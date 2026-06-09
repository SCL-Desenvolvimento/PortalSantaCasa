using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;
using PortalSantaCasa.Realtime.Consumers;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Realtime.Services;
using PortalSantaCasa.Realtime.Utils;
using StackExchange.Redis;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Authentication;
using System.Text;

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
        "http://localhost:4200",
        "http://intranet.santacasalorena.org.br",
        "https://intranet.santacasalorena.org.br",
        "https://intranet.santacasalorena.org.br/realtime",
        "http://intranet.santacasalorena.org.br/realtime",
        "http://docker-w3.sp.santacasalorena.org.br:8085",
        "http://docker-w3.sp.santacasalorena.org.br:8086"
    };

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services
    .AddAuthentication(options =>
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

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    (
                        path.StartsWithSegments("/hub/chat") ||
                        path.StartsWithSegments("/hub/notification") ||
                        path.StartsWithSegments("/hub/presence")
                    ))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
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

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? throw new InvalidOperationException("ConnectionString Redis nao configurada.");

var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
redisOptions.AbortOnConnectFail = false;
redisOptions.ConnectRetry = 5;
redisOptions.KeepAlive = 30;

builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(redisOptions));

builder.Services.AddSingleton<PresenceService>();
builder.Services
    .AddSignalR()
    .AddStackExchangeRedis(options =>
    {
        options.Configuration = redisOptions;
    });

builder.Services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();

builder.Services.AddMassTransit(x =>
{
    x.SetKebabCaseEndpointNameFormatter();

    x.AddConsumer<ChatMessageConsumer>();
    x.AddConsumer<NotificationConsumer>();
    x.AddConsumer<ChatCreatedConsumer>();
    x.AddConsumer<ChatUpdatedConsumer>();
    x.AddConsumer<ChatRemovedConsumer>();
    x.AddConsumer<ChatReadConsumer>();
    x.AddConsumer<UnreadCountUpdatedConsumer>();

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

var app = builder.Build();

app.UseForwardedHeaders();
app.UseSecurityHeaders(app.Environment);
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// In production behind a reverse proxy, HTTPS redirection should be handled at the edge.
// app.UseHttpsRedirection();

app.UseWebSockets();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<ChatHub>("/hub/chat");
app.MapHub<NotificationHub>("/hub/notification");
app.MapHub<PresenceHub>("/hub/presence");

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
