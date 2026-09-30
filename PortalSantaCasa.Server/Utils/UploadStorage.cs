namespace PortalSantaCasa.Server.Utils;

public static class UploadStorage
{
    public static bool TryResolve(string? storedPath, string directory, out string fullPath)
    {
        fullPath = string.Empty;
        if (string.IsNullOrWhiteSpace(storedPath)) return false;
        try
        {
            var root = Path.GetFullPath(Path.Combine("Uploads", directory));
            var candidate = Path.GetFullPath(storedPath);
            var relative = Path.GetRelativePath(root, candidate);
            if (Path.IsPathRooted(relative) || relative == "." || relative == ".." ||
                relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal)) return false;

            // Reparse points and symlinks must not redirect reads or deletes outside uploads.
            var current = new FileInfo(candidate) as FileSystemInfo;
            while (current != null)
            {
                if (current.Exists && (current.Attributes & FileAttributes.ReparsePoint) != 0) return false;
                current = current is FileInfo file ? file.Directory : ((DirectoryInfo)current).Parent;
            }
            fullPath = candidate;
            return true;
        }
        catch (Exception exception) when (exception is ArgumentException or IOException or UnauthorizedAccessException or NotSupportedException)
        {
            return false;
        }
    }

    public static void DeleteIfExists(string? storedPath, string directory)
    {
        if (TryResolve(storedPath, directory, out var fullPath) && File.Exists(fullPath))
            File.Delete(fullPath);
    }
}
