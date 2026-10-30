# Infraestrutura de produção e gateway independente

O build executa em runner hospedado e produz artefatos também em pull requests e em `workflow_dispatch` de branches de preparação. O deploy exige a branch `master` e nunca executa em PRs. O checkout e os artefatos usam o SHA da execução.

Antes de copiar qualquer arquivo para produção, o workflow exige `/usr/local/sbin/scl-https-gateway check`: o marcador de migração concluída e o gateway saudável precisam existir. A primeira instalação é responsabilidade do procedimento de migração do repositório `SCL-Desenvolvimento/SCL.HTTPS.Gateway`; este Action não realiza a troca inicial de HTTPS. Mantenha os workflows suspensos durante essa janela e não reexecute workflows antigos após a troca.

## Arquivos sincronizados

`sync-infrastructure.sh SOURCE DEPLOY` copia somente `Dockerfile`, `Dockerfile.realtime`, `docker-compose.yml`, `entrypoint.sh` e a pasta pública `gateway/`. Valida leitura, sintaxe do entrypoint, links simbólicos, caminhos independentes e escrita em todos os destinos antes da primeira cópia. Não remove arquivos extras. Uma falha de disco durante a cópia pode exigir repetir a sincronização.

O script preserva `.env`, `.gateway.env`, uploads, binários existentes, certificados e dados. O único cadastro HTTPS da aplicação é `gateway/site.json`; os scripts e configurações HTTPS anteriores foram removidos deste repositório. O gateway independente administra os certificados e continua usando o volume existente `intranet_letsencrypt_intranet`, que não deve ser removido. Backups e imagens de reversão são preservados fora deste código.

## Rede e confiança no proxy

App e Realtime participam da rede externa `scl-https-proxy`, com aliases `scl-intranet` e `scl-intranet-realtime`. Ambos exigem o arquivo operacional `.gateway.env`, gerado pela migração com `ReverseProxy__KnownProxy=IPV4_DO_GATEWAY`. Não versione esse arquivo. O middleware aceita o protocolo e IP encaminhados somente desse proxy e limita a cadeia a um salto. IP configurado inválido falha claramente; desenvolvimento sem configuração conserva a confiança restrita padrão em loopback.

A API executa somente .NET, escuta em `0.0.0.0:8080` e não publica porta nova no host. Esta limpeza não altera código da aplicação, runtime .NET, Uploads ou redes de banco, Redis e RabbitMQ. O manifesto `gateway/site.json` conserva o domínio, certificado, limite de 600M e `/realtime/` com retirada do prefixo, WebSocket e timeout de 86400 segundos.

## Publicação e permissões

O runner precisa de acesso Docker e escrita apenas no contexto público `/home/santacasalorena-org-br/intranet/docker`, nos Dockerfiles, Compose, entrypoint e `gateway/`. A migração prepara essas permissões. Corrija somente os caminhos indicados pelo preflight; não altere a propriedade de segredos ou dados.

Depois de validar o runtime .NET e recriar somente `app` e `realtime`, o workflow verifica HTTP da API e conexão do Realtime pela rede compartilhada. Em seguida executa `/usr/local/sbin/scl-https-gateway publish --repository "$GITHUB_REPOSITORY" --file "$DEPLOY_PATH/gateway/site.json"`. A publicação atualiza somente o cadastro da intranet; renovação, lock, Nginx e cron pertencem ao gateway independente. O deploy da aplicação não recria o gateway.

## Verificação local

```bash
bash .github/scripts/tests/sync-infrastructure.test.sh
python3 -B -m unittest discover -s .github/scripts/tests -p 'test_*.py' -v
dotnet test PortalSantaCasa.Server.Tests/PortalSantaCasa.Server.Tests.csproj --configuration Release -p:SkipAngularBuild=true
```

Os testes usam diretórios temporários e middleware real de headers encaminhados; não acessam produção. Casos de permissões e links podem ser ignorados no Windows e continuam ativos no CI Linux. Imagem, rede, login/cookies, TLS e WebSocket precisam dos gates operacionais descritos no guia do gateway.
