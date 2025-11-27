using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface ICourseService
    {
        Task<CourseViewDto> CreateCourseAndAssignAsync(CourseCreationDto dto);
        Task<IEnumerable<CourseViewDto>> GetAssignedCoursesForUserAsync(int userId);
        Task MarkCourseAsWatchedAsync(MarkAsWatchedDto dto);
        Task<IEnumerable<CourseTrackingDto>> GetCourseTrackingAsync(int courseId);
    }
}
