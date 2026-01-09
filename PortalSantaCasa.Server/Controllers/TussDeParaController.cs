using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/tuss-depara")]
    public class TussDeParaController : ControllerBase
    {
        private readonly TussDeParaImportService _service;

        public TussDeParaController(TussDeParaImportService service)
        {
            _service = service;
        }

        [HttpPost("importar")]
        public async Task<IActionResult> Importar([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Arquivo não enviado");

            await _service.ImportarAsync(file);
            return Ok();
        }

        [HttpPost("importar-tuss-values")]
        public async Task<IActionResult> ImportarTussValues([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Arquivo não enviado");

            await _service.ImportarTussValuesAsync(file);
            return Ok();
        }

    }
}
