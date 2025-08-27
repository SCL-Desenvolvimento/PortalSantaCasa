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

        public FeedbackService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<FeedbackResponseDto>> GetAllAsync()
        {
            return await _context.Feedbacks
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

        public async Task<IEnumerable<FeedbackResponseDto>> GetAllPaginatedAsync(int page, int perPage)
        {
            return await _context.Feedbacks
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
                }).OrderByDescending(f => f.CreatedAt).ToListAsync();
        }

        public async Task<FeedbackResponseDto?> GetByIdAsync(int id)
        {
            var f = await _context.Feedbacks.FindAsync(id);
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
                CreatedAt = DateTime.UtcNow
            };

            _context.Feedbacks.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar feedback");
        }

        public async Task<bool> UpdateAsync(int id, FeedbackUpdateDto dto)
        {
            var f = await _context.Feedbacks.FindAsync(id);
            if (f == null) return false;

            f.Category = dto.Category;
            f.Subject = dto.Subject;
            f.Message = dto.Message;
            f.IsRead = dto.IsRead;
            f.TargetDepartment = dto.TargetDepartment;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var f = await _context.Feedbacks.FindAsync(id);
            if (f == null) return false;

            _context.Feedbacks.Remove(f);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task MarkAsRead(int id)
        {
            var feedback = await _context.Feedbacks.FindAsync(id);
            if (feedback == null)
                return;

            feedback.IsRead = true;
            feedback.ReadAt = DateTime.Now;
            await _context.SaveChangesAsync();
        }
    }
}
