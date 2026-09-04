# Implantação

A configuração do banco cria, de forma idempotente, as abas auxiliares e um gatilho
diário para `enviarNotificacoesAtividadesMapro_`, executado por volta das 8h no timezone
`America/Sao_Paulo`. O manifesto precisa dos escopos de envio de e-mail, Drive e gestão
de gatilhos do Apps Script. Uma alteração nesses escopos pode exigir nova autorização
do proprietário da implantação.

Implantações anteriores podem possuir o manipulador público legado. Na primeira abertura
administrativa após a atualização, ele é removido e substituído pelo manipulador privado.
Para um teste manual autorizado, execute `executarNotificacoesAtividadesMapro` com um
usuário `ADMIN`.

O código fonte oficial é mantido na branch `codespace-sync`. Antes de criar uma nova
implantação, execute `npx @google/clasp push` em uma sessão autenticada, confira o projeto
indicado em `.clasp.json` e publique uma nova versão do Web App mantendo “Executar como”
na conta SGI e o acesso restrito ao Grupo JCA. Nunca use `clasp pull` sobre alterações
locais não commitadas.

A rotina diária envia os avisos da semana na segunda-feira e o aviso de atraso no dia
seguinte ao prazo. `MAPRO_NOTIFICACOES` evita reenvio para a mesma atividade, tipo e data.

Ao aprovar uma solicitação pela implantação `/exec`, a aplicação valida e registra essa
URL na Script Property `MAPRO_WEB_APP_URL`. Os botões dos e-mails usam essa URL pública
estável com `pagina=mapros&mapro=ID`; não usam a URL de desenvolvimento nem forçam uma
conta Google pelo parâmetro `authuser`.

## Verificação rápida após a implantação

1. Abrir a lista de Mapros e um projeto com foto de líder.
2. Confirmar que o conteúdo aparece antes da foto e que ela é carregada em seguida.
3. Editar uma atividade sem alterar datas e salvar.
4. Reabrir a Mapro e confirmar os valores e a versão da atividade.
5. Anexar um PDF pequeno como evidência e abrir o link retornado.
6. Confirmar que um arquivo fora dos formatos permitidos é rejeitado.
7. Conferir os registros de execução do Apps Script para erros de autorização ou lock.
