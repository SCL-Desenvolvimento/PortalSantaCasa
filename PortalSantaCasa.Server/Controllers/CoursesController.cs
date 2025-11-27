using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;

        public CoursesController(ICourseService courseService)
        {
            _courseService = courseService;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateCourse([FromBody] CourseCreationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var course = await _courseService.CreateCourseAndAssignAsync(dto);

            return CreatedAtAction(nameof(GetCourseTracking), new { courseId = course.Id }, course);
        }

        [HttpGet("assigned/{userId}")]
        public async Task<ActionResult<IEnumerable<CourseViewDto>>> GetAssignedCourses(int userId)
        {
            var courses = await _courseService.GetAssignedCoursesForUserAsync(userId);
            return Ok(courses);
        }

        [HttpPost("watch")]
        public async Task<IActionResult> MarkAsWatched([FromBody] MarkAsWatchedDto dto)
        {
            await _courseService.MarkCourseAsWatchedAsync(dto);
            return NoContent();
        }

        [HttpGet("tracking/{courseId}")]
        public async Task<ActionResult<IEnumerable<CourseTrackingDto>>> GetCourseTracking(int courseId)
        {
            var tracking = await _courseService.GetCourseTrackingAsync(courseId);
            return Ok(tracking);
        }
    }
}
