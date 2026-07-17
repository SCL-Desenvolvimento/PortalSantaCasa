using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly IDocumentService _service;

    public DocumentController(IDocumentService service) => _service = service;

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync(GetCurrentRole(), IsDocumentManager()));

    [Authorize]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id, GetCurrentRole(), IsDocumentManager());
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromForm] DocumentCreateDto dto)
    {
        var result = await _service.CreateAsync(dto, GetCurrentRole());
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromForm] DocumentUpdateDto dto)
    {
        var updated = await _service.UpdateAsync(id, dto, GetCurrentRole());
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin,Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpGet("{id}/content")]
    public async Task<IActionResult> GetContent(int id)
    {
        var document = await _service.GetAccessibleFileAsync(id, GetCurrentRole());
        if (document?.FileUrl is null) return NotFound();

        var filePath = Path.GetFullPath(document.FileUrl);
        if (!System.IO.File.Exists(filePath)) return NotFound();

        var contentTypeProvider = new FileExtensionContentTypeProvider();
        if (!contentTypeProvider.TryGetContentType(document.FileName, out var contentType))
            contentType = "application/octet-stream";

        return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
    }

    [Authorize]
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q) =>
        Ok(await _service.SearchAsync(q, GetCurrentRole(), IsDocumentManager()));

    private string GetCurrentRole() => User.FindFirst("role")?.Value ?? string.Empty;

    private bool IsDocumentManager() =>
        GetCurrentRole().Equals("admin", StringComparison.OrdinalIgnoreCase) ||
        GetCurrentRole().Equals("superadmin", StringComparison.OrdinalIgnoreCase);
}
