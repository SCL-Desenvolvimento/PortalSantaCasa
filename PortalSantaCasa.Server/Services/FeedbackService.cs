using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class FeedbackService : IFeedbackService
    {
        private readonly PortalSantaCasaDbContext _context;
        private INotificationService _notificationService;

        public FeedbackService(PortalSantaCasaDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<IEnumerable<FeedbackResponseDto>> GetAllAsync(string? targetDepartment)
        {
            var query = ScopeToDepartment(_context.Feedbacks.AsNoTracking(), targetDepartment);
            return await query
                .OrderByDescending(f => f.CreatedAt)
                .Select(f => new FeedbackResponseDto
                {
                    Id = f.Id,
                    Name = f.Name,
                    Email = f.Email,
                    Department = f.Department,
                    TargetDepartment = f.TargetDepartment,
                    Category = f.Category,
                    Subject = f.Subject,
                    Message = f.Message,
                    IsRead = f.IsRead,
                    CreatedAt = f.CreatedAt
                }).OrderByDescending(f => f.CreatedAt).ToListAsync();
        }

        public async Task<IEnumerable<FeedbackResponseDto>> GetAllPaginatedAsync(
            int page,
            int perPage,
            string? targetDepartment)
        {
            var query = ScopeToDepartment(_context.Feedbacks.AsNoTracking(), targetDepartment);
            return await query
                .OrderByDescending(f => f.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(f => new FeedbackResponseDto
                {
                    Id = f.Id,
                    Name = f.Name,
                    Email = f.Email,
                    Department = f.Department,
                    TargetDepartment = f.TargetDepartment,
                    Category = f.Category,
                    Subject = f.Subject,
                    Message = f.Message,
                    IsRead = f.IsRead,
                    CreatedAt = f.CreatedAt
                }).AsNoTracking().ToListAsync();
        }

        public Task<int> GetTotalCountAsync(string? targetDepartment)
        {
            return ScopeToDepartment(_context.Feedbacks.AsNoTracking(), targetDepartment).CountAsync();
        }

        public async Task<FeedbackResponseDto?> GetByIdAsync(int id, string? targetDepartment)
        {
            var f = await ScopeToDepartment(_context.Feedbacks.AsNoTracking(), targetDepartment)
                .FirstOrDefaultAsync(feedback => feedback.Id == id);
            if (f == null) return null;

            return new FeedbackResponseDto
            {
                Id = f.Id,
                Name = f.Name,
                Email = f.Email,
                Department = f.Department,
                TargetDepartment = f.TargetDepartment,
                Category = f.Category,
                Subject = f.Subject,
                Message = f.Message,
                IsRead = f.IsRead,
                CreatedAt = f.CreatedAt
            };
        }

        public async Task<FeedbackResponseDto> CreateAsync(FeedbackCreateDto dto)
        {
            var entity = new Feedback
            {
                Name = dto.Name,
                Email = dto.Email,
                Department = dto.Department,
                Category = dto.Category,
                TargetDepartment = dto.TargetDepartment,
                Subject = dto.Subject,
                Message = dto.Message,
                IsRead = dto.IsRead,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Feedbacks.Add(entity);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(new NotificationCreateDto()
            {
                Type = "feedback",
                Title = "Novo feedback recebido",
                Message = entity.Subject,
                Link = $"/feedbacks/{entity.Id}",
                IsGlobal = false,
                TargetDepartment = entity.TargetDepartment
            });

            return await GetByIdAsync(entity.Id, null) ?? throw new Exception("Erro ao criar feedback");
        }

        public async Task<bool> UpdateAsync(int id, FeedbackUpdateDto dto, string? targetDepartment)
        {
            var f = await ScopeToDepartment(_context.Feedbacks, targetDepartment)
                .FirstOrDefaultAsync(feedback => feedback.Id == id);
            if (f == null) return false;

            f.Category = dto.Category;
            f.Subject = dto.Subject;
            f.Message = dto.Message;
            f.IsRead = dto.IsRead;
            f.TargetDepartment = dto.TargetDepartment;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id, string? targetDepartment)
        {
            var f = await ScopeToDepartment(_context.Feedbacks, targetDepartment)
                .FirstOrDefaultAsync(feedback => feedback.Id == id);
            if (f == null) return false;

            _context.Feedbacks.Remove(f);
            await _notificationService.DeleteBySourceAsync("feedback", $"/feedbacks/{id}");
            return true;
        }

        public async Task<bool> MarkAsRead(int id, string? targetDepartment)
        {
            var feedback = await ScopeToDepartment(_context.Feedbacks, targetDepartment)
                .FirstOrDefaultAsync(feedback => feedback.Id == id);
            if (feedback == null)
                return false;

            feedback.IsRead = true;
            feedback.ReadAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private static IQueryable<Feedback> ScopeToDepartment(
            IQueryable<Feedback> query,
            string? targetDepartment)
        {
            if (string.IsNullOrWhiteSpace(targetDepartment))
                return query;

            var normalizedDepartment = targetDepartment.Trim().ToLower();
            return query.Where(feedback =>
                feedback.TargetDepartment != null &&
                feedback.TargetDepartment.ToLower() == normalizedDepartment);
        }
    }
}
