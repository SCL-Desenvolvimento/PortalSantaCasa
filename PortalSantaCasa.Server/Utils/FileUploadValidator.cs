using System.Text;

namespace PortalSantaCasa.Server.Utils;

public sealed class FileUploadValidationException : Exception
{
    public FileUploadValidationException(string message) : base(message)
    {
    }
}

public static class FileUploadValidator
{
    private const long ImageMaxBytes = 10L * 1024L * 1024L;
    private const long DocumentMaxBytes = 100L * 1024L * 1024L;
    private const long VideoMaxBytes = 500L * 1024L * 1024L;
    private const long ImportMaxBytes = 250L * 1024L * 1024L;

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp"
    };

    private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".zip"
    };

    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".webm", ".mov"
    };

    private static readonly HashSet<string> ImportExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".txt", ".csv"
    };

    private static readonly HashSet<string> ImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/gif", "image/webp"
    };

    private static readonly HashSet<string> DocumentContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
        "text/plain",
        "application/zip",
        "application/x-zip-compressed"
    };

    private static readonly HashSet<string> VideoContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "video/mp4", "video/webm", "video/quicktime"
    };

    private static readonly HashSet<string> ImportContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text/plain", "text/csv", "application/vnd.ms-excel"
    };

    public static void EnsureImage(IFormFile file) =>
        EnsureAllowed(file, ImageExtensions, ImageContentTypes, ImageMaxBytes, "imagem", HasImageSignature);

    public static void EnsureDocument(IFormFile file) =>
        EnsureAllowed(file, DocumentExtensions, DocumentContentTypes, DocumentMaxBytes, "documento", HasDocumentSignature);

    public static void EnsureVideo(IFormFile file) =>
        EnsureAllowed(file, VideoExtensions, VideoContentTypes, VideoMaxBytes, "video", HasVideoSignature);

    public static void EnsureImportFile(IFormFile file) =>
        EnsureAllowed(file, ImportExtensions, ImportContentTypes, ImportMaxBytes, "arquivo de importacao", HasImportSignature);

    public static void EnsureChatAttachment(IFormFile file)
    {
        var allowedExtensions = ImageExtensions
            .Concat(DocumentExtensions)
            .Concat(VideoExtensions)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var allowedContentTypes = ImageContentTypes
            .Concat(DocumentContentTypes)
            .Concat(VideoContentTypes)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        EnsureAllowed(file, allowedExtensions, allowedContentTypes, DocumentMaxBytes, "anexo", HasChatAttachmentSignature);
    }

    private static void EnsureAllowed(
        IFormFile file,
        ISet<string> allowedExtensions,
        ISet<string> allowedContentTypes,
        long maxBytes,
        string label,
        Func<string, byte[], bool> hasAllowedSignature)
    {
        if (file.Length <= 0)
            throw new FileUploadValidationException($"O {label} enviado esta vazio.");

        if (file.Length > maxBytes)
            throw new FileUploadValidationException($"O {label} excede o tamanho maximo permitido.");

        var extension = Path.GetExtension(file.FileName);

        if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
            throw new FileUploadValidationException($"Extensao de {label} nao permitida.");

        if (!IsAllowedContentType(file.ContentType, allowedContentTypes))
            throw new FileUploadValidationException($"Tipo de conteudo de {label} nao permitido.");

        var signature = ReadSignature(file);
        if (!hasAllowedSignature(extension, signature))
            throw new FileUploadValidationException($"Assinatura de {label} invalida.");
    }

    private static bool IsAllowedContentType(string? contentType, ISet<string> allowedContentTypes)
    {
        if (string.IsNullOrWhiteSpace(contentType) ||
            contentType.Equals("application/octet-stream", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return allowedContentTypes.Contains(contentType);
    }

    private static byte[] ReadSignature(IFormFile file)
    {
        var buffer = new byte[16];
        using var stream = file.OpenReadStream();
        var bytesRead = stream.Read(buffer, 0, buffer.Length);
        return buffer[..bytesRead];
    }

    private static bool HasImageSignature(string extension, byte[] signature)
    {
        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => StartsWith(signature, 0xFF, 0xD8, 0xFF),
            ".png" => StartsWith(signature, 0x89, 0x50, 0x4E, 0x47),
            ".gif" => StartsWithAscii(signature, "GIF87a") || StartsWithAscii(signature, "GIF89a"),
            ".webp" => signature.Length >= 12 &&
                       StartsWithAscii(signature, "RIFF") &&
                       Encoding.ASCII.GetString(signature, 8, 4) == "WEBP",
            _ => false
        };
    }

    private static bool HasDocumentSignature(string extension, byte[] signature)
    {
        return extension.ToLowerInvariant() switch
        {
            ".pdf" => StartsWithAscii(signature, "%PDF"),
            ".zip" or ".docx" or ".xlsx" => StartsWith(signature, 0x50, 0x4B),
            ".doc" or ".xls" => StartsWith(signature, 0xD0, 0xCF, 0x11, 0xE0),
            ".txt" or ".csv" => true,
            _ => false
        };
    }

    private static bool HasVideoSignature(string extension, byte[] signature)
    {
        return extension.ToLowerInvariant() switch
        {
            ".mp4" or ".mov" => signature.Length >= 8 &&
                                Encoding.ASCII.GetString(signature, 4, 4) == "ftyp",
            ".webm" => StartsWith(signature, 0x1A, 0x45, 0xDF, 0xA3),
            _ => false
        };
    }

    private static bool HasImportSignature(string extension, byte[] signature) => true;

    private static bool HasChatAttachmentSignature(string extension, byte[] signature) =>
        HasImageSignature(extension, signature) ||
        HasDocumentSignature(extension, signature) ||
        HasVideoSignature(extension, signature);

    private static bool StartsWithAscii(byte[] bytes, string value)
    {
        if (bytes.Length < value.Length)
            return false;

        return Encoding.ASCII.GetString(bytes, 0, value.Length) == value;
    }

    private static bool StartsWith(byte[] bytes, params byte[] expected)
    {
        if (bytes.Length < expected.Length)
            return false;

        for (var i = 0; i < expected.Length; i++)
        {
            if (bytes[i] != expected[i])
                return false;
        }

        return true;
    }
}
