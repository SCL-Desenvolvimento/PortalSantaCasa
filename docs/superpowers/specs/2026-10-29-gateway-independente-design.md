# Gateway HTTPS independente

Data: 29/10/2026. Estado: desenho para revisão e aprovação, sem implementação ou alterações remotas.

## Intenção e decisão do usuário

O usuário escolheu separar o gateway da intranet. Quer adicionar outros sistemas sem copiar scripts Certbot, criar um cron por site ou alterar o Dockerfile do gateway a cada inclusão. Cada aplicação deve continuar publicando sua própria infraestrutura pelo GitHub Actions.

Foram apresentadas duas alternativas: padronizar dentro do container da intranet, com menos alterações iniciais, ou criar um gateway independente, com uma migração inicial maior e manutenção separada. A segunda foi escolhida. Não será trocado o Nginx por outro produto nem criado um painel administrativo.

## Estado confirmado

- Host: docker-w3, 10.10.14.10. Portas 80/443 pertencem hoje a `fe-intranet-sp-santacasalorena-org-br`.
- O mesmo container executa .NET 10, Nginx e Certbot. A API da intranet escuta em 127.0.0.1:8080. O Nginx encaminha `/realtime/` para `realtime:8080/`, com WebSocket e timeouts próprios.
- Relatórios executa em `fe-trm-relatorios-sp-santacasalorena-org-br`, HTTP 8082:8080, usuário app UID/GID 1654. O Compose atual contém bind `./data:/app/Data`; não modificar essa persistência.
- Os dois domínios já resolvem para 10.10.14.10. O usuário confirmou 200 OK e TLS sem ignorar validação para ambos.
- Certificados separados no volume existente `intranet_letsencrypt_intranet`. Certificado de Relatórios emitido em 29/10/2026, validade informada até 27/01/2027. Não solicitar nova emissão de produção desses certificados apenas para mudar o gateway.
- Credencial Cloudflare: `/etc/letsencrypt-secrets/intranet/cloudflare.ini`, root 0600. Caminho interno de credenciais já salvo: `/run/letsencrypt-secrets/cloudflare.ini`.
- Cron intranet às 03:17/15:17; Relatórios às 03:27/15:27, fuso do servidor. Lock compartilhado persistente: `/var/lib/scl-https-gateway/operation.lock`, root:docker 0660.
- Um Ctrl+C no cliente Docker deixou Certbot ativo no container. Uma espera aleatória de 384 segundos foi observada durante teste manual. Os testes interativos futuros desabilitam somente essa espera aleatória; o prazo DNS continua explícito.
- Bases locais limpas inspecionadas: PortalSantaCasa, branch Melhoria, HEAD 6dbd81e; GestaoTI.Relatorios, branch main, HEAD 751f1c8. Os próximos trabalhos devem preservar alterações independentes do usuário.

## Organização proposta pelo agente

Nomes são escolhas propostas, não exigências já dadas pelo usuário:

- Novo projeto local: `C:/Users/rossini.alves/source/repos/SCL-Desenvolvimento/SCL.HTTPS.Gateway`.
- Novo repositório GitHub proposto: `SCL-Desenvolvimento/SCL.HTTPS.Gateway`, privado. Preparação local não implica publicar, criar commits ou fazer push. Registrar o remoto e autorizar runner são etapas separadas, descritas no guia.
- Contexto no host: `/home/santacasalorena-org-br/https-gateway/docker`.
- Container: `scl-https-gateway`. Único publicador das portas 80/443 após a troca.
- Rede bridge externa compartilhada: `scl-https-proxy`. Cada aplicação mantém também sua rede atual para banco, Redis, RabbitMQ e demais dependências.
- Gateway com Nginx, Certbot, plugin Cloudflare, OpenSSL e controlador genérico Python/Bash. Base Ubuntu 24.04 para manter a família de pacotes já usada no gateway atual. Sem socket Docker dentro do container.
- Um único volume de certificados: reutilizar o volume existente, declarado externo pelo gateway e protegido de remoção pelo Compose da intranet. Manter o caminho do token atual evita movimentar o segredo e mantém compatibilidade com as configurações de renovação salvas.

## Responsabilidade de cada projeto

### SCL.HTTPS.Gateway

Versiona Dockerfile/Compose do gateway, configuração base Nginx, controlador, modelos de site, teste, migração, reversão, wrapper de renovação, cron e rotação de log. Seu Action constrói e atualiza somente o gateway, após validar a imagem candidata contra o estado persistente. Nunca sincroniza com exclusão a pasta de sites já publicados.

O pipeline do novo repositório precisa de runner autorizado no docker-w3. Pode usar runner de organização com acesso a esse repositório ou uma instalação própria, conforme as permissões reais. O guia não pressupõe que um runner exclusivo de outra aplicação possa executar jobs deste repositório. A primeira instalação usa pacote/manual e não depende de um runner novo já existir.

### PortalSantaCasa

Dockerfile da aplicação deixa de instalar Nginx/Certbot; inicialização passa a executar somente a API. Kestrel escuta em 0.0.0.0:8080 dentro da rede Docker; não publicar essa porta nova no host. Preservar o usuário atual do processo, configurações, Uploads e redes de dados. App e Realtime recebem aliases únicos na rede compartilhada, por exemplo `scl-intranet` e `scl-intranet-realtime`.

Compose remove 80/443 e montagens TLS da API. A definição antiga do volume é retirada de propriedade do ciclo da aplicação, sem apagar o volume. Arquivos de Nginx/Certbot antigos podem permanecer arquivados; não são executados nem sincronizados como infraestrutura ativa. O Action deixa de validar Nginx na imagem da API e deixa de recriar o gateway. Mantém build, testes e deploy de app/Realtime; publica apenas o cadastro da intranet no controlador comum.

### GestaoTI.Relatorios

Mantém imagem, UID/GID, bind Data e porta 8082 atuais. Acrescenta a rede compartilhada e alias único `scl-relatorios`. O Action continua atualizando somente sua API e publica apenas seu cadastro. Deixa de depender de montagens ou scripts executados no container da intranet.

## Cadastro e comportamento dos sites

Cada aplicação versiona um arquivo público, proposto como `gateway/site.json`. Campos básicos: identificador estável, domínio e destino HTTP/HTTPS. JSON permite validar com a biblioteca padrão Python, sem nova dependência YAML. Certificado usa por padrão o nome do domínio; a associação permanece estável durante esta migração.

Cadastro da intranet também representa `/realtime/`, retirada do prefixo no upstream, suporte WebSocket e timeouts atuais. Preservar o limite 600M dos dois sites e os headers encaminhados. Novos sites comuns precisam somente dos campos básicos; regras excepcionais não exigem criar outro script de renovação.

O controlador valida esquema, nomes, caminhos, domínio duplicado e conflitos com outros sites antes de gravar. Só altera o site solicitado. Nenhum token, PEM, chave privada, banco ou configuração de aplicação entra no cadastro ou no Git. Publicação repetida do mesmo cadastro deve ser idempotente, sem reemitir certificado nem recarregar sem necessidade.

O cadastro persistente associa site, domínio e repositório proprietário. A migração registra intranet → SCL-Desenvolvimento/PortalSantaCasa e relatorios → SCL-Desenvolvimento/GestaoTI.Relatorios. O Action informa seu repositório; o controlador rejeita alterações de um cadastro atribuído a outro repositório. Um identificador novo pode ser registrado na primeira publicação se identificador/domínio não estiverem ocupados; a associação é gravada atomicamente. Mudar domínio ou transferir propriedade de site existente requer comando administrativo explícito. Essa regra impede conflitos acidentais; não constitui isolamento de segurança contra um runner malicioso que já possui acesso administrativo ao Docker. Manter o modelo atual de runners confiáveis, sem criar uma API pública de administração.

O host possui registros publicados e estado habilitado persistentes fora do checkout. A imagem do gateway contém código e modelos; atualizar a imagem não substitui esse estado nem apaga cadastros de outros projetos. Atualização de configuração ativa é atômica, com restauração da configuração anterior se `nginx -t`, recarga ou verificação TLS falhar.

Para um site novo: validar cadastro, testar DNS-01 em staging, emitir certificado real, conferir PEMs e só então habilitar configuração. Falha antes disso mantém os sites existentes funcionando. A alteração inicial do registro A continua sendo feita pelo operador depois do teste direto, como já foi realizado em Relatórios; o controlador não muda os registros A existentes automaticamente.

## Rede, descoberta e headers

Os destinos dos três serviços usam aliases Docker estáveis, não IPs dinâmicos dos containers. A resolução Nginx deve funcionar durante recriações dos backends. Não permitir que um backend temporariamente ausente impeça o gateway de iniciar ou recarregar os outros sites. A implementação pode usar resolver Docker e proxy por variável, com testes específicos de preservação da URI de `/realtime/`.

A intranet já usa ForwardedHeaders com confiança padrão em loopback; a saída do proxy do mesmo container exige atualizar essa confiança. Relatórios não possui middleware ForwardedHeaders no código atual. Configurar os dois para aceitar headers somente do gateway confiável, antes dos middlewares que os usam. Não habilitar confiança irrestrita em proxies.

Escolha proposta para obter identidade estável: provisionar a rede externa, obter seu IPAM real e reservar um IPv4 disponível para o gateway. Persistir essa escolha em configuração operacional e disponibilizar o endereço aos dois aplicativos por arquivo de ambiente gerado, separado dos segredos existentes. Não fixar uma sub-rede arbitrária no código; verificar conflitos antes da troca. Se não houver rede/IP seguro, interromper a preparação e pedir diagnóstico ao operador. Backend IPs continuam dinâmicos e são resolvidos por alias. O gateway conserva seu IP quando for recriado.

O IP usado pelos clientes, os dois nomes DNS e os certificados permanecem iguais. Não é necessária nova alteração de DNS nesta migração.

## Renovação e concorrência

Uma rotina central verifica os certificados gerenciados e renova os elegíveis. Um hook genérico associa RENEWED_LINEAGE ao cadastro, testa o Nginx, recarrega e confirma a impressão digital SHA-256 pelo SNI correto. Mantém pendência persistente até confirmar; a rotina também tenta pendências sem uma nova emissão.

Trocar os dois cron jobs por um, duas vezes por dia, inicialmente 03:17/15:17. Logs e rotação são centrais; conservar logs anteriores. Não instalar um cron por site novo. O horário é escolha proposta do agente.

Todas as operações que mudam sites ou certificados compartilham o lock atual, sem substituir seu inode. Operações dentro do gateway mantêm a posse do lock no processo dentro do container, durante toda a operação; assim perder o cliente Docker não libera uma transação ainda ativa. Operações administrativas de troca da imagem usam o mesmo lock no host. Evitar aquisição aninhada do mesmo recurso. O controlador informa fases e permite consultar o resultado por log, mesmo quando a conexão SSH termina.

Cada operação possui identificador, tipo, fase, início, processo supervisor e resultado persistidos atomicamente. Consulta de status não exige obter o lock da operação ativa. Perder o cliente deixa o supervisor terminar normalmente. Antes de parar/recriar o gateway, o operador consulta o estado e o procedimento aguarda o lock com prazo limitado e mensagens de progresso; expirar o prazo interrompe a troca sem parar os serviços. Uma necessidade real de cancelamento usa o identificador da operação e sinalização graciosa ao supervisor, nunca PID copiado de saída antiga. O supervisor termina e espera seu filho Certbot, faz a limpeza/reversão da fase não confirmada, preserva certificados e pendências e só então libera o lock. Se o filho não terminar, a troca é recusada; não aplicar SIGKILL nem apagar locks automaticamente. Repetição após queda reconhece o estado incompleto e recupera a transação antes de aceitar outra alteração. Um site já validado e confirmado não é desabilitado por cancelar somente a simulação final.

Os dois nomes administrativos já usados (`renew-intranet-certificate` e `renew-relatorios-certificate`) viram wrappers de compatibilidade que chamam o novo controlador com escopo do site. São arquivos root fora das pastas sobrescritas pelos Actions. Também manter compatibilidade com os dois caminhos antigos de deploy hook que podem estar salvos no volume. Isso permite preservar os certificados e renovar sem editar manualmente os arquivos internos do Certbot.

## Migração e reversão

1. Preparar e testar localmente os três projetos e gerar um pacote com código público, guia e comandos absolutos. Docker real não está disponível nesta máquina; os testes reais de imagem/rede/TLS são gates no host, sem alegação de sucesso remoto antecipado.
2. Combinar janela breve para a troca das portas e suspender publicações dos três workflows durante a migração. Não reexecutar versões antigas dos Actions após a troca. Os novos Actions recusam deploy antes do marcador de migração concluída, evitando retirar HTTPS antes da instalação do gateway.
3. No host, conferir identidade/IP, containers e configuração reais, ausência de Certbot ainda ativo, volume e token; obter o lock. Salvar Compose/Dockerfiles/entrypoints antigos dos dois aplicativos, suas imagens por ID e tag de backup, variáveis/arquivos operacionais com seus modos, configurações públicas, wrappers, crons, estado e cópia protegida do armazenamento de certificados. Preservar também a imagem e o Compose de Realtime se sua definição for alterada. Não imprimir segredos.
4. Preparar rede/IP, diretórios, configurações e imagens candidatas sem parar a instalação atual. Validar sintaxe Nginx e leitura dos certificados na imagem nova. As alterações de confiança no proxy exigem compilar/publicar as duas APIs: preparar previamente artefatos completos de SHAs selecionados e testados, com identificação no pacote e backup dos artefatos atualmente publicados no servidor. Não presumir que uma variável habilita middleware ausente. Não misturar binários de versões diferentes nem migrar dados de negócio. Não iniciar uma segunda instância da API para evitar duplicar serviços em background.
5. Na troca, retirar o container antigo da intranet das portas 80/443, recriar sua API sem essas portas, atualizar Relatórios com os novos binários/configuração de proxy confiável e iniciar o gateway independente. Realtime recebe a rede prevista nessa janela. Não recriar banco, Redis ou RabbitMQ. Verificar a presença da rede compartilhada em todos os backends antes de depender de seus aliases, preservando nomes e dados. Os artefatos já estão preparados; não compilar durante a interrupção.
6. Verificar configuração, fingerprints TLS, raiz dos dois sites, login/cookie e `/realtime/`, incluindo WebSocket. Comprovar que a aplicação vê protocolo/IP encaminhados corretamente. Se falhar, executar a reversão antes de declarar a troca concluída.
7. Somente depois dos testes, instalar cron único e wrappers compatíveis, desabilitar crons antigos conservando cópias fora de /etc/cron.d, gravar marcador de migração, publicar as novas versões aprovadas dos Actions e liberar deploys.
8. Provar que publicar ou recriar a intranet não recria o gateway nem interrompe HTTPS de Relatórios. Provar que os dois certificados e os dados persistem. Retenção dos backups é explícita; não excluir arquivos, volumes, imagens anteriores ou remover redes antigas automaticamente.

Reversão: confirmar que não há operação ativa, parar o gateway novo para liberar 80/443; restaurar Compose/Dockerfile/entrypoint, arquivos de ambiente, artefatos e imagem antiga de ambas as APIs e de Realtime se alterado; restaurar wrappers e crons antigos; iniciar a topologia original; conferir os dois sites. Isso também restaura a confiança original de Relatórios no proxy anterior. Não restaurar dados da aplicação para uma versão antiga. Preservar o volume atual de certificados: não restaurar o snapshot antigo sobre certificados potencialmente mais recentes. Os arquivos/configurações que sustentam a topologia antiga permanecem disponíveis durante a janela de compatibilidade. Redes adicionais sem conflito podem permanecer, sem forçar remoção. A reversão precisa ser repetível e indicada no registro persistente de migração, inclusive para retomada manual após reinicialização do host durante a janela.

## Critérios de aceite

- Os dois sites usam os mesmos nomes e certificados, via gateway próprio em 10.10.14.10.
- App da intranet não executa Nginx/Certbot nem publica 80/443; gateway é o único proprietário dessas portas.
- Realtime, prefixo de URI, autenticação, cookies e headers continuam funcionando.
- Atualizar app/Realtime ou Relatórios não recria o gateway. Atualizar o gateway conserva sites publicados e o volume existente.
- Novo site comum entra por cadastro/publicação, sem Dockerfile, hook ou cron novo.
- Falhas de staging, certificado, configuração, reload ou interrupção não deixam referência habilitada a PEM ausente e não desabilitam um site já validado por causa de um teste final cancelado.
- Uma aplicação indisponível não impede HTTPS/configuração dos outros sites de funcionar.
- Renovação, pendências e concorrência têm testes; o caminho antigo de rollback e os controles de branch dos Actions são preservados.
- Nenhum segredo, dado ou certificado é enviado ao Git. Nenhum commit, push, emissão, deploy ou DNS é executado pelo agente nesta fase de desenho.

## Limites e escolhas restantes

Não inclui alta disponibilidade, outro host, migração do Nginx 10.10.14.4, painel web, troca de produto, certificado wildcard compartilhado ou alterações de negócio. Essa separação reduz a dependência entre deploys, mas o gateway e o host ainda são pontos compartilhados de disponibilidade.

O implementador decide nomes internos de funções, organização dos testes e detalhes dos modelos, mantendo os contratos acima. O nome proposto do repositório, o diretório, o formato JSON, a base Ubuntu, a rede externa, o IP estável para confiança e o horário único são escolhas do agente abertas à correção do usuário. A preparação inicial não depende de permissão para criar/publicar um repositório remoto.

## Referências verificadas

- Docker: redes externas entre projetos e resolução por nome: https://docs.docker.com/compose/how-tos/networking/
- Docker: reaproveitamento de volume com external/name: https://docs.docker.com/reference/compose-file/volumes/
- Nginx: proxy_pass, resolução e comportamento da URI: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Certbot: renovação, hooks e reconfigure: https://eff-certbot.readthedocs.io/en/latest/using.html
- ASP.NET Core: proxies confiáveis e ordem do middleware: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0

## Revisão de viabilidade do desenho

Um revisor independente avaliou o documento como base de planejamento. As três dúvidas materiais foram respondidas no próprio desenho: reversão inclui as duas APIs e os artefatos de confiança no proxy; cadastro mantém proprietário e explicita os limites do acesso Docker; operações têm consulta, espera e cancelamento gracioso antes de uma troca. Essas decisões são propostas técnicas do agente, sem novos pedidos de funcionalidade ao usuário.
