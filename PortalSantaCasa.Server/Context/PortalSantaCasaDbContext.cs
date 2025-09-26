using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using PortalSantaCasa.Server.Converters;
using PortalSantaCasa.Server.Entities;
using System.Drawing;
using System.Text.Json;

namespace PortalSantaCasa.Server.Context
{
    public class PortalSantaCasaDbContext : DbContext
    {
        public PortalSantaCasaDbContext(DbContextOptions options) : base(options)
        {
        }
        public DbSet<Birthday> Birthdays { get; set; }
        public DbSet<Document> Documents { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<Feedback> Feedbacks { get; set; }
        public DbSet<Menu> Menus { get; set; }
        public DbSet<News> News { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Banner> Banners { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<UserNotification> UserNotifications { get; set; }
        public DbSet<PostEntity> Posts { get; set; }
        public DbSet<AuthToken> AuthTokens { get; set; }
        public DbSet<PostPublishLog> PostPublishLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // USER - Username único
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasMany(u => u.News)
                .WithOne(n => n.User)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasMany(u => u.Events)
                .WithOne(e => e.User)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // NEWS
            modelBuilder.Entity<News>()
                .HasMany(n => n.Banners)
                .WithOne(b => b.News)
                .HasForeignKey(b => b.NewsId)
                .OnDelete(DeleteBehavior.SetNull);

            // EVENT
            modelBuilder.Entity<Event>()
                .HasOne(e => e.User)
                .WithMany(u => u.Events)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // BANNER
            modelBuilder.Entity<Banner>()
                .HasOne(b => b.News)
                .WithMany(n => n.Banners)
                .HasForeignKey(b => b.NewsId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);




            // Configurações para PostEntity
            modelBuilder.Entity<PostEntity>(entity =>
            {
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.ScheduledAtUtc);
                entity.HasIndex(e => e.CreatedAtUtc);
                entity.HasIndex(e => e.CreatedByUserId);
                entity.Property(e => e.Providers)
                    .HasConversion<StringArrayToJsonConverter>();
                entity.Property(e => e.Metadata)
                    .HasConversion<DictionaryToJsonConverter>();
            });

            // Configurações para AuthToken
            modelBuilder.Entity<AuthToken>(entity =>
            {
                entity.HasIndex(e => new { e.Provider, e.AccountId }).IsUnique();
                entity.HasIndex(e => e.ExpiresAtUtc);
                entity.HasIndex(e => e.IsActive);

                entity.Property(e => e.Scopes)
                      .HasConversion<StringArrayToJsonConverter>();

                entity.Property(e => e.ProviderMetadata)
                      .HasConversion<DictionaryToJsonConverter>();
            });

            // Configurações para PostPublishLog
            modelBuilder.Entity<PostPublishLog>(entity =>
            {
                entity.HasIndex(e => e.PostId);
                entity.HasIndex(e => e.Provider);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.CreatedAtUtc);
                entity.HasOne(e => e.Post)
                    .WithMany(p => p.PublishLogs)
                    .HasForeignKey(e => e.PostId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Seed data para desenvolvimento
            modelBuilder.Entity<AuthToken>().HasData(
                new AuthToken
                {
                    Id = 1,
                    Provider = "facebook",
                    AccountId = "sample_page_id",
                    AccountName = "Sample Facebook Page",
                    AccessToken = "sample_access_token",
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(60),
                    Scopes = ["pages_manage_posts", "pages_read_engagement"],
                    IsActive = false
                }
            );
        }
    }
}
