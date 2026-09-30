namespace PortalSantaCasa.Server.DTOs;

public class AuthLoginResultDto
{
    public string Token { get; set; } = null!;
    public bool PrecisaTrocarSenha { get; set; }
    public int UserId { get; set; }
}
