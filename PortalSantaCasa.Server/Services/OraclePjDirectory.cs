using Oracle.ManagedDataAccess.Client;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services;

public class OraclePjDirectory(IConfiguration configuration, ILogger<OraclePjDirectory> logger) : IPjDirectory
{
    public async Task<EmployeeIdentityDto?> FindAsync(string cpf, CancellationToken cancellationToken = default)
    {
        cpf = AccessIdentity.NormalizeCpf(cpf);
        var connectionString = configuration.GetConnectionString("OraclePjConnectionString");
        var query = configuration["OraclePj:LookupSql"];
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(query))
            throw Unavailable();

        OracleConnectionStringBuilder connectionOptions;
        try { connectionOptions = new OracleConnectionStringBuilder(connectionString); }
        catch (ArgumentException) { throw Unavailable(); }
        if (string.IsNullOrWhiteSpace(connectionOptions.DataSource) ||
            string.IsNullOrWhiteSpace(connectionOptions.UserID) || string.IsNullOrWhiteSpace(connectionOptions.Password))
            throw Unavailable();
        try
        {
            await using var connection = new OracleConnection(connectionOptions.ConnectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.BindByName = true;
            command.CommandTimeout = 15;
            command.CommandText = query;
            command.Parameters.Add("cpf", OracleDbType.Varchar2, 11).Value = cpf;
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)) return null;
            var nameIndex = reader.GetOrdinal("NOME");
            var sectorIndex = reader.GetOrdinal("SETOR");
            var name = reader.IsDBNull(nameIndex) ? "" : reader.GetString(nameIndex).Trim();
            var sector = reader.IsDBNull(sectorIndex) ? "" : reader.GetString(sectorIndex).Trim();
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(sector))
                throw new ArgumentException("O cadastro PJ está sem nome ou setor. Entre em contato com o suporte.");
            if (await reader.ReadAsync(cancellationToken))
                throw new ArgumentException("O CPF possui mais de um cadastro PJ. Entre em contato com o suporte.");
            return new EmployeeIdentityDto(cpf, name, sector);
        }
        catch (OracleException ex)
        {
            logger.LogWarning("Consulta ao cadastro PJ falhou. Código Oracle: {Number}", ex.Number);
            throw Unavailable();
        }
        catch (Exception ex) when (ex is InvalidOperationException or IndexOutOfRangeException or InvalidCastException)
        {
            logger.LogWarning("Configuração da consulta PJ inválida: {ExceptionType}", ex.GetType().Name);
            throw Unavailable();
        }
    }

    private static EmployeeDirectoryUnavailableException Unavailable()
        => new("Não foi possível consultar o cadastro PJ no Oracle. Tente novamente mais tarde.");
}
