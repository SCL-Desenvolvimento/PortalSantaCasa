﻿using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly IConfiguration _config;
        private readonly IPasswordHasher<object> _passwordHasher;

        public AuthController(PortalSantaCasaDbContext context, IConfiguration config, IPasswordHasher<object> passwordHasher)
        {
            _context = context;
            _config = config;
            _passwordHasher = passwordHasher;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] UserCreateDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest("Usuário já cadastrado.");

            var user = new User
            {
                Email = dto.Email,
                Username = dto.Username,
                IsActive = dto.IsActive,
                UserType = dto.UserType,
                Department = dto.Department,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                PhotoUrl = dto.File == null ? "Uploads/Usuarios/padrao.png" : await ProcessarMidiasAsync(dto.File),
                Senha = _passwordHasher.HashPassword(null!, "MV")
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return Ok(new { token });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.UserName);

            if (user == null)
                return Unauthorized("Usuário não encontrado.");

            var result = _passwordHasher.VerifyHashedPassword(null!, user.Senha, dto.Password);

            if (result != PasswordVerificationResult.Success)
                return Unauthorized("Senha inválida.");

            // Verifica se ainda é a senha padrão "MV"
            bool precisaTrocarSenha = _passwordHasher.VerifyHashedPassword(null!, user.Senha, "MV")
                                        == PasswordVerificationResult.Success;

            if (precisaTrocarSenha)
            {
                // NÃO gera token ainda
                return Ok(new { precisaTrocarSenha = true, userId = user.Id });
            }

            // Se já alterou a senha, então gera o token normalmente
            var token = GenerateJwtToken(user);

            return Ok(new { token, precisaTrocarSenha = false, userId = user.Id });
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new("id", user.Id.ToString()),
                new("email", user.Email ?? ""),
                new("username", user.Username),
                new("department", user.Department),
                new("role", user.UserType),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var secretKey = _config["Jwt:Key"];
            var issuer = _config["Jwt:Issuer"];
            var audience = _config["Jwt:Audience"];

            if (string.IsNullOrEmpty(secretKey) || string.IsNullOrEmpty(issuer) || string.IsNullOrEmpty(audience))
                throw new InvalidOperationException("JWT configuration is missing in appsettings.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }


        private static async Task<string> ProcessarMidiasAsync(IFormFile midia)
        {
            var baseDirectory = Path.Combine("Uploads", "Usuarios").Replace("\\", "/");

            if (!Directory.Exists(baseDirectory))
                Directory.CreateDirectory(baseDirectory);

            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(midia.FileName)).Replace("\\", "/");

            await using var stream = new FileStream(filePath, FileMode.Create);
            await midia.CopyToAsync(stream);

            return filePath;
        }
    }
}