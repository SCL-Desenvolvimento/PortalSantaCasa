using System.Globalization;
using System.Text.Json;
using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Services;

internal static class TacticalReportAnalyzer
{
    private static readonly string[] Colors = ["#0284c7", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#ec4899", "#22c55e"];

    private static readonly Dictionary<string, string> Labels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["hostname"] = "Equipamento", ["status"] = "Situação", ["status_pt"] = "Situação",
        ["client_name"] = "Cliente", ["site_name"] = "Unidade / setor", ["operating_system"] = "Sistema operacional",
        ["last_seen"] = "Última comunicação", ["logged_username"] = "Usuário conectado", ["logged_in_username"] = "Usuário conectado",
        ["make_model"] = "Fabricante / modelo", ["serial_number"] = "Número de série", ["version"] = "Versão do agente",
        ["needs_reboot"] = "Reinicialização pendente", ["has_patches_pending"] = "Patches pendentes",
        ["maintenance_mode"] = "Em manutenção", ["monitoring_type"] = "Tipo", ["public_ip"] = "IP público",
        ["checks_total"] = "Checks", ["checks_failing"] = "Checks com falha", ["checks_passing"] = "Checks aprovados",
        ["health_score"] = "Saúde", ["risk_score"] = "Risco", ["priority"] = "Prioridade",
        ["name"] = "Nome", ["display_name"] = "Nome de exibição", ["publisher"] = "Fabricante",
        ["installations"] = "Instalações", ["equipment_count"] = "Equipamentos", ["versions"] = "Versões",
        ["size"] = "Tamanho", ["source"] = "Origem", ["location"] = "Local", ["install_date"] = "Instalado em",
        ["severity"] = "Severidade", ["title"] = "Descrição", ["kb"] = "KB", ["installed"] = "Instalado",
        ["downloaded"] = "Baixado", ["date_installed"] = "Data de instalação", ["result"] = "Resultado",
        ["start_type"] = "Inicialização", ["pid"] = "PID", ["username"] = "Usuário", ["cpu_percent"] = "CPU",
        ["memory_mb"] = "Memória", ["source_name"] = "Origem", ["event_type"] = "Tipo de evento",
        ["event_id"] = "ID do evento", ["message"] = "Mensagem", ["time"] = "Data e hora",
        ["script_name"] = "Script", ["command"] = "Comando", ["type"] = "Tipo", ["is_active"] = "Ativo",
        ["last_login"] = "Último acesso", ["last_login_ip"] = "IP do último acesso", ["role"] = "Perfil",
        ["email"] = "E-mail", ["permission_count"] = "Permissões concedidas", ["user_count"] = "Usuários",
        ["is_superuser"] = "Superusuário", ["category"] = "Categoria", ["count"] = "Quantidade",
        ["description"] = "Descrição", ["created_by"] = "Criado por", ["created_time"] = "Criado em",
        ["modified_by"] = "Alterado por", ["modified_time"] = "Alterado em", ["timezone"] = "Fuso horário",
        ["default_shell"] = "Terminal padrão", ["required"] = "Obrigatório", ["model"] = "Entidade",
        ["order"] = "Ordem", ["action"] = "Ação", ["guid"] = "Identificador"
    };

    private static readonly HashSet<string> AgentSlugs =
    [
        "painel-executivo", "inventario-maquinas", "online-offline", "disponibilidade-sla", "sistemas-operacionais",
        "hardware-capacidade", "saude-discos", "cpu-memoria", "checks-monitoramento", "incidentes-recorrentes",
        "reinicializacao-pendente", "versoes-agentes", "meshcentral", "implantacao-agentes",
        "clientes-unidades-sites", "campos-qualidade", "garantia-ciclo-vida", "manutencao-preventiva", "saude-consolidada",
        "risco-tecnico", "substituicao-equipamentos", "vulnerabilidade-operacional", "capacidade-crescimento",
        "servidores-criticos", "setor-hospitalar", "continuidade-operacional"
    ];

    public static TacticalReportPresentationDto Empty() => new([], [], [], [], []);

    public static TacticalReportPresentationDto Analyze(TacticalReportDefinitionDto definition, IReadOnlyList<JsonElement> rawRows, string? sourceMessage)
    {
        var rows = definition.Slug is "inventario-software" or "conformidade-software"
            ? PrepareSoftware(rawRows)
            : AgentSlugs.Contains(definition.Slug)
                ? PrepareAgents(rawRows, definition.Slug)
                : PrepareGeneric(rawRows);

        var metrics = BuildMetrics(definition.Slug, rows);
        var charts = BuildCharts(definition.Slug, rows);
        var insights = BuildInsights(definition, rows, sourceMessage);
        var columns = BuildColumns(definition.Slug, rows);
        var serializedRows = rows.Take(2000).Select(row => JsonSerializer.SerializeToElement(row)).ToArray();
        return new(metrics, charts, insights, columns, serializedRows);
    }

    private static List<Dictionary<string, object?>> PrepareAgents(IReadOnlyList<JsonElement> rawRows, string slug)
    {
        var result = new List<Dictionary<string, object?>>();
        foreach (var item in rawRows.Where(x => Has(x, "hostname") && Has(x, "agent_id")))
        {
            var status = S(item, "status").ToLowerInvariant();
            var failing = NestedInt(item, "checks", "failing");
            var total = NestedInt(item, "checks", "total");
            var oldOs = IsLegacyOs(S(item, "operating_system"));
            var incomplete = string.IsNullOrWhiteSpace(S(item, "serial_number")) || S(item, "site_name").Contains("Uncategorized", StringComparison.OrdinalIgnoreCase);
            var risk = Math.Min(100, (status == "offline" ? 35 : status == "overdue" ? 20 : 0) + Math.Min(30, failing * 10) + (oldOs ? 25 : 0) + (incomplete ? 10 : 0));
            var health = Math.Max(0, 100 - risk);
            var row = new Dictionary<string, object?>
            {
                ["hostname"] = S(item, "hostname"), ["status"] = status, ["status_pt"] = StatusPt(status),
                ["client_name"] = S(item, "client_name"), ["site_name"] = S(item, "site_name"),
                ["operating_system"] = S(item, "operating_system"), ["make_model"] = S(item, "make_model"),
                ["serial_number"] = S(item, "serial_number"), ["last_seen"] = S(item, "last_seen"),
                ["logged_username"] = S(item, "logged_username"), ["version"] = S(item, "version"),
                ["monitoring_type"] = S(item, "monitoring_type"), ["needs_reboot"] = B(item, "needs_reboot"),
                ["has_patches_pending"] = B(item, "has_patches_pending"), ["maintenance_mode"] = B(item, "maintenance_mode"),
                ["checks_total"] = total, ["checks_passing"] = NestedInt(item, "checks", "passing"), ["checks_failing"] = failing,
                ["risk_score"] = risk, ["health_score"] = health, ["priority"] = risk >= 60 ? "Crítica" : risk >= 35 ? "Alta" : risk >= 15 ? "Média" : "Baixa"
            };
            result.Add(row);
        }

        if (slug == "servidores-criticos") result = result.Where(x => Convert.ToString(x["monitoring_type"]) == "server").ToList();
        if (slug is "risco-tecnico" or "substituicao-equipamentos" or "vulnerabilidade-operacional" or "saude-consolidada" or "continuidade-operacional")
            result = result.OrderByDescending(x => Convert.ToInt32(x["risk_score"], CultureInfo.InvariantCulture)).ToList();
        else if (slug == "reinicializacao-pendente") result = result.OrderByDescending(x => (bool)(x["needs_reboot"] ?? false)).ToList();
        else result = result.OrderBy(x => StatusOrder(Convert.ToString(x["status"]) ?? "")).ThenBy(x => x["hostname"]).ToList();
        return result;
    }

    private static List<Dictionary<string, object?>> PrepareSoftware(IReadOnlyList<JsonElement> rawRows)
    {
        var installs = new List<(string Name, string Version, string Publisher, string Agent)>();
        foreach (var wrapper in rawRows.Where(x => Has(x, "software")))
        {
            var agent = S(wrapper, "agent");
            if (!wrapper.TryGetProperty("software", out var software) || software.ValueKind != JsonValueKind.Array) continue;
            foreach (var item in software.EnumerateArray())
                installs.Add((S(item, "name"), S(item, "version"), S(item, "publisher"), agent));
        }
        return installs.Where(x => !string.IsNullOrWhiteSpace(x.Name))
            .GroupBy(x => $"{x.Name.Trim()}\u001f{x.Publisher.Trim()}", StringComparer.OrdinalIgnoreCase)
            .Select(g => new Dictionary<string, object?>
            {
                ["name"] = g.First().Name.Trim(), ["publisher"] = g.First().Publisher.Trim(), ["installations"] = g.Count(),
                ["equipment_count"] = g.Select(x => x.Agent).Distinct().Count(),
                ["versions"] = string.Join(", ", g.Select(x => x.Version).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().Take(6))
            }).OrderByDescending(x => Convert.ToInt32(x["installations"], CultureInfo.InvariantCulture)).ToList();
    }

    private static List<Dictionary<string, object?>> PrepareGeneric(IReadOnlyList<JsonElement> rawRows)
    {
        var result = new List<Dictionary<string, object?>>();
        foreach (var item in rawRows.Where(x => x.ValueKind == JsonValueKind.Object))
        {
            var row = new Dictionary<string, object?>();
            foreach (var property in item.EnumerateObject())
            {
                if (property.Name.StartsWith("can_", StringComparison.OrdinalIgnoreCase)) continue;
                var value = Primitive(property.Value);
                if (value is not null) row[NormalizeKey(property.Name)] = value;
            }
            if (item.EnumerateObject().Any(x => x.Name.StartsWith("can_", StringComparison.OrdinalIgnoreCase)))
                row["permission_count"] = item.EnumerateObject().Count(x => x.Name.StartsWith("can_", StringComparison.OrdinalIgnoreCase) && x.Value.ValueKind == JsonValueKind.True);
            if (Has(item, "membytes")) row["memory_mb"] = Math.Round(N(item, "membytes") / 1024d / 1024d, 1);
            if (Has(item, "eventType")) row["event_type"] = S(item, "eventType");
            if (Has(item, "eventID")) row["event_id"] = S(item, "eventID");
            if (Has(item, "source")) row["source_name"] = S(item, "source");
            result.Add(row);
        }
        return result;
    }

    private static IReadOnlyList<TacticalMetricDto> BuildMetrics(string slug, List<Dictionary<string, object?>> rows)
    {
        if (AgentSlugs.Contains(slug))
        {
            var total = rows.Count;
            var online = Count(rows, "status", "online"); var overdue = Count(rows, "status", "overdue"); var offline = Count(rows, "status", "offline");
            var availability = total == 0 ? 0 : online * 100d / total;
            var failing = rows.Sum(x => Int(x, "checks_failing"));
            if (slug == "sistemas-operacionais")
                return [M("Equipamentos", total, "Parque analisado", "info", "fa-desktop"), M("Windows 11", rows.Count(x => Text(x,"operating_system").Contains("Windows 11")), "Sistemas atuais", "success", "fa-windows"), M("Sistemas legados", rows.Count(x => IsLegacyOs(Text(x,"operating_system"))), "Requerem avaliação", "danger", "fa-triangle-exclamation"), M("Versões distintas", rows.Select(x => Text(x,"operating_system")).Distinct().Count(), "Builds encontrados", "warning", "fa-code-branch")];
            if (slug == "reinicializacao-pendente")
                return [M("Reinicialização pendente", rows.Count(x => Bool(x,"needs_reboot")), "Ação recomendada", "warning", "fa-power-off"), M("Parque sem pendência", rows.Count(x => !Bool(x,"needs_reboot")), "Sem indicação de reboot", "success", "fa-circle-check"), M("Fora de comunicação", overdue + offline, "Validar antes de agendar", "danger", "fa-wifi")];
            if (slug == "versoes-agentes")
            {
                var mode = rows.GroupBy(x => Text(x,"version")).OrderByDescending(x => x.Count()).FirstOrDefault()?.Key ?? "—";
                return [M("Versão predominante", mode, "Referência atual do parque", "info", "fa-code-branch"), M("Na versão predominante", rows.Count(x => Text(x,"version") == mode), "Equipamentos alinhados", "success", "fa-circle-check"), M("Versões divergentes", rows.Count(x => Text(x,"version") != mode), "Planejar atualização", "warning", "fa-arrow-up")];
            }
            if (slug is "risco-tecnico" or "substituicao-equipamentos" or "vulnerabilidade-operacional")
                return [M("Risco crítico", rows.Count(x => Int(x,"risk_score") >= 60), "Prioridade imediata", "danger", "fa-shield-virus"), M("Risco alto", rows.Count(x => Int(x,"risk_score") is >= 35 and < 60), "Entrar no plano de ação", "warning", "fa-triangle-exclamation"), M("Risco médio/baixo", rows.Count(x => Int(x,"risk_score") < 35), "Monitoramento regular", "success", "fa-circle-check"), M("Risco médio", rows.Count == 0 ? 0 : Math.Round(rows.Average(x => Int(x,"risk_score"))), "Índice de 0 a 100", "info", "fa-gauge-high")];
            if (slug == "campos-qualidade")
                return [M("Cadastros completos", rows.Count(x => !string.IsNullOrWhiteSpace(Text(x,"serial_number")) && !Text(x,"site_name").Contains("Uncategorized")), "Com série e setor", "success", "fa-clipboard-check"), M("Sem número de série", rows.Count(x => string.IsNullOrWhiteSpace(Text(x,"serial_number"))), "Corrigir inventário", "warning", "fa-barcode"), M("Sem setor definido", rows.Count(x => Text(x,"site_name").Contains("Uncategorized")), "Classificar equipamento", "danger", "fa-building")];
            return [M("Equipamentos", total, "Total analisado", "info", "fa-desktop"), M("Disponíveis agora", $"{availability:0.0}%", $"{online} online", availability >= 90 ? "success" : "warning", "fa-wifi"), M("Atenção", overdue, "Comunicação atrasada", "warning", "fa-clock"), M("Indisponíveis", offline, "Sem comunicação", "danger", "fa-circle-xmark"), M("Checks com falha", failing, "Falhas somadas no parque", failing == 0 ? "success" : "danger", "fa-circle-exclamation")];
        }

        if (slug is "inventario-software" or "conformidade-software")
            return [M("Aplicativos distintos", rows.Count, "Produtos identificados", "info", "fa-boxes-stacked"), M("Instalações", rows.Sum(x => Int(x,"installations")), "Total no parque", "success", "fa-download"), M("Com múltiplas versões", rows.Count(x => Text(x,"versions").Contains(',')), "Padronização necessária", "warning", "fa-code-branch"), M("Fabricantes", rows.Select(x => Text(x,"publisher")).Where(x => x.Length > 0).Distinct().Count(), "Fornecedores identificados", "info", "fa-building")];

        if (slug == "servicos-windows")
            return [M("Serviços", rows.Count, "No agente selecionado", "info", "fa-gears"), M("Em execução", CountAny(rows,"status","running"), "Operação normal", "success", "fa-play"), M("Parados", rows.Count - CountAny(rows,"status","running"), "Revisar conforme criticidade", "warning", "fa-stop"), M("Automáticos parados", rows.Count(x => !Text(x,"status").Equals("running",StringComparison.OrdinalIgnoreCase) && Text(x,"start_type").Contains("auto",StringComparison.OrdinalIgnoreCase)), "Prioridade de análise", "danger", "fa-triangle-exclamation")];
        if (slug == "processos-execucao")
            return [M("Processos", rows.Count, "Fotografia atual", "info", "fa-list"), M("CPU acumulada", $"{rows.Sum(x => Double(x,"cpu_percent")):0.0}%", "Consumo reportado", "warning", "fa-microchip"), M("Memória utilizada", $"{rows.Sum(x => Double(x,"memory_mb"))/1024:0.0} GB", "Soma dos processos", "info", "fa-memory"), M("Alto consumo", rows.Count(x => Double(x,"cpu_percent") >= 10), "CPU igual ou acima de 10%", "danger", "fa-fire")];
        if (slug == "atualizacoes-windows")
            return [M("Atualizações", rows.Count, "Itens avaliados", "info", "fa-arrows-rotate"), M("Pendentes", rows.Count(x => !Bool(x,"installed")), "Requerem instalação", "warning", "fa-download"), M("Instaladas", rows.Count(x => Bool(x,"installed")), "Aplicadas", "success", "fa-circle-check"), M("Críticas pendentes", rows.Count(x => !Bool(x,"installed") && Text(x,"severity").Contains("critical",StringComparison.OrdinalIgnoreCase)), "Prioridade máxima", "danger", "fa-shield")];
        if (slug == "event-viewer")
            return [M("Eventos", rows.Count, "Últimos 7 dias", "info", "fa-rectangle-list"), M("Erros", rows.Count(x => Text(x,"event_type").Contains("error",StringComparison.OrdinalIgnoreCase)), "Investigar recorrência", "danger", "fa-circle-xmark"), M("Avisos", rows.Count(x => Text(x,"event_type").Contains("warn",StringComparison.OrdinalIgnoreCase)), "Sinais preventivos", "warning", "fa-triangle-exclamation"), M("Origens", rows.Select(x => Text(x,"source_name")).Distinct().Count(), "Fontes de eventos", "info", "fa-layer-group")];
        if (slug == "auditoria-usuarios")
            return [M("Usuários", rows.Count, "Contas cadastradas", "info", "fa-users"), M("Ativos", rows.Count(x => Bool(x,"is_active")), "Acesso permitido", "success", "fa-user-check"), M("Inativos", rows.Count(x => !Bool(x,"is_active")), "Revisar necessidade", "warning", "fa-user-slash"), M("Sem acesso registrado", rows.Count(x => string.IsNullOrWhiteSpace(Text(x,"last_login"))), "Contas nunca utilizadas", "danger", "fa-clock")];
        if (slug == "funcoes-permissoes")
            return [M("Perfis", rows.Count, "Funções cadastradas", "info", "fa-user-lock"), M("Superusuários", rows.Count(x => Bool(x,"is_superuser")), "Perfis de privilégio total", "danger", "fa-user-shield"), M("Permissões médias", rows.Count == 0 ? 0 : Math.Round(rows.Average(x => Int(x,"permission_count"))), "Por perfil", "warning", "fa-key"), M("Usuários vinculados", rows.Sum(x => Int(x,"user_count")), "Total nas funções", "success", "fa-users")];

        return [M("Registros analisados", rows.Count, "Dados retornados pelo Tactical", "info", "fa-database"), M("Campos úteis", rows.SelectMany(x => x.Keys).Distinct().Count(), "Informações disponíveis", "success", "fa-table-columns")];
    }

    private static IReadOnlyList<TacticalChartDto> BuildCharts(string slug, List<Dictionary<string, object?>> rows)
    {
        if (rows.Count == 0) return [];
        var charts = new List<TacticalChartDto>();
        if (AgentSlugs.Contains(slug))
        {
            charts.Add(Chart("Situação do parque", "donut", Group(rows, "status_pt", 6)));
            var groupField = slug == "sistemas-operacionais" ? "operating_system" : slug == "versoes-agentes" ? "version" : "site_name";
            charts.Add(Chart(slug == "sistemas-operacionais" ? "Sistemas mais utilizados" : slug == "versoes-agentes" ? "Versões dos agentes" : "Equipamentos por setor", "bar", Group(rows, groupField, 8, slug == "sistemas-operacionais" ? OsFamily : null)));
        }
        else if (slug is "inventario-software" or "conformidade-software")
        {
            charts.Add(Chart("Aplicativos com mais instalações", "bar", rows.Take(8).Select((x,i) => P(Text(x,"name"), Int(x,"installations"), i)).ToArray()));
            charts.Add(Chart("Principais fabricantes", "donut", GroupWeighted(rows,"publisher","installations",7)));
        }
        else if (slug == "processos-execucao")
        {
            charts.Add(Chart("Processos com maior CPU", "bar", rows.OrderByDescending(x => Double(x,"cpu_percent")).Take(8).Select((x,i)=>P(Text(x,"name"),Double(x,"cpu_percent"),i)).ToArray()));
            charts.Add(Chart("Processos com maior memória (MB)", "bar", rows.OrderByDescending(x => Double(x,"memory_mb")).Take(8).Select((x,i)=>P(Text(x,"name"),Double(x,"memory_mb"),i)).ToArray()));
        }
        else
        {
            var candidate = new[] { "status", "severity", "event_type", "type", "script_name", "username", "name" }.FirstOrDefault(key => rows.Any(x => x.ContainsKey(key)));
            if (candidate is not null) charts.Add(Chart($"Distribuição por {Label(candidate).ToLowerInvariant()}", "bar", Group(rows,candidate,8)));
        }
        return charts;
    }

    private static IReadOnlyList<TacticalInsightDto> BuildInsights(TacticalReportDefinitionDto report, List<Dictionary<string, object?>> rows, string? sourceMessage)
    {
        var list = new List<TacticalInsightDto>();
        if (!string.IsNullOrWhiteSpace(sourceMessage)) list.Add(new("warning", "Cobertura parcial de dados", sourceMessage, "Revise as permissões da chave da API para ampliar esta visão."));
        if (rows.Count == 0)
        {
            list.Add(new("info", "Nenhum registro disponível", report.RequiresAgent ? "Selecione um agente online para produzir esta análise." : "A fonte consultada não possui registros ou não está habilitada.", report.RequiresAgent ? "Informe o ID do agente no filtro acima." : "Valide a configuração e as permissões no Tactical RMM."));
            return list;
        }
        if (AgentSlugs.Contains(report.Slug))
        {
            var attention = Count(rows,"status","overdue") + Count(rows,"status","offline");
            var critical = rows.Count(x => Int(x,"risk_score") >= 60);
            var legacy = rows.Count(x => IsLegacyOs(Text(x,"operating_system")));
            list.Add(attention > 0
                ? new("warning", $"{attention} equipamentos precisam de atenção", "Há equipamentos offline ou com comunicação atrasada, reduzindo a confiabilidade operacional.", "Priorize setores assistenciais e confirme conectividade, energia e serviço do agente.")
                : new("success", "Comunicação do parque saudável", "Todos os equipamentos analisados estão comunicando normalmente.", "Mantenha o monitoramento e os limites atuais."));
            if (critical > 0) list.Add(new("critical", $"{critical} equipamentos em risco crítico", "O índice combina comunicação, checks, sistema legado e qualidade cadastral.", "Abra um plano de ação começando pelos primeiros itens da tabela de prioridade."));
            if (legacy > 0) list.Add(new("warning", $"{legacy} equipamentos com sistema legado", "Sistemas antigos aumentam exposição operacional e dificultam suporte.", "Avalie compatibilidade, atualização ou substituição programada."));
        }
        else if (report.Slug is "inventario-software" or "conformidade-software")
        {
            var divergent = rows.Count(x => Text(x,"versions").Contains(','));
            list.Add(new(divergent > 0 ? "warning" : "success", $"{divergent} produtos com versões divergentes", "Múltiplas versões dificultam suporte, correções e controle de licenças.", "Defina uma versão corporativa e crie uma política gradual de atualização."));
            list.Add(new("info", "Inventário convertido em visão de licenciamento", "As instalações foram agrupadas por produto, fabricante e quantidade de equipamentos.", "Use as maiores contagens para reconciliar contratos e licenças."));
        }
        else if (report.Slug == "servicos-windows")
        {
            var autoStopped = rows.Count(x => !Text(x,"status").Equals("running",StringComparison.OrdinalIgnoreCase) && Text(x,"start_type").Contains("auto",StringComparison.OrdinalIgnoreCase));
            list.Add(new(autoStopped > 0 ? "critical" : "success", $"{autoStopped} serviços automáticos estão parados", "Serviços configurados para iniciar automaticamente podem indicar falha operacional.", "Valide primeiro serviços de banco, integração, backup, segurança e impressão."));
        }
        else if (report.Slug == "atualizacoes-windows")
        {
            var pending = rows.Count(x => !Bool(x,"installed"));
            list.Add(new(pending > 0 ? "warning" : "success", $"{pending} atualizações pendentes", "A lista considera o agente selecionado e diferencia atualizações instaladas e pendentes.", "Aplique primeiro atualizações críticas e de segurança em janela controlada."));
        }
        else if (report.Slug == "processos-execucao")
        {
            var high = rows.OrderByDescending(x => Double(x,"cpu_percent")).FirstOrDefault();
            if (high is not null) list.Add(new("info", $"Maior consumo de CPU: {Text(high,"name")}", $"O processo estava usando {Double(high,"cpu_percent"):0.0}% no momento da coleta.", "Confirme recorrência antes de encerrar processos ou alterar serviços."));
        }
        else list.Add(new("info", "Leitura orientada à decisão", $"Foram analisados {rows.Count} registros para esta visão.", "Use os indicadores e a distribuição para definir a prioridade de investigação."));
        return list.Take(4).ToArray();
    }

    private static IReadOnlyList<TacticalColumnDto> BuildColumns(string slug, List<Dictionary<string, object?>> rows)
    {
        if (rows.Count == 0) return [];
        string[] preferred = slug switch
        {
            "inventario-maquinas" => ["hostname","status_pt","site_name","operating_system","make_model","serial_number","last_seen"],
            "online-offline" or "disponibilidade-sla" => ["hostname","status_pt","last_seen","site_name","logged_username","checks_failing"],
            "sistemas-operacionais" => ["hostname","operating_system","status_pt","site_name","version"],
            "reinicializacao-pendente" => ["hostname","needs_reboot","status_pt","site_name","last_seen"],
            "versoes-agentes" => ["hostname","version","status_pt","site_name","operating_system"],
            "campos-qualidade" => ["hostname","serial_number","site_name","make_model","status_pt"],
            "risco-tecnico" or "substituicao-equipamentos" or "vulnerabilidade-operacional" or "saude-consolidada" or "continuidade-operacional" => ["hostname","priority","risk_score","health_score","status_pt","checks_failing","operating_system","site_name"],
            "inventario-software" or "conformidade-software" => ["name","publisher","installations","equipment_count","versions"],
            "atualizacoes-windows" => ["kb","title","severity","installed","downloaded","date_installed","result"],
            "servicos-windows" => ["display_name","name","status","start_type","username","pid"],
            "processos-execucao" => ["name","pid","cpu_percent","memory_mb","username"],
            "event-viewer" => ["time","event_type","source_name","event_id","message"],
            "notas-tecnicas" => ["hostname","description","status","logged_in_username","operating_system","last_seen","modified_time","modified_by"],
            "auditoria-usuarios" or "sessoes-seguranca" or "sso-autenticacao" => ["username","email","is_active","last_login","last_login_ip","role"],
            "funcoes-permissoes" => ["name","user_count","permission_count","is_superuser","modified_time"],
            "historico-scripts" or "atividade-fora-horario" or "historico-agentes" => ["time","script_name","type","username","command"],
            _ when AgentSlugs.Contains(slug) => ["hostname","status_pt","site_name","operating_system","checks_failing","last_seen"],
            _ => []
        };
        var available = rows.SelectMany(x => x.Keys).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var keys = preferred.Where(available.Contains).ToList();
        if (keys.Count == 0) keys = available.Take(8).ToList();
        return keys.Select(key => new TacticalColumnDto(key, Label(key), Format(key))).ToArray();
    }

    private static TacticalMetricDto M(string label, object value, string detail, string tone, string icon) => new(label, Convert.ToString(value, CultureInfo.GetCultureInfo("pt-BR")) ?? "0", detail, tone, icon);
    private static TacticalChartDto Chart(string title, string type, IReadOnlyList<TacticalChartPointDto> data) => new(title,type,data);
    private static TacticalChartPointDto P(string label, double value, int index) => new(string.IsNullOrWhiteSpace(label) ? "Não informado" : label, value, Colors[index % Colors.Length]);
    private static TacticalChartPointDto[] Group(List<Dictionary<string, object?>> rows, string field, int take, Func<string,string>? normalize = null) => rows.GroupBy(x => normalize?.Invoke(Text(x,field)) ?? Text(x,field)).OrderByDescending(x => x.Count()).Take(take).Select((x,i)=>P(x.Key,x.Count(),i)).ToArray();
    private static TacticalChartPointDto[] GroupWeighted(List<Dictionary<string, object?>> rows, string field, string weight, int take) => rows.GroupBy(x => Text(x,field)).Select(x=>new{Label=x.Key,Value=x.Sum(y=>Int(y,weight))}).OrderByDescending(x=>x.Value).Take(take).Select((x,i)=>P(x.Label,x.Value,i)).ToArray();
    private static int Count(List<Dictionary<string, object?>> rows, string field, string value) => rows.Count(x => Text(x,field).Equals(value,StringComparison.OrdinalIgnoreCase));
    private static int CountAny(List<Dictionary<string, object?>> rows, string field, string value) => rows.Count(x => Text(x,field).Contains(value,StringComparison.OrdinalIgnoreCase));
    private static int Int(Dictionary<string, object?> row, string key) => row.TryGetValue(key,out var value) && int.TryParse(Convert.ToString(value,CultureInfo.InvariantCulture),out var number) ? number : 0;
    private static double Double(Dictionary<string, object?> row, string key) => row.TryGetValue(key,out var value) && double.TryParse(Convert.ToString(value,CultureInfo.InvariantCulture),NumberStyles.Any,CultureInfo.InvariantCulture,out var number) ? number : 0;
    private static bool Bool(Dictionary<string, object?> row, string key) => row.TryGetValue(key,out var value) && value is bool b ? b : bool.TryParse(Convert.ToString(value),out var parsed) && parsed;
    private static string Text(Dictionary<string, object?> row, string key) => row.TryGetValue(key,out var value) ? Convert.ToString(value,CultureInfo.InvariantCulture) ?? "" : "";
    private static bool Has(JsonElement item, string key) => item.ValueKind == JsonValueKind.Object && item.TryGetProperty(key,out _);
    private static string S(JsonElement item, string key) => item.TryGetProperty(key,out var v) ? v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : v.ToString() : "";
    private static bool B(JsonElement item, string key) => item.TryGetProperty(key,out var v) && v.ValueKind == JsonValueKind.True;
    private static double N(JsonElement item, string key) => item.TryGetProperty(key,out var v) && v.TryGetDouble(out var n) ? n : 0;
    private static int NestedInt(JsonElement item, string parent, string key) => item.TryGetProperty(parent,out var p) && p.ValueKind == JsonValueKind.Object && p.TryGetProperty(key,out var v) && v.TryGetInt32(out var n) ? n : 0;
    private static object? Primitive(JsonElement value) => value.ValueKind switch { JsonValueKind.String => value.GetString(), JsonValueKind.Number when value.TryGetInt64(out var i) => i, JsonValueKind.Number => value.GetDouble(), JsonValueKind.True => true, JsonValueKind.False => false, _ => null };
    private static string NormalizeKey(string key) => key switch { "eventType" => "event_type", "eventID" => "event_id", _ => key };
    private static string Label(string key) => Labels.TryGetValue(key,out var value) ? value : CultureInfo.GetCultureInfo("pt-BR").TextInfo.ToTitleCase(key.Replace('_',' '));
    private static string Format(string key) => key switch { "last_seen" or "time" or "last_login" or "date_installed" or "modified_time" => "date", "needs_reboot" or "installed" or "downloaded" or "is_active" or "is_superuser" => "boolean", "cpu_percent" => "percent", "memory_mb" => "megabytes", "risk_score" or "health_score" => "score", "status" or "status_pt" or "priority" or "severity" => "badge", _ => "text" };
    private static string StatusPt(string value) => value switch { "online" => "Online", "overdue" => "Comunicação atrasada", "offline" => "Offline", _ => string.IsNullOrWhiteSpace(value) ? "Não informado" : value };
    private static int StatusOrder(string value) => value switch { "offline" => 0, "overdue" => 1, "online" => 2, _ => 3 };
    private static bool IsLegacyOs(string value) => value.Contains("Windows 7",StringComparison.OrdinalIgnoreCase) || value.Contains("Windows 8",StringComparison.OrdinalIgnoreCase) || value.Contains("Windows XP",StringComparison.OrdinalIgnoreCase) || value.Contains("Windows 10",StringComparison.OrdinalIgnoreCase);
    private static string OsFamily(string value) => value.Contains("Windows 11",StringComparison.OrdinalIgnoreCase) ? "Windows 11" : value.Contains("Windows 10",StringComparison.OrdinalIgnoreCase) ? "Windows 10" : value.Contains("Server",StringComparison.OrdinalIgnoreCase) ? "Windows Server" : value.Contains("Linux",StringComparison.OrdinalIgnoreCase) ? "Linux" : "Outros / legados";

}
