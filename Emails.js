const CABECALHOS_MAPRO_EMAILS = [
  'ID_EMAIL', 'CHAVE_IDEMPOTENCIA', 'TIPO', 'CONTEXTO_ID', 'DESTINATARIO',
  'ASSUNTO', 'CORPO_TEXTO_B64', 'CORPO_HTML_B64', 'NOME_REMETENTE', 'STATUS',
  'TENTATIVAS', 'ULTIMA_TENTATIVA_EM', 'PROXIMA_TENTATIVA_EM', 'ENVIADO_EM',
  'ULTIMO_ERRO', 'CRIADO_EM', 'CRIADO_POR'
];

const STATUS_EMAIL_MAPRO = {
  PENDENTE: 'PENDENTE',
  PROCESSANDO: 'PROCESSANDO',
  ENVIADO: 'ENVIADO',
  FALHA: 'FALHA'
};

/** Cria a caixa de saída sem alterar ou remover registros existentes. */
function configurarEstruturaEmailsMapro_(planilha) {
  const aba = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaFilaEmails,
    CABECALHOS_MAPRO_EMAILS
  );
  if (aba.getFrozenRows() < 1) formatarAba_(aba, CABECALHOS_MAPRO_EMAILS.length);
  return aba;
}

function obterAbaFilaEmailsMapro_() {
  return configurarEstruturaEmailsMapro_(obterPlanilha_());
}

function emailValidoMapro_(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(normalizarEmail_(email));
}

function codificarConteudoEmailMapro_(conteudo) {
  const blob = Utilities.newBlob(String(conteudo == null ? '' : conteudo), 'text/plain');
  return Utilities.base64Encode(blob.getBytes());
}

function decodificarConteudoEmailMapro_(conteudo) {
  if (!conteudo) return '';
  return Utilities.newBlob(Utilities.base64Decode(String(conteudo)))
    .getDataAsString('UTF-8');
}

function normalizarChaveIdempotenciaEmailMapro_(valor) {
  return String(valor || '').trim().replace(/\s+/g, '_').slice(0, 500);
}

function linhaEmailMapro_(registro) {
  return CABECALHOS_MAPRO_EMAILS.map(function (cabecalho) {
    return registro[cabecalho] == null ? '' : registro[cabecalho];
  });
}

function buscarLinhaEmailPorChaveMapro_(aba, chave) {
  if (!chave || aba.getLastRow() < 2) return 0;
  const encontrado = aba.getRange(2, 2, aba.getLastRow() - 1, 1)
    .createTextFinder(chave)
    .matchEntireCell(true)
    .findNext();
  return encontrado ? encontrado.getRow() : 0;
}

function buscarLinhaEmailPorIdMapro_(aba, idEmail) {
  if (!idEmail || aba.getLastRow() < 2) return 0;
  const encontrado = aba.getRange(2, 1, aba.getLastRow() - 1, 1)
    .createTextFinder(String(idEmail))
    .matchEntireCell(true)
    .findNext();
  return encontrado ? encontrado.getRow() : 0;
}

function autorFilaEmailMapro_() {
  try {
    return normalizarEmail_(Session.getActiveUser().getEmail()) || 'SISTEMA';
  } catch (erro) {
    return 'SISTEMA';
  }
}

/**
 * Registra um e-mail antes da tentativa de envio. A chave estável impede duplicações
 * quando a mesma ação de negócio é reexecutada.
 */
function enfileirarEmailMapro_(mensagem) {
  const dados = mensagem || {};
  const destinatario = normalizarEmail_(dados.to);
  if (!emailValidoMapro_(destinatario)) {
    throw new Error('Destinatário de e-mail inválido: ' + (destinatario || 'não informado') + '.');
  }
  const assunto = String(dados.subject || '').trim();
  const corpoTexto = String(dados.body || '');
  if (!assunto || !corpoTexto) {
    throw new Error('Assunto e corpo de texto são obrigatórios para o envio de e-mail.');
  }
  let chave = normalizarChaveIdempotenciaEmailMapro_(dados.chaveIdempotencia);
  if (!chave) {
    chave = normalizarChaveIdempotenciaEmailMapro_([
      dados.tipo || 'GERAL', dados.contextoId || '', destinatario, assunto
    ].join(':'));
  }
  if (dados.forcarNovo) chave += ':' + Utilities.getUuid();

  const bloqueio = LockService.getDocumentLock();
  try {
    bloqueio.waitLock(10000);
    const aba = obterAbaFilaEmailsMapro_();
    const linhaExistente = buscarLinhaEmailPorChaveMapro_(aba, chave);
    if (linhaExistente) {
      const existente = lerRegistroDaLinha_(aba, linhaExistente, CABECALHOS_MAPRO_EMAILS);
      return {
        idEmail: String(existente.ID_EMAIL || ''),
        status: String(existente.STATUS || STATUS_EMAIL_MAPRO.PENDENTE),
        existente: true
      };
    }
    const agora = new Date().toISOString();
    const registro = {
      ID_EMAIL: Utilities.getUuid(),
      CHAVE_IDEMPOTENCIA: chave,
      TIPO: String(dados.tipo || 'GERAL').toUpperCase(),
      CONTEXTO_ID: String(dados.contextoId || ''),
      DESTINATARIO: destinatario,
      ASSUNTO: assunto,
      CORPO_TEXTO_B64: codificarConteudoEmailMapro_(corpoTexto),
      CORPO_HTML_B64: codificarConteudoEmailMapro_(dados.htmlBody || ''),
      NOME_REMETENTE: String(dados.name || 'SGI MAPRO'),
      STATUS: STATUS_EMAIL_MAPRO.PENDENTE,
      TENTATIVAS: 0,
      ULTIMA_TENTATIVA_EM: '',
      PROXIMA_TENTATIVA_EM: agora,
      ENVIADO_EM: '',
      ULTIMO_ERRO: '',
      CRIADO_EM: agora,
      CRIADO_POR: autorFilaEmailMapro_()
    };
    aba.getRange(aba.getLastRow() + 1, 1, 1, CABECALHOS_MAPRO_EMAILS.length)
      .setValues([linhaEmailMapro_(registro)]);
    return {idEmail: registro.ID_EMAIL, status: registro.STATUS, existente: false};
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function minutosProximaTentativaEmailMapro_(tentativas) {
  const atrasos = CONFIG.atrasosRetentativaEmailMinutos || [5, 30, 120, 720, 1440];
  const indice = Math.max(0, Math.min(atrasos.length - 1, Number(tentativas || 1) - 1));
  return Number(atrasos[indice] || 5);
}

function elegivelProcessamentoEmailMapro_(registro, agora, opcoes) {
  const status = String(registro.STATUS || STATUS_EMAIL_MAPRO.PENDENTE).toUpperCase();
  const tentativas = Number(registro.TENTATIVAS || 0);
  const configuracao = opcoes || {};
  if (status === STATUS_EMAIL_MAPRO.ENVIADO) return false;
  if (status === STATUS_EMAIL_MAPRO.PROCESSANDO) {
    const ultima = new Date(registro.ULTIMA_TENTATIVA_EM || 0);
    return !Number.isNaN(ultima.getTime()) &&
      agora.getTime() - ultima.getTime() >= 30 * 60 * 1000;
  }
  if (tentativas >= Number(CONFIG.maxTentativasEmail || 5) && !configuracao.ignorarLimite) {
    return false;
  }
  if ([STATUS_EMAIL_MAPRO.PENDENTE, STATUS_EMAIL_MAPRO.FALHA].indexOf(status) === -1) {
    return false;
  }
  if (configuracao.ignorarAgendamento) return true;
  const proxima = new Date(registro.PROXIMA_TENTATIVA_EM || 0);
  return Number.isNaN(proxima.getTime()) || proxima.getTime() <= agora.getTime();
}

function obterCotaDisponivelEmailMapro_() {
  try {
    return Math.max(0, Number(MailApp.getRemainingDailyQuota() || 0));
  } catch (erro) {
    console.error(JSON.stringify({acao: 'FALHA_CONSULTA_COTA_EMAIL', erro: erro && erro.message}));
    return 0;
  }
}

/** Handler privado do gatilho e processador interno da caixa de saída. */
function processarFilaEmailsMapro_(opcoes) {
  const configuracao = opcoes || {};
  const ids = (configuracao.ids || []).reduce(function (mapa, id) {
    mapa[String(id)] = true;
    return mapa;
  }, {});
  const filtrarIds = Object.keys(ids).length > 0;
  const limiteConfigurado = Math.max(1, Number(configuracao.limite || CONFIG.loteEmails || 25));
  const cota = obterCotaDisponivelEmailMapro_();
  if (!cota) {
    return {processados: 0, enviados: 0, falhas: 0, pendentes: 0, cotaRestante: 0};
  }

  const bloqueio = LockService.getDocumentLock();
  const selecionados = [];
  try {
    bloqueio.waitLock(10000);
    const aba = obterAbaFilaEmailsMapro_();
    const agora = new Date();
    lerRegistros_(aba, CABECALHOS_MAPRO_EMAILS)
      .map(function (registro, indice) {
        registro._linha = indice + 2;
        return registro;
      })
      .filter(function (registro) {
        return (!filtrarIds || ids[String(registro.ID_EMAIL)]) &&
          elegivelProcessamentoEmailMapro_(registro, agora, configuracao);
      })
      .sort(function (a, b) {
        return new Date(a.CRIADO_EM || 0).getTime() - new Date(b.CRIADO_EM || 0).getTime();
      })
      .slice(0, Math.min(limiteConfigurado, cota))
      .forEach(function (registro) {
        registro.STATUS = STATUS_EMAIL_MAPRO.PROCESSANDO;
        registro.TENTATIVAS = Number(registro.TENTATIVAS || 0) + 1;
        registro.ULTIMA_TENTATIVA_EM = agora.toISOString();
        registro.PROXIMA_TENTATIVA_EM = '';
        registro.ULTIMO_ERRO = '';
        aba.getRange(registro._linha, 1, 1, CABECALHOS_MAPRO_EMAILS.length)
          .setValues([linhaEmailMapro_(registro)]);
        selecionados.push(registro);
      });
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }

  const resultados = selecionados.map(function (registro) {
    try {
      const mensagem = {
        to: normalizarEmail_(registro.DESTINATARIO),
        subject: String(registro.ASSUNTO || ''),
        body: decodificarConteudoEmailMapro_(registro.CORPO_TEXTO_B64),
        name: String(registro.NOME_REMETENTE || 'SGI MAPRO')
      };
      const html = decodificarConteudoEmailMapro_(registro.CORPO_HTML_B64);
      if (html) mensagem.htmlBody = html;
      MailApp.sendEmail(mensagem);
      return {idEmail: String(registro.ID_EMAIL), enviado: true, erro: ''};
    } catch (erro) {
      return {
        idEmail: String(registro.ID_EMAIL),
        enviado: false,
        erro: erro && erro.message ? String(erro.message).slice(0, 1000) : 'ERRO_DESCONHECIDO'
      };
    }
  });

  let enviados = 0;
  let falhas = 0;
  try {
    bloqueio.waitLock(10000);
    const aba = obterAbaFilaEmailsMapro_();
    resultados.forEach(function (resultado) {
      const linha = buscarLinhaEmailPorIdMapro_(aba, resultado.idEmail);
      if (!linha) return;
      const registro = lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPRO_EMAILS);
      if (resultado.enviado) {
        registro.STATUS = STATUS_EMAIL_MAPRO.ENVIADO;
        registro.ENVIADO_EM = new Date().toISOString();
        registro.PROXIMA_TENTATIVA_EM = '';
        registro.ULTIMO_ERRO = '';
        enviados += 1;
      } else {
        const tentativas = Number(registro.TENTATIVAS || 0);
        registro.STATUS = STATUS_EMAIL_MAPRO.FALHA;
        registro.ULTIMO_ERRO = resultado.erro;
        registro.PROXIMA_TENTATIVA_EM = tentativas >= Number(CONFIG.maxTentativasEmail || 5)
          ? ''
          : new Date(Date.now() + minutosProximaTentativaEmailMapro_(tentativas) * 60000)
            .toISOString();
        falhas += 1;
      }
      aba.getRange(linha, 1, 1, CABECALHOS_MAPRO_EMAILS.length)
        .setValues([linhaEmailMapro_(registro)]);
    });
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }

  const resumo = {
    processados: resultados.length,
    enviados: enviados,
    falhas: falhas,
    pendentes: Math.max(0, selecionados.length - resultados.length),
    cotaRestante: Math.max(0, cota - enviados)
  };
  console.info(JSON.stringify(Object.assign({acao: 'FILA_EMAILS_MAPRO_PROCESSADA'}, resumo)));
  return resumo;
}

function obterStatusEmailMapro_(idEmail) {
  const aba = obterAbaFilaEmailsMapro_();
  const linha = buscarLinhaEmailPorIdMapro_(aba, idEmail);
  if (!linha) return null;
  return lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPRO_EMAILS);
}

/** Registra e tenta entregar imediatamente; falhas permanecem para nova tentativa. */
function entregarEmailMapro_(mensagem) {
  try {
    const fila = enfileirarEmailMapro_(mensagem);
    if (fila.status === STATUS_EMAIL_MAPRO.ENVIADO) {
      return {enviado: true, enfileirado: true, idEmail: fila.idEmail, reutilizado: true};
    }
    processarFilaEmailsMapro_({
      ids: [fila.idEmail],
      limite: 1,
      ignorarAgendamento: true
    });
    const atual = obterStatusEmailMapro_(fila.idEmail);
    return {
      enviado: Boolean(atual && String(atual.STATUS) === STATUS_EMAIL_MAPRO.ENVIADO),
      enfileirado: true,
      idEmail: fila.idEmail,
      status: atual ? String(atual.STATUS) : fila.status,
      erro: atual ? String(atual.ULTIMO_ERRO || '') : ''
    };
  } catch (erro) {
    console.error(JSON.stringify({
      acao: 'FALHA_REGISTRO_EMAIL_MAPRO',
      tipo: mensagem && mensagem.tipo,
      destinatario: mensagem && mensagem.to,
      erro: erro && erro.message
    }));
    return {enviado: false, enfileirado: false, erro: erro && erro.message};
  }
}

/** Instala uma única rotina de retentativa para toda a caixa de saída. */
function configurarGatilhoFilaEmailsMapro_() {
  const funcao = 'processarFilaEmailsMapro_';
  const existe = ScriptApp.getProjectTriggers().some(function (gatilho) {
    return gatilho.getHandlerFunction() === funcao;
  });
  if (!existe) {
    ScriptApp.newTrigger(funcao).timeBased().everyMinutes(15).create();
  }
}

/** Reativa falhas esgotadas e tenta novamente; disponível apenas para administradores. */
function reprocessarFilaEmailsMapro() {
  try {
    garantirBancoConfigurado_();
    const administrador = exigirAdministrador_();
    const bloqueio = LockService.getDocumentLock();
    let reativados = 0;
    try {
      bloqueio.waitLock(10000);
      const aba = obterAbaFilaEmailsMapro_();
      const registros = lerRegistros_(aba, CABECALHOS_MAPRO_EMAILS);
      registros.forEach(function (registro) {
        const status = String(registro.STATUS || '').toUpperCase();
        if (status !== STATUS_EMAIL_MAPRO.FALHA && status !== STATUS_EMAIL_MAPRO.PENDENTE) return;
        registro.STATUS = STATUS_EMAIL_MAPRO.PENDENTE;
        registro.TENTATIVAS = 0;
        registro.PROXIMA_TENTATIVA_EM = new Date().toISOString();
        registro.ULTIMO_ERRO = '';
        reativados += 1;
      });
      if (reativados) {
        aba.getRange(2, 1, registros.length, CABECALHOS_MAPRO_EMAILS.length)
          .setValues(registros.map(linhaEmailMapro_));
      }
    } finally {
      if (bloqueio.hasLock()) bloqueio.releaseLock();
    }
    const resultado = processarFilaEmailsMapro_({limite: CONFIG.loteEmails || 25});
    console.info(JSON.stringify({
      acao: 'FILA_EMAILS_MAPRO_REPROCESSADA_MANUALMENTE',
      realizadoPor: administrador.EMAIL,
      reativados: reativados,
      enviados: resultado.enviados,
      falhas: resultado.falhas
    }));
    return {
      sucesso: true,
      mensagem: reativados
        ? reativados + ' e-mail(s) liberado(s) para nova tentativa; ' +
          resultado.enviados + ' enviado(s) agora, ' + resultado.falhas + ' com falha e ' +
          Math.max(0, reativados - resultado.processados) + ' aguardando o próximo lote.'
        : 'Não há e-mails pendentes ou com falha para reprocessar.'
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}
