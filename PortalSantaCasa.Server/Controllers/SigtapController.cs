using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/sigtap")]
    public class SigtapController : ControllerBase
    {
        private readonly SigtapImportService _importService;

        public SigtapController(SigtapImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("importar")]
        public async Task<IActionResult> Importar([FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest("Nenhum arquivo enviado");

            await _importService.ImportarAsync(files);
            return Ok();
        }

    }
}
