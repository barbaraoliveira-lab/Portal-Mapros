const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const codigo = fs.readFileSync('Código.js', 'utf8');
const mapros = fs.readFileSync('Mapros.js', 'utf8') +
  fs.readFileSync('MaprosParte2.js', 'utf8');
const html = fs.readFileSync('mapros.html', 'utf8');
const js = fs.readFileSync('maprosJS.html', 'utf8');
const usuariosHtml = fs.readFileSync('cadastrosDeUsuarios.html', 'utf8');
const usuariosJs = fs.readFileSync('cadastrosDeUsuariosJS.html', 'utf8');

const contexto = vm.createContext({ console });
vm.runInContext(codigo, contexto);
vm.runInContext(mapros, contexto);

function atividade(id, pai, status, tipo = 'ATIVIDADE') {
  return {
    ID_ATIVIDADE: id,
    ID_ATIVIDADE_PAI: pai || '',
    TIPO: tipo,
    STATUS_ATIVIDADE: status,
    ATIVO: 'SIM'
  };
}

const maioriaConcluida = vm.runInContext(
  `calcularSituacaoProjetoMapro_('EM_ANDAMENTO', ${JSON.stringify([
    atividade('1', '', 'CONCLUIDA'),
    atividade('2', '', 'CONCLUIDA'),
    atividade('3', '', 'PLANEJADA')
  ])})`, contexto
);
assert.equal(maioriaConcluida, 'EM_ANDAMENTO');

const maioriaNaoAplicavel = vm.runInContext(
  `calcularSituacaoProjetoMapro_('EM_ANDAMENTO', ${JSON.stringify([
    atividade('1', '', 'NAO_APLICAVEL'),
    atividade('2', '', 'NAO_APLICAVEL'),
    atividade('3', '', 'CONCLUIDA')
  ])})`, contexto
);
assert.equal(maioriaNaoAplicavel, 'NAO_APLICAVEL');

const empateTerminal = vm.runInContext(
  `calcularSituacaoProjetoMapro_('EM_ANDAMENTO', ${JSON.stringify([
    atividade('1', '', 'NAO_APLICAVEL'),
    atividade('2', '', 'CONCLUIDA')
  ])})`, contexto
);
assert.equal(empateTerminal, 'EM_ANDAMENTO');

assert.match(codigo, /'AREAS_RELACIONADAS'/);
assert.match(codigo, /'GERENTE', 'DIRETOR'/);
assert.match(mapros, /CABECALHOS_BASE_DEPARTAMENTOS = \['DEPARTAMENTO', 'AREAS_RELACIONADAS'\]/);
assert.match(mapros, /function obterIdsMaprosPermitidosPorArea_/);
assert.match(mapros, /papel: 'EDITOR'/);
assert.match(mapros, /function podeGerenciarParticipantesMapro_/);
assert.match(mapros, /\['GERENTE', 'DIRETOR'\]\.indexOf\(nivel\)/);
assert.match(mapros, /\['LIDER', 'EDITOR'\]\.indexOf\(papel\)/);
assert.match(mapros, /podeGerenciarParticipantes:\s*podeGerenciarParticipantesMapro_\(contexto\)/);
assert.equal(vm.runInContext(
  "podeGerenciarParticipantesMapro_({admin:false,usuario:{NIVEL:'PARTICIPANTE'},papel:'EDITOR'})",
  contexto
), true);
assert.equal(vm.runInContext(
  "podeGerenciarParticipantesMapro_({admin:false,usuario:{NIVEL:'GERENTE'},papel:'ACESSO_AREA'})",
  contexto
), true);
assert.equal(vm.runInContext(
  "podeGerenciarParticipantesMapro_({admin:false,usuario:{NIVEL:'PARTICIPANTE'},papel:'OBSERVADOR'})",
  contexto
), false);
assert.match(codigo, /sincronizarParticipantesMapros_\(abaMapros, obterAbaMaproParticipantes_\(\), abaUsuarios\)/);
assert.match(mapros, /Esta Mapro foi cancelada e está disponível somente para o SGI/);
assert.match(mapros, /function cancelarMaprosInativas_/);
assert.match(mapros, /function prepararInativacaoResponsavelMapro_/);
assert.match(mapros, /\['CONCLUIDA', 'NAO_APLICAVEL'\]\.indexOf\(status\)/);
assert.match(mapros, /destinatarios:\s*emails/);
assert.match(mapros, /email !== emailInativado/);
assert.match(mapros, /liderInativado:\s*liderInativado/);
assert.match(mapros, /É necessário definir um novo líder/);
assert.deepEqual(JSON.parse(vm.runInContext(`JSON.stringify(
  obterDestinatariosAvisoInativacaoMapro_([
    {ID_MAPRO:'1',EMAIL:'inativo@empresa.com',ATIVO:'NAO'},
    {ID_MAPRO:'1',EMAIL:'participante@empresa.com',ATIVO:'SIM'},
    {ID_MAPRO:'1',EMAIL:'participante@empresa.com',ATIVO:'SIM'},
    {ID_MAPRO:'2',EMAIL:'outro@empresa.com',ATIVO:'SIM'}
  ], {ID_MAPRO:'1','EMAIL_LÍDER':'lider@empresa.com'}, 'inativo@empresa.com'))`, contexto)),
  ['participante@empresa.com', 'lider@empresa.com']);
assert.match(mapros, /function enviarEmailConclusaoProjetoMapro_/);
assert.equal(vm.runInContext(
  "responsavelPermitidoNaEdicaoMapro_({ID_RESPONSAVEL:'07'}, {ID:'7'}, {})",
  contexto
), true);
assert.equal(vm.runInContext(
  "responsavelPermitidoNaEdicaoMapro_({ID_RESPONSAVEL:'07'}, {ID:'8'}, {})",
  contexto
), false);
assert.equal(vm.runInContext(
  "responsavelPermitidoNaEdicaoMapro_(null, {ID:'8'}, {'8':true})",
  contexto
), true);
assert.doesNotThrow(function () {
  vm.runInContext(`validarAtividadeMapro_({
    idMapro:'1', idAtividade:'pai-legado', idAtividadePai:'topico', tipo:'ATIVIDADE',
    nomeAtividade:'Atividade agregadora', idResponsavel:'', dataInicio:'', dataFinal:'',
    status:'PLANEJADA'
  }, {permitirCamposOperacionaisVazios:true})`, contexto);
});
assert.throws(function () {
  vm.runInContext(`validarAtividadeMapro_({
    idMapro:'1', idAtividade:'folha', idAtividadePai:'topico', tipo:'ATIVIDADE',
    nomeAtividade:'Atividade folha', idResponsavel:'', dataInicio:'', dataFinal:'',
    status:'PLANEJADA'
  })`, contexto);
}, /Selecione o responsável/);
assert.match(mapros,
  /const houveReplanejamento = acompanhamentoIniciado && Boolean\(atual\) &&[\s\S]{0,80}!atividadeTemFilhos/);
assert.match(codigo, /function reenviarEmailsAprovacaoMapro\(/);
assert.match(codigo, /enviarEmailsAprovacaoMapro_\(registro, agora, urlPublicaAprovacao\)/);
assert.match(
  codigo,
  /const urlPublicaAprovacao[\s\S]*obterUrlPublicaAplicacao_\(\)[\s\S]*aba\.getRange\(linha, 4\)\.setValue\(status\)/
);
assert.match(codigo, /ANALISAR SOLICITAÇÃO/);
assert.match(codigo, /itens\.join\(', '\) \+ '\.'/);
assert.match(mapros, /String\(atividade\.TIPO \|\| ''\)\.toUpperCase\(\) === 'TOPICO'/);
assert.match(codigo, /'PROCESSO_CRITICO', 'INICIATIVA_ESTRATEGICA', 'ENVOLVE_SISTEMA'/);
assert.match(mapros, /INICIATIVA_ESTRATEGICA:\s*iniciativaEstrategica/);
assert.match(codigo, /Informe se o projeto faz parte de uma iniciativa estratégica/);

const cadeiaPrazos = [
  {ID_ATIVIDADE:'A',ID_MAPRO:'1',ID_ATIVIDADE_PREDECESSORA:'',ATIVO:'SIM',DATA_INICIO:'2026-09-01',DATA_FINAL:'2026-09-05',VERSION:1},
  {ID_ATIVIDADE:'B',ID_MAPRO:'1',ID_ATIVIDADE_PREDECESSORA:'A',ATIVO:'SIM',DATA_INICIO:'2026-09-06',DATA_FINAL:'2026-09-10',VERSION:1},
  {ID_ATIVIDADE:'C',ID_MAPRO:'1',ID_ATIVIDADE_PREDECESSORA:'B',ATIVO:'SIM',DATA_INICIO:'2026-09-11',DATA_FINAL:'2026-09-15',VERSION:1}
];
const cadeiaSerializada = JSON.stringify(cadeiaPrazos);
const aposPredecessora = JSON.parse(vm.runInContext(`JSON.stringify((function () {
  const registros = ${cadeiaSerializada};
  propagarPrazoPredecessoraMapro_(registros, '1', 'A', 3, false, '', '', [], {B:true});
  return registros;
})())`, contexto));
assert.equal(aposPredecessora[1].DATA_FINAL, '2026-09-10');
assert.equal(aposPredecessora[2].DATA_FINAL, '2026-09-15');
const aposEdicaoDireta = JSON.parse(vm.runInContext(`JSON.stringify((function () {
  const registros = ${cadeiaSerializada};
  propagarPrazoPredecessoraMapro_(registros, '1', 'B', 2, false, '', '', [], {B:true});
  return registros;
})())`, contexto));
assert.equal(aposEdicaoDireta[2].DATA_FINAL, '2026-09-17');

assert.equal(vm.runInContext(
  "urlPublicaValidaMapro_('https://script.google.com/macros/s/abc_123-def/exec')",
  contexto
), true);
assert.equal(vm.runInContext(
  "urlPublicaValidaMapro_('https://script.google.com/a/macros/integrajca.com.br/s/abc_123-def/exec')",
  contexto
), true);
assert.equal(vm.runInContext(
  "urlPublicaValidaMapro_('https://script.google.com/a/macros/integrajca.com.br/s/abc_123-def/dev')",
  contexto
), false);
contexto.ScriptApp = {
  getService() {
    return { getUrl() { return 'https://script.google.com/macros/s/teste/dev'; } };
  }
};
contexto.PropertiesService = {
  getScriptProperties() {
    return {
      getProperty() {
        return 'https://script.google.com/a/macros/integrajca.com.br/s/publica/exec';
      }
    };
  }
};
assert.equal(
  vm.runInContext('obterUrlPublicaAplicacao_()', contexto),
  'https://script.google.com/a/macros/integrajca.com.br/s/publica/exec'
);
contexto.PropertiesService = {
  getScriptProperties() {
    return { getProperty() { return ''; } };
  }
};
assert.match(
  vm.runInContext('obterUrlPublicaAplicacao_()', contexto),
  /^https:\/\/script\.google\.com\/a\/macros\/integrajca\.com\.br\/s\/.+\/exec$/
);

assert.match(html, /data-classificacao="ATRASADA"/);
assert.match(html, /data-classificacao="NO_PRAZO"/);
assert.match(html, /data-classificacao="CONCLUIDA"/);
assert.match(js, /estadoMapros\.filtroClassificacao === classificacao/);
assert.match(js, /atividade\.tipo === 'TOPICO' \|\| temFilhos/);
assert.match(html, /botao-informacao-padrao-mapro botao-informacao-cabecalho-mapro/);
assert.match(html, /botao-informacao-padrao-mapro botao-informacao-participantes-mapro/);

assert.match(usuariosHtml, /<option value="GERENTE">Gerente<\/option>/);
assert.match(usuariosHtml, /<option value="DIRETOR">Diretor<\/option>/);
assert.match(usuariosHtml, /id="campo-areas-relacionadas-usuario"/);
assert.match(usuariosJs, /obterAreasRelacionadasSelecionadasUsuario/);

console.log('Testes de governança, portfólio e perfis concluídos com sucesso.');
