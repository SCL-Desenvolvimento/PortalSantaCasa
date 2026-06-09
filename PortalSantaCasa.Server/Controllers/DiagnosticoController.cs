using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin,Admin")]
    public class DiagnosticoController : ControllerBase
    {
        private readonly IDiagnosticoService _service;

        public DiagnosticoController(IDiagnosticoService service)
        {
            _service = service;
        }

        [HttpPost("processar")]
        public async Task<IActionResult> Processar([FromBody] DiagnosticoRequestDto request)
        {
            var resultado = await _service.ProcessarDiagnosticoAsync(request);
            return Ok(resultado);
        }
    }
}
