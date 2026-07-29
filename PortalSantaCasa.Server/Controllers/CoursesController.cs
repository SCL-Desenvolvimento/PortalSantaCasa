using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;
        private readonly PortalSantaCasaDbContext _context;
        private readonly byte[] _contentSigningKey;

        public CoursesController(
            ICourseService courseService,
            PortalSantaCasaDbContext context,
            IConfiguration configuration)
        {
            _courseService = courseService;
            _context = context;
            _contentSigningKey = Encoding.UTF8.GetBytes(
                configuration["Jwt:Key"] ??
                throw new InvalidOperationException("Jwt:Key nao configurado."));
        }

        [Authorize(Roles = "admin,Admin,superadmin,SuperAdmin,editor,Editor")]
        [HttpPost("create")]
        public async Task<IActionResult> CreateCourse([FromForm] CourseCreationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dto.CreatorId = GetCurrentUserId();
            var course = await _courseService.CreateCourseAndAssignAsync(dto);
            SetSignedContentUrl(course);
            return CreatedAtAction(nameof(GetById), new { id = course.Id }, course);
        }

        [Authorize(Roles = "admin,Admin,superadmin,SuperAdmin,editor,Editor")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var list = IsAdmin()
                ? await _courseService.GetAllAsync()
                : await _courseService.GetCoursesCreatedByUserAsync(GetCurrentUserId());
            SetSignedContentUrls(list);
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!await CanAccessCourseAsync(id))
                return NotFound();

            var course = await _courseService.GetByIdAsync(id);
            if (course == null) return NotFound();
            SetSignedContentUrl(course);
            return Ok(course);
        }

        [Authorize(Roles = "admin,Admin,superadmin,SuperAdmin,editor,Editor")]
        [HttpPut("update/{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] CourseCreationDto dto)
        {
            if (!await CanManageCourseAsync(id))
                return NotFound();

            // O dono do registro nunca é aceito do corpo da requisição.
            dto.CreatorId = await _context.Courses
                .Where(course => course.Id == id)
                .Select(course => course.CreatorId)
                .SingleAsync();
            var updated = await _courseService.UpdateAsync(id, dto);
            if (updated == null) return NotFound();
            SetSignedContentUrl(updated);
            return Ok(updated);
        }

        [Authorize(Roles = "admin,Admin,superadmin,SuperAdmin,editor,Editor")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!await CanManageCourseAsync(id))
                return NotFound();

            var deleted = await _courseService.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        [HttpGet("assigned/{userId}")]
        public async Task<IActionResult> GetAssignedCourses(int userId)
        {
            if (GetCurrentUserId() != userId && !IsAdmin())
                return Forbid();

            var courses = await _courseService.GetAssignedCoursesForUserAsync(userId);
            SetSignedContentUrls(courses);
            return Ok(courses);
        }

        [HttpPost("watch")]
        public async Task<IActionResult> MarkAsWatched([FromBody] MarkAsWatchedDto dto)
        {
            dto.UserId = GetCurrentUserId();
            await _courseService.MarkCourseAsWatchedAsync(dto);
            return NoContent();
        }

        [HttpPut("progress")]
        public async Task<IActionResult> UpdateProgress([FromBody] CourseProgressDto dto)
        {
            var updated = await _courseService.UpdateProgressAsync(GetCurrentUserId(), dto);
            return updated ? NoContent() : NotFound();
        }

        [Authorize(Roles = "admin,Admin,superadmin,SuperAdmin,editor,Editor")]
        [HttpGet("tracking/{courseId}")]
        public async Task<IActionResult> GetCourseTracking(int courseId)
        {
            if (!await CanManageCourseAsync(courseId))
                return NotFound();

            var tracking = await _courseService.GetCourseTrackingAsync(courseId);
            return Ok(tracking);
        }

        [HttpGet("created-by/{creatorId}")]
        public async Task<IActionResult> GetCoursesCreatedByUser(int creatorId)
        {
            if (GetCurrentUserId() != creatorId && !IsAdmin())
                return Forbid();

            var courses = await _courseService.GetCoursesCreatedByUserAsync(creatorId);
            SetSignedContentUrls(courses);
            return Ok(courses);
        }

        [HttpGet("created-and-assigned")]
        public async Task<IActionResult> GetCreatedAndAssignedCourses()
        {
            var userId = GetCurrentUserId();
            var courses = await _courseService.GetCreatedAndAssignedCoursesAsync(userId);
            SetSignedContentUrls(courses);
            return Ok(courses);
        }

        [AllowAnonymous]
        [HttpGet("{id:int}/content")]
        public async Task<IActionResult> GetContent(
            int id,
            [FromQuery] int userId,
            [FromQuery] long expires,
            [FromQuery] string signature)
        {
            if (!IsValidContentSignature(id, userId, expires, signature) ||
                DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expires)
            {
                return NotFound();
            }

            var signedUser = await _context.Users
                .AsNoTracking()
                .Where(user => user.Id == userId && user.IsActive)
                .Select(user => new { user.UserType })
                .SingleOrDefaultAsync();

            if (signedUser == null)
                return NotFound();

            var canAccessAll =
                signedUser.UserType.Equals("admin", StringComparison.OrdinalIgnoreCase) ||
                signedUser.UserType.Equals("superadmin", StringComparison.OrdinalIgnoreCase);

            var canAccess = await _context.Courses
                .AsNoTracking()
                .AnyAsync(course =>
                    course.Id == id &&
                    (canAccessAll ||
                     course.CreatorId == userId ||
                     course.AssignedUsers.Any(assignment => assignment.UserId == userId)));

            if (!canAccess)
                return NotFound();

            var content = await _context.Courses
                .AsNoTracking()
                .Where(course => course.Id == id)
                .Select(course => new { course.VideoUrl, course.OriginalFileName })
                .SingleOrDefaultAsync();

            if (content == null)
                return NotFound();

            var fullPath = Path.GetFullPath(content.VideoUrl);
            var allowedDirectory = Path.GetFullPath(Path.Combine("Uploads", "Courses"));
            var relativePath = Path.GetRelativePath(allowedDirectory, fullPath);
            if (Path.IsPathRooted(relativePath) ||
                relativePath.StartsWith("..", StringComparison.Ordinal) ||
                !System.IO.File.Exists(fullPath))
            {
                return NotFound();
            }

            var provider = new FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(
                    content.OriginalFileName ?? Path.GetFileName(fullPath),
                    out var contentType))
            {
                contentType = "application/octet-stream";
            }

            return PhysicalFile(
                fullPath,
                contentType,
                enableRangeProcessing: true);
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (int.TryParse(userIdClaim, out var userId))
                return userId;

            throw new UnauthorizedAccessException("Usuário não autenticado ou ID de usuário não encontrado.");
        }

        private bool IsAdmin()
        {
            return User.IsInRole("admin") || User.IsInRole("Admin") ||
                   User.IsInRole("superadmin") || User.IsInRole("SuperAdmin");
        }

        private Task<bool> CanAccessCourseAsync(int courseId)
        {
            var userId = GetCurrentUserId();
            var canAccessAll = IsAdmin();
            return _context.Courses.AsNoTracking().AnyAsync(course =>
                course.Id == courseId &&
                (canAccessAll ||
                 course.CreatorId == userId ||
                 course.AssignedUsers.Any(assignment => assignment.UserId == userId)));
        }

        private Task<bool> CanManageCourseAsync(int courseId)
        {
            var userId = GetCurrentUserId();
            var canAccessAll = IsAdmin();
            return _context.Courses.AsNoTracking().AnyAsync(course =>
                course.Id == courseId &&
                (canAccessAll || course.CreatorId == userId));
        }

        private void SetSignedContentUrls(IEnumerable<CourseViewDto> courses)
        {
            foreach (var course in courses)
                SetSignedContentUrl(course);
        }

        private void SetSignedContentUrl(CourseViewDto course)
        {
            var userId = GetCurrentUserId();
            var expires = DateTimeOffset.UtcNow.AddHours(2).ToUnixTimeSeconds();
            var payload = $"{course.Id}:{userId}:{expires}";
            using var hmac = new HMACSHA256(_contentSigningKey);
            var signature = WebEncoders.Base64UrlEncode(
                hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
            course.VideoUrl =
                $"/api/courses/{course.Id}/content?userId={userId}&expires={expires}&signature={signature}";
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
}
