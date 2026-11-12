using Microsoft.Data.SqlClient;
using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Services;

internal sealed record RhBirthdayEmployee(
    int PersonId, string Name, DateOnly BirthDate, string? Sex, string? Department, string? Position);

public class RhBirthdayDirectory(IConfiguration configuration, ILogger<RhBirthdayDirectory> logger)
{
    private static readonly TimeZoneInfo BrasiliaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");

    private const string ActiveEmployeesWithBirthday = """
        PF.DATADEMISSAO IS NULL AND PP.DTNASCIMENTO IS NOT NULL AND NULLIF(TRIM(PF.NOME), '') IS NOT NULL
        """;

    internal static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, BrasiliaTimeZone).DateTime);

    public async Task<IReadOnlyList<UpcomingBirthdayDto>> GetAsync(DateOnly today, int daysAhead, CancellationToken cancellationToken)
    {
        var employees = await QueryAsync($"""
            SELECT PF.CODPESSOA, PF.NOME, PP.SEXO, PP.DTNASCIMENTO AS dtNascimento,
                   CA.NOME AS CARGO, SE.DESCRICAO AS DEPARTAMENTO
            FROM PFUNC PF
            INNER JOIN PPESSOA PP ON PP.CODIGO = PF.CODPESSOA
            LEFT JOIN PFUNCAO FU ON FU.CODCOLIGADA = PF.CODCOLIGADA AND FU.CODIGO = PF.CODFUNCAO
            LEFT JOIN PCARGO CA ON CA.CODCOLIGADA = FU.CODCOLIGADA AND CA.CODIGO = FU.CARGO
            LEFT JOIN PSECAO SE ON SE.CODCOLIGADA = PF.CODCOLIGADA AND SE.CODIGO = PF.CODSECAO
            WHERE {ActiveEmployeesWithBirthday}
            ORDER BY PF.NOME, PF.CODCOLIGADA, PF.CHAPA
            """, async (command, token) =>
        {
            var result = new List<RhBirthdayEmployee>();
            await using var reader = await command.ExecuteReaderAsync(token);
            while (await reader.ReadAsync(token))
            {
                result.Add(new RhBirthdayEmployee(
                    reader.GetInt32(0),
                    reader.GetString(1).Trim(),
                    DateOnly.FromDateTime(reader.GetDateTime(3)),
                    ReadOptionalString(reader, 2),
                    ReadOptionalString(reader, 5),
                    ReadOptionalString(reader, 4)));
            }

            return result;
        }, cancellationToken);

        return BuildUpcomingBirthdays(employees, today, daysAhead);
    }

    public Task<int> CountAsync(CancellationToken cancellationToken = default) => QueryAsync($"""
        SELECT COUNT(DISTINCT PF.CODPESSOA)
        FROM PFUNC PF
        INNER JOIN PPESSOA PP ON PP.CODIGO = PF.CODPESSOA
        WHERE {ActiveEmployeesWithBirthday}
        """, async (command, token) => (int)(await command.ExecuteScalarAsync(token))!, cancellationToken);

    internal static IReadOnlyList<UpcomingBirthdayDto> BuildUpcomingBirthdays(
        IEnumerable<RhBirthdayEmployee> employees, DateOnly today, int daysAhead)
    {
        var endDate = today.AddDays(daysAhead);

        return employees
            .DistinctBy(employee => employee.PersonId)
            .Select(employee => (Employee: employee, Birthday: NextBirthday(employee.BirthDate, today)))
            .Where(item => item.Birthday <= endDate)
            .OrderBy(item => item.Birthday)
            .Select(item => new UpcomingBirthdayDto(item.Employee.Name, item.Birthday,
                item.Employee.Department, item.Employee.Position, item.Employee.Sex?.Trim().ToUpperInvariant() switch
                {
                    "F" => "assets/birthdays/parabens-feminino.jpg",
                    "M" => "assets/birthdays/parabens-masculino.jpg",
                    _ => null
                }, item.Birthday == today))
            .ToList();
    }

    private static DateOnly NextBirthday(DateOnly birthDate, DateOnly today)
    {
        // DateOnly.AddYears usa 28/02 para nascidos em 29/02 nos anos comuns.
        var years = today.Year - birthDate.Year;
        var birthday = birthDate.AddYears(years);
        return birthday < today ? birthDate.AddYears(years + 1) : birthday;
    }

    private static string? ReadOptionalString(SqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal).Trim();

    private async Task<T> QueryAsync<T>(string sql, Func<SqlCommand, CancellationToken, Task<T>> execute, CancellationToken cancellationToken)
    {
        var connectionString = configuration.GetConnectionString("RhConnectionString");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new EmployeeDirectoryUnavailableException();

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.CommandTimeout = 15;
            return await execute(command, cancellationToken);
        }
        catch (SqlException ex)
        {
            logger.LogWarning("Consulta de aniversariantes ao RH falhou. Código SQL: {Number}", ex.Number);
            throw new EmployeeDirectoryUnavailableException();
        }
    }
}
