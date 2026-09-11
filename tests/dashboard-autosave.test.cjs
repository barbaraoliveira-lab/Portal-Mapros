const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = n => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');
const source = n => read(n).replace(/^<script>\s*/, '').replace(/<\/script>\s*$/, '');
const dashboardHtml = read('Dashboard.html');
const dashboardCss = read('DashboardCSS.html');
const codigoServidor = read('Código.js');
const maprosServidor = read('Mapros.js');
assert.match(dashboardHtml, /id="abrir-portfolios-dashboard"/);
assert.match(dashboardHtml, /id="painel-filtros-dashboard" hidden/);
assert.match(dashboardHtml, /class="paineis-resumo-dashboard"/);
assert.match(dashboardHtml, /data-aba-dashboard="mapros"/);
assert.match(dashboardHtml, /data-aba-dashboard="atividades"/);
assert.match(dashboardHtml, /id="indicadores-atividades-dashboard"/);
assert.match(dashboardHtml, /id="grafico-portfolios"/);
assert.match(dashboardHtml, /id="tabela-minhas-atividades-container"/);
assert.match(dashboardCss, /grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(0, \.92fr\)/);
assert.doesNotMatch(dashboardHtml, /id="grafico-status"/);
assert.match(dashboardHtml, /id="filtro-nivel"/);
assert.match(dashboardHtml, /id="filtro-lider"[^>]*role="combobox"/);
assert.match(dashboardHtml, /id="opcoes-lider-dashboard"[^>]*role="listbox"/);
assert.match(dashboardHtml, /id="painel-indicadores-atividades-dashboard"/);
assert.match(dashboardHtml, /id="alternar-painel-indicadores-atividades-dashboard"/);
assert.doesNotMatch(dashboardHtml, /id="menu-portfolios-atividades-dashboard"/);
assert.match(dashboardCss, /\.layout-atividades-dashboard\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0, 1fr\)/);
assert.match(dashboardCss, /#grafico-conclusao\s*\{\s*width:\s*min\(100%, 165px\)/);
assert.match(dashboardCss, /\.paineis-resumo-dashboard > \.cartao-grafico-dashboard\s*\{\s*min-height:\s*360px/);
assert.match(dashboardCss, /grid-template-rows:\s*minmax\(140px, auto\) minmax\(58px, auto\) minmax\(64px, auto\)/);
assert.match(dashboardCss, /\.painel-graficos-resumo-dashboard\s*\{[\s\S]*grid-template-rows:\s*auto auto/);
assert.match(dashboardHtml, /id="resumo-filtros-dashboard"/);
assert.match(dashboardHtml, /id="pesquisa-tabela-mapros-dashboard"/);
assert.match(dashboardHtml, /id="paginacao-atividades-dashboard"/);
assert.match(dashboardCss, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(codigoServidor, /'CONCLUIDA_EM'/);
assert.match(maprosServidor, /mapro\.CONCLUIDA_EM \|\| agora/);
assert.match(maprosServidor, /mapro\.CONCLUIDA_EM \|\| mapro\.ATUALIZADO_EM/);
assert.match(maprosServidor, /replanejada: Boolean\(maprosReplanejadas/);
assert.match(maprosServidor, /minhasAtividades: minhas\.map\(mapearMinha\)/);
assert.match(maprosServidor, /atualizadoEm: new Date\(\)\.toISOString\(\)/);
const element = () => ({value:'', hidden:false, textContent:'', dataset:{},
  classList:{toggle(){},add(){},remove(){}}, style:{setProperty(){}},
  addEventListener(){}, setAttribute(){}, append(){}, appendChild(){}, replaceChildren(){},
  querySelectorAll(){return [];}, querySelector(){return element();}, closest(){return element();}});
const elements = {};
const document = {getElementById(id){return elements[id] ||= element();},
  querySelectorAll(){return [];}, querySelector(){return null;}, addEventListener(){},
  createElement:element};
const context = vm.createContext({console, document, setTimeout, clearTimeout,
  window:{addEventListener(){},requestAnimationFrame(){}}, URLSearchParams,
  MaproUI:{showLoading(){},hideLoading(){}}, localStorage:{getItem(){return null;}}});
vm.runInContext(source('DashboardJS.html').replace('  iniciarDashboard();',''), context);
vm.runInContext(`
  estadoDashboard.filtrados = [
    {id:'1',status:'CONCLUÍDA',percentual:100,acompanhamentoIniciado:true},
    {id:'2',status:'EM ANDAMENTO',percentual:20,temNovasAtividades:true,replanejada:true,
      minhasAtividades:[{status:'PLANEJADA',saude:'VERMELHO'},
        {status:'PLANEJADA',saude:'VERDE'},{status:'CONCLUIDA',saude:'AZUL'}]},
    {id:'3',status:'CANCELADA',percentual:0},
    {id:'4',status:'AGUARDANDO INÍCIO',percentual:0},
    {id:'5',status:'NÃO APLICÁVEL',percentual:0}
  ];
`, context);
assert.equal(vm.runInContext("obterProjetosIndicadorDashboard('novasAtividades').length",context),1);
assert.equal(vm.runInContext("obterProjetosIndicadorDashboard('replanejadas').length",context),1);
assert.equal(vm.runInContext("obterProjetosIndicadorDashboard('concluidas').length",context),1);
assert.equal(vm.runInContext("obterProjetosIndicadorDashboard('naoAplicaveis').length",context),1);
assert.equal(vm.runInContext("filtrarMinhasAtividadesDashboard('atrasadas').length",context),1);
assert.equal(vm.runInContext("filtrarMinhasAtividadesDashboard('noPrazo').length",context),1);
assert.equal(vm.runInContext("filtrarMinhasAtividadesDashboard('concluidas').length",context),1);
vm.runInContext("estadoDashboard.indicadorDetalhe = 'concluidas'",context);
assert.equal(vm.runInContext("faixasDashboard().reduce((s,f)=>s+f.total,0)",context),1);
assert.equal(vm.runInContext("contarPorDashboard('status')[0].rotulo",context),'CONCLUÍDA');
assert.equal(vm.runInContext("typeof montarOpcoesLiderDashboard", context),'function');
assert.equal(vm.runInContext("typeof obterProjetosCruzadosDashboard", context),'function');
vm.runInContext("estadoDashboard.filtroFaixaConclusao = 'menos50'",context);
assert.equal(vm.runInContext("obterProjetosCruzadosDashboard().length",context),0,
  'filtro da rosca combina com o card selecionado');
vm.runInContext("estadoDashboard.indicadorDetalhe = ''; estadoDashboard.filtroFaixaConclusao = ''; estadoDashboard.filtroGraficoPortfolio = '';",context);
assert.match(read('DashboardJS.html'), /seletorPortfolio\.hidden = false/);
vm.runInContext(`
  estadoDashboard.projetos = estadoDashboard.filtrados.slice();
  document.getElementById('filtro-status').value = 'CONCLUÍDA';
  renderizarDashboard = function(){};
  estadoDashboard.aba = 'atividades';
  aplicarFiltrosDashboard();
`, context);
assert.equal(vm.runInContext('estadoDashboard.filtrados.length', context),5,
  'filtro avançado oculto não interfere em Minhas atividades');
vm.runInContext("estadoDashboard.aba = 'mapros'; aplicarFiltrosDashboard();", context);
assert.equal(vm.runInContext('estadoDashboard.filtrados.length', context),1,
  'filtro avançado volta a valer na visão geral');
vm.runInContext(source('maprosJS.html').replace('  iniciarPaginaMapros();',''),context);
vm.runInContext(`
  estadoMapros.detalhe = {mapro:{acompanhamentoIniciado:false},atividades:[]};
  var atividadeTeste = {idAtividade:'a',tipo:'TOPICO',nomeAtividade:'Tópico teste',
    justificativa:'',observacao:'',status:'PLANEJADA',rascunho:true};
  estadoMapros.rascunhosAtividades = [atividadeTeste];
  atualizarBotaoSalvarPrazosMapro = function(){};
  var gravacoesTeste = 0;
  salvarAtividadeInlineMapro = async function(){ gravacoesTeste++; };
  agendarSalvamentoAtividadeMapro(atividadeTeste,0);
  agendarSalvamentoAtividadeMapro(atividadeTeste,0);
`,context);
(async () => {
  await new Promise(r=>setTimeout(r,750));
  assert.equal(vm.runInContext('gravacoesTeste',context),0,'antes do acompanhamento o salvamento também é manual');
  vm.runInContext(`
    estadoMapros.detalhe.mapro.acompanhamentoIniciado = true;
    agendarSalvamentoAtividadeMapro(atividadeTeste,0);
  `,context);
  await new Promise(r=>setTimeout(r,750));
  assert.equal(vm.runInContext('gravacoesTeste',context),0,'após início o salvamento permanece manual');
  vm.runInContext(`
    estadoMapros.detalhe.mapro.acompanhamentoIniciado = false;
    atividadeTeste.nomeAtividade = '';
    agendarSalvamentoAtividadeMapro(atividadeTeste,0);
  `,context);
  await new Promise(r=>setTimeout(r,750));
  assert.equal(vm.runInContext('gravacoesTeste',context),0,'não salva rascunho inválido');
  const server = vm.createContext({});
  vm.runInContext(maprosServidor,server);
  assert.equal(vm.runInContext("obterFolhasDashboardMapro_([{ID_ATIVIDADE:'1',TIPO:'TOPICO'},{ID_ATIVIDADE:'2',ID_ATIVIDADE_PAI:'1',TIPO:'ATIVIDADE'},{ID_ATIVIDADE:'3',ID_ATIVIDADE_PAI:'2',TIPO:'SUBATIVIDADE'}]).length",server),1);
  assert.deepEqual(
    JSON.parse(vm.runInContext("JSON.stringify(obterIdsMaprosReplanejadasDashboardMapro_([{ID_MAPRO:'1',PRAZO_ANTERIOR:'2026-09-01',PRAZO_NOVO:'2026-09-10'},{ID_MAPRO:'2',PRAZO_ANTERIOR:'2026-09-10',PRAZO_NOVO:'2026-09-01'}]))",server)),
    {'1': true}
  );
  assert.equal(vm.runInContext(`calcularSituacaoProjetoMapro_('EM_ANDAMENTO', [
    {ID_ATIVIDADE:'1',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'2',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'3',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'4',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'5',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'PLANEJADA'},
    {ID_ATIVIDADE:'6',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'PLANEJADA'},
    {ID_ATIVIDADE:'7',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'PLANEJADA'}])`,server),'EM_ANDAMENTO');
  assert.equal(vm.runInContext(`calcularSituacaoProjetoMapro_('EM_ANDAMENTO', [
    {ID_ATIVIDADE:'1',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'2',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'3',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'4',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'5',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'NAO_APLICAVEL'},
    {ID_ATIVIDADE:'6',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'NAO_APLICAVEL'},
    {ID_ATIVIDADE:'7',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'NAO_APLICAVEL'}])`,server),'CONCLUIDA');
  assert.equal(vm.runInContext(`calcularSituacaoProjetoMapro_('EM_ANDAMENTO', [
    {ID_ATIVIDADE:'1',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'NAO_APLICAVEL'},
    {ID_ATIVIDADE:'2',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'NAO_APLICAVEL'},
    {ID_ATIVIDADE:'3',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'NAO_APLICAVEL'},
    {ID_ATIVIDADE:'4',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'NAO_APLICAVEL'},
    {ID_ATIVIDADE:'5',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'6',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'},
    {ID_ATIVIDADE:'7',TIPO:'ATIVIDADE',STATUS_ATIVIDADE:'CONCLUIDA'}])`,server),'NAO_APLICAVEL');
  console.log('Dashboard e salvamento manual: indicadores, gráficos, rascunhos e filtros OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
