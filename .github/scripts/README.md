# Infraestrutura de produção

O workflow de produção mantém o contexto de build do servidor atualizado a partir do mesmo commit usado para publicar a aplicação. A execução continua ocorrendo por push na branch `master` ou por acionamento manual. A criação de uma pull request, sozinha, não dispara esse workflow.

## Arquivos sincronizados

`sync-infrastructure.sh` recebe o diretório do repositório e o diretório de produção. Copia `Dockerfile`, `Dockerfile.realtime`, `docker-compose.yml`, `entrypoint.sh` e os arquivos das pastas `nginx` e `certbot`, incluindo subpastas.

A sincronização verifica todos os arquivos obrigatórios, a sintaxe dos dois scripts usados pela imagem e as permissões de escrita antes da primeira cópia. Origem e destino precisam estar em diretórios independentes. Links simbólicos nas fontes ou nos caminhos de destino são recusados. Uma cópia interrompida por falha de disco ou alteração concorrente ainda pode ficar parcial; corrija a causa e execute novamente.

Arquivos extras já existentes nessas duas pastas não são excluídos. `.env`, token Cloudflare, certificados, volumes e os diretórios `app` e `realtime` não são copiados nem removidos por esse script. A publicação dos binários continua nas etapas existentes do workflow.

O Dockerfile determina quais arquivos desse contexto entram na imagem. Hoje ele usa `nginx/intranet.conf` e `certbot/reload-nginx.sh`. Ao adicionar novos includes ou scripts que precisem entrar na imagem, ajuste também o Dockerfile.

O runner e o cron de renovação instalados no host continuam nos caminhos administrativos definidos durante a instalação. Copiar um arquivo para a pasta `certbot` do contexto de build não altera automaticamente `/usr/local/sbin` nem `/etc/cron.d`.

## Preparação única das permissões

O job executa no servidor como `github-runner`. Alguns arquivos foram instalados inicialmente como `root`; eles precisam permitir que o runner atualize a infraestrutura. Execute uma vez no servidor, antes do primeiro deploy com este workflow:

```bash
DEPLOY=/home/santacasalorena-org-br/intranet/docker

sudo chown github-runner \
  "$DEPLOY" \
  "$DEPLOY/Dockerfile" \
  "$DEPLOY/Dockerfile.realtime" \
  "$DEPLOY/docker-compose.yml" \
  "$DEPLOY/entrypoint.sh" \
  "$DEPLOY/nginx" \
  "$DEPLOY/nginx/intranet.conf" \
  "$DEPLOY/certbot" \
  "$DEPLOY/certbot/reload-nginx.sh"
```

O comando mantém o grupo atual e não faz alteração recursiva. Ele não inclui `.env`, o diretório de credenciais `/etc/letsencrypt-secrets`, certificados ou dados. Se o serviço do runner usar outro usuário, utilize esse usuário no comando. Novos arquivos sincronizados serão criados pelo próprio runner.

Caso já existam outros arquivos ou subpastas de infraestrutura com propriedade `root`, ajuste também a propriedade desses caminhos específicos. O script informa qual caminho precisa de escrita e interrompe o deploy antes da cópia.

## Validação e publicação

O CI executa os testes do sincronizador antes de compilar a aplicação. O job de deploy faz checkout do SHA da execução, sincroniza a infraestrutura e mantém as etapas atuais de publicação dos binários.

Após construir as imagens, o workflow valida o runtime .NET, a configuração Nginx, a sintaxe do hook, a instalação do plugin Cloudflare e a leitura da credencial. A validação usa um container temporário sem publicar portas e sem iniciar a aplicação. Somente nesse container, o nome `realtime` é resolvido para `127.0.0.1` em `/etc/hosts`, permitindo testar sintaxe e certificados mesmo que o Realtime anterior esteja parado. `nginx -t` não testa a conectividade com o upstream. O container publicado continua usando a resolução normal da rede Docker. A validação não emite certificados nem chama a API da Cloudflare.

Os containers em execução só são recriados depois dessas validações. Se a configuração nova falhar, corrija o commit e execute o workflow novamente. Os arquivos do contexto de build já podem ter sido atualizados, mas o container anterior continua em execução até a etapa de publicação.

## Testes locais

```bash
bash .github/scripts/tests/sync-infrastructure.test.sh
bash -n .github/scripts/sync-infrastructure.sh
```

Os testes usam diretórios temporários e executam o sincronizador real. Também executam o comando de validação extraído do workflow, com caminhos de filesystem mapeados para arquivos temporários e Nginx/Python simulados, para verificar que a ausência do Realtime não impede a validação e que um erro do Nginx continua interrompendo o passo. Não acessam Docker nem o servidor. Casos de permissões ou links podem ser ignorados quando o usuário ou sistema de arquivos local não permite reproduzi-los; o mesmo teste roda no Linux do CI.
