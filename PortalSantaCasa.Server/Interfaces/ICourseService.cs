using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface ICourseService
    {
        Task<bool> CanAccessCourseAsync(int courseId, int userId, bool canAccessAll);
        Task<bool> CanManageCourseAsync(int courseId, int userId, bool canAccessAll);
        Task<int> GetCreatorIdAsync(int courseId);
        string CreateSignedContentUrl(int courseId, int userId);
        Task<CourseContentDto?> GetContentAsync(int courseId, int userId, long expires, string signature);
        Task<CourseViewDto> CreateCourseAndAssignAsync(CourseCreationDto dto);
        Task<IEnumerable<CourseViewDto>> GetAllAsync();
        Task<CourseViewDto?> GetByIdAsync(int id);
        Task<CourseViewDto?> UpdateAsync(int id, CourseCreationDto dto);
        Task<bool> DeleteAsync(int id);
        Task<IEnumerable<CourseViewDto>> GetAssignedCoursesForUserAsync(int userId);
        Task MarkCourseAsWatchedAsync(MarkAsWatchedDto dto);
        Task<bool> UpdateProgressAsync(int userId, CourseProgressDto dto);
        Task<IEnumerable<CourseTrackingDto>> GetCourseTrackingAsync(int courseId);
        Task<IEnumerable<CourseViewDto>> GetCoursesCreatedByUserAsync(int creatorId);
        Task<IEnumerable<CourseViewDto>> GetCreatedAndAssignedCoursesAsync(int creatorId);
    }
}
