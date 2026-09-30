# Benefícios

Antes de publicar esta versão, execute `20260930_add_benefits.sql` no banco MySQL do portal. O script cria somente a tabela `benefits` e pode ser executado novamente sem apagar registros.

As migrations existentes são ignoradas pelo repositório. Este script versionado deve ser aplicado no processo de implantação; `Database:ApplyMigrationsOnStartup` não executa arquivos SQL desta pasta. Em ambientes que mantêm migrations do Entity Framework fora do Git, gere uma migration para a entidade `Benefit` em vez de criar a tabela duas vezes.

Após a atualização, entre com um administrador e acesse **Serviços > Benefícios** (`/admin/benefits`). Cadastre um benefício e marque **Publicar na página de benefícios**. Confira sua exibição em `/beneficios`, sem login. Desmarque a publicação para retirá-lo da página pública sem apagar o cadastro. Confirme também a edição, a exclusão e que usuários sem perfil administrativo não conseguem acessar os endpoints de escrita ou `/api/benefits/admin`.
