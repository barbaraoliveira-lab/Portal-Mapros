# Arquitetura

O Portal Mapros é um Web App do Google Apps Script. A interface usa HTML Service e
chama funções públicas do servidor por um wrapper de `google.script.run`. Regras de
acesso e seleção de dados permanecem no servidor; a interface recebe somente registros
que o usuário autenticado pode consultar.

## Caminhos críticos da página de Mapros

O carregamento inicial reutiliza o mesmo contexto autorizado para produzir a configuração
da tela e a lista de projetos, evitando uma segunda leitura completa de Mapros e
participantes. As pequenas bases corporativas de Contagiro, departamentos e estratégia
usam cache de cinco minutos; a planilha continua sendo a fonte de verdade.

A foto do líder é buscada em uma chamada posterior à exibição do detalhe. Assim, a leitura
do arquivo no Drive e a conversão para base64 não bloqueiam o conteúdo e a árvore de
atividades.

No salvamento em lote, a aplicação mantém o lock global somente durante a transação e
compara o estado anterior com o calculado. Linhas contíguas alteradas são agrupadas e
persistidas, e novas atividades são anexadas em lote. O resumo da Mapro reutiliza o mesmo
conjunto já agregado, sem uma segunda gravação global das colunas de data e status.
Quando predecessora e sucessora recebem prazos explícitos no mesmo lote, a data digitada
na sucessora prevalece; a propagação automática continua a partir do deslocamento próprio
dela. A tabela mantém uma barra horizontal sincronizada no rodapé da janela enquanto a
barra nativa estiver abaixo da área visível.

A exportação em PDF monta um relatório sem controles de formulário: identificação,
indicadores executivos, estratégia, plano, complementos e corpo do projeto até a coluna
Situação. O cabeçalho da tabela é repetido nas páginas seguintes, e os dados são inseridos
como texto para preservar legibilidade e evitar interpretação de marcação informada pelo usuário.

## Capacidade planejada

O cenário informado é de aproximadamente 3.000 usuários cadastrados, 40 Mapros novas por
ano, média de 50 atividades por Mapro e até 100 pessoas usando o portal ao mesmo tempo.
A otimização atual reduz chamadas ao Sheets, usa operações em lote e cache, em linha com
as [práticas recomendadas do Apps Script](https://developers.google.com/apps-script/guides/support/best-practices).

Esse cenário ainda exige teste de carga controlado. A documentação oficial registra o
limite atual de 30 execuções simultâneas por usuário e 1.000 por script, além de no máximo
200 versões por projeto. Como a implantação executa pela conta SGI, não se deve prometer
100 chamadas simultâneas ao servidor sem medir o comportamento real e as quotas da conta.
Consulte [Quotas for Google Services](https://developers.google.com/apps-script/guides/services/quotas).

Se o uso sustentado se aproximar desse limite, a evolução recomendada é manter o frontend
no ecossistema Google e migrar as tabelas transacionais (atividades, participantes e
históricos) para um banco gerenciado, preservando o Sheets como visão administrativa e
relatório. A migração deve ser incremental e precedida por métricas reais de execução.

## Dashboard

A página `Dashboard` consome um endpoint agregado. O servidor aplica primeiro o mesmo
escopo usado pela página de Mapros: administradores recebem todos os projetos e os
demais usuários recebem somente aqueles com vínculo ativo ou liderança. Filtros e
gráficos operam no navegador exclusivamente sobre esse conjunto já autorizado.

As visões “Mapros - Visão geral” e “Minhas atividades” compartilham somente o recorte
de portfólio. Os filtros corporativos de Contagiro, início, prazo, status, área, nível,
líder e Mapro pertencem à visão geral e deixam de afetar os resultados quando estão
ocultos na visão pessoal.

Na visão geral, cards, faixas de conclusão e barras por portfólio atuam como filtros
cruzados. Cada seleção atualiza os demais gráficos e a tabela, e aparece como um chip
removível. As tabelas possuem pesquisa local, ordenação, paginação, cabeçalho e primeira
coluna fixos, além de acesso direto à Mapro selecionada. O tempo médio de conclusão usa
o intervalo entre a data inicial derivada das atividades e `CONCLUIDA_EM`, com
`ATUALIZADO_EM` apenas como compatibilidade para registros antigos.

## Entrega de e-mails

Todos os eventos de e-mail passam por uma caixa de saída persistente antes de chamar o
`MailApp`. A aplicação tenta a entrega imediatamente para manter a experiência atual; se
o serviço estiver indisponível ou a cota diária estiver esgotada, a mensagem continua na
fila e um gatilho temporal a reprocessa a cada quinze minutos. O lote é limitado e também
é reduzido pela cota restante informada pelo Google.

As mensagens são entregues individualmente, mesmo quando o evento possui vários
destinatários. A chave idempotente é derivada do evento, do projeto ou atividade e do
destinatário. O envio é, portanto, resistente à reexecução da função de negócio, enquanto
registros que ficaram em `PROCESSANDO` por mais de trinta minutos são recuperados
automaticamente.

Na página administrativa de solicitações, o SGI pode reenviar os e-mails de uma aprovação
selecionada ou liberar toda a fila pendente/com falha para nova tentativa. Essas operações
continuam protegidas pela validação de perfil no servidor.
