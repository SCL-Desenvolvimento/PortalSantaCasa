# Fluxos internos da Santa Casa

Os novos módulos ficam em **Serviços internos** no menu da área autenticada. O cadastro de treinamentos e o acompanhamento continuam em **Cursos e Materiais**. A página Formulários também oferece acesso direto às solicitações internas.

- **POPs e comunicados.** A Qualidade pode publicar para outros setores. Cada publicação com ciência registra as contas ativas do setor naquele momento. Uma revisão gera outra versão no mesmo link. Editores do setor podem acompanhar suas pendências. Compartilhe o link com a equipe para iniciar o piloto.
- **Ramais e serviços.** Editores e administradores mantêm os contatos do próprio setor. A busca do Portal encontra os registros ativos para usuários autenticados. Cadastre os ramais e canais reais antes de divulgar o guia.
- **Treinamentos.** Configure uma trilha, setores ou pessoas, prazo, lembrete e reciclagem no cadastro do curso. A rotina diária roda às 7h de Brasília. Ela incorpora novos membros das trilhas, envia lembretes individuais e registra a conclusão anterior ao iniciar uma reciclagem.
- **Solicitações internas.** O piloto de segunda via de crachá entra na fila do Departamento Pessoal. A equipe define prazo e andamento. O colaborador consulta o protocolo e o retorno pelo Portal.
- **Contingência de TI.** A Informática publica o aviso com o procedimento aprovado. Os setores podem baixar uma cópia datada para consulta sem acesso ao Portal. Distribua uma cópia atualizada nos postos que precisem dela.

## Atualização do MySQL existente

1. Faça backup do banco e verifique a persistência de `Uploads/Documentos`, onde ficam armazenados os PDFs de POP. A migração pressupõe o esquema do Portal já instalado, incluindo `courses`, `usercourses` e `notifications`.
2. Com a configuração do ambiente apontando para o banco correto, execute o comando abaixo antes de trocar a versão da aplicação. Configure `ConnectionStrings__PortalSclConnectionString` e `Jwt__Key`, `Jwt__Issuer` e `Jwt__Audience` pelo mecanismo de configuração do ambiente.

   ```powershell
   dotnet ef database update StaffOperations --project PortalSantaCasa.Server --context PortalSantaCasaDbContext
   ```

3. Verifique a entrada `20261116184717_StaffOperations` em `__EFMigrationsHistory`. Confira um curso e seu progresso anterior. Após publicar a aplicação, entre com contas de teste de setores distintos e confira os novos módulos e seus escopos.

O EF registra a migração e pula sua execução quando ela já foi aplicada. Se o MySQL interromper a execução durante uma alteração de esquema, compare as tabelas e colunas do banco com a migração antes de repetir. Em caso de reversão da aplicação, mantenha as tabelas, colunas e PDFs já gravados. Voltar a migração remove os registros dos novos módulos.
