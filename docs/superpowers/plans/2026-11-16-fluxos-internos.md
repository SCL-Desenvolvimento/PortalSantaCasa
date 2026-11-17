# Fluxos internos do Portal Santa Casa

> Use superpowers:subagent-driven-development para executar os módulos e integrar as verificações.

**Objetivo** — Entregar ciência de POPs, guia de ramais, treinamentos recorrentes, solicitações internas e avisos de contingência.

**Arquitetura** — Manter a API ASP.NET Core, EF Core/MySQL e a área autenticada em Angular. Cada módulo tem uma entrada no menu. As novas tabelas e colunas são adicionadas sem alterar o conteúdo publicado ou o progresso já registrado.

**Escopo** — As cinco funcionalidades aprovadas na conversa, com piloto de ciência configurável pela Qualidade e segunda via de crachá como serviço inicial.

- [x] POPs em `/admin/pops`. Publicar PDF com versão, responsável e revisão. Fixar os destinatários na publicação. Registrar ciência por versão e listar pendências com escopo por setor. Verificar acesso aos arquivos, histórico e confirmação repetida.
- [x] Guia em `/admin/ramais`. Listar serviços e contatos, buscar por termos com ou sem acento e incluir resultados na busca do portal autenticado. Editores e administradores de setor mantêm os próprios registros. Verificar busca, sigilo e permissão de alteração.
- [x] Treinamentos nos três fluxos existentes de cadastro, acompanhamento e consumo. Grupos de integração, prazos, lembretes e ciclos de reciclagem. Verificar conclusão anterior, renovação e reenvio de lembretes.
- [x] Solicitações em `/admin/solicitacoes`. Disparar segunda via de crachá para Departamento Pessoal, fornecer protocolo, prazo, estado e retorno. Verificar isolamento da fila e idempotência.
- [x] Contingência em `/admin/contingencia`. TI publica sistema, setores, estado, próxima atualização, ramal e procedimento aprovado. Registrar atualizações e oferecer cópia para impressão. Verificar publicação, revisão concorrente e acesso da TI.
- [x] Integrar rotas, menu, persistência e job diário. Gerar migration, atualizar snapshot e documentar aplicação e validação no MySQL existente. Executar testes .NET, testes Angular, lint, build e verificação das rotas renderizadas.
