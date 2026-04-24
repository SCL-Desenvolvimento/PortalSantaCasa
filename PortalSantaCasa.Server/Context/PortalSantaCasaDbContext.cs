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
        public DbSet<Cid10> Cids { get; set; }
        public DbSet<Procedimento> Procedimentos { get; set; }
        public DbSet<CidProcedimento> CidProcedimentos { get; set; }
        public DbSet<TussDePara> TussDePara { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Banner>().ToTable("banners");
            modelBuilder.Entity<Birthday>().ToTable("birthdays");
            modelBuilder.Entity<Chat>().ToTable("chats");
            modelBuilder.Entity<ChatMessage>().ToTable("chatmessages");
            modelBuilder.Entity<ChatMessageFile>().ToTable("chatmessagefiles");
            modelBuilder.Entity<ChatParticipant>().ToTable("chatparticipants");
            modelBuilder.Entity<Cid10>().ToTable("cid10");
            modelBuilder.Entity<CidProcedimento>().ToTable("cidprocedimentos");
            modelBuilder.Entity<Course>().ToTable("courses");
            modelBuilder.Entity<Document>().ToTable("documents");
            modelBuilder.Entity<Event>().ToTable("events");
            modelBuilder.Entity<Feedback>().ToTable("feedbacks");
            modelBuilder.Entity<Form>().ToTable("forms");
            modelBuilder.Entity<InternalAnnouncement>().ToTable("internalannouncements");
            modelBuilder.Entity<Menu>().ToTable("menus");
            modelBuilder.Entity<News>().ToTable("news");
            modelBuilder.Entity<Notification>().ToTable("notifications");
            modelBuilder.Entity<Procedimento>().ToTable("procedimentos");
            modelBuilder.Entity<TussDePara>().ToTable("tussdepara");
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<UserCourse>().ToTable("usercourses");
            modelBuilder.Entity<UserNotification>().ToTable("usernotifications");

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

            //CID PROCEDIMENTO
            modelBuilder.Entity<CidProcedimento>()
                .HasKey(x => new { x.CidCodigo, x.ProcedimentoId });

            //TUSS DE PARA
            modelBuilder.Entity<TussDePara>()
                .HasKey(x => new { x.ProcedimentoSigtapId, x.ProcedimentoTussId });

        }
    }
}
