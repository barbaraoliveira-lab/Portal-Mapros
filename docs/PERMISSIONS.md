# Permissões de projeto

- `ADMIN`: acesso e edição total.
- `LIDER`: edição total e gestão dos participantes relacionados ao projeto.
- `EDITOR`: edição do cabeçalho e de todas as atividades, inclusive inclusão, exclusão e movimentação.
- `OBSERVADOR`: consulta do projeto e edição apenas das atividades sob sua responsabilidade; não exclui, cria ou move itens.
- `ACESSO`: consulta da Mapro em “Minhas Mapros”, sem permissão de edição ou atribuição como responsável.

Os participantes iniciais da solicitação recebem vínculo `ACESSO` quando a Mapro é
aprovada. Esse vínculo aparece marcado no gerenciamento de participantes e pode ser
mantido, promovido para `OBSERVADOR` ou `EDITOR`, ou removido por quem gerencia o projeto.

Todos os níveis com acesso ativo à Mapro podem visualizar evidências e anexar um arquivo
quando a atividade ainda não possui evidência. Depois do primeiro envio, somente o autor
da evidência ou um `ADMIN` pode substituí-la. Evidências legadas sem autoria registrada
só podem ser substituídas por um `ADMIN`. Essa permissão é independente da edição dos
demais campos da linha e é revalidada no servidor.

Somente `ADMIN` e `EDITOR` podem confirmar o início do acompanhamento. Antes do marco,
o botão permanece visível, porém desabilitado, para os demais níveis. Depois desse marco,
mudanças de prazo exigem motivo na observação e entram no histórico.

Ao confirmar o início do acompanhamento, todos os vínculos ativos do projeto recebem um
e-mail individual de abertura, incluindo o líder e eliminando endereços duplicados. A
mensagem informa que a Mapro está apta para acompanhamento na Contagiro designada e
inclui um link direto para o projeto. Falhas individuais de envio são registradas sem
reverter a abertura já confirmada.

O solicitante da Mapro é relacionado automaticamente ao projeto como `EDITOR`, inclusive
quando também é o líder. A migração de estrutura promove os vínculos de solicitantes das
Mapros existentes. Ser líder, isoladamente, não autoriza iniciar o acompanhamento: é
necessário possuir vínculo ativo de `EDITOR` ou ser `ADMIN`.

O líder do projeto e o `ADMIN` podem revogar vínculos `EDITOR` e `OBSERVADOR`. O
vínculo do líder não pode ser removido por essa operação.

As regras são revalidadas nas funções do servidor. O estado dos controles no navegador
serve apenas para orientar a experiência e não substitui a autorização do backend.

As rotinas públicas de configuração do banco e de autorização da pasta de fotos aceitam
somente a conta SGI configurada ou um `ADMIN` ativo. A implementação interna termina com
`_` e não fica disponível para chamadas feitas pelo navegador via `google.script.run`.

As respostas de processo crítico, envolvimento de sistema e a descrição dos sistemas fazem
parte do cabeçalho. Portanto, participantes com vínculo `EDITOR` podem atualizá-las; o
servidor aplica a mesma autorização usada nos demais campos do cabeçalho.

Ao criar ou alterar explicitamente um vínculo para `EDITOR` ou `OBSERVADOR`, o usuário
recebe um e-mail com a Mapro, a permissão concedida e o link de acesso. A resposta da
operação também atualiza imediatamente as opções de responsável na página aberta.

Quando um participante cria uma nova solicitação de Mapro, o endereço administrativo
central do SGI recebe um aviso por e-mail sem os dados da solicitação. Edições posteriores
não repetem o aviso. Falhas no serviço de e-mail são registradas nos logs e não revertem
a solicitação já persistida.

Quando uma conta ainda não cadastrada solicita acesso ao portal, o SGI recebe um e-mail
com o endereço solicitado, a data e o protocolo gerado. O conteúdo possui versões HTML
e texto simples.
