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
        // GET ALL
        // ============================================================
        public async Task<IEnumerable<CourseViewDto>> GetAllAsync()
        {
            return await _context.Courses
                .Include(c => c.Creator)
                .Select(c => new CourseViewDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    VideoUrl = c.VideoUrl,
                    CreatorName = c.Creator.Username,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();
        }

        // ============================================================
        // GET BY ID
        // ============================================================
        public async Task<CourseViewDto?> GetByIdAsync(int id)
        {
            return await _context.Courses
                .Include(c => c.Creator)
                .Where(c => c.Id == id)
                .Select(c => new CourseViewDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    VideoUrl = c.VideoUrl,
                    CreatorName = c.Creator.Username,
                    CreatedAt = c.CreatedAt
                })
                .FirstOrDefaultAsync();
        }

        // ============================================================
        // UPDATE
        // ============================================================
        public async Task<CourseViewDto?> UpdateAsync(int id, CourseCreationDto dto)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null) return null;

            course.Title = dto.Title;
            course.Description = dto.Description;
            course.VideoUrl = dto.VideoUrl;

            await _context.SaveChangesAsync();

            var creator = await _context.Users
                .Where(u => u.Id == course.CreatorId)
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
        // DELETE
        // ============================================================
        public async Task<bool> DeleteAsync(int id)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null) return false;

            _context.Courses.Remove(course);

            var assignments = _context.UserCourses.Where(x => x.CourseId == id);
            _context.UserCourses.RemoveRange(assignments);

            await _context.SaveChangesAsync();

            return true;
        }

        // ============================================================
        // ASSIGNED COURSES
        // ============================================================
        public async Task<IEnumerable<CourseViewDto>> GetAssignedCoursesForUserAsync(int userId)
        {
            return await _context.UserCourses
                .Where(uc => uc.UserId == userId)
                .Include(uc => uc.Course)
                .ThenInclude(c => c.Creator)
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
        // COURSE TRACKING
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

        public async Task<IEnumerable<CourseViewDto>> GetCoursesCreatedByUserAsync(int creatorId)
        {
            return await _context.Courses
                .Where(c => c.CreatorId == creatorId)
                .Include(c => c.Creator)
                .Select(c => new CourseViewDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    VideoUrl = c.VideoUrl,
                    CreatorName = c.Creator.Username,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();
        }

        // ============================================================
        // GET CREATED AND ASSIGNED COURSES FOR USER
        // ============================================================
        public async Task<IEnumerable<CourseViewDto>> GetCreatedAndAssignedCoursesAsync(int creatorId)
        {
            // 1. Encontrar todos os cursos criados pelo usuário
            var createdCourses = await _context.Courses
                .Where(c => c.CreatorId == creatorId)
                .ToListAsync();

            // 2. Filtrar apenas os cursos que foram atribuídos a pelo menos um usuário
            var courseIdsWithAssignments = await _context.UserCourses
                .Where(uc => createdCourses.Select(c => c.Id).Contains(uc.CourseId))
                .Select(uc => uc.CourseId)
                .Distinct()
                .ToListAsync();

            // 3. Selecionar os cursos filtrados e projetar para CourseViewDto
            var finalCourses = await _context.Courses
                .Where(c => courseIdsWithAssignments.Contains(c.Id))
                .Include(c => c.Creator)
                .Select(c => new CourseViewDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    VideoUrl = c.VideoUrl,
                    CreatorName = c.Creator.Username,
                    CreatedAt = c.CreatedAt,
                    // Adicionar a contagem de usuários atribuídos para o frontend
                    AssignedUserIds = _context.UserCourses
                        .Where(uc => uc.CourseId == c.Id)
                        .Select(uc => uc.UserId)
                        .ToList()
                })
                .ToListAsync();

            return finalCourses;
        }

    }
}
