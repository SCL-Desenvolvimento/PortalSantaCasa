using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Utils;
using System.Text.Json;

namespace PortalSantaCasa.Server.Services;

public class CourseService : ICourseService
{
    private readonly PortalSantaCasaDbContext _context;

    public CourseService(PortalSantaCasaDbContext context)
    {
        _context = context;
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
            VideoUrl = await ProcessContentAsync(dto.File!, dto.ContentType),
            ContentType = NormalizeContentType(dto.ContentType),
            OriginalFileName = Path.GetFileName(dto.File!.FileName),
            AssignedDepartments = JsonSerializer.Serialize(departments),
            CreatorId = dto.CreatorId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync();

        _context.UserCourses.AddRange(assignedUserIds.Select(userId => NewAssignment(course.Id, userId)));
        await _context.SaveChangesAsync();

        await _context.Entry(course).Reference(c => c.Creator).LoadAsync();
        var result = ToViewDto(course);
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

        return courses.Select(ToViewDto);
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

        var departments = NormalizeDepartments(dto.AssignedDepartments);
        var newUserIds = await ResolveAssignedUsersAsync(dto.AssignedUserIds, departments);
        course.Title = dto.Title.Trim();
        course.Description = dto.Description.Trim();
        course.AssignedDepartments = JsonSerializer.Serialize(departments);

        if (dto.File != null)
        {
            var oldFile = course.VideoUrl;
            course.VideoUrl = await ProcessContentAsync(dto.File, dto.ContentType);
            course.ContentType = NormalizeContentType(dto.ContentType);
            course.OriginalFileName = Path.GetFileName(dto.File.FileName);
            DeleteStoredFile(oldFile);
        }

        var existing = await _context.UserCourses.Where(x => x.CourseId == id).ToListAsync();
        var existingIds = existing.Select(x => x.UserId).ToHashSet();

        _context.UserCourses.AddRange(newUserIds
            .Where(userId => !existingIds.Contains(userId))
            .Select(userId => NewAssignment(id, userId)));

        _context.UserCourses.RemoveRange(existing.Where(x => !newUserIds.Contains(x.UserId)));
        await _context.SaveChangesAsync();

        await _context.Entry(course).Reference(c => c.Creator).LoadAsync();
        var result = ToViewDto(course);
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
            .Where(x => x.UserId == userId)
            .Include(x => x.Course).ThenInclude(c => c.Creator)
            .OrderByDescending(x => x.Course.CreatedAt)
            .ToListAsync();

        return assignments.Select(assignment =>
        {
            var item = ToViewDto(assignment.Course);
            item.IsWatched = assignment.IsWatched;
            item.ProgressPercentage = assignment.IsWatched ? 100 : assignment.ProgressPercentage;
            item.LastPositionSeconds = assignment.LastPositionSeconds;
            item.FirstAccessedAt = assignment.FirstAccessedAt;
            item.LastAccessedAt = assignment.LastAccessedAt;
            return item;
        });
    }

    public async Task MarkCourseAsWatchedAsync(MarkAsWatchedDto dto)
    {
        await UpdateProgressAsync(dto.UserId, new CourseProgressDto
        {
            CourseId = dto.CourseId,
            ProgressPercentage = 100,
            Completed = true
        });
    }

    public async Task<bool> UpdateProgressAsync(int userId, CourseProgressDto dto)
    {
        var assignment = await _context.UserCourses
            .FirstOrDefaultAsync(x => x.UserId == userId && x.CourseId == dto.CourseId);
        if (assignment == null) return false;

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
            assignment.WatchedAt ??= now;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<CourseTrackingDto>> GetCourseTrackingAsync(int courseId)
    {
        return await _context.UserCourses
            .AsNoTracking()
            .Where(x => x.CourseId == courseId)
            .Include(x => x.User)
            .Include(x => x.Course)
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
                LastAccessedAt = x.LastAccessedAt
            })
            .ToListAsync();
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
        return courses.Select(ToViewDto);
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
        return courses.Select(ToViewDto);
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

    private static UserCourse NewAssignment(int courseId, int userId) => new()
    {
        CourseId = courseId,
        UserId = userId,
        IsWatched = false,
        ProgressPercentage = 0
    };

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
        AssignedUserIds = course.AssignedUsers?.Select(x => x.UserId).ToList() ?? [],
        AssignedDepartments = ParseDepartments(course.AssignedDepartments)
    };

    private static List<string> NormalizeDepartments(IEnumerable<string>? departments) =>
        (departments ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value)
            .ToList();

    private static List<string> ParseDepartments(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch (JsonException) { return []; }
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
        if (fullPath.StartsWith(allowedDirectory, StringComparison.OrdinalIgnoreCase) && File.Exists(fullPath))
            File.Delete(fullPath);
    }
}
