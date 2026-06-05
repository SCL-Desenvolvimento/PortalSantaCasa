using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BirthdayController : ControllerBase
    {
        private readonly IBirthdayService _service;

        public BirthdayController(IBirthdayService service)
        {
            _service = service;
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }


        [HttpGet("paginated")]
        public async Task<IActionResult> GetAllPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10)
        {
            var result = await _service.GetAllPaginatedAsync(page, perPage);
            return Ok(new
            {
                currentPage = page,
                perPage,
                birthdays = result,
                pages = (int)Math.Ceiling(await _service.GetTotalCountAsync() / (double)perPage)
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] BirthdayCreateDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] BirthdayUpdateDto dto)
        {
            var updated = await _service.UpdateAsync(id, dto);
            if (!updated) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        [HttpGet("next-birthdays")]
        public async Task<IActionResult> GetNextBirthdays()
        {
            var result = await _service.GetNextBirthdays();
            return Ok(result);
        }

    }
}
