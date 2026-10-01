using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Authentication;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class AuthAndUserTests
{
    [Fact]
    public async Task LoginUpgradesOutdatedPasswordHashAndIssuesSessionForNewHash()
    {
        using var db = TestSupport.Database(); var user = TestSupport.User();
        user.Senha = new PasswordHasher<object>(Options.Create(new PasswordHasherOptions { IterationCount = 1000 })).HashPassword(null!, "Password123!");
        var originalHash = user.Senha; db.Users.Add(user); await db.SaveChangesAsync();
        var service = new AuthService(db, TestSupport.Configuration(), new PasswordHasher<object>());
        var result = await service.LoginAsync(new LoginDto { UserName = "user1", Password = "Password123!" });
        Assert.NotEqual(originalHash, user.Senha); Assert.False(result.PrecisaTrocarSenha);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        Assert.Equal(PortalSantaCasa.Server.Security.SessionVersion.For(user), jwt.Claims.Single(x => x.Type == "session_version").Value);
    }

    [Theory]
    [InlineData("MV", true)]
    [InlineData("Password123!", false)]
    public async Task LoginIssuesTokenWithCorrectPurposeAndLifetime(string password, bool changeRequired)
    {
        using var db = TestSupport.Database();
        db.Users.Add(TestSupport.User(password: password)); await db.SaveChangesAsync();
        var service = new AuthService(db, TestSupport.Configuration(), new PasswordHasher<object>());
        var result = await service.LoginAsync(new LoginDto { UserName = "user1", Password = password });
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        Assert.Equal(changeRequired, result.PrecisaTrocarSenha);
        Assert.Equal(changeRequired ? "password_change" : null, jwt.Claims.FirstOrDefault(x => x.Type == "purpose")?.Value);
        Assert.Equal("1", jwt.Claims.Single(x => x.Type == "id").Value);
        Assert.Contains(jwt.Claims, x => x.Type == "session_version");
        Assert.InRange((jwt.ValidTo - DateTime.UtcNow).TotalMinutes, changeRequired ? 14 : 119, changeRequired ? 16 : 121);
    }

    [Theory]
    [InlineData("missing", "Password123!", true)]
    [InlineData("user1", "wrong", true)]
    [InlineData("user1", "Password123!", false)]
    public async Task LoginFailureDoesNotRevealAccountExistence(string name, string password, bool active)
    {
        using var db = TestSupport.Database();
        var user = TestSupport.User(); user.IsActive = active;
        db.Users.Add(user); await db.SaveChangesAsync();
        var service = new AuthService(db, TestSupport.Configuration(), new PasswordHasher<object>());
        var error = await Assert.ThrowsAsync<AuthenticationException>(() => service.LoginAsync(new LoginDto { UserName = name, Password = password }));
        Assert.Equal("Usuário ou senha inválidos.", error.Message);
    }

    [Fact]
    public async Task InitialPasswordCanBeChangedOnlyOnce()
    {
        using var db = TestSupport.Database();
        db.Users.Add(TestSupport.User(password: "MV")); await db.SaveChangesAsync();
        var service = new AuthService(db, TestSupport.Configuration(), new PasswordHasher<object>());
        await service.ChangeInitialPasswordAsync(1, "Changed123!");
        await Assert.ThrowsAsync<ArgumentException>(() => service.ChangeInitialPasswordAsync(1, "Another123!"));
        Assert.False((await service.LoginAsync(new LoginDto { UserName = "user1", Password = "Changed123!" })).PrecisaTrocarSenha);
        await Assert.ThrowsAsync<AuthenticationException>(() => service.LoginAsync(new LoginDto { UserName = "user1", Password = "MV" }));
    }

    [Theory]
    [InlineData("")]
    [InlineData("short")]
    public async Task InitialPasswordRejectsWeakInputWithoutChangingHash(string password)
    {
        using var db = TestSupport.Database(); var user = TestSupport.User(password: "MV");
        db.Users.Add(user); await db.SaveChangesAsync(); var original = user.Senha;
        var service = new AuthService(db, TestSupport.Configuration(), new PasswordHasher<object>());
        await Assert.ThrowsAsync<ArgumentException>(() => service.ChangeInitialPasswordAsync(1, password));
        Assert.Equal(original, (await db.Users.AsNoTracking().SingleAsync()).Senha);
    }

    [Fact]
    public async Task RegistrationPreventsDuplicateNamesAndAdditionalSuperadminByRegularAdmin()
    {
        using var db = TestSupport.Database();
        var service = new AuthService(db, TestSupport.Configuration(), new PasswordHasher<object>());
        var dto = new UserCreateDto { Username = "root", UserType = "superadmin", Department = "TI", IsActive = true };
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(await service.RegisterAsync(dto, false));
        Assert.Equal("password_change", jwt.Claims.Single(x => x.Type == "purpose").Value);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RegisterAsync(dto, false));
        dto.UserType = "viewer";
        await Assert.ThrowsAsync<ArgumentException>(() => service.RegisterAsync(dto, true));
        Assert.Single(await db.Users.ToListAsync());
    }

    [Fact]
    public async Task ProfilePasswordChangeRequiresCurrentPasswordAndRejectsReuse()
    {
        using var db = TestSupport.Database(); db.Users.Add(TestSupport.User()); await db.SaveChangesAsync();
        var service = new UserService(db, new PasswordHasher<object>());
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ChangeOwnPasswordAsync(1, "wrong", "Changed123!"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ChangeOwnPasswordAsync(1, "Password123!", "Password123!"));
        Assert.True(await service.ChangeOwnPasswordAsync(1, "Password123!", "Changed123!"));
        var user = await db.Users.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordVerificationResult.Success, new PasswordHasher<object>().VerifyHashedPassword(null!, user.Senha, "Changed123!"));
    }
}
