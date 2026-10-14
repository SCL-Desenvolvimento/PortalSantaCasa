# Identificação de acessos CLT e PJ

O modal compartilhado de Notícias, Comunicados e Qualidade exige a escolha de vínculo. CLT consulta a chapa no RH existente. PJ valida o CPF e consulta o Oracle nas tabelas `USUARIOS` (`CPF`, `NM_USUARIO`) e `PRESTADOR` (`NR_CPF_CGC`, `NM_PRESTADOR`). A consulta usa `ROW_NUMBER()` por CPF, priorizando o cadastro de `USUARIOS` (prioridade 1) sobre `PRESTADOR` (prioridade 2), e retorna uma única identificação. O CPF é normalizado para 11 dígitos e a consulta utiliza o parâmetro `:cpf`.

A consulta fornecida não retorna setor; os PJs são registrados com `Prestador PJ`. Se houver uma coluna ou relacionamento para o setor, ajuste `OraclePj:LookupSql` para retornar os aliases `NOME` e `SETOR`. A consulta deve retornar apenas o cadastro correspondente ao CPF. Cadastros ausentes, duplicados ou incompletos não permitem registrar o acesso.

## Desenvolvimento

Em `PortalSantaCasa.Server/appsettings.Development.local.json`, a conexão fica em `ConnectionStrings:OraclePjConnectionString`, junto às demais conexões locais. O endereço Oracle já está configurado; preencha `User Id` e `Password` na connection string. A consulta fixa fica em `OraclePj:LookupSql` no `appsettings.json`, compartilhada por todos os ambientes. O arquivo local contém apenas a conexão Oracle junto às outras configurações locais; é ignorado pelo Git e não é publicado.

O usuário Oracle precisa ter acesso de leitura às tabelas `USUARIOS` e `PRESTADOR` (ou use o schema explícito em `LookupSql`). A conexão utiliza o driver gerenciado Oracle; não requer instalar Oracle Client no container. O acesso de rede ao host informado, porta 1521, deve estar disponível.

## Produção

1. Execute **uma vez**, no MySQL do portal existente, `PortalSantaCasa.Server/Migrations/20261014000100_AddAccessLogEmploymentType.sql`, antes de subir a nova versão. Ele adiciona `EmploymentType`, atribui `CLT` aos acessos históricos e registra a migration no histórico do EF. A configuração de produção mantém `Database:ApplyMigrationsOnStartup=false`. O script pressupõe que a tabela `publicaccesslogs` já existe.
2. Preencha no `.env` de produção as connection strings completas `PORTAL_SCL_CONNECTION_STRING`, `RH_CONNECTION_STRING`, `REDIS_CONNECTION_STRING` e `ORACLE_PJ_CONNECTION_STRING`. Os arquivos `.env` e `.env.example` incluem os modelos. Mantenha o banco, usuário e senha da conexão do portal consistentes com `MYSQL_DATABASE`, `MYSQL_USER` e `MYSQL_PASSWORD`, usados pelo serviço MySQL. A conexão Oracle segue este formato:

   ```dotenv
   ORACLE_PJ_CONNECTION_STRING='Data Source=(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=144.22.250.228)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=PRD1741.db1741.mv1741vcn.oraclevcn.com)));User Id=SEU_USUARIO;Password=SUA_SENHA;Connection Timeout=15;'
   ```

   Para valores com `$` ou `#`, utilize aspas simples conforme o formato `.env` do Docker Compose. `.env.example` lista todas as variáveis do compose, com modelos de connection strings e campos para preencher.
3. Utilize o `docker-compose.yml` atualizado e recrie o serviço `app` com a nova imagem. Tanto a cópia no repositório quanto o arquivo fornecido em Downloads foram atualizados. O compose recebe todas as connection strings prontas do `.env`: `PORTAL_SCL_CONNECTION_STRING` → `ConnectionStrings__PortalSclConnectionString`, `RH_CONNECTION_STRING` → `ConnectionStrings__RhConnectionString`, `REDIS_CONNECTION_STRING` → `ConnectionStrings__Redis` (realtime) e `ORACLE_PJ_CONNECTION_STRING` → `ConnectionStrings__OraclePjConnectionString`. A conexão completa, incluindo endereço, usuário e senha, vem do `.env`; a consulta permanece em `OraclePj:LookupSql` no `appsettings.json` publicado, compartilhado por todos os ambientes.

O relatório inclui vínculo, chapa/CPF e filtro CLT/PJ, inclusive nas exportações CSV e PDF e em todas as páginas exportadas. O identificador permanece na coluna `RE` para compatibilidade; `EmploymentType` distingue chapa de CPF. Para a pontuação existente, o identificador PJ recebe o prefixo `PJ:` para não colidir com uma chapa CLT.

A digitação manual existente continua disponível para CLT quando o RH fica indisponível. PJ exige confirmação do cadastro Oracle; falhas retornam indisponibilidade e permitem tentar novamente. Nenhuma credencial real foi adicionada, e a conexão real ao Oracle deve ser validada após configurar usuário e senha.
