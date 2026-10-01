using Microsoft.AspNetCore.Http;
using PortalSantaCasa.Server.Utils;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class UploadValidationTests
{
    [Theory]
    [InlineData("image.png", "image/png", "89504E470D0A1A0A")]
    [InlineData("image.jpg", "image/jpeg", "FFD8FF")]
    [InlineData("image.gif", "image/gif", "474946383961")]
    public void ImagesAcceptMatchingSignature(string filename, string contentType, string signature)
    {
        using var stream = new MemoryStream(Convert.FromHexString(signature));
        var file = File(stream, filename, contentType); FileUploadValidator.EnsureImage(file);
        Assert.Equal(Path.GetExtension(filename), FileUploadValidator.EnsureImageAndGetExtension(file));
    }

    [Theory]
    [InlineData("image.svg", "image/svg+xml", 10)]
    [InlineData("image.html", "text/html", 10)]
    [InlineData("image.png", "text/html", 10)]
    [InlineData("image.png", "image/png", 0)]
    [InlineData("image.png", "image/png", 10485761)]
    public void ImagesRejectExtensionMimeEmptyOrOversize(string filename, string mime, long length)
    {
        using var stream = new MemoryStream(Convert.FromHexString("89504E470D0A1A0A"));
        var file = new FormFile(stream, 0, length, "file", filename) { Headers = new HeaderDictionary(), ContentType = mime };
        Assert.Throws<FileUploadValidationException>(() => FileUploadValidator.EnsureImage(file));
    }

    [Theory]
    [InlineData("report.pdf", "application/pdf", "255044462D312E37")]
    [InlineData("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "504B0304")]
    [InlineData("report.xls", "application/vnd.ms-excel", "D0CF11E0A1B11AE1")]
    public void DocumentsAcceptMatchingSignatures(string filename, string mime, string signature)
    {
        using var stream = new MemoryStream(Convert.FromHexString(signature)); FileUploadValidator.EnsureDocument(File(stream, filename, mime));
    }

    [Fact]
    public void PdfAndZipRejectTruncatedOrWrongSignature()
    {
        using var stream = new MemoryStream(new byte[] { 0x50, 0x4B });
        Assert.Throws<FileUploadValidationException>(() => FileUploadValidator.EnsureDocument(File(stream, "report.zip", "application/zip")));
        Assert.Throws<FileUploadValidationException>(() => FileUploadValidator.EnsureDocument(File(stream, "report.pdf", "application/pdf")));
    }

    private static FormFile File(MemoryStream stream, string filename, string mime) => new(stream, 0, stream.Length, "file", filename) {
        Headers = new HeaderDictionary(), ContentType = mime
    };
}
