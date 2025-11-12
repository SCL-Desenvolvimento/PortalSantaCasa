using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Converters;
using PortalSantaCasa.Server.Entities;

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
        public DbSet<InternalAnnouncement> InternalAnnouncements { get; set; }
        public DbSet<Chat> Chats { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatParticipant> ChatParticipants { get; set; }

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

            // CHAT PARTICIPANT — chave composta (ChatId + UserId)
            modelBuilder.Entity<ChatParticipant>()
                .HasKey(cp => new { cp.ChatId, cp.UserId });

            modelBuilder.Entity<ChatParticipant>()
                .HasOne(cp => cp.Chat)
                .WithMany(c => c.Participants)
                .HasForeignKey(cp => cp.ChatId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatParticipant>()
                .HasOne(cp => cp.User)
                .WithMany() // se quiser adicionar ICollection<ChatParticipant> em User, pode ajustar aqui
                .HasForeignKey(cp => cp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CHAT MESSAGE
            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Chat)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ChatId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

        }
    }
}
