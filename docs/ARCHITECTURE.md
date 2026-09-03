# Arquitetura

O Portal Mapros é um Web App do Google Apps Script. A interface usa HTML Service e
chama funções públicas do servidor por um wrapper de `google.script.run`. Regras de
acesso e seleção de dados permanecem no servidor; a interface recebe somente registros
que o usuário autenticado pode consultar.

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
