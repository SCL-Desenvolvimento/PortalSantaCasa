using System.Data;
using Microsoft.Data.SqlClient;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services;

public class EmployeeDirectoryUnavailableException : Exception
{
    public EmployeeDirectoryUnavailableException() : base("Não foi possível consultar o RH. Tente novamente mais tarde.") { }
}

public class RhEmployeeDirectory(IConfiguration configuration, ILogger<RhEmployeeDirectory> logger) : IEmployeeDirectory
{
    public async Task<EmployeeIdentityDto?> FindAsync(string chapa, CancellationToken cancellationToken = default)
    {
        chapa = chapa?.Trim() ?? "";
        if (chapa.Length is < 1 or > 50 || chapa.Any(c => c < '0' || c > '9'))
            throw new ArgumentException("Informe uma chapa válida, somente com números.");

        var connectionString = configuration.GetConnectionString("RhConnectionString");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new EmployeeDirectoryUnavailableException();

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandTimeout = 15;
            command.CommandText = """
                SELECT PF.CHAPA, PP.NOME, SE.DESCRICAO
                FROM PFUNC PF
                INNER JOIN PPESSOA PP ON PP.CODIGO = PF.CODPESSOA
                INNER JOIN PSECAO SE ON SE.CODIGO = PF.CODSECAO
                WHERE PF.CHAPA = @Chapa
                """;
            command.Parameters.Add("@Chapa", SqlDbType.VarChar, 50).Value = chapa;
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)) return null;
            if (reader.IsDBNull(0) || reader.IsDBNull(1) || reader.IsDBNull(2))
                throw new ArgumentException("O cadastro no RH está incompleto. Entre em contato com o suporte.");
            var employee = new EmployeeIdentityDto(reader.GetString(0).Trim(), reader.GetString(1).Trim(), reader.GetString(2).Trim());
            if (await reader.ReadAsync(cancellationToken))
                throw new ArgumentException("A chapa possui mais de um cadastro no RH. Entre em contato com o suporte.");
            if (string.IsNullOrWhiteSpace(employee.Name) || string.IsNullOrWhiteSpace(employee.Sector))
                throw new ArgumentException("O cadastro no RH está sem nome ou setor. Entre em contato com o suporte.");
            return employee;
        }
        catch (SqlException ex)
        {
            logger.LogWarning("Consulta ao RH falhou. Código SQL: {Number}", ex.Number);
            throw new EmployeeDirectoryUnavailableException();
        }
    }
}
