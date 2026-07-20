using MassTransit;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Security;
using PortalSantaCasa.Server.Utils;
using System.IO.Compression;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Authentication;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key nao configurado.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer nao configurado.");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience nao configurado.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key precisa ter pelo menos 32 bytes.");

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?? new[]
    {
        "https://localhost:53598",
        "http://intranet.santacasalorena.org.br",
        "https://intranet.santacasalorena.org.br",
        "http://homologacao-intranet.santacasalorena.org.br",
        "https://homologacao-intranet.santacasalorena.org.br",
        "https://intranet.santacasalorena.org.br/realtime",
        "http://homologacao-intranet.santacasalorena.org.br/realtime",
        "https://homologacao-intranet.santacasalorena.org.br/realtime",
        "http://intranet.santacasalorena.org.br/realtime",
        "http://docker-w3.sp.santacasalorena.org.br:8085",
        "http://docker-w3.sp.santacasalorena.org.br:8086"
    };

builder.Services.AddDbContextPool<PortalSantaCasaDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("PortalSclConnectionString"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("PortalSclConnectionString"))));

builder.Services.AddScoped<IPasswordHasher<object>, PasswordHasher<object>>();
builder.Services.AddTransient<IClaimsTransformation, SuperAdminClaimsTransformation>();

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        RequireExpirationTime = true,
        ClockSkew = TimeSpan.FromMinutes(1),
        NameClaimType = "username",
        RoleClaimType = "role",
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = builder.Configuration.GetValue<long?>("Upload:MultipartBodyLengthLimitBytes")
        ?? 600L * 1024L * 1024L;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = builder.Configuration.GetValue<long?>("Upload:MaxRequestBodySizeBytes")
        ?? 600L * 1024L * 1024L;
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var partitionKey = context.User.Identity?.Name
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = 240,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(1)
        });
    });

    options.AddFixedWindowLimiter("auth", limiter =>
    {
        limiter.AutoReplenishment = true;
        limiter.PermitLimit = 10;
        limiter.QueueLimit = 0;
        limiter.Window = TimeSpan.FromMinutes(1);
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMQ:Host"]
            ?? throw new InvalidOperationException("RabbitMQ:Host nao configurado.");
        var rabbitUser = builder.Configuration["RabbitMQ:User"]
            ?? throw new InvalidOperationException("RabbitMQ:User nao configurado.");
        var rabbitPassword = builder.Configuration["RabbitMQ:Password"]
            ?? throw new InvalidOperationException("RabbitMQ:Password nao configurado.");
        var rabbitVirtualHost = builder.Configuration["RabbitMQ:VirtualHost"] ?? "/";

        cfg.Host(
            rabbitHost,
            rabbitVirtualHost,
            h =>
            {
                h.Username(rabbitUser);
                h.Password(rabbitPassword);

                if (builder.Configuration.GetValue<bool>("RabbitMQ:UseSsl"))
                {
                    h.UseSsl(s =>
                    {
                        s.Protocol = SslProtocols.Tls12;
                    });
                }
            });

        cfg.UseMessageRetry(retry =>
        {
            retry.Exponential(
                retryLimit: 5,
                minInterval: TimeSpan.FromMilliseconds(200),
                maxInterval: TimeSpan.FromSeconds(20),
                intervalDelta: TimeSpan.FromMilliseconds(200));
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
builder.Services.AddScoped<IPublicSearchService, PublicSearchService>();

builder.Services.AddHostedService<DailyNotificationJob>();
builder.Services.AddHttpClient();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseResponseCompression();
app.UseSecurityHeaders(app.Environment);
app.UseCors();

app.UseDefaultFiles();

// Arquivos de documentos são entregues somente pelo endpoint autorizado /api/document/{id}/content.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/Uploads/Documentos", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});

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
    ServeUnknownFileTypes = false,

    OnPrepareResponse = ctx =>
    {
        var origin = ctx.Context.Request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origin) && allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
            ctx.Context.Response.Headers.Append("Vary", "Origin");
        }

        ctx.Context.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, OPTIONS");
        ctx.Context.Response.Headers.Append("Accept-Ranges", "bytes");
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=604800,immutable");
    }
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (FileUploadValidationException ex)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = ex.Message });
    }
});

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

app.MapFallbackToFile("index.html", new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "browser"))
});

if (app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<PortalSantaCasaDbContext>();
    dbContext.Database.Migrate();
}

app.Run();

static class SecurityHeaderExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app, IWebHostEnvironment environment)
    {
        return app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;

            headers.TryAdd("X-Content-Type-Options", "nosniff");
            headers.TryAdd("X-Frame-Options", "DENY");
            headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
            headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            headers.TryAdd("X-Permitted-Cross-Domain-Policies", "none");

            if (!environment.IsDevelopment())
            {
                headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            }

            await next();
        });
    }
}
