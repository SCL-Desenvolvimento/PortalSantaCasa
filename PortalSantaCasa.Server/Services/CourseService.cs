using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;
using System.Text;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Utils;
using System.Text.Json;

namespace PortalSantaCasa.Server.Services;

public class CourseService : ICourseService
{
    private static readonly TimeZoneInfo BrasiliaTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");

    private readonly PortalSantaCasaDbContext _context;

    private readonly byte[] _contentSigningKey;

    public CourseService(PortalSantaCasaDbContext context, IConfiguration configuration)
    {
        _context = context;
        _contentSigningKey = Encoding.UTF8.GetBytes(configuration["Jwt:Key"] ??
            throw new InvalidOperationException("Jwt:Key nao configurado."));
    }

    public async Task<CourseViewDto> CreateCourseAndAssignAsync(CourseCreationDto dto)
    {
        ValidateContent(dto, requireFile: true);
        var departments = NormalizeDepartments(dto.AssignedDepartments);
        var assignedUserIds = await ResolveAssignedUsersAsync(dto.AssignedUserIds, departments);

        var course = new Course
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            ContentType = NormalizeContentType(dto.ContentType),
            OriginalFileName = Path.GetFileName(dto.File!.FileName),
            AssignedDepartments = JsonSerializer.Serialize(departments),
            ExplicitAssignedUserIds = SerializeExplicitUsers(dto.AssignedUserIds, assignedUserIds),
            CreatorId = dto.CreatorId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        SetTrainingSchedule(course, dto);
        course.VideoUrl = await ProcessContentAsync(dto.File!, dto.ContentType);
        foreach (var userId in assignedUserIds)
            course.AssignedUsers.Add(NewAssignment(course, userId, course.CreatedAt));

        _context.Courses.Add(course);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            DeleteStoredFile(course.VideoUrl);
            throw;
        }

        await _context.Entry(course).Reference(c => c.Creator).LoadAsync();
        var result = ToManagementViewDto(course);
        result.AssignedUserIds = assignedUserIds;
        return result;
    }

    public async Task<IEnumerable<CourseViewDto>> GetAllAsync()
    {
        var courses = await _context.Courses
            .AsNoTracking()
            .Include(c => c.Creator)
            .Include(c => c.AssignedUsers)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return courses.Select(ToManagementViewDto);
    }

    public async Task<CourseViewDto?> GetByIdAsync(int id)
    {
        var course = await _context.Courses
            .AsNoTracking()
            .Include(c => c.Creator)
            .Include(c => c.AssignedUsers)
            .FirstOrDefaultAsync(c => c.Id == id);

        return course == null ? null : ToViewDto(course);
    }

    public async Task<CourseViewDto?> UpdateAsync(int id, CourseCreationDto dto)
    {
        ValidateContent(dto, requireFile: false);
        var course = await _context.Courses.FindAsync(id);
        if (course == null) return null;

        var previouslyScheduled = IsTraining(course);
        var updateSchedule = dto.UpdateTrainingSchedule || dto.TrackName != null ||
            dto.DeadlineDays.HasValue || dto.ReminderDaysBefore.HasValue || dto.RenewalDays.HasValue;
        if (updateSchedule)
            SetTrainingSchedule(course, dto);

        var departments = NormalizeDepartments(dto.AssignedDepartments);
        var newUserIds = await ResolveAssignedUsersAsync(dto.AssignedUserIds, departments);
        var selectedUsers = newUserIds.ToHashSet();
        course.Title = dto.Title.Trim();
        course.Description = dto.Description.Trim();
        course.AssignedDepartments = JsonSerializer.Serialize(departments);
        course.ExplicitAssignedUserIds = SerializeExplicitUsers(dto.AssignedUserIds, newUserIds);

        var now = DateTimeOffset.UtcNow;
        var existing = await _context.UserCourses.Where(x => x.CourseId == id).ToListAsync();
        var existingIds = existing.Select(x => x.UserId).ToHashSet();
        foreach (var assignment in existing.Where(x => selectedUsers.Contains(x.UserId)))
        {
            if (updateSchedule || assignment.WithdrawnAt.HasValue)
                ApplyAssignmentSchedule(assignment, course, now);
            assignment.WithdrawnAt = null;
        }

        _context.UserCourses.AddRange(newUserIds
            .Where(userId => !existingIds.Contains(userId))
            .Select(userId => NewAssignment(course, userId, now)));

        var withdrawn = existing.Where(x => !selectedUsers.Contains(x.UserId) && x.WithdrawnAt == null).ToList();
        if (withdrawn.Count > 0)
        {
            var retainAssignments = previouslyScheduled || IsTraining(course) || existing.Any(x => x.WithdrawnAt.HasValue) ||
                await _context.CourseCompletions.AnyAsync(x => x.CourseId == id);
            if (retainAssignments)
            {
                foreach (var assignment in withdrawn)
                    assignment.WithdrawnAt = now;
            }
            else
            {
                _context.UserCourses.RemoveRange(withdrawn);
            }
        }

        string? replacedFile = null;
        if (dto.File != null)
        {
            replacedFile = course.VideoUrl;
            course.VideoUrl = await ProcessContentAsync(dto.File, dto.ContentType);
            course.ContentType = NormalizeContentType(dto.ContentType);
            course.OriginalFileName = Path.GetFileName(dto.File.FileName);
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (replacedFile != null)
                DeleteStoredFile(course.VideoUrl);
            throw;
        }

        DeleteStoredFile(replacedFile);

        await _context.Entry(course).Reference(c => c.Creator).LoadAsync();
        var result = ToManagementViewDto(course);
        result.AssignedUserIds = newUserIds;
        return result;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null) return false;

        var storedFile = course.VideoUrl;
        _context.Courses.Remove(course);
        await _context.SaveChangesAsync();
        DeleteStoredFile(storedFile);
        return true;
    }

    public async Task<IEnumerable<CourseViewDto>> GetAssignedCoursesForUserAsync(int userId)
    {
        var assignments = await _context.UserCourses
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.WithdrawnAt == null)
            .Include(x => x.Course).ThenInclude(c => c.Creator)
            .Include(x => x.Completions)
            .OrderByDescending(x => x.Course.CreatedAt)
            .ToListAsync();

        var today = BusinessDate(DateTimeOffset.UtcNow);
        return assignments.Select(assignment =>
        {
            var item = ToViewDto(assignment.Course);
            item.IsWatched = assignment.IsWatched;
            item.ProgressPercentage = assignment.IsWatched ? 100 : assignment.ProgressPercentage;
            item.LastPositionSeconds = assignment.LastPositionSeconds;
            item.FirstAccessedAt = assignment.FirstAccessedAt;
            item.LastAccessedAt = assignment.LastAccessedAt;
            item.CycleId = assignment.CycleId ?? Guid.Empty;
            item.DueAt = assignment.DueAt;
            item.RenewalAt = assignment.RenewalAt;
            item.IsOverdue = !assignment.IsWatched && assignment.DueAt is { } due && BusinessDate(due) < today;
            item.IsRecertification = assignment.Completions.Count > 0;
            return item;
        });
    }

    public async Task MarkCourseAsWatchedAsync(MarkAsWatchedDto dto)
    {
        await UpdateProgressAsync(dto.UserId, new CourseProgressDto
        {
            CourseId = dto.CourseId,
            CycleId = dto.CycleId,
            ProgressPercentage = 100,
            Completed = true
        });
    }

    public async Task<bool> UpdateProgressAsync(int userId, CourseProgressDto dto)
    {
        var assignment = await _context.UserCourses
            .FirstOrDefaultAsync(x => x.UserId == userId && x.CourseId == dto.CourseId && x.WithdrawnAt == null);
        if (assignment == null || (dto.CycleId.HasValue && dto.CycleId != (assignment.CycleId ?? Guid.Empty)))
            return false;
        if (!dto.CycleId.HasValue && assignment.CycleId.HasValue &&
            await _context.Courses.AnyAsync(x => x.Id == dto.CourseId && x.RenewalDays != null))
            return false;

        var now = DateTimeOffset.UtcNow;
        assignment.FirstAccessedAt ??= now;
        assignment.LastAccessedAt = now;
        assignment.ProgressPercentage = Math.Max(
            assignment.ProgressPercentage,
            Math.Clamp(dto.ProgressPercentage, 0, 100));
        assignment.LastPositionSeconds = Math.Max(0, dto.PositionSeconds);
        assignment.TotalDurationSeconds = Math.Max(assignment.TotalDurationSeconds, dto.DurationSeconds);
        assignment.CurrentPage = Math.Max(assignment.CurrentPage, dto.CurrentPage);
        assignment.TotalPages = Math.Max(assignment.TotalPages, dto.TotalPages);
        assignment.TimeSpentSeconds += Math.Clamp(dto.ActivitySeconds, 0, 60);

        if (dto.Completed || assignment.ProgressPercentage >= 90)
        {
            assignment.IsWatched = true;
            assignment.ProgressPercentage = 100;
            if (!assignment.WatchedAt.HasValue)
            {
                assignment.WatchedAt = now;
                var renewalDays = await _context.Courses.Where(x => x.Id == dto.CourseId)
                    .Select(x => x.RenewalDays).SingleOrDefaultAsync();
                assignment.RenewalAt = renewalDays.HasValue ? now.AddDays(renewalDays.Value) : null;
            }
        }

        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    public async Task<IEnumerable<CourseTrackingDto>> GetCourseTrackingAsync(int courseId)
    {
        var tracking = await _context.UserCourses
            .AsNoTracking()
            .Where(x => x.CourseId == courseId && x.WithdrawnAt == null)
            .OrderBy(x => x.User.Username)
            .Select(x => new CourseTrackingDto
            {
                CourseId = x.CourseId,
                CourseTitle = x.Course.Title,
                ContentType = x.Course.ContentType,
                UserId = x.UserId,
                UserName = x.User.Username,
                Department = x.User.Department,
                IsWatched = x.IsWatched,
                WatchedAt = x.WatchedAt,
                ProgressPercentage = x.IsWatched ? 100 : x.ProgressPercentage,
                LastPositionSeconds = x.LastPositionSeconds,
                TotalDurationSeconds = x.TotalDurationSeconds,
                CurrentPage = x.CurrentPage,
                TotalPages = x.TotalPages,
                TimeSpentSeconds = x.TimeSpentSeconds,
                FirstAccessedAt = x.FirstAccessedAt,
                LastAccessedAt = x.LastAccessedAt,
                TrackName = x.Course.TrackName,
                AssignedAt = x.AssignedAt,
                DueAt = x.DueAt,
                RenewalAt = x.RenewalAt,
                CompletionHistory = x.Completions.OrderByDescending(c => c.Id)
                    .Select(c => new CourseCompletionDto(c.AssignedAt, c.DueAt, c.CompletedAt, c.TimeSpentSeconds))
                    .ToList()
            })
            .ToListAsync();
        var today = BusinessDate(DateTimeOffset.UtcNow);
        foreach (var item in tracking)
            item.IsOverdue = !item.IsWatched && item.DueAt is { } due && BusinessDate(due) < today;
        return tracking;
    }

    public async Task<IEnumerable<CourseViewDto>> GetCoursesCreatedByUserAsync(int creatorId)
    {
        var courses = await _context.Courses
            .AsNoTracking()
            .Where(c => c.CreatorId == creatorId)
            .Include(c => c.Creator)
            .Include(c => c.AssignedUsers)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return courses.Select(ToManagementViewDto);
    }

    public async Task<IEnumerable<CourseViewDto>> GetCreatedAndAssignedCoursesAsync(int creatorId)
    {
        var courses = await _context.Courses
            .AsNoTracking()
            .Where(c => c.CreatorId == creatorId)
            .Include(c => c.Creator)
            .Include(c => c.AssignedUsers)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return courses.Select(ToManagementViewDto);
    }

    private async Task<List<int>> ResolveAssignedUsersAsync(IEnumerable<int>? userIds, IEnumerable<string> departments)
    {
        var ids = (userIds ?? []).Where(id => id > 0).ToHashSet();
        var departmentList = departments.ToList();
        if (departmentList.Count > 0)
        {
            var departmentUserIds = await _context.Users
                .Where(u => u.IsActive && departmentList.Contains(u.Department))
                .Select(u => u.Id)
                .ToListAsync();
            ids.UnionWith(departmentUserIds);
        }

        return await _context.Users
            .Where(u => u.IsActive && ids.Contains(u.Id))
            .Select(u => u.Id)
            .ToListAsync();
    }

    internal static UserCourse NewAssignment(Course course, int userId, DateTimeOffset now)
    {
        var assignment = new UserCourse { Course = course, UserId = userId, CycleId = Guid.NewGuid() };
        ApplyAssignmentSchedule(assignment, course, now);
        return assignment;
    }

    private static bool IsTraining(Course course) =>
        course.TrackName != null || course.DeadlineDays.HasValue || course.RenewalDays.HasValue;

    private static string SerializeExplicitUsers(IEnumerable<int>? requestedUsers, List<int> assignedUserIds) =>
        JsonSerializer.Serialize((requestedUsers ?? []).Intersect(assignedUserIds).ToList());

    private static void SetTrainingSchedule(Course course, CourseCreationDto dto)
    {
        if (dto.DeadlineDays is < 1 or > 3650 || dto.RenewalDays is < 1 or > 3650
            || dto.ReminderDaysBefore is < 0 or > 3650)
            throw new FileUploadValidationException("Informe um prazo, antecedência ou intervalo de reciclagem válido.");
        if (dto.ReminderDaysBefore.HasValue && (!dto.DeadlineDays.HasValue || dto.ReminderDaysBefore > dto.DeadlineDays))
            throw new FileUploadValidationException("A antecedência do lembrete deve ser menor ou igual ao prazo do curso.");

        course.TrackName = string.IsNullOrWhiteSpace(dto.TrackName) ? null : dto.TrackName.Trim();
        course.DeadlineDays = dto.DeadlineDays;
        course.ReminderDaysBefore = dto.ReminderDaysBefore;
        course.RenewalDays = dto.RenewalDays;
    }

    internal static void ApplyAssignmentSchedule(UserCourse assignment, Course course, DateTimeOffset now)
    {
        assignment.AssignedAt ??= assignment.FirstAccessedAt ?? assignment.WatchedAt ?? now;
        assignment.DueAt = course.DeadlineDays.HasValue
            ? assignment.AssignedAt?.AddDays(course.DeadlineDays.Value)
            : null;
        assignment.RenewalAt = course.RenewalDays.HasValue
            ? assignment.WatchedAt?.AddDays(course.RenewalDays.Value)
            : null;
    }

    internal static DateOnly BusinessDate(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, BrasiliaTimeZone).DateTime);

    private static CourseViewDto ToViewDto(Course course) => new()
    {
        Id = course.Id,
        Title = course.Title,
        Description = course.Description,
        VideoUrl = course.VideoUrl,
        ContentType = string.IsNullOrWhiteSpace(course.ContentType) ? "video" : course.ContentType,
        OriginalFileName = course.OriginalFileName,
        CreatorName = course.Creator?.Username ?? "Desconhecido",
        CreatedAt = course.CreatedAt,
        CreatorId = course.CreatorId,
        TrackName = course.TrackName,
        DeadlineDays = course.DeadlineDays,
        ReminderDaysBefore = course.ReminderDaysBefore,
        RenewalDays = course.RenewalDays,
        AssignedUserIds = course.AssignedUsers.Where(x => x.WithdrawnAt == null).Select(x => x.UserId).ToList(),
        AssignedDepartments = ParseDepartments(course.AssignedDepartments)
    };

    private static CourseViewDto ToManagementViewDto(Course course)
    {
        var result = ToViewDto(course);
        result.ExplicitAssignedUserIds = ParseList<int>(course.ExplicitAssignedUserIds);
        return result;
    }

    private static List<string> NormalizeDepartments(IEnumerable<string>? departments) =>
        (departments ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value)
            .ToList();

    internal static List<string> ParseDepartments(string? json) => ParseList<string>(json) ?? [];

    private static List<T>? ParseList<T>(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<List<T>>(json); }
        catch (JsonException) { return null; }
    }

    private static void ValidateContent(CourseCreationDto dto, bool requireFile)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new FileUploadValidationException("Informe o título do curso.");
        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new FileUploadValidationException("Informe a descrição do curso.");
        if (requireFile && dto.File == null)
            throw new FileUploadValidationException("Envie um vídeo ou arquivo PDF.");
        _ = NormalizeContentType(dto.ContentType);
    }

    private static string NormalizeContentType(string? contentType)
    {
        var normalized = contentType?.Trim().ToLowerInvariant();
        if (normalized is not ("video" or "pdf"))
            throw new FileUploadValidationException("O conteúdo deve ser um vídeo ou PDF.");
        return normalized;
    }

    private static async Task<string> ProcessContentAsync(IFormFile file, string contentType)
    {
        var normalizedType = NormalizeContentType(contentType);
        if (normalizedType == "pdf")
        {
            if (!Path.GetExtension(file.FileName).Equals(".pdf", StringComparison.OrdinalIgnoreCase))
                throw new FileUploadValidationException("Para conteúdo PDF, envie um arquivo .pdf.");
            FileUploadValidator.EnsureDocument(file);
        }
        else
        {
            FileUploadValidator.EnsureVideo(file);
        }

        var directory = Path.Combine("Uploads", "Courses");
        Directory.CreateDirectory(directory);
        var filePath = Path.Combine(directory, $"{Guid.NewGuid()}{Path.GetExtension(file.FileName).ToLowerInvariant()}")
            .Replace("\\", "/");
        await using var stream = new FileStream(filePath, FileMode.CreateNew);
        await file.CopyToAsync(stream);
        return filePath;
    }

    private static void DeleteStoredFile(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;
        var fullPath = Path.GetFullPath(path);
        var allowedDirectory = Path.GetFullPath(Path.Combine("Uploads", "Courses"));
        UploadStorage.DeleteIfExists(path, "Courses");
    }

    public Task<int> GetCreatorIdAsync(int courseId) => _context.Courses
        .Where(course => course.Id == courseId).Select(course => course.CreatorId).SingleAsync();

    public Task<bool> CanAccessCourseAsync(int courseId, int userId, bool canAccessAll)
    {
        return _context.Courses.AsNoTracking().AnyAsync(course =>
            course.Id == courseId &&
            (canAccessAll ||
             course.CreatorId == userId ||
             course.AssignedUsers.Any(assignment => assignment.UserId == userId && assignment.WithdrawnAt == null)));
    }

    public Task<bool> CanManageCourseAsync(int courseId, int userId, bool canAccessAll)
    {
        return _context.Courses.AsNoTracking().AnyAsync(course =>
            course.Id == courseId &&
            (canAccessAll || course.CreatorId == userId));
    }

    public string CreateSignedContentUrl(int courseId, int userId)
    {
        var expires = DateTimeOffset.UtcNow.AddHours(2).ToUnixTimeSeconds();
        var payload = $"{courseId}:{userId}:{expires}";
        using var hmac = new HMACSHA256(_contentSigningKey);
        var signature = WebEncoders.Base64UrlEncode(
            hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
        return
            $"/api/courses/{courseId}/content?userId={userId}&expires={expires}&signature={signature}";
    }

    public async Task<CourseContentDto?> GetContentAsync(int id, int userId, long expires, string signature)
    {
        if (!IsValidContentSignature(id, userId, expires, signature) ||
            DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expires)
        {
            return null;
        }

        var signedUser = await _context.Users
            .AsNoTracking()
            .Where(user => user.Id == userId && user.IsActive)
            .Select(user => new { user.UserType })
            .SingleOrDefaultAsync();

        if (signedUser == null)
            return null;

        var canAccessAll =
            signedUser.UserType.Equals("admin", StringComparison.OrdinalIgnoreCase) ||
            signedUser.UserType.Equals("superadmin", StringComparison.OrdinalIgnoreCase);

        var canAccess = await _context.Courses
            .AsNoTracking()
            .AnyAsync(course =>
                course.Id == id &&
                (canAccessAll ||
                 course.CreatorId == userId ||
                 course.AssignedUsers.Any(assignment => assignment.UserId == userId && assignment.WithdrawnAt == null)));

        if (!canAccess)
            return null;

        var content = await _context.Courses
            .AsNoTracking()
            .Where(course => course.Id == id)
            .Select(course => new { course.VideoUrl, course.OriginalFileName })
            .SingleOrDefaultAsync();

        if (content == null)
            return null;

        var fullPath = Path.GetFullPath(content.VideoUrl);
        var allowedDirectory = Path.GetFullPath(Path.Combine("Uploads", "Courses"));
        var relativePath = Path.GetRelativePath(allowedDirectory, fullPath);
        if (Path.IsPathRooted(relativePath) ||
            relativePath.StartsWith("..", StringComparison.Ordinal) ||
            !System.IO.File.Exists(fullPath))
        {
            return null;
        }

        var provider = new FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(
                content.OriginalFileName ?? Path.GetFileName(fullPath),
                out var contentType))
        {
            contentType = "application/octet-stream";
        }

        return new CourseContentDto(fullPath, contentType);
    }

    private bool IsValidContentSignature(int courseId, int userId, long expires, string signature)
    {
        if (userId <= 0 || expires <= 0 || string.IsNullOrWhiteSpace(signature))
            return false;

        byte[] receivedSignature;
        try
        {
            receivedSignature = WebEncoders.Base64UrlDecode(signature);
        }
        catch (FormatException)
        {
            return false;
        }

        var payload = $"{courseId}:{userId}:{expires}";
        using var hmac = new HMACSHA256(_contentSigningKey);
        var expectedSignature = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return CryptographicOperations.FixedTimeEquals(expectedSignature, receivedSignature);
    }
}
