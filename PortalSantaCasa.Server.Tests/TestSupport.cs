using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using System.Reflection;

namespace PortalSantaCasa.Server.Tests;

internal static class TestSupport
{
    public static PortalSantaCasaDbContext Database() => new(new DbContextOptionsBuilder<PortalSantaCasaDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public static IConfiguration Configuration() => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
        ["Jwt:Key"] = "test-only-key-with-more-than-thirty-two-bytes",
        ["Jwt:Issuer"] = "test-issuer", ["Jwt:Audience"] = "test-audience"
    }).Build();

    public static User User(int id = 1, string role = "viewer", string password = "Password123!") => new() {
        Id = id, Username = "user" + id, Senha = new PasswordHasher<object>().HashPassword(null!, password),
        UserType = role, Department = "TI", PhotoUrl = "Uploads/Usuarios/default-user.png", IsActive = true
    };

    public static T Stub<T>() where T : class => DispatchProxy.Create<T, AsyncStub>();
}

// Only external side effects are stubbed. Database queries and business rules run normally.
public class AsyncStub : DispatchProxy
{
    protected override object? Invoke(MethodInfo? method, object?[]? args)
    {
        var type = method!.ReturnType;
        if (type == typeof(Task)) return Task.CompletedTask;
        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Task<>))
        {
            var resultType = type.GetGenericArguments()[0];
            var result = resultType.IsInterface ? null : Activator.CreateInstance(resultType);
            return typeof(Task).GetMethod(nameof(Task.FromResult))!.MakeGenericMethod(resultType).Invoke(null, [result]);
        }
        throw new NotSupportedException(method.Name);
    }
}
