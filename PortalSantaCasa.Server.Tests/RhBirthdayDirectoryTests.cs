using PortalSantaCasa.Server.Services;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class RhBirthdayDirectoryTests
{
    [Fact]
    public void UpcomingBirthdaysAreOrderedAcrossNewYearAndIncludeEachPersonOnce()
    {
        var employees = new RhBirthdayEmployee[]
        {
            new(1, "Janeiro", new DateOnly(1985, 1, 2), "F", "Enfermagem", "Enfermeira"),
            new(1, "Janeiro", new DateOnly(1985, 1, 2), "F", "Outro setor", null),
            new(2, "Dezembro", new DateOnly(1990, 12, 28), " M ", null, null),
            new(3, "Fora da janela", new DateOnly(1990, 2, 1), null, null, null)
        };

        var birthdays = RhBirthdayDirectory.BuildUpcomingBirthdays(employees, new DateOnly(2026, 12, 28), 30);

        Assert.Collection(birthdays, today =>
        {
            Assert.True(today.IsToday);
            Assert.Equal(new DateOnly(2026, 12, 28), today.BirthDate);
            Assert.Equal("assets/birthdays/parabens-masculino.jpg", today.PhotoUrl);
        }, january =>
        {
            Assert.False(january.IsToday);
            Assert.Equal(new DateOnly(2027, 1, 2), january.BirthDate);
            Assert.Equal("Enfermagem", january.Department);
            Assert.Equal("Enfermeira", january.Position);
            Assert.Equal("assets/birthdays/parabens-feminino.jpg", january.PhotoUrl);
        });
    }

    [Theory]
    [InlineData(2027, 28)]
    [InlineData(2028, 29)]
    public void LeapDayBirthdaysAppearOnceOnTheLastDayOfFebruary(int year, int day)
    {
        var employee = new RhBirthdayEmployee(1, "Pessoa", new DateOnly(2000, 2, 29), null, null, null);

        var birthday = Assert.Single(RhBirthdayDirectory.BuildUpcomingBirthdays([employee], new DateOnly(year, 2, day), 0));

        Assert.True(birthday.IsToday);
        Assert.Null(birthday.PhotoUrl);
        Assert.Empty(RhBirthdayDirectory.BuildUpcomingBirthdays([employee], new DateOnly(year, 3, 1), 30));
    }
}
