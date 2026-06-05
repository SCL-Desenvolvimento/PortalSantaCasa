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

    public static void EnsureImage(IFormFile file) =>
        EnsureAllowed(file, ImageExtensions, ImageMaxBytes, "imagem");

    public static void EnsureDocument(IFormFile file) =>
        EnsureAllowed(file, DocumentExtensions, DocumentMaxBytes, "documento");

    public static void EnsureVideo(IFormFile file) =>
        EnsureAllowed(file, VideoExtensions, VideoMaxBytes, "video");

    public static void EnsureImportFile(IFormFile file) =>
        EnsureAllowed(file, ImportExtensions, ImportMaxBytes, "arquivo de importacao");

    public static void EnsureChatAttachment(IFormFile file)
    {
        var allowedExtensions = ImageExtensions
            .Concat(DocumentExtensions)
            .Concat(VideoExtensions)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        EnsureAllowed(file, allowedExtensions, DocumentMaxBytes, "anexo");
    }

    private static void EnsureAllowed(
        IFormFile file,
        ISet<string> allowedExtensions,
        long maxBytes,
        string label)
    {
        if (file.Length <= 0)
            throw new FileUploadValidationException($"O {label} enviado esta vazio.");

        if (file.Length > maxBytes)
            throw new FileUploadValidationException($"O {label} excede o tamanho maximo permitido.");

        var extension = Path.GetExtension(file.FileName);

        if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
            throw new FileUploadValidationException($"Extensao de {label} nao permitida.");
    }
}
