# Implantação

A configuração do banco cria, de forma idempotente, as abas auxiliares e um gatilho
diário para `enviarNotificacoesAtividadesMapro`, executado por volta das 8h no timezone
`America/Sao_Paulo`. O manifesto precisa dos escopos de envio de e-mail, Drive e gestão
de gatilhos do Apps Script. Uma alteração nesses escopos pode exigir nova autorização
do proprietário da implantação.

A rotina diária envia os avisos da semana na segunda-feira e o aviso de atraso no dia
seguinte ao prazo. `MAPRO_NOTIFICACOES` evita reenvio para a mesma atividade, tipo e data.

Ao aprovar uma solicitação pela implantação `/exec`, a aplicação valida e registra essa
URL na Script Property `MAPRO_WEB_APP_URL`. Os botões dos e-mails usam essa URL pública
estável com `pagina=mapros&mapro=ID`; não usam a URL de desenvolvimento nem forçam uma
conta Google pelo parâmetro `authuser`.
