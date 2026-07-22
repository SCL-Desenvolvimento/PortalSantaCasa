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
        public DbSet<ChatMessageFile> ChatMessageFiles { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<UserCourse> UserCourses { get; set; }
        public DbSet<Form> Forms { get; set; }
        public DbSet<PublicAccessLog> PublicAccessLogs { get; set; }
        public DbSet<Player> Players { get; set; }
        public DbSet<PointRule> PointRules { get; set; }
        public DbSet<PointEvent> PointEvents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Banner>().ToTable("banners");
            modelBuilder.Entity<Birthday>().ToTable("birthdays");
            modelBuilder.Entity<Chat>().ToTable("chats");
            modelBuilder.Entity<ChatMessage>().ToTable("chatmessages");
            modelBuilder.Entity<ChatMessageFile>().ToTable("chatmessagefiles");
            modelBuilder.Entity<ChatParticipant>().ToTable("chatparticipants");
            modelBuilder.Entity<Course>().ToTable("courses");
            modelBuilder.Entity<Document>().ToTable("documents");
            modelBuilder.Entity<Event>().ToTable("events");
            modelBuilder.Entity<Feedback>().ToTable("feedbacks");
            modelBuilder.Entity<Form>().ToTable("forms");
            modelBuilder.Entity<InternalAnnouncement>().ToTable("internalannouncements");
            modelBuilder.Entity<Menu>().ToTable("menus");
            modelBuilder.Entity<News>().ToTable("news");
            modelBuilder.Entity<Notification>().ToTable("notifications");
            modelBuilder.Entity<Player>().ToTable("player");
            modelBuilder.Entity<PointEvent>().ToTable("point_event");
            modelBuilder.Entity<PointRule>().ToTable("point_rule");
            modelBuilder.Entity<PublicAccessLog>().ToTable("publicaccesslogs");
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<UserCourse>().ToTable("usercourses");
            modelBuilder.Entity<UserNotification>().ToTable("usernotifications");

            modelBuilder.Entity<Player>(entity =>
            {
                entity.ToTable("player");
                entity.HasKey(p => p.RE);
                entity.Property(p => p.RE).HasColumnName("re");
                entity.Property(p => p.Name).HasColumnName("name");
                entity.Property(p => p.Sector).HasColumnName("sector");
                entity.Property(p => p.LastAccess).HasColumnName("last_access");
                entity.Property(p => p.CreatedAt).HasColumnName("created_at");
                entity.Property(p => p.UpdatedAt).HasColumnName("updated_at");
            });

            modelBuilder.Entity<PointRule>(entity =>
            {
                entity.ToTable("point_rule");
                entity.Property(r => r.Id).HasColumnName("id");
                entity.Property(r => r.EventType).HasColumnName("event_type");
                entity.Property(r => r.Difficulty).HasColumnName("difficulty");
                entity.Property(r => r.Points).HasColumnName("points");
                entity.Property(r => r.BonusPoints).HasColumnName("bonus_points");
                entity.Property(r => r.IsActive).HasColumnName("active");
                entity.Property(r => r.CreatedAt).HasColumnName("created_at");
                entity.Property(r => r.UpdatedAt).HasColumnName("updated_at");
                entity.HasIndex(r => new { r.EventType, r.Difficulty, r.IsActive });
            });

            modelBuilder.Entity<PointEvent>(entity =>
            {
                entity.ToTable("point_event");
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.RE).HasColumnName("re");
                entity.Property(e => e.EventType).HasColumnName("event_type");
                entity.Property(e => e.ReferenceId).HasColumnName("reference_id");
                entity.Property(e => e.ReferenceTitle).HasColumnName("reference_title");
                entity.Property(e => e.Difficulty).HasColumnName("difficulty");
                entity.Property(e => e.Points).HasColumnName("points");
                entity.Property(e => e.TimeSeconds).HasColumnName("time_seconds");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");

                entity.HasIndex(e => new { e.RE, e.EventType, e.ReferenceId });
                entity.HasOne<Player>()
                    .WithMany()
                    .HasForeignKey(e => e.RE)
                    .HasPrincipalKey(p => p.RE);
            });

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

            // COURSE x USERCOURSE (Many-to-Many via entidade explícita)
            modelBuilder.Entity<Course>()
                .Property(c => c.ContentType)
                .HasDefaultValue("video");

            modelBuilder.Entity<UserCourse>()
                .HasKey(uc => new { uc.UserId, uc.CourseId });

            modelBuilder.Entity<UserCourse>()
                .HasOne(uc => uc.User)
                .WithMany(u => u.AssignedCourses)
                .HasForeignKey(uc => uc.UserId)
                .OnDelete(DeleteBehavior.Cascade); // usuário deletado -> remove vinculação

            modelBuilder.Entity<UserCourse>()
                .HasOne(uc => uc.Course)
                .WithMany(c => c.AssignedUsers)
                .HasForeignKey(uc => uc.CourseId)
                .OnDelete(DeleteBehavior.Cascade); // curso deletado -> remove vinculação

        }
    }
}
