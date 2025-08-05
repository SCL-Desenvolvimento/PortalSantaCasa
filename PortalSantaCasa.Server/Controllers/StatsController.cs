using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatsController : ControllerBase
    {
        private readonly IStatsService _service;

        public StatsController(IStatsService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _service.GetStatsAsync();
            return Ok(stats);
        }
    }
}
