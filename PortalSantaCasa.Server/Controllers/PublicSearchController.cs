using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public-search")]
public sealed class PublicSearchController : ControllerBase
{
    private readonly IPublicSearchService _searchService;

    public PublicSearchController(IPublicSearchService searchService) => _searchService = searchService;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(Array.Empty<object>());

        if (q.Length > 100)
            return BadRequest(new { message = "A busca deve ter no máximo 100 caracteres." });

        return Ok(await _searchService.SearchAsync(q, GetDocumentRole()));
    }

    private string GetDocumentRole()
    {
        var role = User.FindFirst("role")?.Value;
        return User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(role)
            ? role
            : "viewer";
    }
}
