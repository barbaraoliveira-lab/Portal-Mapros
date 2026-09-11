const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const codigo = fs.readFileSync('Código.js', 'utf8');
const mapros = fs.readFileSync('Mapros.js', 'utf8');
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
assert.match(mapros, /function enviarEmailConclusaoProjetoMapro_/);
assert.match(codigo, /ANALISAR SOLICITAÇÃO/);
assert.match(codigo, /itens\.join\(', '\) \+ '\.'/);
assert.match(mapros, /String\(atividade\.TIPO \|\| ''\)\.toUpperCase\(\) === 'TOPICO'/);

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
