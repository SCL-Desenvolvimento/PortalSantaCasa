using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Utils;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<PortalSantaCasaDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("PortalSclConnectionString"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("PortalSclConnectionString"))));

builder.Services.AddScoped<IPasswordHasher<object>, PasswordHasher<object>>();

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
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 1024L * 1024L * 1024L;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1024L * 1024L * 1024L;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "https://localhost:53598",
                "http://intranet.santacasalorena.org.br",
                "https://intranet.santacasalorena.org.br",
                "http://docker-w3.sp.santacasalorena.org.br:8085")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(
            builder.Configuration["RabbitMQ:Host"],
            "/",
            h =>
            {
                h.Username(builder.Configuration["RabbitMQ:User"]!);
                h.Password(builder.Configuration["RabbitMQ:Password"]!);
            });

        cfg.ConfigureEndpoints(context);
    });
});

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
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<IFormsService, FormsService>();
builder.Services.AddScoped<IDiagnosticoService, DiagnosticoService>();
builder.Services.AddScoped<SigtapImportService>();
builder.Services.AddScoped<TussDeParaImportService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

builder.Services.AddHostedService<DailyNotificationJob>();
builder.Services.AddHttpClient();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseCors();

app.UseDefaultFiles();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "browser")),
    RequestPath = ""
});

var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");

if (!Directory.Exists(uploadsPath))
    Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/Uploads",
    ServeUnknownFileTypes = true,
    DefaultContentType = "application/octet-stream",

    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "https://localhost:53598");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, OPTIONS");
        ctx.Context.Response.Headers.Append("Accept-Ranges", "bytes");
    }
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

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