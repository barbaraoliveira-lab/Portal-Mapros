const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'mapros.html'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'maprosCSS.html'), 'utf8');
const cliente = fs.readFileSync(path.join(raiz, 'maprosJS.html'), 'utf8');
const servidor = fs.readFileSync(path.join(raiz, 'Mapros.js'), 'utf8');
const estilosGerais = fs.readFileSync(path.join(raiz, 'Styles.html'), 'utf8');
const solicitacaoCss = fs.readFileSync(path.join(raiz, 'solicitacoesCabecalhoCSS.html'), 'utf8');
const solicitacaoHtml = fs.readFileSync(path.join(raiz, 'solicitacoesDeMapro.html'), 'utf8');
const solicitacaoJs = fs.readFileSync(path.join(raiz, 'solicitacoesDeMaproJS.html'), 'utf8');

const cabecalhoTabela = html.match(
  /<table class="tabela-usuarios tabela-atividades-mapro">[\s\S]*?<thead><tr>([\s\S]*?)<\/tr><\/thead>/
);
assert.ok(cabecalhoTabela, 'o cabeçalho da tabela de atividades deve existir');
const rotulos = Array.from(cabecalhoTabela[1].matchAll(/<th[^>]*>([^<]*)<\/th>/g))
  .map(function (item) { return item[1].trim(); });
assert.ok(rotulos.indexOf('PREDECESSORA') > rotulos.indexOf('SITUAÇÃO'));
assert.ok(rotulos.indexOf('REPLANEJADO') > rotulos.indexOf('PREDECESSORA'));
assert.match(cliente, /PLANEJADA', texto: 'Não iniciada'/);

assert.match(cliente, /function atividadePossuiEdicaoPendenteMapro/);
assert.match(cliente, /function atividadePossuiReplanejamentoPendenteMapro/);
assert.match(cliente, /atividade\.tipo !== 'TOPICO' && !atividadeTemFilhosClienteMapro\(atividade\)/);
assert.match(cliente,
  /confirmarReplanejamento:\s*atividadePossuiReplanejamentoPendenteMapro\(atividade\)/);
assert.match(cliente,
  /function assinaturaAtividadeMapro[\s\S]*atividadeTemFilhosClienteMapro\(atividade\)/);
assert.match(cliente, /!temEdicoesAtividadesPendentesMapro\(\)/);
assert.match(cliente, /const validacaoDeDataConcluida = tipoEvento === 'change'/);

assert.doesNotMatch(html, /id="barra-rolagem-horizontal-atividades-mapro"/);
assert.doesNotMatch(css, /barra-rolagem-horizontal-atividades-mapro/);
assert.match(html, /id="rolagem-horizontal-fixa-mapro"/);
assert.match(css, /\.rolagem-horizontal-fixa-mapro\s*\{[\s\S]*position:\s*fixed;[\s\S]*bottom:\s*0/);
assert.match(cliente, /function sincronizarRolagemHorizontalTabelaMapro/);
assert.match(cliente, /barraOriginalAbaixoDaTela/);
assert.match(html, /id="tabela-atividades-container"/);
assert.match(css, /#tabela-atividades-container\s*\{[\s\S]*overflow-anchor:\s*none/);
assert.match(cliente, /function ajustarLarguraDescricaoMapro/);
assert.match(cliente, /const larguras = \[86, 42,/);
assert.match(cliente, /container\.clientWidth - larguras\.slice\(0, 11\)/);
assert.match(css, /\.acoes-linha-atividade\s*\{[\s\S]*min-width:\s*78px/);
assert.match(cliente, /function salvarPendenciasAutomaticasAtividadesMapro/);
assert.match(cliente, /function renderizarAtividadesPreservandoRolagemMapro/);
assert.match(cliente, /focus\(\{preventScroll: true\}\)/);
assert.match(cliente,
  /function adicionarRascunhoAtividadeMapro[\s\S]*renderizarAtividadesPreservandoRolagemMapro/);
assert.match(cliente,
  /function excluirAtividadeInlineMapro[\s\S]*renderizarAtividadesPreservandoRolagemMapro/);
assert.doesNotMatch(cliente, /detalhe\.mapro\.acompanhamentoIniciado \|\|[\s\S]{0,180}salvarAtividadeInlineMapro/);
assert.match(cliente, /editar\.hidden = !estadoMapros\.detalhe\.mapro\.acompanhamentoIniciado/);
assert.match(css, /\.titulo-corpo-projeto\s*\{[\s\S]*position:\s*sticky;\s*top:\s*0/);
assert.match(css, /\.titulo-corpo-projeto\.titulo-corpo-projeto-fixo\s*\{[\s\S]*position:\s*fixed/);
assert.match(cliente, /tituloCorpo\.classList\.toggle\('titulo-corpo-projeto-fixo', deveFixarTitulo\)/);

assert.doesNotMatch(html, />QUAL\/QUAIS SISTEMAS\?</);
assert.match(html, /id="mapro-sistemas-envolvidos"[^>]*maxlength="3000"[^>]*rows="1"/);
assert.match(cliente, /function ajustarAlturaCampoSistemasMapro/);
assert.match(cliente, /observadorCabecalhoFixo\.observe\(document\.querySelector\('\.cartao-cabecalho-mapro'\)\)/);
assert.match(cliente, /function montarRelatorioProjetoMapro/);
assert.match(cliente, /'CORPO DO PROJETO'/);
assert.match(cliente, /'Status', 'Situação'/);
assert.match(cliente, /'Iniciativa estratégica\?', mapro\.iniciativaEstrategica/);
assert.match(css, /\.tabela-relatorio-mapro\s*\{[\s\S]*table-layout:\s*fixed/);
assert.match(css, /\.tabela-relatorio-mapro thead\s*\{\s*display:\s*table-header-group/);
assert.match(css, /\.cabecalho-relatorio-mapro/);
assert.match(cliente, /function criarLogoRelatorioMapro/);
assert.match(cliente, /logo\.setAttribute\('src', LOGO_RELATORIO_MAPRO_TOKEN\)/);
assert.match(servidor, /function obterLogoRelatorioMaproDataUri_/);
assert.match(servidor, /DriveApp\.getFileById\(CONFIG\.logoCadastroId\)/);
assert.match(servidor, /__LOGO_SGI_RELATORIO_MAPRO__/);
assert.doesNotMatch(cliente, /'sigla-relatorio-mapro', 'SGI'/);
assert.match(css, /\.marca-relatorio-mapro\s*\{[\s\S]*background:\s*#06063d/);
assert.match(cliente, /function criarStatusRelatorioMapro/);
assert.match(cliente, /celulaStatus\.appendChild\(criarStatusRelatorioMapro\(atividade\.saude\)\)/);
assert.match(css, /\.tabela-relatorio-mapro \.status-relatorio-mapro[\s\S]*text-align:\s*center/);
assert.match(cliente,
  /const omitirResponsabilidade = atividade\.tipo === 'TOPICO' \|\|\s*atividadeTemFilhosClienteMapro\(atividade\)/);
assert.match(cliente, /omitirResponsabilidade \? '—' : atividade\.responsavel/);
assert.match(cliente, /omitirResponsabilidade \? '—' : atividade\.departamento/);
assert.doesNotMatch(cliente, /documento\.appendChild\(rodape\.cloneNode\(true\)\)/);
assert.match(cliente, /MaproUI\.showLoading\('Iniciando acompanhamento\.\.\.'\)/);
assert.match(cliente, /botao\.textContent = 'INICIANDO\.\.\.'/);

assert.match(css, /\.opcao-participante-mapro\[hidden\]\s*\{\s*display:\s*none;/);
assert.match(cliente, /normalizarPesquisaParticipanteMapro/);

assert.match(solicitacaoCss, /\.botao-informacao-solicitacao[\s\S]*width:\s*20px[\s\S]*background:\s*#06063d/);
assert.match(estilosGerais, /\.pagina-solicitacoes-mapro #tabela-container\s*\{\s*overflow-x:\s*auto/);
assert.match(estilosGerais, /\.pagina-solicitacoes-mapro \.status-usuario[\s\S]*white-space:\s*nowrap/);
assert.match(estilosGerais, /perfil-admin \.tabela-solicitacoes\s*\{\s*min-width:\s*1050px/);
assert.doesNotMatch(solicitacaoHtml, /data-fechar-modal="modal-solicitacao">CANCELAR/);
assert.match(solicitacaoJs, /fundo\.id !== 'modal-solicitacao'/);
assert.match(solicitacaoJs, /aberto\.id !== 'modal-solicitacao'/);
assert.match(solicitacaoHtml, /name="iniciativa-estrategica-solicitacao" value="SIM" required/);
assert.match(solicitacaoHtml, /name="iniciativa-estrategica-solicitacao" value="NÃO" required/);
assert.match(solicitacaoJs, /iniciativaEstrategica:\s*obterValorRadioSolicitacao/);
assert.match(html, /name="mapro-iniciativa-estrategica" value="SIM"/);
assert.match(cliente, /selecionarRadioMapro\('mapro-iniciativa-estrategica'/);

console.log('Testes de interface da página de MAPROs concluídos com sucesso.');
