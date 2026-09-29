const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class IntervaloFalso {
  constructor(aba, linha, coluna, linhas, colunas) {
    this.aba = aba;
    this.linha = linha;
    this.coluna = coluna;
    this.linhas = linhas;
    this.colunas = colunas;
  }

  getValues() {
    return Array.from({length: this.linhas}, (_, i) =>
      Array.from({length: this.colunas}, (_, j) =>
        this.aba.dados[this.linha - 1 + i]?.[this.coluna - 1 + j] ?? ''
      )
    );
  }

  setValues(valores) {
    valores.forEach((linhaValores, i) => {
      const destino = this.linha - 1 + i;
      if (!this.aba.dados[destino]) this.aba.dados[destino] = [];
      linhaValores.forEach((valor, j) => {
        this.aba.dados[destino][this.coluna - 1 + j] = valor;
      });
    });
    return this;
  }

  createTextFinder(texto) {
    const intervalo = this;
    return {
      matchEntireCell() { return this; },
      findNext() {
        for (let i = 0; i < intervalo.linhas; i += 1) {
          for (let j = 0; j < intervalo.colunas; j += 1) {
            if (String(intervalo.getValues()[i][j]) === String(texto)) {
              return {getRow() { return intervalo.linha + i; }};
            }
          }
        }
        return null;
      }
    };
  }

  clearContent() {
    for (let i = 0; i < this.linhas; i += 1) {
      for (let j = 0; j < this.colunas; j += 1) {
        if (this.aba.dados[this.linha - 1 + i]) {
          this.aba.dados[this.linha - 1 + i][this.coluna - 1 + j] = '';
        }
      }
    }
    return this;
  }

  setBackground() { return this; }
  setFontColor() { return this; }
  setFontWeight() { return this; }
}

class AbaFalsa {
  constructor(nome) {
    this.nome = nome;
    this.dados = [];
    this.congeladas = 0;
  }

  getLastRow() { return this.dados.length; }
  getLastColumn() { return this.dados.reduce((maior, linha) => Math.max(maior, linha.length), 0); }
  getFrozenRows() { return this.congeladas; }
  setFrozenRows(valor) { this.congeladas = valor; }
  autoResizeColumns() {}
  getRange(linha, coluna, linhas = 1, colunas = 1) {
    return new IntervaloFalso(this, linha, coluna, linhas, colunas);
  }
  getDataRange() {
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }
}

class PlanilhaFalsa {
  constructor() { this.abas = {}; }
  getSheetByName(nome) { return this.abas[nome] || null; }
  insertSheet(nome) {
    const aba = new AbaFalsa(nome);
    this.abas[nome] = aba;
    return aba;
  }
}

let sequencia = 0;
let cota = 100;
let falharEnvio = false;
const enviados = [];
const planilha = new PlanilhaFalsa();
const bloqueio = {
  travado: false,
  waitLock() { this.travado = true; },
  hasLock() { return this.travado; },
  releaseLock() { this.travado = false; }
};
const contexto = vm.createContext({
  console,
  Buffer,
  SpreadsheetApp: {getActiveSpreadsheet() { return planilha; }},
  LockService: {getDocumentLock() { return bloqueio; }},
  Session: {getActiveUser() { return {getEmail() { return 'sgi@integrajca.com.br'; }}; }},
  Utilities: {
    getUuid() { sequencia += 1; return 'uuid-' + sequencia; },
    newBlob(valor) {
      const buffer = Buffer.isBuffer(valor) ? valor : Buffer.from(valor);
      return {
        getBytes() { return Array.from(buffer); },
        getDataAsString() { return buffer.toString('utf8'); }
      };
    },
    base64Encode(bytes) { return Buffer.from(bytes).toString('base64'); },
    base64Decode(valor) { return Array.from(Buffer.from(valor, 'base64')); }
  },
  MailApp: {
    getRemainingDailyQuota() { return cota; },
    sendEmail(mensagem) {
      if (falharEnvio) throw new Error('Falha temporária simulada');
      enviados.push(mensagem);
      cota -= 1;
    }
  }
});

vm.runInContext(fs.readFileSync('Código.js', 'utf8'), contexto);
vm.runInContext(fs.readFileSync('Emails.js', 'utf8'), contexto);

assert.equal(contexto.emailValidoMapro_('usuario@integrajca.com.br'), true);
assert.equal(contexto.emailValidoMapro_('email-invalido'), false);
assert.equal(contexto.minutosProximaTentativaEmailMapro_(1), 5);
assert.equal(contexto.minutosProximaTentativaEmailMapro_(5), 1440);

const mensagem = {
  to: 'usuario@integrajca.com.br',
  subject: 'Teste da fila',
  body: 'Conteúdo de texto',
  htmlBody: '<strong>Conteúdo HTML</strong>',
  tipo: 'TESTE',
  contextoId: '01',
  chaveIdempotencia: 'TESTE:01:usuario@integrajca.com.br'
};
const primeira = contexto.entregarEmailMapro_(mensagem);
assert.equal(primeira.enviado, true);
assert.equal(enviados.length, 1);
assert.equal(enviados[0].body, mensagem.body);
assert.equal(enviados[0].htmlBody, mensagem.htmlBody);

const duplicada = contexto.entregarEmailMapro_(mensagem);
assert.equal(duplicada.enviado, true);
assert.equal(enviados.length, 1, 'a chave idempotente deve impedir envio duplicado');

falharEnvio = true;
const comFalha = contexto.entregarEmailMapro_({
  ...mensagem,
  to: 'falha@integrajca.com.br',
  chaveIdempotencia: 'TESTE:FALHA'
});
assert.equal(comFalha.enfileirado, true);
assert.equal(comFalha.enviado, false);
assert.equal(comFalha.status, 'FALHA');
assert.match(comFalha.erro, /Falha temporária simulada/);

falharEnvio = false;
cota = 0;
const semCota = contexto.entregarEmailMapro_({
  ...mensagem,
  to: 'cota@integrajca.com.br',
  chaveIdempotencia: 'TESTE:COTA'
});
assert.equal(semCota.enfileirado, true);
assert.equal(semCota.enviado, false);
assert.equal(semCota.status, 'PENDENTE');

const aba = planilha.getSheetByName('MAPRO_EMAIL_OUTBOX');
assert.equal(aba.getLastRow(), 4, 'deve haver cabeçalho e três eventos únicos');
assert.equal(
  contexto.entregarEmailMapro_({...mensagem, to: 'invalido'}).enfileirado,
  false,
  'endereços inválidos não devem entrar na fila'
);

const codigo = fs.readFileSync('Código.js', 'utf8');
const mapros = fs.readFileSync('Mapros.js', 'utf8') +
  fs.readFileSync('MaprosParte2.js', 'utf8');
const emails = fs.readFileSync('Emails.js', 'utf8');
const interfaceSolicitacoes = fs.readFileSync('solicitacoesDeMapro.html', 'utf8');
assert.match(interfaceSolicitacoes,
  /Processo crítico<\/dt><dd>Impacta a receita, o cliente externo e a estratégia da empresa\./);
assert.doesNotMatch(codigo, /MailApp\.sendEmail/);
assert.doesNotMatch(mapros, /MailApp\.sendEmail/);
[
  'NOVA_SOLICITACAO_MAPRO', 'SOLICITACAO_ACESSO', 'APROVACAO_MAPRO',
  'REJEICAO_MAPRO', 'PARTICIPANTE_RELACIONADO', 'ABERTURA_PROJETO',
  'CONCLUSAO_PROJETO', 'INATIVACAO_RESPONSAVEL', 'REPLANEJAMENTO_ATIVIDADE'
].forEach((tipo) => assert.match(codigo + mapros, new RegExp("tipo: '" + tipo + "'")));
assert.match(mapros, /tipo: 'AVISO_' \+ tipo/);
assert.match(emails, /getRemainingDailyQuota/);
assert.match(emails, /everyMinutes\(15\)/);
assert.match(emails, /function reprocessarFilaEmailsMapro\(/);
assert.match(interfaceSolicitacoes, /id="reenviar-emails-aprovacao"/);
assert.match(interfaceSolicitacoes, /id="reprocessar-fila-emails"/);

console.log('Testes da fila persistente de e-mails concluídos com sucesso.');
