using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IDiagnosticoService
    {
        Task<DiagnosticoRelacionamentoDto> ProcessarDiagnosticoAsync(DiagnosticoRequestDto request);
    }
}
