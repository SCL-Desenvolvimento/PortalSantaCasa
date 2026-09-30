namespace PortalSantaCasa.Server.Utils;

public static class PaginationLimits
{
    public static void Normalize(ref int page, ref int perPage, int maximumSize = 500)
    {
        perPage = Math.Clamp(perPage, 1, maximumSize);
        page = Math.Clamp(page, 1, Math.Min(1_000_000, int.MaxValue / perPage));
    }
}
