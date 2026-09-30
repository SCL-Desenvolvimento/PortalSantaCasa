using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;

        public CoursesController(ICourseService courseService)
        {
            _courseService = courseService;
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
            dto.CreatorId = await _courseService.GetCreatorIdAsync(id);
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
            var content = await _courseService.GetContentAsync(id, userId, expires, signature);
            return content == null ? NotFound() : PhysicalFile(content.FullPath, content.ContentType, enableRangeProcessing: true);
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

        private Task<bool> CanAccessCourseAsync(int courseId) =>
            _courseService.CanAccessCourseAsync(courseId, GetCurrentUserId(), IsAdmin());

        private Task<bool> CanManageCourseAsync(int courseId) =>
            _courseService.CanManageCourseAsync(courseId, GetCurrentUserId(), IsAdmin());

        private void SetSignedContentUrls(IEnumerable<CourseViewDto> courses)
        {
            foreach (var course in courses)
                SetSignedContentUrl(course);
        }

        private void SetSignedContentUrl(CourseViewDto course) =>
            course.VideoUrl = _courseService.CreateSignedContentUrl(course.Id, GetCurrentUserId());


    }
}
