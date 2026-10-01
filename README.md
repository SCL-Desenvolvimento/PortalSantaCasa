# Portal Santa Casa

Portal em Angular 21, com API e serviço Realtime em ASP.NET Core 10.

## Ambiente

- SDK .NET 10.0.400 ou patch posterior da mesma linha, conforme `global.json`.
- Node.js 24 e npm 11; o frontend inclui `.nvmrc`.
- Chrome para os testes Angular em modo headless.
- MySQL, RabbitMQ e Redis para executar as integrações da aplicação.

As configurações locais são carregadas de `appsettings.Development.local.json`
nos respectivos projetos. Esses arquivos são ignorados pelo Git e excluídos
da publicação. Não copie credenciais para arquivos versionados.

## Dependências e compatibilidade

Angular 21 utiliza TypeScript 5.9. A atualização mantém Zone.js para os módulos
e componentes existentes, e migra os templates para `@if` e `@for`.

O backend utiliza .NET 10, mas mantém Entity Framework Core 9.0.20 e Pomelo 9.0.0:
o provedor MySQL disponível exige EF Core 9. A ferramenta `dotnet-ef` e os provedores
de teste acompanham a mesma versão. MassTransit permanece na série 8.

O `package-lock.json` fixa a árvore npm. Quill fica em 2.0.2 porque a versão 2.0.3
tem um alerta de XSS; o override de Piscina 5.3.2 corrige uma vulnerabilidade
na dependência transitiva do build Angular. Revise esses pins ao atualizar os pacotes.

Referências: [compatibilidade Angular](https://angular.dev/reference/versions),
[Pomelo](https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql),
[alerta Quill](https://github.com/advisories/GHSA-v3m3-f69x-jf25) e
[alerta Piscina](https://github.com/advisories/GHSA-67c8-pqhq-4rmx).

## Build e testes

Na pasta `portalsantacasa.client`:

```powershell
npm ci
npm audit --audit-level=moderate
npm run test:ci
npm run build -- --configuration production
```

Na raiz do repositório:

```powershell
dotnet test PortalSantaCasa.Server.Tests/PortalSantaCasa.Server.Tests.csproj --configuration Release -p:SkipAngularBuild=true -p:TreatWarningsAsErrors=true
dotnet list PortalSantaCasa.Server/PortalSantaCasa.Server.csproj package --vulnerable --include-transitive
dotnet list PortalSantaCasa.Realtime/PortalSantaCasa.Realtime.csproj package --vulnerable --include-transitive
```

Para desenvolver, execute `npm start` no frontend e os projetos Server e Realtime
com `dotnet run --project <caminho-do-csproj>`. O frontend usa HTTPS local;
o script de preparação utiliza o certificado de desenvolvimento do .NET.

## Publicação

O publish manual do Server executa `npm ci`, compila o Angular em produção e inclui
os arquivos em `wwwroot/browser` no pacote:

```powershell
dotnet publish PortalSantaCasa.Server/PortalSantaCasa.Server.csproj --configuration Release --output .codex-build/publish/app -p:TreatWarningsAsErrors=true
dotnet publish PortalSantaCasa.Realtime/PortalSantaCasa.Realtime.csproj --configuration Release --output .codex-build/publish/realtime -p:TreatWarningsAsErrors=true
```

Quando o Angular já foi compilado, acrescente `-p:SkipAngularBuild=true` ao publish
do Server. A publicação verifica se `wwwroot/browser/index.html` existe e coleta
os arquivos após o build, evitando recompilações tardias e referências a bundles antigos.

O workflow de produção usa Dockerfiles e Docker Compose que ficam no servidor,
fora deste repositório. **As imagens de `app` e `realtime` precisam incluir
ASP.NET Core 10**, por exemplo `mcr.microsoft.com/dotnet/aspnet:10.0`.
O workflow verifica o runtime das imagens antes de recriar os containers.
Verifique também a atualização do runner para as versões de actions utilizadas.

Antes de publicar em produção, valide as integrações reais em homologação.
Os testes automatizados utilizam bancos em memória/SQLite e substituem os serviços
externos; não validam a conexão ao MySQL, ao RH, ao RabbitMQ ou ao Redis de produção.
Esta modernização não cria nem aplica migrations no banco.
Se houver alterações locais de modelo/migrations, revise-as separadamente antes
de habilitar `Database:ApplyMigrationsOnStartup`.
