const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = nome => fs.readFileSync(path.join(__dirname, '..', nome), 'utf8');

['Index.html', 'Dashboard.html', 'mapros.html', 'solicitacoesDeMapro.html',
  'cadastrosDeUsuarios.html'].forEach(nome => {
  assert.match(read(nome), /<meta name="viewport" content="width=device-width, initial-scale=1">/,
    nome + ' deve declarar viewport responsivo');
});

const dashboardCss = read('DashboardCSS.html');
const dashboardJs = read('DashboardJS.html');
const styles = read('Styles.html');
const maprosCss = read('maprosCSS.html');

assert.match(dashboardCss, /@media \(max-width: 640px\)[\s\S]*content: attr\(data-label\)/,
  'tabelas do dashboard devem virar cartões em celulares');
assert.match(dashboardCss, /\.tabela-detalhes-indicador-dashboard tbody tr\s*\{[\s\S]*grid-template-columns: repeat\(2/,
  'cartões móveis devem organizar os dados em duas colunas');
assert.match(dashboardJs, /celula\.dataset\.label = coluna\.rotulo/g,
  'células do dashboard devem expor rótulos no layout móvel');
assert.match(styles, /@media \(max-width: 600px\)[\s\S]*\.formulario-grid \{ grid-template-columns: 1fr; \}/,
  'formulários genéricos devem usar uma coluna no celular');
assert.match(styles, /\.botao-icone \{ width: 44px; height: 44px; min-width: 44px; min-height: 44px; \}/,
  'botões de ícone devem preservar área mínima de toque');
assert.match(maprosCss, /\.tabela-atividades-mapro td::before \{[\s\S]*font-size: \.75rem/,
  'rótulos móveis da tabela de atividades devem permanecer legíveis');

console.log('Responsividade: viewport, cartões móveis, formulários e áreas de toque OK.');
