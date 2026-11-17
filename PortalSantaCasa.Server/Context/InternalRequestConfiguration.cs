using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Context;

internal sealed class InternalRequestConfiguration : IEntityTypeConfiguration<InternalRequest>
{
    public void Configure(EntityTypeBuilder<InternalRequest> entity)
    {
        entity.ToTable("internalrequests");
        entity.Property(request => request.ServiceCode).HasMaxLength(64);
        entity.Property(request => request.ServiceName).HasMaxLength(128);
        entity.Property(request => request.Department).HasMaxLength(128);
        entity.Property(request => request.Status).HasMaxLength(24);
        entity.Property(request => request.DueDate).HasConversion(PortalSantaCasaDbContext.SqlDateConverter).HasColumnType("date");
        entity.Property(request => request.Version).IsConcurrencyToken();
        entity.HasIndex(request => new { request.RequesterId, request.Id });
        entity.HasIndex(request => new { request.Department, request.Id });
        entity.HasMany(request => request.History)
            .WithOne()
            .HasForeignKey(item => item.InternalRequestId);
    }
}

internal sealed class InternalRequestEventConfiguration : IEntityTypeConfiguration<InternalRequestEvent>
{
    public void Configure(EntityTypeBuilder<InternalRequestEvent> entity)
    {
        entity.ToTable("internalrequestevents");
        entity.HasKey(item => new { item.InternalRequestId, item.Version });
        entity.Property(item => item.Status).HasMaxLength(24);
        entity.Property(item => item.DueDate).HasConversion(PortalSantaCasaDbContext.SqlDateConverter).HasColumnType("date");
        entity.Property(item => item.Reply).HasMaxLength(1000);
        entity.HasIndex(item => new { item.ActorId, item.OperationId }).IsUnique();
    }
}
