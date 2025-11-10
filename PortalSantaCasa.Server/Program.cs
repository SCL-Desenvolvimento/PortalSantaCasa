using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Utils;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

using System.Net.Http;

// Criar builder
var builder = WebApplication.CreateBuilder(args);

// Banco de dados
builder.Services.AddDbContext<PortalSantaCasaDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("PortalSclConnectionString"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("PortalSclConnectionString"))));

// Identity
builder.Services.AddScoped<IPasswordHasher<object>, PasswordHasher<object>>();

// JWT
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];

            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/hub/notifications"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});


// CORS (unificado)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "https://localhost:53598",
                "http://intranet.sp.santacasalorena.org.br")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Servi�os
builder.Services.AddScoped<IBirthdayService, BirthdayService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IFeedbackService, FeedbackService>();
builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<IBannerService, BannerService>();
builder.Services.AddScoped<IInternalAnnouncementService, InternalAnnouncementService>();

var matomoConfig = builder.Configuration.GetSection("Matomo");
builder.Services.AddHttpClient<MatomoTracker>().ConfigureHttpClient(c =>
{
    // URL base da API do Matomo
    c.BaseAddress = new Uri(matomoConfig["BaseUrl"]);

    // Opcional: tempo máximo de espera para requisições
    c.Timeout = TimeSpan.FromSeconds(10);

    // Opcional: user-agent padrão
    c.DefaultRequestHeaders.UserAgent.ParseAdd("SCLIntranet .NET Client");
});
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHostedService<DailyNotificationJob>();

builder.Services.AddHttpClient();

// SignalR
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();

// Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Autoriza��o
builder.Services.AddAuthorization();

// Build app
var app = builder.Build();

// Arquivos est�ticos padr�o
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "browser")),
    RequestPath = ""
});

// Uploads
var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/Uploads"
});

// CORS
app.UseCors();

// Swagger em Dev
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS, Auth
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Map Controllers
app.MapControllers();

// Map SignalR hub de notifica��es
app.MapHub<NotificationHub>("/hub/notifications");

// Fallback SPA
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "browser"))
});

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PortalSantaCasaDbContext>();
    dbContext.Database.Migrate();
}

app.Run();
