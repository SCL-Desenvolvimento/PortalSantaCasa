using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services;

public static class AccessIdentity
{
    public static string NormalizeType(string? type) => type?.Trim().ToUpperInvariant() switch
    {
        "CLT" => "CLT",
        "PJ" => "PJ",
        _ => throw new ArgumentException("Selecione o vínculo CLT ou PJ.")
    };

    public static string NormalizeCpf(string? value)
    {
        var cpf = (value ?? "").Trim().Replace(".", "").Replace("-", "");
        if (cpf.Length != 11 || cpf.Any(c => c < '0' || c > '9') || cpf.All(c => c == cpf[0]))
            throw new ArgumentException("Informe um CPF válido.");
        for (var length = 9; length <= 10; length++)
        {
            var sum = 0;
            for (var i = 0; i < length; i++) sum += (cpf[i] - '0') * (length + 1 - i);
            var digit = sum % 11 < 2 ? 0 : 11 - sum % 11;
            if (cpf[length] - '0' != digit) throw new ArgumentException("Informe um CPF válido.");
        }
        return cpf;
    }

    public static Task<EmployeeIdentityDto?> FindAsync(string type, string identifier,
        IEmployeeDirectory employees, IPjDirectory? contractors, CancellationToken cancellationToken = default)
        => NormalizeType(type) == "CLT" ? employees.FindAsync(identifier, cancellationToken)
            : contractors?.FindAsync(NormalizeCpf(identifier), cancellationToken)
                ?? throw new EmployeeDirectoryUnavailableException("Não foi possível consultar o cadastro PJ no Oracle. Tente novamente mais tarde.");
}
