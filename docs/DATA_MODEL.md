# Modelo de dados

## Usuários

A aba `USUARIOS` mantém, ao final do schema, a coluna `DEPARTAMENTO`. Novos cadastros e
edições aceitam somente valores existentes na coluna `DEPARTAMENTO` da aba
`BASE_DEPARTAMENTOS`; a validação é refeita no servidor. Registros anteriores recebem a
nova coluna vazia pela migração idempotente e devem ter o departamento informado na
próxima edição.

`MAPROS.DEPARTAMENTO` é derivado do departamento do usuário registrado em `ID_LÍDER`.
Da mesma forma, `MAPRO_ATIVIDADES.DEPARTAMENTO` é derivado do usuário registrado em
`ID_RESPONSAVEL`, inclusive para tópicos que possuam responsável. A configuração da
estrutura sincroniza esses valores em lote para registros existentes; salvamentos
posteriores repetem a validação e a derivação no servidor.

## Atividades da Mapro

A aba `MAPRO_ATIVIDADES` representa uma árvore por meio de `ID_ATIVIDADE_PAI`:

- `TOPICO`: item raiz, sem pai;
- `ATIVIDADE`: filha direta de um tópico;
- `SUBATIVIDADE`: filha direta de uma atividade; não admite novos níveis.

`ORDEM` mantém a ordem de criação entre itens irmãos. IDs são UUIDs e não dependem da
posição da linha na planilha.

A numeração exibida (`1`, `1.1`, `1.1.1`) é derivada da árvore e da ordem; ela não é
usada como identificador persistente. As datas de todo item que possui filhos são
derivadas: o início é a menor data inicial dos descendentes e o término é a maior data final.
A situação de um `TOPICO` também é derivada
e a conclusão ocorre quando todos os itens aplicáveis descendentes estão concluídos.
O card “Total de itens na Mapro” inclui tópicos, atividades e subatividades ativas.

Novos itens recebem uma ordem superior à maior ordem existente e, por isso, aparecem
depois dos itens irmãos já cadastrados. Ao mover uma atividade para outro tópico, o
vínculo `ID_ATIVIDADE_PAI` e a ordem são atualizados; a numeração visual é recalculada.

`ID_ATIVIDADE_PREDECESSORA` mantém a dependência opcional entre duas atividades-folha
ativas da mesma Mapro. A referência usa o UUID da atividade, nunca sua numeração ou
posição na planilha. Tópicos e itens que possuam filhos não participam da relação. O
servidor rejeita autorreferência, ciclos e referências externas. Quando o prazo final
de uma predecessora muda, as datas inicial e final de todas as sucessoras são deslocadas
em cascata pela mesma quantidade de dias, preservando a duração e os intervalos planejados.

`DIAS_REPLANEJADOS` registra o deslocamento líquido acumulado do prazo final após o início
do acompanhamento. O valor pode ser positivo ou negativo; registros anteriores à inclusão
da coluna são interpretados como zero. A migração flexível acrescenta as duas colunas sem
alterar os IDs e demais dados das Mapros existentes.

## Histórico de reprogramação

A aba `MAPRO_HISTORICO_DATAS` registra cada mudança nas datas inicial e final de uma
atividade ou subatividade, com UUID, Mapro, atividade, valor anterior, valor novo,
timestamp e autoria. O histórico é somente de leitura na interface e não substitui os
valores atuais de `MAPRO_ATIVIDADES`. O registro começa somente após o marco
`ACOMPANHAMENTO_INICIADO_EM` da Mapro; durante o planejamento as datas podem mudar
sem gerar reprogramação.

Após esse marco, alterações de `DATA_INICIO` ou `DATA_FINAL` ficam pendentes no cliente
até a confirmação explícita pelo botão `SALVAR EDIÇÕES`. A confirmação exige um novo
valor em `OBSERVACAO`, utilizado como motivo do replanejamento. As semanas são exibidas
no formato `Sww/aa`, por exemplo `S32/26`.

O motivo é exigido somente para a alteração direta. As sucessoras deslocadas pela regra
de predecessora recebem histórico automático com a autoria da mesma operação, sem exigir
o preenchimento repetido do motivo em cada linha dependente.

A aba `MAPRO_HISTORICO_PRAZO` registra as mudanças do prazo final derivado da Mapro.
A aba `MAPRO_NOTIFICACOES` mantém a chave de cada aviso enviado para impedir duplicação
de e-mails na reexecução da rotina diária.

## Participantes do projeto

`MAPRO_PARTICIPANTES.PAPEL` aceita `LIDER`, `EDITOR`, `OBSERVADOR` e `ACESSO`.
Participantes iniciais aprovados entram como `ACESSO`; somente vínculos explicitamente
relacionados como editor ou observador podem ser responsáveis por atividades. O valor
legado `PARTICIPANTE` é interpretado como `OBSERVADOR` para manter compatibilidade.

As colunas `EVIDENCIA_ID`, `EVIDENCIA_NOME`, `EVIDENCIA_TIPO`, `EVIDENCIA_URL` e
`EVIDENCIA_ENVIADA_POR`
guardam somente metadados da evidência atual. O arquivo fica no Google Drive, em uma
pasta cujo ID é mantido na Script Property `MAPRO_EVIDENCIAS_FOLDER_ID` (com o
valor central de configuração como fallback). A conta efetiva da implantação do
Web App precisa possuir permissão de Editor nessa pasta. Se a propriedade ainda não
existir, a aplicação usa o ID central configurado e o registra após validar o acesso.
O upload aceita imagens PNG/JPG/WEBP, PDF, Word, Excel, PowerPoint, CSV e TXT, com limite
de 20 MB. A extensão e o MIME declarado são validados novamente no servidor; conteúdo
ativo ou executável não é aceito. Como o backend cria e administra a pasta de evidências
com `DriveApp`, o manifesto usa o escopo OAuth `drive`.

A migration de cabeçalhos é idempotente: as colunas de evidência são acrescentadas
sem remover ou reposicionar os dados existentes.

## Foto do líder

As colunas `FOTO_LIDER_ID`, `FOTO_LIDER_TIPO`, `FOTO_LIDER_ATUALIZADA_EM` e
`FOTO_LIDER_ATUALIZADA_POR` guardam os metadados da foto compartilhada da Mapro. O
arquivo fica na pasta exclusiva do Google Drive configurada pela Script Property
`MAPRO_FOTOS_LIDERES_FOLDER_ID`, usando o ID central como fallback, e é entregue aos usuários
autorizados pelo backend; o arquivo não precisa ser publicado.
Somente usuários com permissão de edição completa da Mapro podem incluir, substituir ou
remover a foto. O upload aceita PNG, JPG ou WEBP, é convertido para JPEG no cliente e o
conteúdo processado fica limitado a 2 MB no servidor.

## Solicitação de Mapro

`SOLICITACOES_MAPRO` preserva as doze colunas legadas e acrescenta ao final os dados
do cabeçalho solicitado: líder (ID, e-mail e departamento), Contagiro, nível, combinação
de estratégia BSC, descrição, justificativa, resultados esperados, existência e conteúdo
dos indicadores, classificação de processo crítico, envolvimento e nomes de sistemas e
metadados da foto do líder. A migração flexível de cabeçalhos acrescenta as novas colunas
sem reposicionar os registros anteriores.

O cadastro da solicitação é apresentado em quatro etapas. A passagem para a etapa seguinte
exige o preenchimento dos campos da etapa atual, inclusive participantes, cadastro completo
do líder e imagem. Na quarta etapa, as três perguntas Sim/Não são obrigatórias. Os campos
de indicadores e sistemas são exibidos e exigidos somente quando a resposta correspondente
é `SIM`. O servidor repete as validações no envio final.

Ao aprovar uma solicitação, o servidor copia esses dados para o registro correspondente
em `MAPROS`, revalida o líder pelo ID e deriva novamente o departamento pelo cadastro
vigente. `INDICADORES` é copiado quando já foi definido na solicitação; caso contrário,
permanece vazio para preenchimento posterior na MAPRO. As respostas sobre processo crítico
e sistemas também são copiadas. Datas de início e fim continuam derivadas das atividades.
A foto já armazenada na
pasta compartilhada é referenciada pela MAPRO sem criar uma cópia adicional.

Na árvore do plano, atividades e subatividades mantêm o vínculo pelo `ID_ATIVIDADE_PAI`.
Por isso, o reposicionamento de um tópico altera somente a ordem do tópico raiz: todos os
seus descendentes permanecem vinculados e são movimentados visualmente como uma unidade.
