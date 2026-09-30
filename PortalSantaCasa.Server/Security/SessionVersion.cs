using PortalSantaCasa.Server.Entities;
using System.Security.Cryptography;
using System.Text;

namespace PortalSantaCasa.Server.Security;

public static class SessionVersion
{
    public static string For(User user) => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes($"{user.Id}:{user.Senha}:{user.UserType}:{user.Department}")));
}
