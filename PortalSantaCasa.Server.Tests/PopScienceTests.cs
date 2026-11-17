using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Utils;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class PopScienceTests
{
    [Fact]
    public async Task PublishFreezesRecipientsAndLaterVersionsDoNotReplaceEarlierReceipts()
    {
        await using var fixture = await Fixture.Open();
        var service = fixture.Service;
        var editor = (await service.FindActorAsync(1))!;
        var member = (await service.FindActorAsync(2))!;
        var outsider = (await service.FindActorAsync(3))!;

        var first = (await service.PublishAsync(editor, null, Version("primeira")))!;
        var original = (await service.GetContentAsync(member, first.ItemId, 1))!;
        fixture.Track(original.FullPath);
        Assert.Null(await service.GetContentAsync(outsider, first.ItemId, 1));
        Assert.Null(await service.GetTrackingAsync(member, first.ItemId, 1));
        Assert.Null(await service.ConfirmAsync(outsider, first.ItemId, 1));

        var user = (await fixture.Db.Users.FindAsync(2))!;
        user.Department = "Compras";
        await fixture.Db.SaveChangesAsync();
        var movedMember = (await service.FindActorAsync(2))!;
        Assert.NotNull(await service.GetContentAsync(movedMember, first.ItemId, 1));
        var confirmedAt = await service.ConfirmAsync(movedMember, first.ItemId, 1);
        Assert.NotNull(confirmedAt);
        Assert.Equal(confirmedAt, await service.ConfirmAsync(movedMember, first.ItemId, 1));

        var newMember = TestSupport.User(4);
        newMember.Department = "farmácia";
        fixture.Db.Users.Add(newMember);
        await fixture.Db.SaveChangesAsync();
        var newActor = (await service.FindActorAsync(4))!;
        var second = (await service.PublishAsync(editor, first.ItemId, Version("segunda")))!;
        var replacement = (await service.GetContentAsync(editor, first.ItemId, 2))!;
        fixture.Track(replacement.FullPath);

        Assert.Equal(first.ItemId, second.ItemId);
        Assert.Equal(2, second.Number);
        Assert.Contains("primeira", await File.ReadAllTextAsync(original.FullPath));
        Assert.Contains("segunda", await File.ReadAllTextAsync(replacement.FullPath));
        Assert.Null(await service.ConfirmAsync(newActor, first.ItemId, 1));
        Assert.Null(await service.GetContentAsync(movedMember, first.ItemId, 2));
        Assert.Null(await service.GetTrackingAsync(outsider, first.ItemId, 1));
        Assert.Equal(new[] { 2, 1 }, (await service.ListAsync(newActor)).Items.Single().Versions.Select(v => v.Number));
        Assert.Equal(confirmedAt, (await service.ListAsync(movedMember)).Items.Single().Versions.Single().ConfirmedAt);

        var firstTracking = (await service.GetTrackingAsync(editor, first.ItemId, 1))!;
        Assert.Equal(new[] { 1, 2 }, firstTracking.Select(r => r.UserId));
        Assert.Equal(confirmedAt, firstTracking.Single(r => r.UserId == 2).ConfirmedAt);
        var secondTracking = (await service.GetTrackingAsync(editor, first.ItemId, 2))!;
        Assert.Equal(new[] { 1, 4 }, secondTracking.Select(r => r.UserId));
        Assert.All(secondTracking, r => Assert.Null(r.ConfirmedAt));
    }

    [Fact]
    public async Task PublishRejectsCrossDepartmentEditorsAndNonPdfSnapshots()
    {
        await using var fixture = await Fixture.Open();
        var service = fixture.Service;
        var editor = (await service.FindActorAsync(1))!;
        var viewer = (await service.FindActorAsync(2))!;
        var crossDepartment = Version("cruzado");
        crossDepartment.Department = "Compras";

        Assert.Null(await service.PublishAsync(editor, null, crossDepartment));
        Assert.Null(await service.PublishAsync(viewer, null, Version("leitor")));
        var disguised = Version("inválido");
        disguised.File = Upload("<script>");
        await Assert.ThrowsAsync<FileUploadValidationException>(() => service.PublishAsync(editor, null, disguised));
        Assert.Empty((await service.ListAsync(editor)).Items);
    }

    [Fact]
    public async Task QualityCanPublishTextForAnotherSectorAndItsEditorCanTrackWithoutPublishing()
    {
        await using var fixture = await Fixture.Open();
        var service = fixture.Service;
        var quality = TestSupport.User(6, "editor"); quality.Department = "  Qualidade  ";
        fixture.Db.Users.Add(quality);
        await fixture.Db.SaveChangesAsync();
        var qualityActor = (await service.FindActorAsync(6))!;
        var audienceEditor = (await service.FindActorAsync(3))!;
        var firstDto = Communique("Orientação inicial");

        var first = (await service.PublishAsync(qualityActor, null, firstDto))!;
        Assert.Contains("Compras", (await service.ListAsync(qualityActor)).PublisherDepartments);
        Assert.True((await service.ListAsync(qualityActor)).Items.Single().CanManage);
        var attendeeItem = (await service.ListAsync(audienceEditor)).Items.Single();
        Assert.True(attendeeItem.CanTrack);
        Assert.False(attendeeItem.CanManage);
        Assert.Null(await service.PublishAsync(audienceEditor, first.ItemId, Communique("Não autorizado")));
        Assert.Null(await service.GetContentAsync(audienceEditor, first.ItemId, 1));
        Assert.NotNull(await service.ConfirmAsync(audienceEditor, first.ItemId, 1));
        Assert.Single((await service.GetTrackingAsync(audienceEditor, first.ItemId, 1))!);
        Assert.Null(await service.ConfirmAsync(qualityActor, first.ItemId, 1));

        await service.PublishAsync(qualityActor, first.ItemId, Communique("Nova orientação"));
        var history = (await service.ListAsync(audienceEditor)).Items.Single().Versions;
        Assert.Equal("Nova orientação", history[0].Body);
        Assert.Equal("Orientação inicial", history[1].Body);
        Assert.Null(history[0].ConfirmedAt);
        Assert.NotNull(history[1].ConfirmedAt);
    }

    [Fact]
    public async Task ConcurrentConfirmationsReturnTheSameTimestamp()
    {
        await using var fixture = await Fixture.Open();
        var service = fixture.Service;
        var item = (await service.PublishAsync((await service.FindActorAsync(1))!, null, Version("versão")))!;
        fixture.Track((await service.GetContentAsync((await service.FindActorAsync(1))!, item.ItemId, 1))!.FullPath);
        var actor = (await service.FindActorAsync(2))!;
        using var start = new Barrier(2);
        var confirmations = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => Task.Run(async () =>
        {
            await using var db = fixture.SiblingDb();
            Assert.True(start.SignalAndWait(TimeSpan.FromSeconds(10)));
            return await new PopScienceService(db).ConfirmAsync(actor, item.ItemId, 1);
        })));
        Assert.NotNull(confirmations[0]);
        Assert.Equal(confirmations[0], confirmations[1]);
    }

    private static PopSciencePublishDto Communique(string body) => new()
    {
        Title = "Orientação", Kind = "comunicado", Department = "Compras", Owner = "Qualidade", Body = body,
        ReviewDate = new DateOnly(2099, 2, 1), AcknowledgementDeadline = new DateOnly(2099, 1, 1), ReleaseNote = body
    };

    private static PopSciencePublishDto Version(string note) => new()
    {
        Title = "Higienização", Kind = "pop", Department = "Farmácia", Owner = "Qualidade",
        ReviewDate = new DateOnly(2099, 2, 1), AcknowledgementDeadline = new DateOnly(2099, 1, 1),
        ReleaseNote = note, File = Upload($"%PDF-1.7\n{note}")
    };

    private static IFormFile Upload(string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "procedimento.pdf")
        {
            Headers = new HeaderDictionary(), ContentType = "application/pdf"
        };
    }

    private sealed class Fixture(SqliteConnection connection, PortalSantaCasaDbContext db) : IAsyncDisposable
    {
        private readonly List<string> _files = [];
        public PortalSantaCasaDbContext Db { get; } = db;
        public PopScienceService Service { get; } = new(db);

        public static async Task<Fixture> Open()
        {
            var connection = new SqliteConnection($"Data Source=pop-science-{Guid.NewGuid():N};Mode=Memory;Cache=Shared");
            await connection.OpenAsync();
            var db = new PortalSantaCasaDbContext(new DbContextOptionsBuilder<PortalSantaCasaDbContext>()
                .UseSqlite(connection).Options);
            await db.Database.EnsureCreatedAsync();
            var editor = TestSupport.User(1, "editor"); editor.Department = "Farmácia";
            var member = TestSupport.User(2); member.Department = "  FARMÁCIA  ";
            var outsider = TestSupport.User(3, "editor"); outsider.Department = "Compras";
            var inactive = TestSupport.User(5); inactive.Department = "Farmácia"; inactive.IsActive = false;
            db.Users.AddRange(editor, member, outsider, inactive);
            await db.SaveChangesAsync();
            return new Fixture(connection, db);
        }

        public void Track(string path) => _files.Add(path);

        public PortalSantaCasaDbContext SiblingDb() => new(new DbContextOptionsBuilder<PortalSantaCasaDbContext>()
            .UseSqlite(connection.ConnectionString).Options);

        public async ValueTask DisposeAsync()
        {
            foreach (var path in _files) File.Delete(path);
            await Db.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}
