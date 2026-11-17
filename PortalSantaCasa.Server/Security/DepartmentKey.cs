using System.Security.Cryptography;
using System.Text;

namespace PortalSantaCasa.Server.Security;

internal static class DepartmentKey
{
    // The database collation can consider different department names equal.
    internal static string From(string value) => Convert.ToHexString(
        SHA256.HashData(Encoding.UTF8.GetBytes(value.Trim().Normalize().ToUpperInvariant())));
}
