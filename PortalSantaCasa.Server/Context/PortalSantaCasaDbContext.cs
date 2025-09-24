using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using PortalSantaCasa.Server.Entities;
using System.Drawing;

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
        }
    }
}
