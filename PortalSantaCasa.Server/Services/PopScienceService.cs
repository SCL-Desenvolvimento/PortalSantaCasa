using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Security;
using PortalSantaCasa.Server.Utils;

namespace PortalSantaCasa.Server.Services;

public sealed record PopScienceActor(int Id, string Username, string Department, string Role)
{
    public bool IsAdmin => Role is "admin" or "superadmin";
    public bool CanPublish => IsAdmin || (Role == "editor" && Department.Length != 0);
    public bool IsQualityPublisher => CanPublish && Department.Equals("Qualidade", StringComparison.OrdinalIgnoreCase);
    public bool CanTargetAll => IsAdmin || IsQualityPublisher;
}

public sealed record PopScienceFile(string FullPath, string FileName);
public sealed class PopScienceConflictException() : Exception("Outra versão foi publicada. Atualize a página e tente novamente.");

public sealed class PopScienceService(PortalSantaCasaDbContext db)
{
    public const long MaxPdfBytes = 20L * 1024L * 1024L;
    private const string StorageDirectory = "Documentos";
    private const string StorageSubdirectory = "POPs";
    private static readonly TimeZoneInfo PortalTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    private DbSet<PopScienceVersion> Versions => db.Set<PopScienceVersion>();
    private DbSet<PopScienceReceipt> Receipts => db.Set<PopScienceReceipt>();

    public async Task<PopScienceActor?> FindActorAsync(int id, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Id == id && user.IsActive, ct);
        return user is null ? null : new(user.Id, user.Username, user.Department.Trim(), user.UserType.ToLowerInvariant());
    }

    public async Task<PopScienceModuleDto> ListAsync(PopScienceActor actor, CancellationToken ct = default)
    {
        var versions = await (
            from version in AccessibleVersions(actor)
            join receipt in Receipts.AsNoTracking().Where(receipt => receipt.UserId == actor.Id)
                on version.Id equals receipt.VersionId into ownReceipts
            from ownReceipt in ownReceipts.DefaultIfEmpty()
            orderby version.Item.Title, version.ItemId, version.Number descending
            select new
            {
                version.Item, version.Number, version.Owner, version.ReleaseNote, version.ReviewDate,
                version.AcknowledgementDeadline, version.PublishedAt, version.PublishedByName, version.FileName, version.Body,
                Assigned = ownReceipt != null, ConfirmedAt = ownReceipt == null ? null : ownReceipt.ConfirmedAt
            }).ToListAsync(ct);
        var items = versions.GroupBy(version => version.Item.Id).Select(group =>
        {
            var item = group.First().Item;
            var history = group.Select(version => new PopScienceVersionDto(version.Number, version.Owner, version.ReleaseNote,
                version.ReviewDate, version.AcknowledgementDeadline, version.PublishedAt, version.PublishedByName, version.FileName,
                version.Body, version.Assigned, version.ConfirmedAt)).ToArray();
            return new PopScienceItemDto(item.Id, item.Title, item.Kind, item.Department,
                CanManage(actor, item.ManagementDepartmentKey), CanTrack(actor, item.ManagementDepartmentKey, item.DepartmentKey), history);
        }).ToArray();
        var departments = actor.CanTargetAll
            ? (await db.Users.AsNoTracking().Where(user => user.IsActive).Select(user => user.Department).ToListAsync(ct))
                .Select(value => value.Trim()).Where(value => value.Length is > 0 and <= 160)
                .DistinctBy(DepartmentKey.From).OrderBy(value => value).ToArray()
            : actor.CanPublish ? [actor.Department] : [];
        return new PopScienceModuleDto(departments, items);
    }

    public async Task<PopSciencePublicationDto?> PublishAsync(PopScienceActor actor, int? itemId, PopSciencePublishDto dto, CancellationToken ct = default)
    {
        if (!actor.CanPublish) return null;
        PopScienceItem item;
        int nextNumber;
        if (itemId.HasValue)
        {
            var existing = await db.Set<PopScienceItem>().FirstOrDefaultAsync(value => value.Id == itemId.Value, ct);
            if (existing is null || !CanManage(actor, existing.ManagementDepartmentKey)) return null;
            item = existing;
            nextNumber = (await Versions.Where(version => version.ItemId == item.Id).MaxAsync(version => (int?)version.Number, ct) ?? 0) + 1;
        }
        else
        {
            var title = RequiredText(dto.Title, 160, "Informe o título.");
            var department = RequiredText(dto.Department, 160, "Informe o setor.");
            var departmentKey = DepartmentKey.From(department);
            if (!actor.CanTargetAll && departmentKey != DepartmentKey.From(actor.Department)) return null;
            var kind = dto.Kind?.Trim().ToLowerInvariant();
            if (kind is not ("pop" or "comunicado"))
                throw new FileUploadValidationException("Selecione POP ou Comunicado.");
            item = new PopScienceItem
            {
                Title = title, Kind = kind, Department = department, DepartmentKey = departmentKey,
                ManagementDepartmentKey = actor.IsQualityPublisher ? DepartmentKey.From(actor.Department) : departmentKey
            };
            nextNumber = 1;
        }

        var owner = RequiredText(dto.Owner, 120, "Informe o responsável.");
        var releaseNote = RequiredText(dto.ReleaseNote, 1000, "Descreva as alterações desta versão.");
        var reviewDate = dto.ReviewDate ?? throw new FileUploadValidationException("Informe a data de revisão.");
        var pdf = dto.File;
        var now = DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, PortalTimeZone).DateTime);
        if (dto.AcknowledgementDeadline is { } deadline && deadline < today)
            throw new FileUploadValidationException("O prazo de ciência não pode ser anterior a hoje.");
        string? fileKey = null, fileName = null, body = null;
        if (item.Kind == "pop")
        {
            if (pdf is null || pdf.Length > MaxPdfBytes || !string.Equals(Path.GetExtension(pdf.FileName), ".pdf", StringComparison.OrdinalIgnoreCase))
                throw new FileUploadValidationException("Envie um arquivo PDF de até 20 MB.");
            if (!string.IsNullOrWhiteSpace(dto.Body))
                throw new FileUploadValidationException("Envie o conteúdo do POP no arquivo PDF.");
            FileUploadValidator.EnsureDocument(pdf);
            fileKey = Guid.NewGuid().ToString("N");
            fileName = Path.GetFileName(pdf.FileName.Replace('\\', '/'));
            if (fileName.Length > 255) throw new FileUploadValidationException("O nome do arquivo é muito longo.");
        }
        else
        {
            if (pdf is not null) throw new FileUploadValidationException("Informe o conteúdo do comunicado no campo de texto.");
            body = RequiredText(dto.Body, 12000, "Informe o texto do comunicado (até 12.000 caracteres).");
        }

        List<PopScienceReceipt> recipients = [];
        if (!itemId.HasValue || dto.AcknowledgementDeadline.HasValue)
        {
            var activeUsers = await db.Users.AsNoTracking().Where(user => user.IsActive)
                .Select(user => new { user.Id, user.Username, user.Department }).ToListAsync(ct);
            var audience = activeUsers.Where(user => DepartmentKey.From(user.Department) == item.DepartmentKey).ToArray();
            if (audience.Length == 0)
                throw new FileUploadValidationException("O setor selecionado não tem contas ativas no portal.");
            if (dto.AcknowledgementDeadline.HasValue)
                recipients = audience.Select(user => new PopScienceReceipt { UserId = user.Id, Username = user.Username }).ToList();
        }

        var version = new PopScienceVersion
        {
            Item = item, Number = nextNumber, Owner = owner, ReleaseNote = releaseNote, ReviewDate = reviewDate,
            AcknowledgementDeadline = dto.AcknowledgementDeadline, PublishedAt = now, PublishedByUserId = actor.Id,
            PublishedByName = actor.Username, FileKey = fileKey, FileName = fileName, Body = body, Receipts = recipients
        };
        string? createdPath = null;
        try
        {
            if (pdf is not null && fileKey is not null)
            {
                var path = ResolvePath(fileKey) ?? throw new IOException("Pasta de arquivos de POPs indisponível.");
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                await using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, useAsync: true);
                createdPath = path;
                await pdf.CopyToAsync(stream, ct);
            }
            Versions.Add(version);
            await db.SaveChangesAsync(ct);
        }
        catch (Exception exception)
        {
            if (createdPath is not null) File.Delete(createdPath);
            if (exception is DbUpdateException && itemId.HasValue &&
                await Versions.AsNoTracking().AnyAsync(other => other.ItemId == itemId.Value && other.Number == nextNumber, ct))
                throw new PopScienceConflictException();
            throw;
        }
        return new PopSciencePublicationDto(item.Id, version.Number);
    }

    public async Task<DateTimeOffset?> ConfirmAsync(PopScienceActor actor, int itemId, int number, CancellationToken ct = default)
    {
        var versionId = await Versions.Where(version => version.ItemId == itemId && version.Number == number)
            .Select(version => (int?)version.Id).SingleOrDefaultAsync(ct);
        if (!versionId.HasValue) return null;

        var receipt = Receipts.Where(receipt => receipt.VersionId == versionId.Value && receipt.UserId == actor.Id);
        var now = DateTimeOffset.UtcNow;
        await receipt.Where(receipt => receipt.ConfirmedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(receipt => receipt.ConfirmedAt, now), ct);
        return await receipt.Select(receipt => receipt.ConfirmedAt).SingleOrDefaultAsync(ct);
    }

    public async Task<PopScienceReceiptDto[]?> GetTrackingAsync(PopScienceActor actor, int itemId, int number, CancellationToken ct = default)
    {
        if (!actor.CanPublish) return null;
        var version = await Versions.AsNoTracking().Where(version => version.ItemId == itemId && version.Number == number)
            .Select(version => new { version.Id, version.Item.DepartmentKey, version.Item.ManagementDepartmentKey }).SingleOrDefaultAsync(ct);
        if (version is null || !CanTrack(actor, version.ManagementDepartmentKey, version.DepartmentKey)) return null;
        return await Receipts.AsNoTracking().Where(receipt => receipt.VersionId == version.Id)
            .OrderBy(receipt => receipt.ConfirmedAt != null).ThenBy(receipt => receipt.Username).ThenBy(receipt => receipt.UserId)
            .Select(receipt => new PopScienceReceiptDto(receipt.UserId, receipt.Username, receipt.ConfirmedAt)).ToArrayAsync(ct);
    }

    public async Task<PopScienceFile?> GetContentAsync(PopScienceActor actor, int itemId, int number, CancellationToken ct = default)
    {
        var file = await AccessibleVersions(actor).Where(version => version.ItemId == itemId && version.Number == number)
            .Select(version => new { version.FileKey, version.FileName }).SingleOrDefaultAsync(ct);
        var path = file?.FileKey is { } fileKey ? ResolvePath(fileKey) : null;
        return file?.FileName is { } fileName && path is not null && File.Exists(path) ? new PopScienceFile(path, fileName) : null;
    }

    private IQueryable<PopScienceVersion> AccessibleVersions(PopScienceActor actor)
    {
        var key = DepartmentKey.From(actor.Department);
        return Versions.AsNoTracking().Where(version => actor.IsAdmin || version.Item.DepartmentKey == key ||
            (actor.CanPublish && version.Item.ManagementDepartmentKey == key) ||
            version.Receipts.Any(receipt => receipt.UserId == actor.Id));
    }

    private static bool CanManage(PopScienceActor actor, string departmentKey) =>
        actor.IsAdmin || (actor.CanPublish && departmentKey == DepartmentKey.From(actor.Department));

    private static bool CanTrack(PopScienceActor actor, string managingDepartment, string audienceDepartment) =>
        CanManage(actor, managingDepartment) || CanManage(actor, audienceDepartment);

    private static string RequiredText(string? value, int maxLength, string message) =>
        value?.Trim() is { Length: > 0 } clean && clean.Length <= maxLength ? clean : throw new FileUploadValidationException(message);

    private static string? ResolvePath(string fileKey) => Guid.TryParseExact(fileKey, "N", out var key) &&
        UploadStorage.TryResolve(Path.Combine("Uploads", StorageDirectory, StorageSubdirectory, $"{key:N}.pdf"), StorageDirectory, out var path)
            ? path : null;
}
