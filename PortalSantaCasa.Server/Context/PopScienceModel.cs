using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Context;

public static class PopScienceModel
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PopScienceItem>(entity =>
        {
            entity.ToTable("pop_science_items");
            entity.Property(item => item.Title).HasMaxLength(160);
            entity.Property(item => item.Kind).HasMaxLength(12);
            entity.Property(item => item.Department).HasMaxLength(160);
            entity.Property(item => item.DepartmentKey).HasMaxLength(64);
            entity.Property(item => item.ManagementDepartmentKey).HasMaxLength(64);
            entity.HasIndex(item => item.DepartmentKey);
            entity.HasIndex(item => item.ManagementDepartmentKey);
        });

        modelBuilder.Entity<PopScienceVersion>(entity =>
        {
            entity.ToTable("pop_science_versions");
            entity.Property(version => version.Owner).HasMaxLength(120);
            entity.Property(version => version.ReleaseNote).HasMaxLength(1000);
            entity.Property(version => version.ReviewDate).HasConversion(PortalSantaCasaDbContext.SqlDateConverter).HasColumnType("date");
            entity.Property(version => version.AcknowledgementDeadline).HasConversion(PortalSantaCasaDbContext.SqlDateConverter).HasColumnType("date");
            entity.Property(version => version.PublishedByName).HasMaxLength(255);
            entity.Property(version => version.FileKey).HasMaxLength(32);
            entity.Property(version => version.FileName).HasMaxLength(255);
            entity.Property(version => version.Body).HasColumnType("text").HasMaxLength(12000);
            entity.HasIndex(version => new { version.ItemId, version.Number }).IsUnique();
            entity.HasOne(version => version.Item).WithMany().HasForeignKey(version => version.ItemId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PopScienceReceipt>(entity =>
        {
            entity.ToTable("pop_science_receipts");
            entity.HasKey(receipt => new { receipt.VersionId, receipt.UserId });
            entity.Property(receipt => receipt.Username).HasMaxLength(255);
            entity.HasIndex(receipt => receipt.UserId);
            // No user FK: removing a portal account must not erase the publication's audit history.
            entity.HasOne<PopScienceVersion>().WithMany(version => version.Receipts).HasForeignKey(receipt => receipt.VersionId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
