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

As visões “Visão geral” e “Atividades em atraso” compartilham filtros de Contagiro,
início, prazo, status, área, Mapro e portfólio. O tempo médio de conclusão usa o intervalo
entre a data inicial derivada das atividades e `ATUALIZADO_EM` das Mapros concluídas.
Essa é uma aproximação enquanto o modelo não possuir um timestamp específico para a
conclusão do projeto.
