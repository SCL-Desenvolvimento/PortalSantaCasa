using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Utils;

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

        public async Task<IEnumerable<DocumentResponseDto>> GetAllAsync(string role, bool includeInactive = false)
        {
            var documents = await _context.Documents.AsNoTracking().ToListAsync();
            return documents
                .Where(document => (includeInactive || document.IsActive) &&
                    (IsDocumentManager(role) || HasAccess(document, documents, role)))
                .Select(ToResponse)
                .ToList();
        }

        public async Task<DocumentResponseDto?> GetByIdAsync(int id, string role, bool includeInactive = false)
        {
            var documents = await _context.Documents.AsNoTracking().ToListAsync();
            var document = documents.FirstOrDefault(document => document.Id == id);
            return document is not null &&
                (includeInactive || document.IsActive) &&
                (IsDocumentManager(role) || HasAccess(document, documents, role))
                ? ToResponse(document)
                : null;
        }

        public async Task<DocumentResponseDto> CreateAsync(DocumentCreateDto dto, string role)
        {
            var entity = new Document
            {
                Name = dto.Name,
                FileName = dto.File?.FileName,
                FileUrl = await ProcessarMidiasAsync(dto.File),
                AccessRoles = SerializeRoles(dto.AllowedRoles, role),
                ParentId = dto.ParentId,
                IsActive = dto.IsActive,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Documents.Add(entity);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(new NotificationCreateDto()
            {
                Type = "document",
                Title = "Novo documento",
                Message = entity.Name,
                Link = $"/documents/{entity.Id}"
            });

            return ToResponse(entity);
        }

        public async Task<bool> UpdateAsync(int id, DocumentUpdateDto dto, string role)
        {
            var b = await _context.Documents.FindAsync(id);
            if (b == null) return false;

            b.Name = dto.Name;
            b.ParentId = dto.ParentId;
            b.IsActive = dto.IsActive;
            b.AccessRoles = SerializeRoles(dto.AllowedRoles, role);

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

            FileUploadValidator.EnsureDocument(midia);

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

        public async Task<IEnumerable<DocumentResponseDto>> SearchAsync(string query, string role, bool includeInactive = false)
        {
            var normalizedQuery = query.Trim().ToLowerInvariant();
            var documents = await _context.Documents.AsNoTracking().ToListAsync();
            return documents
                .Where(document => (includeInactive || document.IsActive) &&
                    (IsDocumentManager(role) || HasAccess(document, documents, role)) &&
                    (document.Name.ToLower().Contains(normalizedQuery) ||
                     (document.FileName ?? string.Empty).ToLower().Contains(normalizedQuery)))
                .Select(ToResponse)
                .ToList();
        }

        public async Task<Document?> GetAccessibleFileAsync(int id, string role)
        {
            var documents = await _context.Documents.AsNoTracking().ToListAsync();
            var document = documents.FirstOrDefault(document => document.Id == id);
            return document is { FileUrl: not null } &&
                (document.IsActive || IsDocumentManager(role)) &&
                (IsDocumentManager(role) || HasAccess(document, documents, role))
                ? document
                : null;
        }

        private static DocumentResponseDto ToResponse(Document document) => new()
        {
            Id = document.Id,
            Name = document.Name,
            FileName = document.FileName,
            FileUrl = document.FileUrl is null ? null : $"/api/document/{document.Id}/content",
            ParentId = document.ParentId,
            IsActive = document.IsActive,
            CreatedAt = document.CreatedAt,
            AllowedRoles = DeserializeRoles(document.AccessRoles)
        };

        private static bool HasAccess(Document document, IReadOnlyCollection<Document> documents, string role)
        {
            if (role.Equals("superadmin", StringComparison.OrdinalIgnoreCase)) return true;

            var current = document;
            var visitedIds = new HashSet<int>();
            while (true)
            {
                if (!visitedIds.Add(current.Id) || !DeserializeRoles(current.AccessRoles).Contains(role, StringComparer.OrdinalIgnoreCase))
                    return false;

                if (current.ParentId is null) return true;
                current = documents.FirstOrDefault(item => item.Id == current.ParentId);
                if (current is null) return false;
            }
        }

        private static string SerializeRoles(IEnumerable<string>? roles, string currentRole)
        {
            var validRoles = new[] { "viewer", "editor", "admin" };
            var allowedRoles = (roles ?? [])
                .Where(role => validRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
                .Select(role => role.ToLowerInvariant())
                .Distinct()
                .ToList();

            if (validRoles.Contains(currentRole, StringComparer.OrdinalIgnoreCase))
                allowedRoles.Add(currentRole.ToLowerInvariant());

            allowedRoles = allowedRoles.Distinct().ToList();
            return string.Join(',', allowedRoles);
        }

        private static List<string> DeserializeRoles(string? roles)
        {
            var validRoles = new[] { "viewer", "editor", "admin" };
            var parsedRoles = (roles ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(role => validRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
                .Select(role => role.ToLowerInvariant())
                .Distinct()
                .ToList();

            // Valores legados como "System.Collections.Generic.List`1[System.String]"
            // não representam uma lista válida. Retornamos vazio para não conceder acesso
            // indevidamente e para que o administrador possa selecioná-los novamente.
            return parsedRoles;
        }

        private static bool IsDocumentManager(string role) =>
            role.Equals("admin", StringComparison.OrdinalIgnoreCase) || role.Equals("superadmin", StringComparison.OrdinalIgnoreCase);

    }
}
