using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class CourseService : ICourseService
    {
        private readonly PortalSantaCasaDbContext _context;

        public CourseService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        // ============================================================
        // CREATE COURSE + ASSIGN USERS
        // ============================================================
        public async Task<CourseViewDto> CreateCourseAndAssignAsync(CourseCreationDto dto)
        {
            var course = new Course
            {
                Title = dto.Title,
                Description = dto.Description,
                VideoUrl = dto.VideoUrl,
                CreatorId = dto.CreatorId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();

            // Vincular usuários ao curso
            if (dto.AssignedUserIds?.Any() == true)
            {
                var assignments = dto.AssignedUserIds.Select(uid => new UserCourse
                {
                    CourseId = course.Id,
                    UserId = uid,
                    IsWatched = false
                });

                _context.UserCourses.AddRange(assignments);
                await _context.SaveChangesAsync();
            }

            // Criador para o DTO
            var creator = await _context.Users
                .Where(u => u.Id == dto.CreatorId)
                .Select(u => u.Username)
                .FirstOrDefaultAsync();

            return new CourseViewDto
            {
                Id = course.Id,
                Title = course.Title,
                Description = course.Description,
                VideoUrl = course.VideoUrl,
                CreatorName = creator ?? "Desconhecido",
                CreatedAt = course.CreatedAt
            };
        }

        // ============================================================
        // COURSES ASSIGNED TO A USER
        // ============================================================
        public async Task<IEnumerable<CourseViewDto>> GetAssignedCoursesForUserAsync(int userId)
        {
            return await _context.UserCourses
                .Where(uc => uc.UserId == userId)
                .Include(uc => uc.Course)
                .ThenInclude(c => c.AssignedUsers)
                .Select(uc => new CourseViewDto
                {
                    Id = uc.Course.Id,
                    Title = uc.Course.Title,
                    Description = uc.Course.Description,
                    VideoUrl = uc.Course.VideoUrl,
                    CreatorName = uc.Course.Creator.Username,
                    CreatedAt = uc.Course.CreatedAt
                })
                .ToListAsync();
        }

        // ============================================================
        // MARK AS WATCHED
        // ============================================================
        public async Task MarkCourseAsWatchedAsync(MarkAsWatchedDto dto)
        {
            var relation = await _context.UserCourses
                .FirstOrDefaultAsync(uc => uc.UserId == dto.UserId && uc.CourseId == dto.CourseId);

            if (relation == null)
                return;

            relation.IsWatched = true;
            relation.WatchedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        // ============================================================
        // COURSE TRACKING (ADMIN / RELATÓRIO POR CURSO)
        // ============================================================
        public async Task<IEnumerable<CourseTrackingDto>> GetCourseTrackingAsync(int courseId)
        {
            return await _context.UserCourses
                .Where(uc => uc.CourseId == courseId)
                .Include(uc => uc.User)
                .Include(uc => uc.Course)
                .Select(uc => new CourseTrackingDto
                {
                    CourseId = uc.CourseId,
                    CourseTitle = uc.Course.Title,
                    UserId = uc.UserId,
                    UserName = uc.User.Username,
                    IsWatched = uc.IsWatched,
                    WatchedAt = uc.WatchedAt
                })
                .ToListAsync();
        }
    }
}
