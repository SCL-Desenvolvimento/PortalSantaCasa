using System.Text.Json;
using System.Text.Json.Nodes;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services;

public sealed class TacticalReportsService : ITacticalReportsService
{
    private static readonly TacticalReportDefinitionDto[] Catalog =
    [
        D("painel-executivo", "Painel executivo de TI", "Visão geral", "Indicadores consolidados do parque, disponibilidade, alertas e checks.", "fa-chart-pie", "/core/dashinfo/", "/agents/", "/checks/"),
        D("inventario-maquinas", "Inventário geral de máquinas", "Inventário", "Cadastro técnico completo dos equipamentos monitorados.", "fa-desktop", "/agents/"),
        D("online-offline", "Máquinas online e offline", "Disponibilidade", "Situação atual e última comunicação dos equipamentos.", "fa-wifi", "/agents/"),
        D("disponibilidade-sla", "Disponibilidade e SLA", "Disponibilidade", "Disponibilidade, quedas e equipamentos abaixo do SLA.", "fa-gauge-high", "/agents/history/", "/checks/"),
        D("sistemas-operacionais", "Sistemas operacionais", "Inventário", "Distribuição, versões, builds e sistemas fora de suporte.", "fa-windows", "/agents/"),
        D("hardware-capacidade", "Hardware e capacidade", "Inventário", "Memória, processador, armazenamento e capacidade do parque.", "fa-microchip", "/agents/"),
        D("saude-discos", "Saúde dos discos", "Saúde", "Volumes com pouco espaço, falhas recorrentes e tendência de ocupação.", "fa-hard-drive", "/checks/"),
        D("cpu-memoria", "Uso de CPU e memória", "Saúde", "Sobrecarga, picos e equipamentos candidatos a upgrade.", "fa-memory", "/checks/"),
        D("inventario-software", "Inventário de software", "Software", "Aplicativos e versões instalados no parque.", "fa-boxes-stacked", "/software/"),
        D("conformidade-software", "Conformidade de software", "Software", "Softwares obrigatórios, proibidos e versões mínimas.", "fa-shield-halved", "/software/", "/agents/"),
        DA("atualizacoes-windows", "Atualizações do Windows", "Atualizações", "Patches pendentes, críticos, falhas e conformidade.", "fa-arrows-rotate", "/winupdate/{agentId}/"),
        D("reinicializacao-pendente", "Reinicialização pendente", "Atualizações", "Uptime elevado e equipamentos aguardando reinicialização.", "fa-power-off", "/agents/"),
        DA("servicos-windows", "Serviços do Windows", "Operação", "Serviços parados, automáticos e serviços críticos.", "fa-gears", "/services/{agentId}/"),
        DA("processos-execucao", "Processos em execução", "Operação", "Fotografia dos processos, CPU, memória e itens não autorizados.", "fa-list-check", "/agents/{agentId}/processes/"),
        D("checks-monitoramento", "Checks de monitoramento", "Monitoramento", "Saúde, falhas, recorrência e execução dos checks.", "fa-circle-check", "/checks/"),
        D("alertas", "Alertas", "Monitoramento", "Alertas ativos, críticos, reincidentes e fora do SLA.", "fa-bell", "/alerts/"),
        D("incidentes-recorrentes", "Incidentes recorrentes", "Monitoramento", "Falhas repetidas, oscilação e possíveis causas-raiz.", "fa-triangle-exclamation", "/checks/", "/alerts/"),
        D("historico-agentes", "Histórico dos agentes", "Histórico", "Alterações de status, hostname, IP, usuário e manutenção.", "fa-clock-rotate-left", "/agents/history/"),
        D("historico-scripts", "Histórico de scripts", "Histórico", "Execuções, sucesso, falhas, duração e erros de scripts.", "fa-terminal", "/agents/scripthistory/"),
        D("automacao-politicas", "Automação e políticas", "Automação", "Políticas, vínculos, conformidade e erros de automação.", "fa-wand-magic-sparkles", "/automation/policies/overview/"),
        D("tarefas-agendadas", "Tarefas agendadas", "Automação", "Execuções, atrasos, falhas e tarefas sem vínculo.", "fa-calendar-check", "/tasks/"),
        D("acoes-pendentes", "Ações pendentes", "Operação", "Filas, ações travadas e tempo acima do SLA.", "fa-hourglass-half", "/logs/pendingactions/"),
        D("auditoria-usuarios", "Auditoria de usuários", "Auditoria", "Contas, atividade, funções e situação dos usuários.", "fa-user-shield", "/accounts/users/"),
        D("chaves-api", "Chaves de API", "Auditoria", "Inventário seguro de chaves e responsáveis, sem expor segredos.", "fa-key", "/accounts/apikeys/"),
        D("funcoes-permissoes", "Funções e permissões", "Auditoria", "Perfis, privilégios e permissões excessivas.", "fa-user-lock", "/accounts/roles/"),
        D("sessoes-seguranca", "Sessões e segurança de acesso", "Auditoria", "Sessões abertas, antigas e acessos simultâneos.", "fa-right-to-bracket", "/accounts/users/"),
        D("sso-autenticacao", "SSO e autenticação", "Auditoria", "Configuração e cobertura dos métodos de autenticação.", "fa-id-card", "/accounts/users/"),
        DA("event-viewer", "Event Viewer do Windows", "Diagnóstico", "Eventos críticos e erros recentes do Windows (últimos 7 dias).", "fa-rectangle-list", "/agents/{agentId}/eventlog/application/7/"),
        DA("notas-tecnicas", "Notas técnicas por máquina", "Diagnóstico", "Notas, orientações e contexto operacional por equipamento.", "fa-note-sticky", "/agents/{agentId}/"),
        D("versoes-agentes", "Versões dos agentes", "Implantação", "Versões instaladas, divergências e agentes desatualizados.", "fa-code-branch", "/agents/"),
        D("meshcentral", "MeshCentral e acesso remoto", "Implantação", "Disponibilidade e cobertura do acesso remoto.", "fa-display", "/agents/"),
        D("implantacao-agentes", "Implantação de agentes", "Implantação", "Instalações, cobertura e equipamentos sem agente.", "fa-download", "/agents/"),
        D("clientes-unidades-sites", "Clientes, unidades e sites", "Organização", "Estrutura organizacional e distribuição do parque.", "fa-building", "/clients/", "/clients/sites/"),
        D("campos-qualidade", "Campos personalizados e qualidade cadastral", "Organização", "Cadastros incompletos e cobertura dos campos obrigatórios.", "fa-clipboard-check", "/core/customfields/", "/agents/"),
        D("garantia-ciclo-vida", "Garantia e ciclo de vida", "Ciclo de vida", "Idade, garantia e estágio do ciclo de vida dos equipamentos.", "fa-calendar-days", "/agents/"),
        D("manutencao-preventiva", "Manutenção preventiva", "Ciclo de vida", "Equipamentos em manutenção e agenda preventiva.", "fa-screwdriver-wrench", "/agents/"),
        D("saude-consolidada", "Saúde consolidada por máquina", "Risco", "Índice unificado de disponibilidade, checks, disco e alertas.", "fa-heart-pulse", "/agents/", "/checks/"),
        D("risco-tecnico", "Risco técnico por equipamento", "Risco", "Pontuação de risco para priorização técnica.", "fa-shield-virus", "/agents/", "/checks/"),
        D("substituicao-equipamentos", "Substituição de equipamentos", "Ciclo de vida", "Ranking de candidatos à renovação do parque.", "fa-arrow-right-arrow-left", "/agents/"),
        D("vulnerabilidade-operacional", "Vulnerabilidade operacional", "Risco", "Exposição por patches, software, alertas e capacidade.", "fa-bug", "/agents/", "/checks/"),
        D("capacidade-crescimento", "Capacidade e crescimento do parque", "Planejamento", "Distribuição, expansão e necessidades futuras do parque.", "fa-arrow-trend-up", "/agents/"),
        D("atividade-fora-horario", "Atividade fora do horário", "Auditoria", "Scripts, acessos e ações executados fora do expediente.", "fa-moon", "/agents/scripthistory/"),
        D("servidores-criticos", "Servidores críticos", "Continuidade", "Saúde e disponibilidade dos servidores essenciais.", "fa-server", "/agents/", "/checks/"),
        D("setor-hospitalar", "Relatório por setor hospitalar", "Continuidade", "Indicadores consolidados por setor e unidade.", "fa-hospital", "/agents/", "/checks/"),
        D("continuidade-operacional", "Continuidade operacional", "Continuidade", "Riscos, disponibilidade e prontidão dos serviços críticos.", "fa-life-ring", "/agents/", "/checks/"),
        D("reporting-nativo", "Relatórios nativos do Tactical", "Reporting", "Histórico e relatórios disponíveis no próprio módulo reporting.", "fa-file-lines", "/reporting/history/"),
        D("reporting-administrativo", "Administração do reporting", "Reporting", "Modelos, agendamentos e consultas administrativas.", "fa-sliders", "/reporting/templates/", "/reporting/schedules/", "/reporting/dataqueries/")
    ];

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TacticalReportsService> _logger;

    public TacticalReportsService(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<TacticalReportsService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public IReadOnlyList<TacticalReportDefinitionDto> GetCatalog() => Catalog;

    public async Task<TacticalReportResultDto?> GetReportAsync(string slug, string? agentId, CancellationToken cancellationToken)
    {
        var definition = Catalog.FirstOrDefault(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));
        if (definition is null) return null;

        var baseUrl = _configuration["TacticalRmm:BaseUrl"]?.TrimEnd('/');
        var apiKey = _configuration["TacticalRmm:ApiKey"];
        if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey))
            return new(definition, false, DateTimeOffset.UtcNow, [], new Dictionary<string, int>(), "Configure TacticalRmm:BaseUrl e TacticalRmm:ApiKey no servidor.");

        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri) || (baseUri.Scheme != Uri.UriSchemeHttps && !baseUri.IsLoopback))
            return new(definition, false, DateTimeOffset.UtcNow, [], new Dictionary<string, int>(), "A URL do Tactical RMM deve usar HTTPS.");

        if (definition.RequiresAgent && string.IsNullOrWhiteSpace(agentId))
            return new(definition, true, DateTimeOffset.UtcNow, [], new Dictionary<string, int>(), "Informe o ID do agente para gerar este relatório.");

        var rows = new List<JsonElement>();
        var errors = new List<string>();
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        client.DefaultRequestHeaders.Add("X-API-KEY", apiKey);

        foreach (var template in definition.Endpoints)
        {
            var path = template.Replace("{agentId}", Uri.EscapeDataString(agentId ?? string.Empty), StringComparison.Ordinal);
            try
            {
                using var response = await client.GetAsync(new Uri(baseUri, path), cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    errors.Add($"{path}: HTTP {(int)response.StatusCode}");
                    continue;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
                AddRows(document.RootElement, rows);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogWarning(ex, "Falha ao consultar {Path} no Tactical RMM", path);
                errors.Add($"{path}: indisponível");
            }
        }

        var summary = new Dictionary<string, int>
        {
            ["registros"] = rows.Count,
            ["fontesConsultadas"] = definition.Endpoints.Length,
            ["fontesComFalha"] = errors.Count
        };
        var message = errors.Count > 0 ? string.Join("; ", errors) : null;
        return new(definition, true, DateTimeOffset.UtcNow, rows.Take(2000).ToArray(), summary, message);
    }

    private static void AddRows(JsonElement root, List<JsonElement> rows)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            rows.AddRange(root.EnumerateArray().Select(Sanitize));
            return;
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            foreach (var key in new[] { "results", "data", "agents", "checks", "items" })
            {
                if (root.TryGetProperty(key, out var list) && list.ValueKind == JsonValueKind.Array)
                {
                    rows.AddRange(list.EnumerateArray().Select(Sanitize));
                    return;
                }
            }
            rows.Add(Sanitize(root));
        }
    }

    private static JsonElement Sanitize(JsonElement element)
    {
        var node = JsonNode.Parse(element.GetRawText());
        Scrub(node);
        return JsonSerializer.SerializeToElement(node);
    }

    private static void Scrub(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            foreach (var property in obj.ToList())
            {
                var normalized = property.Key.Replace("-", "", StringComparison.Ordinal).Replace("_", "", StringComparison.Ordinal).ToLowerInvariant();
                if (normalized is "apikey" or "password" or "secret" or "token" or "accesstoken" or "refreshtoken")
                    obj[property.Key] = "••••••••";
                else
                    Scrub(property.Value);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array) Scrub(child);
        }
    }

    private static TacticalReportDefinitionDto D(string slug, string title, string category, string description, string icon, params string[] endpoints) =>
        new(slug, title, category, description, icon, endpoints);

    private static TacticalReportDefinitionDto DA(string slug, string title, string category, string description, string icon, params string[] endpoints) =>
        new(slug, title, category, description, icon, endpoints, true);
}
