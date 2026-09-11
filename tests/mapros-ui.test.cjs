const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'mapros.html'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'maprosCSS.html'), 'utf8');
const cliente = fs.readFileSync(path.join(raiz, 'maprosJS.html'), 'utf8');
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
assert.match(cliente, /!temEdicoesAtividadesPendentesMapro\(\)/);
assert.match(cliente, /const validacaoDeDataConcluida = tipoEvento === 'change'/);

assert.doesNotMatch(html, /id="barra-rolagem-horizontal-atividades-mapro"/);
assert.doesNotMatch(css, /barra-rolagem-horizontal-atividades-mapro/);
assert.match(html, /id="tabela-atividades-container"/);
assert.match(cliente, /function ajustarLarguraDescricaoMapro/);
assert.match(cliente, /const larguras = \[86, 42,/);
assert.match(cliente, /container\.clientWidth - larguras\.slice\(0, 11\)/);
assert.match(css, /\.acoes-linha-atividade\s*\{[\s\S]*min-width:\s*78px/);
assert.match(cliente, /function salvarPendenciasAutomaticasAtividadesMapro/);
assert.doesNotMatch(cliente, /detalhe\.mapro\.acompanhamentoIniciado \|\|[\s\S]{0,180}salvarAtividadeInlineMapro/);
assert.match(cliente, /editar\.hidden = !estadoMapros\.detalhe\.mapro\.acompanhamentoIniciado/);
assert.match(css, /\.titulo-corpo-projeto\s*\{[\s\S]*position:\s*sticky;\s*top:\s*0/);
assert.match(css, /\.titulo-corpo-projeto\.titulo-corpo-projeto-fixo\s*\{[\s\S]*position:\s*fixed/);
assert.match(cliente, /tituloCorpo\.classList\.toggle\('titulo-corpo-projeto-fixo', deveFixarTitulo\)/);

assert.doesNotMatch(html, />QUAL\/QUAIS SISTEMAS\?</);
assert.match(html, /id="mapro-sistemas-envolvidos"[^>]*maxlength="3000"[^>]*rows="1"/);
assert.match(cliente, /function ajustarAlturaCampoSistemasMapro/);
assert.match(cliente, /observadorCabecalhoFixo\.observe\(document\.querySelector\('\.cartao-cabecalho-mapro'\)\)/);
assert.match(cliente, /valor-controle-pdf-mapro/);
assert.match(css, /font-size:\s*8pt\s*!important/);
assert.match(css, /th:nth-child\(n\+12\), \.tabela-atividades-mapro td:nth-child\(n\+12\)/);
assert.match(css, /th:nth-child\(3\), \.tabela-atividades-mapro td:nth-child\(3\)\s*\{\s*width:\s*30%/);
assert.match(cliente, /document\.getElementById\('etapa-detalhe-mapro'\)/);
assert.match(cliente, /documento\.appendChild\(rodape\.cloneNode\(true\)\)/);

assert.match(css, /\.opcao-participante-mapro\[hidden\]\s*\{\s*display:\s*none;/);
assert.match(cliente, /normalizarPesquisaParticipanteMapro/);

assert.match(solicitacaoCss, /\.botao-informacao-solicitacao[\s\S]*width:\s*20px[\s\S]*background:\s*#06063d/);
assert.match(estilosGerais, /\.pagina-solicitacoes-mapro #tabela-container\s*\{\s*overflow-x:\s*auto/);
assert.match(estilosGerais, /\.pagina-solicitacoes-mapro \.status-usuario[\s\S]*white-space:\s*nowrap/);
assert.match(estilosGerais, /perfil-admin \.tabela-solicitacoes\s*\{\s*min-width:\s*1050px/);
assert.doesNotMatch(solicitacaoHtml, /data-fechar-modal="modal-solicitacao">CANCELAR/);
assert.match(solicitacaoJs, /fundo\.id !== 'modal-solicitacao'/);
assert.match(solicitacaoJs, /aberto\.id !== 'modal-solicitacao'/);

console.log('Testes de interface da página de MAPROs concluídos com sucesso.');
