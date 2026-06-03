using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PortalSantaCasa.Realtime.Consumers;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Realtime.Services;
using StackExchange.Redis;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Utils;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "https://localhost:53598",
                "http://localhost:4200",
                "http://intranet.santacasalorena.org.br",
                "https://intranet.santacasalorena.org.br",
                "https://intranet.santacasalorena.org.br/realtime",
                "http://intranet.santacasalorena.org.br/realtime",
                "http://docker-w3.sp.santacasalorena.org.br:8085",
                "http://docker-w3.sp.santacasalorena.org.br:8086")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? throw new InvalidOperationException("ConnectionString Redis não configurada.");

builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(redisConnectionString));

builder.Services.AddSingleton<PresenceService>();
builder.Services
    .AddSignalR()
    .AddStackExchangeRedis(redisConnectionString);

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

var app = builder.Build();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Em produção atrás de proxy reverso, geralmente deixe comentado.
// app.UseHttpsRedirection();

app.UseWebSockets();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<ChatHub>("/hub/chat");
app.MapHub<NotificationHub>("/hub/notification");
app.MapHub<PresenceHub>("/hub/presence");

app.Run();