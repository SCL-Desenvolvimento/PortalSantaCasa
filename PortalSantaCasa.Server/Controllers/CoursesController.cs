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

        [HttpPost("create")]
        public async Task<IActionResult> CreateCourse([FromForm] CourseCreationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var course = await _courseService.CreateCourseAndAssignAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = course.Id }, course);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var list = await _courseService.GetAllAsync();
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var course = await _courseService.GetByIdAsync(id);
            if (course == null) return NotFound();
            return Ok(course);
        }

        [HttpPut("update/{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] CourseCreationDto dto)
        {
            var updated = await _courseService.UpdateAsync(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
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
            return Ok(courses);
        }

        [HttpPost("watch")]
        public async Task<IActionResult> MarkAsWatched([FromBody] MarkAsWatchedDto dto)
        {
            dto.UserId = GetCurrentUserId();
            await _courseService.MarkCourseAsWatchedAsync(dto);
            return NoContent();
        }

        [HttpGet("tracking/{courseId}")]
        public async Task<IActionResult> GetCourseTracking(int courseId)
        {
            var tracking = await _courseService.GetCourseTrackingAsync(courseId);
            return Ok(tracking);
        }

        [HttpGet("created-by/{creatorId}")]
        public async Task<IActionResult> GetCoursesCreatedByUser(int creatorId)
        {
            if (GetCurrentUserId() != creatorId && !IsAdmin())
                return Forbid();

            var courses = await _courseService.GetCoursesCreatedByUserAsync(creatorId);
            return Ok(courses);
        }

        [HttpGet("created-and-assigned")]
        public async Task<IActionResult> GetCreatedAndAssignedCourses()
        {
            var userId = GetCurrentUserId();
            var courses = await _courseService.GetCreatedAndAssignedCoursesAsync(userId);
            return Ok(courses);
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
            return User.IsInRole("admin") || User.IsInRole("Admin");
        }
    }
}
