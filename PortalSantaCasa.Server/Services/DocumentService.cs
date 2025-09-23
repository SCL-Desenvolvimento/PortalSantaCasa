using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class DocumentService : IDocumentService
    {
        private readonly PortalSantaCasaDbContext _context;
        private INotificationService _notificationService;

        public DocumentService(PortalSantaCasaDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<IEnumerable<DocumentResponseDto>> GetAllAsync()
        {
            return await _context.Documents
                .Select(b => new DocumentResponseDto
                {
                    Id = b.Id,
                    Name = b.Name,
                    FileName = b.FileName,
                    FileUrl = b.FileUrl,
                    ParentId = b.ParentId,
                    IsActive = b.IsActive,
                    CreatedAt = b.CreatedAt
                }).ToListAsync();
        }

        public async Task<DocumentResponseDto?> GetByIdAsync(int id)
        {
            var b = await _context.Documents.FindAsync(id);
            if (b == null) return null;

            return new DocumentResponseDto
            {
                Id = b.Id,
                Name = b.Name,
                FileName = b.FileName,
                FileUrl = b.FileUrl,
                ParentId = b.ParentId,
                IsActive = b.IsActive,
                CreatedAt = b.CreatedAt
            };
        }

        public async Task<DocumentResponseDto> CreateAsync(DocumentCreateDto dto)
        {
            var entity = new Document
            {
                Name = dto.Name,
                FileName = dto.File?.FileName,
                FileUrl = await ProcessarMidiasAsync(dto.File),
                ParentId = dto.ParentId,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Documents.Add(entity);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                type: "document",
                title: "Novo documento",
                message: entity.Name,
                link: $"/documents/{entity.Id}"
            );

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar");
        }

        public async Task<bool> UpdateAsync(int id, DocumentUpdateDto dto)
        {
            var b = await _context.Documents.FindAsync(id);
            if (b == null) return false;

            b.Name = dto.Name;
            b.ParentId = dto.ParentId;
            b.IsActive = dto.IsActive;

            if (!string.IsNullOrEmpty(b.FileUrl) && dto.File != null)
            {
                if (File.Exists(b.FileUrl))
                {
                    File.Delete(b.FileUrl);
                }
            }

            if (dto.File != null)
            {
                b.FileUrl = await ProcessarMidiasAsync(dto.File);
                b.FileName = dto.File.FileName;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var b = await _context.Documents.FindAsync(id);
            if (b == null) return false;

            if (File.Exists(b.FileUrl))
                File.Delete(b.FileUrl);

            _context.Documents.Remove(b);
            await _context.SaveChangesAsync();
            return true;
        }

        private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
        {
            if (midia == null) return null;

            // Define o caminho para a pasta "Documentos"
            var baseDirectory = Path.Combine("Uploads", "Documentos").Replace("\\", "/");

            // Verifica se a pasta "Documentos" existe, e a cria caso não exista
            if (!Directory.Exists(baseDirectory))
            {
                Directory.CreateDirectory(baseDirectory);
            }

            // Gera o caminho completo para o arquivo dentro da pasta "Documentos"
            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(midia.FileName)).Replace("\\", "/");

            // Salva o arquivo no caminho especificado
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await midia.CopyToAsync(stream);
            }

            return filePath;
        }
    }
}
