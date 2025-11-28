using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface ICourseService
    {
        Task<CourseViewDto> CreateCourseAndAssignAsync(CourseCreationDto dto);
        Task<IEnumerable<CourseViewDto>> GetAllAsync();
        Task<CourseViewDto?> GetByIdAsync(int id);
        Task<CourseViewDto?> UpdateAsync(int id, CourseCreationDto dto);
        Task<bool> DeleteAsync(int id);
        Task<IEnumerable<CourseViewDto>> GetAssignedCoursesForUserAsync(int userId);
        Task MarkCourseAsWatchedAsync(MarkAsWatchedDto dto);
        Task<IEnumerable<CourseTrackingDto>> GetCourseTrackingAsync(int courseId);
        Task<IEnumerable<CourseViewDto>> GetCoursesCreatedByUserAsync(int creatorId);
        Task<IEnumerable<CourseViewDto>> GetCreatedAndAssignedCoursesAsync(int creatorId);
    }
}
