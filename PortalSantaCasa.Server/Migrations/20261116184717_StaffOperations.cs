using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace PortalSantaCasa.Server.Migrations
{
    /// <inheritdoc />
    public partial class StaffOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AssignedAt",
                table: "usercourses",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CycleId",
                table: "usercourses",
                type: "char(36)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DueAt",
                table: "usercourses",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RenewalAt",
                table: "usercourses",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "WithdrawnAt",
                table: "usercourses",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeduplicationKey",
                table: "notifications",
                type: "varchar(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeadlineDays",
                table: "courses",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExplicitAssignedUserIds",
                table: "courses",
                type: "longtext",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReminderDaysBefore",
                table: "courses",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RenewalDays",
                table: "courses",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackName",
                table: "courses",
                type: "varchar(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "contingencies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    System = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false),
                    DepartmentsJson = table.Column<string>(type: "longtext", nullable: false),
                    Extension = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    Procedure = table.Column<string>(type: "varchar(6000)", maxLength: 6000, nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    NextUpdateAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    Revision = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contingencies", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "coursecompletions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CourseId = table.Column<int>(type: "int", nullable: false),
                    CycleId = table.Column<Guid>(type: "char(36)", nullable: false),
                    AssignedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true),
                    DueAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    TimeSpentSeconds = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_coursecompletions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_coursecompletions_usercourses_UserId_CourseId",
                        columns: x => new { x.UserId, x.CourseId },
                        principalTable: "usercourses",
                        principalColumns: new[] { "UserId", "CourseId" },
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "departmentcontacts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Title = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false),
                    Department = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    DepartmentKey = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    Extension = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    Hours = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false),
                    Keywords = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false),
                    ChannelUrl = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false),
                    SearchText = table.Column<string>(type: "varchar(700)", maxLength: 700, nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    Revision = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_departmentcontacts", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "internalrequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    RequesterId = table.Column<int>(type: "int", nullable: false),
                    RequesterName = table.Column<string>(type: "longtext", nullable: false),
                    ServiceCode = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    ServiceName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Department = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false),
                    Status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    DueDate = table.Column<DateTime>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_internalrequests", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "pop_science_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Title = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false),
                    Kind = table.Column<string>(type: "varchar(12)", maxLength: 12, nullable: false),
                    Department = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false),
                    DepartmentKey = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    ManagementDepartmentKey = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pop_science_items", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "contingencyupdates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    ContingencyId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    Message = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false),
                    Author = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contingencyupdates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_contingencyupdates_contingencies_ContingencyId",
                        column: x => x.ContingencyId,
                        principalTable: "contingencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "internalrequestevents",
                columns: table => new
                {
                    InternalRequestId = table.Column<int>(type: "int", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    OperationId = table.Column<Guid>(type: "char(36)", nullable: false),
                    ActorId = table.Column<int>(type: "int", nullable: false),
                    ActorName = table.Column<string>(type: "longtext", nullable: false),
                    Status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    DueDate = table.Column<DateTime>(type: "date", nullable: true),
                    Reply = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_internalrequestevents", x => new { x.InternalRequestId, x.Version });
                    table.ForeignKey(
                        name: "FK_internalrequestevents_internalrequests_InternalRequestId",
                        column: x => x.InternalRequestId,
                        principalTable: "internalrequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "pop_science_versions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Number = table.Column<int>(type: "int", nullable: false),
                    Owner = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    ReleaseNote = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false),
                    ReviewDate = table.Column<DateTime>(type: "date", nullable: false),
                    AcknowledgementDeadline = table.Column<DateTime>(type: "date", nullable: true),
                    PublishedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    PublishedByUserId = table.Column<int>(type: "int", nullable: false),
                    PublishedByName = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false),
                    FileKey = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: true),
                    FileName = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    Body = table.Column<string>(type: "text", maxLength: 12000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pop_science_versions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pop_science_versions_pop_science_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "pop_science_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "pop_science_receipts",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Username = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false),
                    ConfirmedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pop_science_receipts", x => new { x.VersionId, x.UserId });
                    table.ForeignKey(
                        name: "FK_pop_science_receipts_pop_science_versions_VersionId",
                        column: x => x.VersionId,
                        principalTable: "pop_science_versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_DeduplicationKey",
                table: "notifications",
                column: "DeduplicationKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contingencyupdates_ContingencyId",
                table: "contingencyupdates",
                column: "ContingencyId");

            migrationBuilder.CreateIndex(
                name: "IX_coursecompletions_UserId_CourseId_CycleId",
                table: "coursecompletions",
                columns: new[] { "UserId", "CourseId", "CycleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_departmentcontacts_DepartmentKey",
                table: "departmentcontacts",
                column: "DepartmentKey");

            migrationBuilder.CreateIndex(
                name: "IX_internalrequestevents_ActorId_OperationId",
                table: "internalrequestevents",
                columns: new[] { "ActorId", "OperationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_internalrequests_Department_Id",
                table: "internalrequests",
                columns: new[] { "Department", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_internalrequests_RequesterId_Id",
                table: "internalrequests",
                columns: new[] { "RequesterId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_pop_science_items_DepartmentKey",
                table: "pop_science_items",
                column: "DepartmentKey");

            migrationBuilder.CreateIndex(
                name: "IX_pop_science_items_ManagementDepartmentKey",
                table: "pop_science_items",
                column: "ManagementDepartmentKey");

            migrationBuilder.CreateIndex(
                name: "IX_pop_science_receipts_UserId",
                table: "pop_science_receipts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_pop_science_versions_ItemId_Number",
                table: "pop_science_versions",
                columns: new[] { "ItemId", "Number" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contingencyupdates");

            migrationBuilder.DropTable(
                name: "coursecompletions");

            migrationBuilder.DropTable(
                name: "departmentcontacts");

            migrationBuilder.DropTable(
                name: "internalrequestevents");

            migrationBuilder.DropTable(
                name: "pop_science_receipts");

            migrationBuilder.DropTable(
                name: "contingencies");

            migrationBuilder.DropTable(
                name: "internalrequests");

            migrationBuilder.DropTable(
                name: "pop_science_versions");

            migrationBuilder.DropTable(
                name: "pop_science_items");

            migrationBuilder.DropIndex(
                name: "IX_notifications_DeduplicationKey",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "AssignedAt",
                table: "usercourses");

            migrationBuilder.DropColumn(
                name: "CycleId",
                table: "usercourses");

            migrationBuilder.DropColumn(
                name: "DueAt",
                table: "usercourses");

            migrationBuilder.DropColumn(
                name: "RenewalAt",
                table: "usercourses");

            migrationBuilder.DropColumn(
                name: "WithdrawnAt",
                table: "usercourses");

            migrationBuilder.DropColumn(
                name: "DeduplicationKey",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "DeadlineDays",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "ExplicitAssignedUserIds",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "ReminderDaysBefore",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "RenewalDays",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "TrackName",
                table: "courses");
        }
    }
}
