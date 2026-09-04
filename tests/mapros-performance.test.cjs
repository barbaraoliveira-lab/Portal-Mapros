const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const contexto = { console };
vm.createContext(contexto);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'Mapros.js'), 'utf8'),
  contexto
);

function criarAbaFalsa() {
  const escritas = [];
  return {
    escritas,
    getRange(linha, coluna, quantidadeLinhas, quantidadeColunas) {
      return {
        setValues(valores) {
          escritas.push({ linha, coluna, quantidadeLinhas, quantidadeColunas, valores });
        }
      };
    }
  };
}

function atividade(id, nome) {
  return {
    ID_ATIVIDADE: id,
    ID_MAPRO: '01',
    ORDEM: Number(id),
    TIPO: 'ATIVIDADE',
    NOME_ATIVIDADE: nome,
    ATIVO: 'SIM',
    VERSION: 1
  };
}

{
  const registros = [atividade('1', 'A'), atividade('2', 'B')];
  const assinaturas = registros.map(contexto.assinarRegistroAtividadeMapro_);
  const aba = criarAbaFalsa();
  contexto.persistirAtividadesAlteradasMapro_(aba, registros, 2, assinaturas);
  assert.equal(aba.escritas.length, 0, 'não deve gravar quando nada mudou');
}

{
  const registros = [atividade('1', 'A'), atividade('2', 'B'), atividade('3', 'C')];
  const assinaturas = registros.map(contexto.assinarRegistroAtividadeMapro_);
  registros[0].NOME_ATIVIDADE = 'A2';
  registros[1].NOME_ATIVIDADE = 'B2';
  const aba = criarAbaFalsa();
  contexto.persistirAtividadesAlteradasMapro_(aba, registros, 3, assinaturas);
  assert.equal(aba.escritas.length, 1, 'linhas contíguas devem usar uma escrita');
  assert.equal(aba.escritas[0].linha, 2);
  assert.equal(aba.escritas[0].quantidadeLinhas, 2);
}

{
  const registros = [atividade('1', 'A'), atividade('2', 'B')];
  const assinaturas = registros.map(contexto.assinarRegistroAtividadeMapro_);
  registros.push(atividade('3', 'C'));
  const aba = criarAbaFalsa();
  contexto.persistirAtividadesAlteradasMapro_(aba, registros, 2, assinaturas);
  assert.equal(aba.escritas.length, 1, 'novas atividades devem ser anexadas em lote');
  assert.equal(aba.escritas[0].linha, 4);
  assert.equal(aba.escritas[0].quantidadeLinhas, 1);
}

assert.doesNotThrow(function () {
  contexto.validarArquivoEvidenciaMapro_('.pdf', 'application/pdf');
});
assert.throws(function () {
  contexto.validarArquivoEvidenciaMapro_('.html', 'text/html');
}, /Formato de evidência não permitido/);
assert.throws(function () {
  contexto.validarArquivoEvidenciaMapro_('.pdf', 'text/html');
}, /Formato de evidência não permitido/);

console.log('Testes de persistência incremental concluídos com sucesso.');
