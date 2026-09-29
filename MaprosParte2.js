function exigirEdicaoCompletaMapro_(contexto) {
  if (!contexto.podeEditarTudo) {
    throw new Error('Seu perfil permite apenas consultar ou editar atividades sob sua responsabilidade.');
  }
}

function podeEditarAtividadeMapro_(contexto, atividade) {
  if (contexto.podeEditarTudo) return true;
  return contexto.podeEditarProprias &&
    String(atividade.TIPO || '').toUpperCase() !== 'TOPICO' &&
    idsIguaisMapro_(atividade.ID_RESPONSAVEL, contexto.usuario.ID);
}

function mapearResumoMapro_(mapro, atividades) {
  const resumo = calcularResumoAtividadesMapro_(atividades);
  const statusBruto = calcularSituacaoProjetoMapro_(mapro.STATUS_MAPRO, atividades);
  const status = normalizarSituacaoMapro_(statusBruto);
  const saude = calcularSaudeMapro_(status, atividades);
  return {
    idMapro: formatarId_(Number(mapro.ID_MAPRO)),
    portfolio: String(mapro['PORTFÓLIO'] || ''),
    nomeProjeto: normalizarNomeProjeto_(mapro.NOME_PROJETO),
    contagiro: String(mapro.CONTAGIRO || ''),
    dataInicio: resumo.dataInicio || dataIsoMapro_(mapro.DATA_INICIO),
    dataFinal: resumo.dataFinal || dataIsoMapro_(mapro.DATA_FINAL),
    percentualConclusao: resumo.percentual,
    situacao: status,
    saude: saude,
    classificacaoPortfolio: calcularClassificacaoPortfolioMapro_(status, saude)
  };
}

function calcularClassificacaoPortfolioMapro_(situacao, saude) {
  const status = normalizarSituacaoMapro_(situacao);
  if (status === 'CANCELADA') return 'CANCELADA';
  if (status === 'NÃO APLICÁVEL') return 'NAO_APLICAVEL';
  if (status === 'CONCLUÍDA') return 'CONCLUIDA';
  return String(saude || '').toUpperCase() === 'VERMELHO' ? 'ATRASADA' : 'NO_PRAZO';
}

function mapearDetalhesMapro_(mapro) {
  const detalhes = {
    idMapro: formatarId_(Number(mapro.ID_MAPRO)),
    nomeProjeto: normalizarNomeProjeto_(mapro.NOME_PROJETO),
    portfolio: String(mapro['PORTFÓLIO'] || ''),
    oQueE: String(mapro.O_QUE_E || ''),
    porque: String(mapro.PORQUE || ''),
    resultadosEsperados: String(mapro.RESULTADOS_ESPERADOS || ''),
    contagiro: String(mapro.CONTAGIRO || ''),
    nivel: String(mapro.NIVEL || ''),
    dataInicio: dataIsoMapro_(mapro.DATA_INICIO),
    dataFinal: dataIsoMapro_(mapro.DATA_FINAL),
    idLider: formatarId_(Number(mapro['ID_LÍDER'])),
    lider: String(mapro['NOME_LÍDER'] || ''),
    emailLider: normalizarEmail_(mapro['EMAIL_LÍDER']),
    departamento: String(mapro.DEPARTAMENTO || ''),
    negocio: String(mapro.NEGOCIO || ''),
    dimensaoBsc: String(mapro.DIMENSAO_BSC || ''),
    objetivoBsc: String(mapro.OBJETIVO_BSC || ''),
    indicadores: String(mapro.INDICADORES || ''),
    possuiIndicadoresDefinidos: String(mapro.POSSUI_INDICADORES_DEFINIDOS || ''),
    processoCritico: String(mapro.PROCESSO_CRITICO || ''),
    iniciativaEstrategica: String(mapro.INICIATIVA_ESTRATEGICA || ''),
    envolveSistema: String(mapro.ENVOLVE_SISTEMA || ''),
    sistemasEnvolvidos: String(mapro.SISTEMAS_ENVOLVIDOS || ''),
    situacao: normalizarSituacaoMapro_(mapro.STATUS_MAPRO),
    prazoInicio: dataIsoMapro_(mapro.PRAZO_PREENCHIMENTO),
    acompanhamentoIniciado: Boolean(mapro.ACOMPANHAMENTO_INICIADO_EM),
    acompanhamentoIniciadoEm: String(mapro.ACOMPANHAMENTO_INICIADO_EM || ''),
    version: Number(mapro.VERSION || 1),
    possuiFotoLider: Boolean(String(mapro.FOTO_LIDER_ID || '').trim()),
    fotoLider: ''
  };
  return detalhes;
}

/** Carrega a imagem separadamente para não bloquear a abertura do projeto. */
function obterFotoLiderMapro(idMapro) {
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    return {
      sucesso: true,
      dados: { imagem: obterFotoLiderMaproParaCliente_(contexto.mapro) }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function obterFotoLiderMaproParaCliente_(mapro) {
  const idArquivo = String(mapro.FOTO_LIDER_ID || '').trim();
  if (!idArquivo) return '';
  try {
    const blob = DriveApp.getFileById(idArquivo).getBlob();
    const tipo = String(blob.getContentType() || mapro.FOTO_LIDER_TIPO || '').toLowerCase();
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(tipo) === -1) return '';
    return 'data:' + tipo + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (erro) {
    console.warn('Foto do líder indisponível para a Mapro ' + String(mapro.ID_MAPRO || '') + '.');
    return '';
  }
}

function iniciarAcompanhamentoMapro(idMapro, version) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    if (!contexto.podeIniciarAcompanhamento) {
      throw new Error('Somente o ADMIN ou um participante Editor pode iniciar o acompanhamento.');
    }
    bloqueio.waitLock(10000);
    const aba = obterAbaMapros_();
    const linha = buscarLinhaMaproPorId_(aba, idMapro);
    const atual = lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPROS);
    validarVersaoMapro_(atual, Number(version || 0));
    if (atual.ACOMPANHAMENTO_INICIADO_EM) {
      return { sucesso: true, mensagem: 'O acompanhamento deste projeto já foi iniciado.', dados: {
        iniciadoEm: String(atual.ACOMPANHAMENTO_INICIADO_EM), version: Number(atual.VERSION || 1)
      } };
    }
    const agora = new Date().toISOString();
    const alteracoes = {
      ACOMPANHAMENTO_INICIADO_EM: agora,
      ACOMPANHAMENTO_INICIADO_POR: normalizarEmail_(contexto.usuario.EMAIL),
      INICIADA_EM: atual.INICIADA_EM || agora,
      INICIADA_POR: atual.INICIADA_POR || normalizarEmail_(contexto.usuario.EMAIL),
      STATUS_MAPRO: String(atual.STATUS_MAPRO || '').toUpperCase() === 'AGUARDANDO_INICIO'
        ? 'EM_ANDAMENTO' : atual.STATUS_MAPRO,
      ATUALIZADO_EM: agora,
      VERSION: Number(atual.VERSION || 1) + 1
    };
    aba.getRange(linha, 1, 1, CABECALHOS_MAPROS.length).setValues([CABECALHOS_MAPROS.map(function (cabecalho) {
      return Object.prototype.hasOwnProperty.call(alteracoes, cabecalho) ? alteracoes[cabecalho] : atual[cabecalho];
    })]);
    console.info(JSON.stringify({
      acao: 'ACOMPANHAMENTO_MAPRO_INICIADO', maproId: String(idMapro),
      realizadoPor: contexto.usuario.EMAIL
    }));
    bloqueio.releaseLock();
    const resultadoEmails = enviarEmailsAberturaProjetoMapro_(atual);
    const mensagemEmails = resultadoEmails.falhas.length
      ? ' A abertura foi comunicada a ' + resultadoEmails.enviados +
        ' participante(s), mas ' + resultadoEmails.falhas.length +
        ' e-mail(s) não puderam ser enviados.'
      : ' A abertura foi comunicada a ' + resultadoEmails.enviados + ' participante(s).' +
        (resultadoEmails.pendentes.length
          ? ' ' + resultadoEmails.pendentes.length + ' e-mail(s) estão na fila automática.'
          : '');
    return {
      sucesso: true,
      mensagem: 'Acompanhamento iniciado. A Mapro está apta para acompanhamento na Contagiro designada.' +
        mensagemEmails,
      dados: {
        iniciadoEm: agora,
        version: alteracoes.VERSION,
        emailsEnviados: resultadoEmails.enviados,
        emailsPendentes: resultadoEmails.pendentes.length,
        emailsComFalha: resultadoEmails.falhas.length
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function enviarEmailsAberturaProjetoMapro_(mapro) {
  const destinatarios = {};
  obterParticipantesAtivosMapro_(mapro.ID_MAPRO).forEach(function (participante) {
    const email = normalizarEmail_(participante.email);
    if (email && !destinatarios[email]) {
      destinatarios[email] = {email: email, nome: participante.nome};
    }
  });
  const emailLider = normalizarEmail_(mapro['EMAIL_LÍDER']);
  if (emailLider && !destinatarios[emailLider]) {
    destinatarios[emailLider] = {email: emailLider, nome: String(mapro['NOME_LÍDER'] || '')};
  }
  const resultado = {enviados: 0, pendentes: [], falhas: []};
  Object.keys(destinatarios).forEach(function (email) {
    const destinatario = destinatarios[email];
    const idMapro = formatarId_(Number(mapro.ID_MAPRO));
    const entrega = entregarEmailMapro_({
      to: email,
      subject: 'ABERTURA DE PROJETO - ' + idMapro +
        ' - ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
      body: montarEmailAberturaProjetoTextoMapro_(destinatario, mapro),
      htmlBody: montarEmailAberturaProjetoHtmlMapro_(destinatario, mapro),
      name: 'SGI MAPRO',
      tipo: 'ABERTURA_PROJETO',
      contextoId: idMapro,
      chaveIdempotencia: 'ABERTURA_PROJETO:' + idMapro + ':' + email
    });
    if (entrega.enviado) resultado.enviados += 1;
    else if (entrega.enfileirado) resultado.pendentes.push(email);
    else resultado.falhas.push(email);
  });
  console.info(JSON.stringify({
    acao: 'EMAILS_ABERTURA_PROJETO_MAPRO_PROCESSADOS',
    maproId: String(mapro.ID_MAPRO),
    enviados: resultado.enviados,
    pendentes: resultado.pendentes.length,
    falhas: resultado.falhas.length
  }));
  return resultado;
}

function montarEmailAberturaProjetoTextoMapro_(destinatario, mapro) {
  return [
    'Olá, ' + String(destinatario.nome || 'participante') + '!',
    '',
    'A abertura do projeto foi realizada e a Mapro está apta para acompanhamento na Contagiro designada.',
    '',
    'ID da Mapro: ' + formatarId_(Number(mapro.ID_MAPRO)),
    'Nome do projeto: ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
    'Líder do projeto: ' + String(mapro['NOME_LÍDER'] || ''),
    'Portfólio: ' + String(mapro['PORTFÓLIO'] || ''),
    'Contagiro: ' + String(mapro.CONTAGIRO || 'Não informada'),
    'Nível: ' + String(mapro.NIVEL || 'Não informado'),
    'Departamento: ' + String(mapro.DEPARTAMENTO || 'Não informado'),
    'Negócio: ' + String(mapro.NEGOCIO || 'Não informado'),
    'Dimensão BSC: ' + String(mapro.DIMENSAO_BSC || 'Não informada'),
    'Objetivo BSC: ' + String(mapro.OBJETIVO_BSC || 'Não informado'),
    'Início: ' + formatarDataEmailMapro_(mapro.DATA_INICIO),
    'Prazo final: ' + formatarDataEmailMapro_(mapro.DATA_FINAL),
    'O que é o projeto: ' + String(mapro.O_QUE_E || 'Não informado'),
    'Por que: ' + String(mapro.PORQUE || 'Não informado'),
    'Resultados esperados: ' + String(mapro.RESULTADOS_ESPERADOS || 'Não informados'),
    'Indicadores: ' + formatarListaPontuadaEmail_(mapro.INDICADORES),
    'Processo crítico: ' + String(mapro.PROCESSO_CRITICO || 'Não informado'),
    'Iniciativa estratégica: ' + String(mapro.INICIATIVA_ESTRATEGICA || 'Não informado'),
    'Envolve sistema: ' + String(mapro.ENVOLVE_SISTEMA || 'Não informado'),
    'Sistema(s) envolvido(s): ' + formatarListaPontuadaEmail_(mapro.SISTEMAS_ENVOLVIDOS),
    '',
    'Acessar projeto: ' + montarUrlProjetoMapro_(mapro.ID_MAPRO),
    '',
    'CORPORATIVO | P&G | SGI'
  ].join('\n');
}

function montarEmailAberturaProjetoHtmlMapro_(destinatario, mapro) {
  const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
  const urlProjeto = montarUrlProjetoMapro_(mapro.ID_MAPRO);
  return '<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="width:100%;max-width:580px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px">' +
    '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto"></td></tr>' +
    '<tr><td style="padding:30px 34px 34px;font-size:14px;line-height:1.6">' +
    '<div role="img" aria-label="Confete" style="width:58px;height:58px;margin:0 auto 16px;border-radius:50%;background:#fff3c4;text-align:center;font-size:34px;line-height:58px">🎉</div>' +
    '<p style="margin:0 0 8px;color:#15942e;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Abertura do projeto</p>' +
    '<h1 style="margin:0 0 14px;color:#06063d;font-size:22px;line-height:1.25">Projeto aberto para acompanhamento</h1>' +
    '<p style="margin:0 0 18px">Olá, <strong>' + escaparHtml_(destinatario.nome || 'participante') + '</strong>!</p>' +
    '<p style="margin:0 0 22px">A abertura do projeto foi realizada e a Mapro está apta para acompanhamento na Contagiro designada.</p>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7fa;border-radius:10px;margin-bottom:22px">' +
    montarLinhaEmail_('ID da Mapro', formatarId_(Number(mapro.ID_MAPRO))) +
    montarLinhaEmail_('Nome do projeto', normalizarNomeProjeto_(mapro.NOME_PROJETO)) +
    montarLinhaEmail_('Líder do projeto', String(mapro['NOME_LÍDER'] || '')) +
    montarLinhaEmail_('Portfólio', String(mapro['PORTFÓLIO'] || '')) +
    montarLinhaEmail_('Contagiro', String(mapro.CONTAGIRO || 'Não informada')) +
    montarLinhaEmail_('Nível', String(mapro.NIVEL || 'Não informado')) +
    montarLinhaEmail_('Departamento', String(mapro.DEPARTAMENTO || 'Não informado')) +
    montarLinhaEmail_('Negócio', String(mapro.NEGOCIO || 'Não informado')) +
    montarLinhaEmail_('Dimensão BSC', String(mapro.DIMENSAO_BSC || 'Não informada')) +
    montarLinhaEmail_('Objetivo BSC', String(mapro.OBJETIVO_BSC || 'Não informado')) +
    montarLinhaEmail_('Início', formatarDataEmailMapro_(mapro.DATA_INICIO)) +
    montarLinhaEmail_('Prazo final', formatarDataEmailMapro_(mapro.DATA_FINAL)) +
    montarLinhaEmail_('O que é o projeto', String(mapro.O_QUE_E || 'Não informado')) +
    montarLinhaEmail_('Por que', String(mapro.PORQUE || 'Não informado')) +
    montarLinhaEmail_('Resultados esperados', String(mapro.RESULTADOS_ESPERADOS || 'Não informados')) +
    montarLinhaEmail_('Indicadores', formatarListaPontuadaEmail_(mapro.INDICADORES)) +
    montarLinhaEmail_('Processo crítico', String(mapro.PROCESSO_CRITICO || 'Não informado')) +
    montarLinhaEmail_('Iniciativa estratégica', String(mapro.INICIATIVA_ESTRATEGICA || 'Não informado')) +
    montarLinhaEmail_('Envolve sistema', String(mapro.ENVOLVE_SISTEMA || 'Não informado')) +
    montarLinhaEmail_('Sistema(s) envolvido(s)', formatarListaPontuadaEmail_(mapro.SISTEMAS_ENVOLVIDOS)) +
    '</table><table role="presentation" width="100%"><tr><td align="center">' +
    '<a href="' + escaparHtml_(urlProjeto) + '" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#06063d;color:#fff;text-decoration:none;font-weight:800">ACESSAR PROJETO</a>' +
    '</td></tr></table></td></tr><tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI</td></tr></table></td></tr></table></body></html>';
}

function mapearAtividadeMaproParaCliente_(atividade) {
  const inicio = dataIsoMapro_(atividade.DATA_INICIO);
  const fim = dataIsoMapro_(atividade.DATA_FINAL);
  return {
    idAtividade: String(atividade.ID_ATIVIDADE || ''),
    idMapro: formatarId_(Number(atividade.ID_MAPRO)),
    idAtividadePai: String(atividade.ID_ATIVIDADE_PAI || ''),
    idAtividadePredecessora: String(atividade.ID_ATIVIDADE_PREDECESSORA || ''),
    idAtividadePredecessoraRegistrada: String(atividade.ID_ATIVIDADE_PREDECESSORA || ''),
    ordem: Number(atividade.ORDEM || 0),
    tipo: String(atividade.TIPO || ''),
    nomeAtividade: String(atividade.NOME_ATIVIDADE || ''),
    idResponsavel: String(atividade.ID_RESPONSAVEL || '').trim()
      ? formatarId_(Number(atividade.ID_RESPONSAVEL)) : '',
    responsavel: String(atividade.NOME_RESPONSAVEL || ''),
    departamento: String(atividade.DEPARTAMENTO || ''),
    dataInicio: inicio,
    dataFinal: fim,
    dataInicioRegistrada: inicio,
    dataFinalRegistrada: fim,
    semanaInicio: calcularSemanaUtilMapro_(inicio),
    semanaFinal: calcularSemanaUtilMapro_(fim),
    status: String(atividade.STATUS_ATIVIDADE || ''),
    saude: calcularSaudeAtividadeMapro_(atividade),
    justificativa: String(atividade.JUSTIFICATIVA || ''),
    observacao: String(atividade.OBSERVACAO || ''),
    observacaoRegistrada: String(atividade.OBSERVACAO || ''),
    diasReplanejados: Number(atividade.DIAS_REPLANEJADOS || 0),
    evidenciaId: String(atividade.EVIDENCIA_ID || ''),
    evidenciaNome: String(atividade.EVIDENCIA_NOME || ''),
    evidenciaTipo: String(atividade.EVIDENCIA_TIPO || ''),
    evidenciaUrl: String(atividade.EVIDENCIA_URL || ''),
    evidenciaEnviadaPor: normalizarEmail_(atividade.EVIDENCIA_ENVIADA_POR),
    version: Number(atividade.VERSION || 1)
  };
}

function calcularResumoAtividadesMapro_(atividades) {
  const ativasPorOrdem = atividades.filter(function (atividade) {
    return String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
  }).sort(function (a, b) {
    const diferencaOrdem = Number(a.ORDEM || 0) - Number(b.ORDEM || 0);
    if (diferencaOrdem) return diferencaOrdem;
    return String(a.ID_ATIVIDADE || '').localeCompare(String(b.ID_ATIVIDADE || ''));
  });
  const topicos = ativasPorOrdem.filter(function (atividade) {
    return String(atividade.TIPO || '').toUpperCase() === 'TOPICO';
  });
  const ativas = [];
  const visitadas = {};
  const adicionarComFilhas = function (atividade) {
    const id = String(atividade.ID_ATIVIDADE || '');
    if (visitadas[id]) return;
    visitadas[id] = true;
    ativas.push(atividade);
    ativasPorOrdem.forEach(function (filha) {
      if (String(filha.ID_ATIVIDADE_PAI || '') === id) adicionarComFilhas(filha);
    });
  };
  topicos.forEach(function (topico) {
    adicionarComFilhas(topico);
  });
  ativasPorOrdem.forEach(function (atividade) {
    adicionarComFilhas(atividade);
  });
  const pais = {};
  ativas.forEach(function (atividade) {
    if (atividade.ID_ATIVIDADE_PAI) pais[String(atividade.ID_ATIVIDADE_PAI)] = true;
  });
  const folhas = ativas.filter(function (atividade) {
    return String(atividade.TIPO || '').toUpperCase() !== 'TOPICO' &&
      !pais[String(atividade.ID_ATIVIDADE)] &&
      String(atividade.STATUS_ATIVIDADE).toUpperCase() !== 'NAO_APLICAVEL';
  });
  const concluidas = folhas.filter(function (atividade) {
    return String(atividade.STATUS_ATIVIDADE).toUpperCase() === 'CONCLUIDA';
  }).length;
  const operacionais = ativas.filter(function (atividade) {
    return String(atividade.TIPO || '').toUpperCase() !== 'TOPICO';
  });
  const atividadesComInicio = operacionais.filter(function (atividade) {
    return Boolean(dataIsoMapro_(atividade.DATA_INICIO));
  });
  const atividadesComFinal = operacionais.filter(function (atividade) {
    return Boolean(dataIsoMapro_(atividade.DATA_FINAL));
  });
  const inicios = atividadesComInicio.map(function (atividade) {
    return dataIsoMapro_(atividade.DATA_INICIO);
  }).sort();
  const finais = atividadesComFinal.map(function (atividade) {
    return dataIsoMapro_(atividade.DATA_FINAL);
  }).sort();
  return {
    percentual: folhas.length ? Math.round((concluidas / folhas.length) * 100) : 0,
    dataInicio: inicios.length ? inicios[0] : '',
    dataFinal: finais.length ? finais[finais.length - 1] : '',
    totalAtividades: ativas.length,
    atividadesConcluidas: operacionais.filter(function (atividade) {
      return String(atividade.STATUS_ATIVIDADE || '').toUpperCase() === 'CONCLUIDA';
    }).length,
    atividadesEmAtraso: operacionais.filter(function (atividade) {
      return calcularSaudeAtividadeMapro_(atividade) === 'VERMELHO';
    }).length,
    atividadesNaoAplicaveis: operacionais.filter(function (atividade) {
      return String(atividade.STATUS_ATIVIDADE || '').toUpperCase() === 'NAO_APLICAVEL';
    }).length
  };
}

function agregarTopicosMapro_(atividades) {
  const ativas = atividades.filter(function (atividade) {
    return String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
  });
  const filhosPorPai = {};
  ativas.forEach(function (atividade) {
    const pai = String(atividade.ID_ATIVIDADE_PAI || '');
    if (!filhosPorPai[pai]) filhosPorPai[pai] = [];
    filhosPorPai[pai].push(atividade);
  });
  Object.keys(filhosPorPai).forEach(function (pai) {
    filhosPorPai[pai].sort(function (a, b) {
      return Number(a.ORDEM || 0) - Number(b.ORDEM || 0);
    });
  });
  const processar = function (atividade) {
    const filhos = filhosPorPai[String(atividade.ID_ATIVIDADE)] || [];
    filhos.forEach(processar);
    if (!filhos.length) return;
    const inicios = filhos.map(function (filha) { return dataIsoMapro_(filha.DATA_INICIO); })
      .filter(Boolean).sort();
    const finais = filhos.map(function (filha) { return dataIsoMapro_(filha.DATA_FINAL); })
      .filter(Boolean).sort();
    atividade.DATA_INICIO = inicios.length ? inicios[0] : '';
    atividade.DATA_FINAL = finais.length ? finais[finais.length - 1] : '';
    if (String(atividade.TIPO || '').toUpperCase() !== 'TOPICO') return;
    const descendentes = [];
    const coletar = function (idPai) {
      (filhosPorPai[String(idPai)] || []).forEach(function (filha) {
        descendentes.push(filha);
        coletar(filha.ID_ATIVIDADE);
      });
    };
    coletar(atividade.ID_ATIVIDADE);
    const aplicaveis = descendentes.filter(function (item) {
      return String(item.TIPO || '').toUpperCase() !== 'TOPICO' &&
        String(item.STATUS_ATIVIDADE || '').toUpperCase() !== 'NAO_APLICAVEL';
    });
    atividade.STATUS_ATIVIDADE = !aplicaveis.length ? 'NAO_APLICAVEL' :
      aplicaveis.every(function (item) {
        return String(item.STATUS_ATIVIDADE || '').toUpperCase() === 'CONCLUIDA';
      }) ? 'CONCLUIDA' : 'EM_ANDAMENTO';
  };
  (filhosPorPai[''] || []).forEach(processar);
  return atividades;
}

function calcularSaudeMapro_(situacao, atividades) {
  if (situacao === 'NÃO APLICÁVEL' || situacao === 'CANCELADA') return 'CINZA';
  if (situacao === 'CONCLUÍDA') return 'AZUL';
  const ativas = atividades.filter(function (item) {
    return String(item.ATIVO || 'SIM').toUpperCase() !== 'NAO' &&
      String(item.TIPO || '').toUpperCase() !== 'TOPICO';
  });
  if (ativas.some(function (item) { return calcularSaudeAtividadeMapro_(item) === 'VERMELHO'; })) {
    return 'VERMELHO';
  }
  if (ativas.some(function (item) { return calcularSaudeAtividadeMapro_(item) === 'AMARELO'; })) {
    return 'AMARELO';
  }
  return 'VERDE';
}

function calcularSaudeAtividadeMapro_(atividade) {
  const status = String(atividade.STATUS_ATIVIDADE || '').toUpperCase();
  if (status === 'CONCLUIDA') return 'AZUL';
  if (status === 'NAO_APLICAVEL') return 'CINZA';
  const fim = dataIsoMapro_(atividade.DATA_FINAL);
  if (!fim) return 'VERDE';
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  if (fim < hoje) return 'VERMELHO';
  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const dataLimite = Utilities.formatDate(limite, 'America/Sao_Paulo', 'yyyy-MM-dd');
  return fim <= dataLimite ? 'AMARELO' : 'VERDE';
}

function obterBasesMapro_() {
  const chaveCache = 'BASES_MAPRO_V1';
  try {
    const armazenado = CacheService.getScriptCache().get(chaveCache);
    if (armazenado) return JSON.parse(armazenado);
  } catch (erroCache) {
    console.warn('Cache das bases Mapro indisponível: ' + erroCache.message);
  }
  const planilha = obterPlanilha_();
  const bases = {
    contagiros: lerValoresBaseMapro_(
      planilha.getSheetByName(CONFIG.abaBaseContagiro),
      'CONTAGIRO'
    ),
    departamentos: lerValoresBaseMapro_(
      planilha.getSheetByName(CONFIG.abaBaseDepartamentos),
      'DEPARTAMENTO'
    ),
    estrategia: lerRegistros_(
      planilha.getSheetByName(CONFIG.abaBaseEstrategia),
      CABECALHOS_BASE_ESTRATEGIA
    ).filter(function (item) {
      return String(item.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    }).map(function (item) {
      return {
        negocio: String(item.NEGOCIO || ''),
        dimensaoBsc: String(item.DIMENSAO_BSC || ''),
        objetivoBsc: String(item.OBJETIVO_BSC || ''),
        cor: String(item.COR || ''),
        linkBsc: String(item.LINK_BSC || '').trim()
      };
    })
  };
  try {
    CacheService.getScriptCache().put(chaveCache, JSON.stringify(bases), 300);
  } catch (erroCache) {
    console.warn('Não foi possível atualizar o cache das bases Mapro: ' + erroCache.message);
  }
  return bases;
}

function validarAtividadeMapro_(dados, opcoes) {
  const entrada = dados || {};
  const configuracao = opcoes || {};
  const atividade = {
    idAtividade: String(entrada.idAtividade || '').trim(),
    idMapro: String(entrada.idMapro || '').trim(),
    idAtividadePai: String(entrada.idAtividadePai || '').trim(),
    idAtividadePredecessora: String(entrada.idAtividadePredecessora || '').trim(),
    tipo: String(entrada.tipo || '').trim().toUpperCase(),
    nomeAtividade: String(entrada.nomeAtividade || '').trim(),
    idResponsavel: String(entrada.idResponsavel || '').trim(),
    departamento: String(entrada.departamento || '').trim(),
    dataInicio: validarDataOpcionalMapro_(entrada.dataInicio, 'Data de início'),
    dataFinal: validarDataOpcionalMapro_(entrada.dataFinal, 'Data final'),
    status: String(entrada.status || '').trim().toUpperCase(),
    justificativa: String(entrada.justificativa || '').trim(),
    observacao: String(entrada.observacao || '').trim(),
    version: Number(entrada.version || 0)
  };
  if (!/^\d+$/.test(atividade.idMapro)) throw new Error('ID da Mapro inválido.');
  if (['TOPICO', 'ATIVIDADE', 'SUBATIVIDADE'].indexOf(atividade.tipo) === -1) {
    throw new Error('Selecione um tipo de atividade válido.');
  }
  if (atividade.tipo !== 'TOPICO' && !atividade.idAtividadePai) {
    throw new Error('Selecione o item superior da atividade.');
  }
  if (atividade.nomeAtividade.length < 3 || atividade.nomeAtividade.length > 300) {
    throw new Error('Informe uma atividade entre 3 e 300 caracteres.');
  }
  if (atividade.idResponsavel && !/^\d+$/.test(atividade.idResponsavel)) {
    throw new Error('Selecione o responsável.');
  }
  if (atividade.tipo !== 'TOPICO' && !configuracao.permitirCamposOperacionaisVazios &&
      !atividade.idResponsavel) {
    throw new Error('Selecione o responsável.');
  }
  if (atividade.tipo !== 'TOPICO' && !configuracao.permitirCamposOperacionaisVazios &&
      (!atividade.dataInicio || !atividade.dataFinal)) {
    throw new Error('Informe as datas de início e final.');
  }
  if (atividade.dataInicio && atividade.dataFinal && atividade.dataFinal < atividade.dataInicio) {
    throw new Error('A data final não pode ser anterior à data de início.');
  }
  if (['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'NAO_APLICAVEL']
      .indexOf(atividade.status) === -1) {
    throw new Error('Selecione um status de atividade válido.');
  }
  if (atividade.status === 'NAO_APLICAVEL' && atividade.justificativa.length < 5) {
    throw new Error('Informe a justificativa para marcar a atividade como não aplicável.');
  }
  if (atividade.justificativa.length > 1500 || atividade.observacao.length > 3000) {
    throw new Error('Justificativa ou observação excede o tamanho permitido.');
  }
  return atividade;
}

/**
 * Mantém salváveis as atividades antigas cujo responsável ativo foi relacionado como
 * ACESSO. Esse vínculo legado só é aceito quando o responsável não está sendo trocado;
 * novas atribuições continuam restritas a LIDER, EDITOR ou OBSERVADOR.
 */
function responsavelPermitidoNaEdicaoMapro_(atividadeAtual, responsavel, idsPermitidos) {
  if (!responsavel) return false;
  const idResponsavel = String(Number(responsavel.ID));
  if (idsPermitidos && idsPermitidos[idResponsavel]) return true;
  return Boolean(atividadeAtual) &&
    idsIguaisMapro_(atividadeAtual.ID_RESPONSAVEL, responsavel.ID);
}

function validarPaiAtividadeMapro_(entrada, registros) {
  if (entrada.tipo === 'TOPICO') {
    if (entrada.idAtividadePai) throw new Error('Um tópico não pode possuir item superior.');
    return;
  }
  const pai = registros.find(function (atividade) {
    return String(atividade.ID_ATIVIDADE) === entrada.idAtividadePai &&
      idsIguaisMapro_(atividade.ID_MAPRO, entrada.idMapro) &&
      String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
  });
  if (!pai || pai.ID_ATIVIDADE === entrada.idAtividade) {
    throw new Error('Selecione um item superior válido.');
  }
  const tipoPai = String(pai.TIPO || '').toUpperCase();
  if (entrada.tipo === 'ATIVIDADE' && tipoPai !== 'TOPICO') {
    throw new Error('Uma atividade deve pertencer diretamente a um tópico.');
  }
  if (entrada.tipo === 'SUBATIVIDADE' && tipoPai !== 'ATIVIDADE') {
    throw new Error('Uma subatividade deve pertencer diretamente a uma atividade.');
  }
  if (entrada.tipo === 'SUBATIVIDADE') {
    const paiPossuiDependencia = Boolean(String(pai.ID_ATIVIDADE_PREDECESSORA || '')) ||
      registros.some(function (atividade) {
        return String(atividade.ID_ATIVIDADE_PREDECESSORA || '') === String(pai.ID_ATIVIDADE) &&
          String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
      });
    if (paiPossuiDependencia) {
      throw new Error(
        'Remova a relação de predecessora da atividade antes de adicionar uma subatividade.'
      );
    }
  }
  const porId = {};
  registros.forEach(function (atividade) {
    porId[String(atividade.ID_ATIVIDADE || '')] = atividade;
  });
  let ancestral = pai;
  while (ancestral) {
    if (String(ancestral.ID_ATIVIDADE) === entrada.idAtividade) {
      throw new Error('A hierarquia da atividade contém um ciclo.');
    }
    ancestral = porId[String(ancestral.ID_ATIVIDADE_PAI || '')];
  }
}

function validarPredecessoraAtividadeMapro_(entrada, registros) {
  if (entrada.tipo === 'TOPICO') {
    if (entrada.idAtividadePredecessora) {
      throw new Error('Um tópico não pode possuir atividade predecessora.');
    }
    return;
  }
  if (!entrada.idAtividadePredecessora) return;
  const ativasDaMapro = registros.filter(function (atividade) {
    return idsIguaisMapro_(atividade.ID_MAPRO, entrada.idMapro) &&
      String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
  });
  const predecessora = ativasDaMapro.find(function (atividade) {
    return String(atividade.ID_ATIVIDADE) === entrada.idAtividadePredecessora;
  });
  if (!predecessora || String(predecessora.TIPO || '').toUpperCase() === 'TOPICO' ||
      String(predecessora.ID_ATIVIDADE) === entrada.idAtividade) {
    throw new Error('Selecione uma atividade predecessora válida.');
  }
  const predecessoraPossuiFilhos = ativasDaMapro.some(function (atividade) {
    return String(atividade.ID_ATIVIDADE_PAI || '') === String(predecessora.ID_ATIVIDADE);
  });
  const atividadePossuiFilhos = entrada.idAtividade && ativasDaMapro.some(function (atividade) {
    return String(atividade.ID_ATIVIDADE_PAI || '') === entrada.idAtividade;
  });
  if (predecessoraPossuiFilhos || atividadePossuiFilhos) {
    throw new Error('A predecessora deve ser definida somente entre atividades sem itens internos.');
  }
  const porId = {};
  ativasDaMapro.forEach(function (atividade) {
    porId[String(atividade.ID_ATIVIDADE)] = atividade;
  });
  const visitadas = {};
  let ancestral = predecessora;
  while (ancestral) {
    const id = String(ancestral.ID_ATIVIDADE || '');
    if (id === entrada.idAtividade || visitadas[id]) {
      throw new Error('A relação de predecessoras não pode formar um ciclo.');
    }
    visitadas[id] = true;
    ancestral = porId[String(ancestral.ID_ATIVIDADE_PREDECESSORA || '')];
  }
}

function registrarHistoricoDatasMapro_(atual, entrada, email) {
  const mudancas = criarLinhasHistoricoDatasMapro_(
    atual, entrada, email, new Date().toISOString()
  );
  if (!mudancas.length) return;
  const aba = obterAbaMaproHistoricoDatas_();
  aba.getRange(aba.getLastRow() + 1, 1, mudancas.length, mudancas[0].length)
    .setValues(mudancas);
}

function criarLinhasHistoricoDatasMapro_(atual, entrada, email, agora) {
  const mudancas = [];
  [['DATA_INICIO', entrada.dataInicio], ['DATA_FINAL', entrada.dataFinal]]
    .forEach(function (campo) {
      const anterior = dataIsoMapro_(atual[campo[0]]);
      if (anterior === campo[1]) return;
      mudancas.push([
        Utilities.getUuid(), formatarId_(Number(entrada.idMapro)),
        String(atual.ID_ATIVIDADE), campo[0], anterior, campo[1], agora,
        normalizarEmail_(email)
      ]);
    });
  return mudancas;
}

function diferencaDiasMapro_(dataAnterior, dataNova) {
  const anterior = Date.parse(String(dataAnterior || '') + 'T00:00:00Z');
  const nova = Date.parse(String(dataNova || '') + 'T00:00:00Z');
  if (!Number.isFinite(anterior) || !Number.isFinite(nova)) return 0;
  return Math.round((nova - anterior) / 86400000);
}

function adicionarDiasMapro_(dataIso, quantidade) {
  const instante = Date.parse(String(dataIso || '') + 'T00:00:00Z');
  if (!Number.isFinite(instante)) return String(dataIso || '');
  return new Date(instante + Number(quantidade || 0) * 86400000).toISOString().slice(0, 10);
}

/**
 * Desloca em cascata as datas das sucessoras, preservando a duração e os intervalos
 * planejados. As alterações automáticas usam a mesma quantidade de dias da predecessora.
 */
function propagarPrazoPredecessoraMapro_(
  registros, idMapro, idPredecessora, deslocamento, acompanhamentoIniciado, email, agora,
  historicosAcumulados, idsComPrazoEditado
) {
  const dias = Number(deslocamento || 0);
  if (!dias) return [];
  const dependentesPorPredecessora = {};
  registros.forEach(function (atividade) {
    if (!idsIguaisMapro_(atividade.ID_MAPRO, idMapro) ||
        String(atividade.ATIVO || 'SIM').toUpperCase() === 'NAO') return;
    const predecessora = String(atividade.ID_ATIVIDADE_PREDECESSORA || '');
    if (!predecessora) return;
    if (!dependentesPorPredecessora[predecessora]) dependentesPorPredecessora[predecessora] = [];
    dependentesPorPredecessora[predecessora].push(atividade);
  });
  const fila = [String(idPredecessora)];
  const visitadas = {};
  const alteradas = [];
  const historicos = [];
  while (fila.length) {
    const origem = fila.shift();
    (dependentesPorPredecessora[origem] || []).forEach(function (atividade) {
      const id = String(atividade.ID_ATIVIDADE || '');
      if (!id || visitadas[id]) return;
      visitadas[id] = true;
      // No salvamento em lote, o prazo informado diretamente pelo usuário prevalece.
      // A alteração direta dessa atividade propagará o próprio deslocamento aos descendentes.
      if (idsComPrazoEditado && idsComPrazoEditado[id]) return;
      const inicioAnterior = dataIsoMapro_(atividade.DATA_INICIO);
      const finalAnterior = dataIsoMapro_(atividade.DATA_FINAL);
      if (!inicioAnterior || !finalAnterior) return;
      const inicioNovo = adicionarDiasMapro_(inicioAnterior, dias);
      const finalNovo = adicionarDiasMapro_(finalAnterior, dias);
      atividade.DATA_INICIO = inicioNovo;
      atividade.DATA_FINAL = finalNovo;
      if (acompanhamentoIniciado) {
        atividade.DIAS_REPLANEJADOS = Number(atividade.DIAS_REPLANEJADOS || 0) + dias;
        [['DATA_INICIO', inicioAnterior, inicioNovo], ['DATA_FINAL', finalAnterior, finalNovo]]
          .forEach(function (mudanca) {
            historicos.push([
              Utilities.getUuid(), formatarId_(Number(idMapro)), id, mudanca[0],
              mudanca[1], mudanca[2], agora, normalizarEmail_(email)
            ]);
          });
      }
      atividade.ATUALIZADO_EM = agora;
      atividade.VERSION = Number(atividade.VERSION || 1) + 1;
      alteradas.push({
        idAtividade: id,
        dataInicio: inicioNovo,
        dataFinal: finalNovo,
        diasReplanejados: Number(atividade.DIAS_REPLANEJADOS || 0),
        version: Number(atividade.VERSION || 1)
      });
      fila.push(id);
    });
  }
  if (historicos.length) {
    if (Array.isArray(historicosAcumulados)) {
      Array.prototype.push.apply(historicosAcumulados, historicos);
    } else {
      const abaHistorico = obterAbaMaproHistoricoDatas_();
      abaHistorico.getRange(
        abaHistorico.getLastRow() + 1, 1, historicos.length, historicos[0].length
      ).setValues(historicos);
    }
  }
  return alteradas;
}

function atualizarResumoPersistidoMapro_(
  idMapro, email, registrosAtividadesCarregados, opcoes
) {
  const abaMapros = obterAbaMapros_();
  const linha = buscarLinhaMaproPorId_(abaMapros, idMapro);
  const mapro = lerRegistroDaLinha_(abaMapros, linha, CABECALHOS_MAPROS);
  const abaAtividades = obterAbaMaproAtividades_();
  const todasAtividades = Array.isArray(registrosAtividadesCarregados)
    ? registrosAtividadesCarregados
    : lerRegistros_(abaAtividades, CABECALHOS_MAPRO_ATIVIDADES);
  const atividades = todasAtividades
    .filter(function (atividade) { return idsIguaisMapro_(atividade.ID_MAPRO, idMapro); });
  const configuracao = opcoes || {};
  if (!configuracao.atividadesJaAgregadas) agregarTopicosMapro_(atividades);
  if (configuracao.persistirAtividades !== false && todasAtividades.length) {
    const agregadasPorId = {};
    atividades.forEach(function (atividade) {
      agregadasPorId[String(atividade.ID_ATIVIDADE)] = atividade;
    });
    const datasEStatus = todasAtividades.map(function (atividade) {
      const agregada = agregadasPorId[String(atividade.ID_ATIVIDADE)] || atividade;
      return [agregada.DATA_INICIO || '', agregada.DATA_FINAL || '', agregada.STATUS_ATIVIDADE || ''];
    });
    abaAtividades.getRange(2, 10, datasEStatus.length, 3).setValues(datasEStatus);
  }
  const resumo = calcularResumoAtividadesMapro_(atividades);
  const agora = new Date().toISOString();
  const prazoAnteriorProjeto = dataIsoMapro_(mapro.DATA_FINAL);
  if (mapro.ACOMPANHAMENTO_INICIADO_EM && prazoAnteriorProjeto &&
      prazoAnteriorProjeto !== resumo.dataFinal) {
    obterAbaMaproHistoricoPrazo_().appendRow([
      Utilities.getUuid(), formatarId_(Number(idMapro)), prazoAnteriorProjeto,
      resumo.dataFinal, agora, normalizarEmail_(email)
    ]);
  }
  const situacao = calcularSituacaoProjetoMapro_(mapro.STATUS_MAPRO, atividades);
  const situacaoNormalizada = normalizarSituacaoMapro_(situacao);
  const concluiuAgora = situacaoNormalizada === 'CONCLUÍDA' &&
    normalizarSituacaoMapro_(mapro.STATUS_MAPRO) !== 'CONCLUÍDA';
  const concluidaEm = situacaoNormalizada === 'CONCLUÍDA'
    ? (mapro.CONCLUIDA_EM || agora) : '';
  const novaVersao = Number(mapro.VERSION || 1) + 1;
  const linhaMaproAtualizada = CABECALHOS_MAPROS.map(function (cabecalho) {
    if (cabecalho === 'STATUS_MAPRO') return situacao;
    if (cabecalho === 'CONCLUIDA_EM') return concluidaEm;
    if (cabecalho === 'ATUALIZADO_EM') return agora;
    if (cabecalho === 'DATA_INICIO') return resumo.dataInicio;
    if (cabecalho === 'DATA_FINAL') return resumo.dataFinal;
    if (cabecalho === 'VERSION') return novaVersao;
    return mapro[cabecalho] == null ? '' : mapro[cabecalho];
  });
  abaMapros.getRange(linha, 1, 1, CABECALHOS_MAPROS.length)
    .setValues([linhaMaproAtualizada]);
  if (concluiuAgora) {
    const maproConcluida = Object.assign({}, mapro, {
      STATUS_MAPRO: situacao,
      CONCLUIDA_EM: concluidaEm,
      DATA_INICIO: resumo.dataInicio,
      DATA_FINAL: resumo.dataFinal,
      ATUALIZADO_EM: agora
    });
    enviarEmailConclusaoProjetoMapro_(maproConcluida, atividades, concluidaEm);
  }
  return {
    version: novaVersao,
    acompanhamentoIniciado: Boolean(mapro.ACOMPANHAMENTO_INICIADO_EM),
    dataInicio: resumo.dataInicio,
    dataFinal: resumo.dataFinal,
    situacao: situacao,
    percentual: resumo.percentual,
    totalAtividades: resumo.totalAtividades,
    atividadesConcluidas: resumo.atividadesConcluidas,
    atividadesEmAtraso: resumo.atividadesEmAtraso,
    atividadesNaoAplicaveis: resumo.atividadesNaoAplicaveis
  };
}

function enviarEmailConclusaoProjetoMapro_(mapro, atividades, concluidaEm) {
  try {
    const destinatarios = {};
    obterParticipantesAtivosMapro_(mapro.ID_MAPRO).forEach(function (participante) {
      if (participante.email) destinatarios[participante.email] = true;
    });
    const emailLider = normalizarEmail_(mapro['EMAIL_LÍDER']);
    if (emailLider) destinatarios[emailLider] = true;
    const emails = Object.keys(destinatarios);
    if (!emails.length) return false;
    const operacionais = (atividades || []).filter(function (atividade) {
      return String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO' &&
        String(atividade.TIPO || '').toUpperCase() !== 'TOPICO';
    });
    const inicioTexto = String(mapro.ACOMPANHAMENTO_INICIADO_EM || mapro.CRIADO_EM || '');
    const inicio = new Date(inicioTexto);
    const fim = new Date(concluidaEm || new Date().toISOString());
    const dias = Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())
      ? null : Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / 86400000));
    const duracao = dias == null ? 'Não calculado' : dias + (dias === 1 ? ' dia' : ' dias');
    const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
    const url = montarUrlProjetoMapro_(mapro.ID_MAPRO);
    const linhas = [
      montarLinhaEmail_('ID da Mapro', formatarId_(Number(mapro.ID_MAPRO))),
      montarLinhaEmail_('Nome do projeto', String(mapro.NOME_PROJETO || '')),
      montarLinhaEmail_('Portfólio', String(mapro['PORTFÓLIO'] || '')),
      montarLinhaEmail_('Líder do projeto', String(mapro['NOME_LÍDER'] || '')),
      montarLinhaEmail_('E-mail do líder', String(mapro['EMAIL_LÍDER'] || '')),
      montarLinhaEmail_('Departamento', String(mapro.DEPARTAMENTO || '')),
      montarLinhaEmail_('Contagiro', String(mapro.CONTAGIRO || '')),
      montarLinhaEmail_('Nível do projeto', String(mapro.NIVEL || '')),
      montarLinhaEmail_('Início', formatarDataEmailMapro_(dataIsoMapro_(mapro.DATA_INICIO))),
      montarLinhaEmail_('Prazo final', formatarDataEmailMapro_(dataIsoMapro_(mapro.DATA_FINAL))),
      montarLinhaEmail_('Negócio', String(mapro.NEGOCIO || '')),
      montarLinhaEmail_('Dimensão BSC', String(mapro.DIMENSAO_BSC || '')),
      montarLinhaEmail_('Objetivo BSC', String(mapro.OBJETIVO_BSC || '')),
      montarLinhaEmail_('O que é o projeto', String(mapro.O_QUE_E || '')),
      montarLinhaEmail_('Por que', String(mapro.PORQUE || '')),
      montarLinhaEmail_('Resultados esperados', String(mapro.RESULTADOS_ESPERADOS || '')),
      montarLinhaEmail_('Indicadores', formatarListaPontuadaEmail_(mapro.INDICADORES)),
      montarLinhaEmail_('Processo crítico?', String(mapro.PROCESSO_CRITICO || '')),
      montarLinhaEmail_('Iniciativa estratégica?', String(mapro.INICIATIVA_ESTRATEGICA || '')),
      montarLinhaEmail_('Envolve sistema?', String(mapro.ENVOLVE_SISTEMA || '')),
      montarLinhaEmail_('Sistemas envolvidos', formatarListaPontuadaEmail_(mapro.SISTEMAS_ENVOLVIDOS)),
      montarLinhaEmail_('Total de atividades/subatividades', String(operacionais.length)),
      montarLinhaEmail_('Tempo até a conclusão', duracao)
    ].join('');
    const assunto = '[MAPRO] Projeto concluído — ' + String(mapro.NOME_PROJETO || '');
    const corpoTexto = 'O projeto ' + String(mapro.NOME_PROJETO || '') + ' foi concluído.\n\n' +
        'ID da Mapro: ' + formatarId_(Number(mapro.ID_MAPRO)) + '\n' +
        'Portfólio: ' + String(mapro['PORTFÓLIO'] || '') + '\n' +
        'Líder: ' + String(mapro['NOME_LÍDER'] || '') + '\n' +
        'Contagiro: ' + String(mapro.CONTAGIRO || '') + '\n' +
        'Nível: ' + String(mapro.NIVEL || '') + '\n' +
        'Início: ' + formatarDataEmailMapro_(dataIsoMapro_(mapro.DATA_INICIO)) + '\n' +
        'Prazo final: ' + formatarDataEmailMapro_(dataIsoMapro_(mapro.DATA_FINAL)) + '\n' +
        'Negócio: ' + String(mapro.NEGOCIO || '') + '\n' +
        'Dimensão BSC: ' + String(mapro.DIMENSAO_BSC || '') + '\n' +
        'Objetivo BSC: ' + String(mapro.OBJETIVO_BSC || '') + '\n' +
        'O que é o projeto: ' + String(mapro.O_QUE_E || '') + '\n' +
        'Por que: ' + String(mapro.PORQUE || '') + '\n' +
        'Resultados esperados: ' + String(mapro.RESULTADOS_ESPERADOS || '') + '\n' +
        'Indicadores: ' + formatarListaPontuadaEmail_(mapro.INDICADORES) + '\n' +
        'Iniciativa estratégica: ' + String(mapro.INICIATIVA_ESTRATEGICA || '') + '\n' +
        'Sistemas envolvidos: ' + formatarListaPontuadaEmail_(mapro.SISTEMAS_ENVOLVIDOS) + '\n' +
        'Total de atividades/subatividades: ' + operacionais.length + '\n' +
        'Tempo até a conclusão: ' + duracao + '\n\nAcessar projeto: ' + url +
        '\n\nCORPORATIVO | P&G | SGI';
    const corpoHtml = '<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px"><tr><td align="center">' +
        '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden">' +
        '<tr><td align="center" style="background:#06063d;padding:8px 20px;overflow:hidden">' +
        '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto;transform:scale(1.3);transform-origin:center"></td></tr>' +
        '<tr><td style="padding:30px 34px;font-size:14px;line-height:1.6">' +
        '<p style="margin:0 0 8px;color:#087f19;font-size:12px;font-weight:800;text-transform:uppercase">Projeto concluído</p>' +
        '<h1 style="margin:0 0 14px;font-size:22px">A Mapro foi concluída</h1>' +
        '<p style="margin:0 0 20px">Todas as pessoas envolvidas estão sendo informadas sobre a conclusão do projeto.</p>' +
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7fa;border-radius:10px;margin-bottom:22px">' + linhas + '</table>' +
        '<p style="text-align:center;margin:0"><a href="' + escaparHtml_(url) + '" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#06063d;color:#fff;text-decoration:none;font-weight:800">ACESSAR PROJETO</a></p>' +
        '</td></tr><tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800">CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI</td></tr>' +
        '</table></td></tr></table></body></html>';
    const idMapro = formatarId_(Number(mapro.ID_MAPRO));
    const resultados = emails.map(function (email) {
      return entregarEmailMapro_({
        to: email,
        subject: assunto,
        body: corpoTexto,
        htmlBody: corpoHtml,
        name: 'SGI MAPRO',
        tipo: 'CONCLUSAO_PROJETO',
        contextoId: idMapro,
        chaveIdempotencia: 'CONCLUSAO_PROJETO:' + idMapro + ':' + email
      });
    });
    return resultados.every(function (resultado) { return resultado.enfileirado; });
  } catch (erro) {
    console.error(JSON.stringify({
      acao: 'FALHA_EMAIL_CONCLUSAO_MAPRO',
      maproId: mapro && mapro.ID_MAPRO,
      erro: erro && erro.message
    }));
    return false;
  }
}

function mapearLinhaAtividadeMapro_(registro) {
  return CABECALHOS_MAPRO_ATIVIDADES.map(function (cabecalho) {
    return registro[cabecalho] == null ? '' : registro[cabecalho];
  });
}

function assinarRegistroAtividadeMapro_(registro) {
  return JSON.stringify(mapearLinhaAtividadeMapro_(registro));
}

/** Escreve somente as linhas realmente alteradas e agrupa intervalos contíguos. */
function persistirAtividadesAlteradasMapro_(
  aba, registros, quantidadeOriginais, assinaturasOriginais
) {
  const alterados = [];
  for (let indice = 0; indice < quantidadeOriginais; indice += 1) {
    if (assinarRegistroAtividadeMapro_(registros[indice]) !== assinaturasOriginais[indice]) {
      alterados.push(indice);
    }
  }
  let inicioGrupo = 0;
  while (inicioGrupo < alterados.length) {
    let fimGrupo = inicioGrupo;
    while (fimGrupo + 1 < alterados.length &&
        alterados[fimGrupo + 1] === alterados[fimGrupo] + 1) {
      fimGrupo += 1;
    }
    const primeiroIndice = alterados[inicioGrupo];
    const ultimoIndice = alterados[fimGrupo];
    const linhas = registros.slice(primeiroIndice, ultimoIndice + 1)
      .map(mapearLinhaAtividadeMapro_);
    aba.getRange(
      primeiroIndice + 2, 1, linhas.length, CABECALHOS_MAPRO_ATIVIDADES.length
    ).setValues(linhas);
    inicioGrupo = fimGrupo + 1;
  }
  if (registros.length > quantidadeOriginais) {
    const novasLinhas = registros.slice(quantidadeOriginais).map(mapearLinhaAtividadeMapro_);
    aba.getRange(
      quantidadeOriginais + 2, 1, novasLinhas.length, CABECALHOS_MAPRO_ATIVIDADES.length
    ).setValues(novasLinhas);
  }
}

/**
 * Libera para reatribuição as atividades abertas de um usuário inativado. Itens
 * concluídos ou não aplicáveis preservam o responsável para manter o histórico.
 * Deve ser executada com o bloqueio de documento já adquirido pelo chamador.
 */
function obterDestinatariosAvisoInativacaoMapro_(vinculos, mapro, emailInativado) {
  const destinatarios = {};
  const idMapro = String(Number(mapro.ID_MAPRO));
  (vinculos || []).forEach(function (vinculo) {
    if (!idsIguaisMapro_(vinculo.ID_MAPRO, idMapro) ||
        String(vinculo.ATIVO || 'SIM').toUpperCase() === 'NAO') return;
    const email = normalizarEmail_(vinculo.EMAIL);
    if (email && email !== emailInativado) destinatarios[email] = true;
  });
  const emailLider = normalizarEmail_(mapro['EMAIL_LÍDER']);
  if (emailLider && emailLider !== emailInativado) destinatarios[emailLider] = true;
  return Object.keys(destinatarios);
}

function prepararInativacaoResponsavelMapro_(usuario, realizadoPor) {
  const idUsuario = String(Number(usuario.ID || 0));
  if (!idUsuario || idUsuario === '0') return [];
  const abaAtividades = obterAbaMaproAtividades_();
  const atividades = lerRegistros_(abaAtividades, CABECALHOS_MAPRO_ATIVIDADES);
  const assinaturas = atividades.map(assinarRegistroAtividadeMapro_);
  const afetadasPorMapro = {};
  const agora = new Date().toISOString();
  atividades.forEach(function (atividade) {
    if (!idsIguaisMapro_(atividade.ID_RESPONSAVEL, idUsuario) ||
        String(atividade.ATIVO || 'SIM').toUpperCase() === 'NAO') return;
    const status = String(atividade.STATUS_ATIVIDADE || '').toUpperCase();
    if (['CONCLUIDA', 'NAO_APLICAVEL'].indexOf(status) !== -1) return;
    const idMapro = String(Number(atividade.ID_MAPRO));
    if (!afetadasPorMapro[idMapro]) afetadasPorMapro[idMapro] = [];
    afetadasPorMapro[idMapro].push(String(atividade.NOME_ATIVIDADE || 'Atividade sem descrição'));
    atividade.ID_RESPONSAVEL = '';
    atividade.NOME_RESPONSAVEL = '';
    atividade.DEPARTAMENTO = '';
    atividade.ATUALIZADO_EM = agora;
    atividade.VERSION = Number(atividade.VERSION || 1) + 1;
  });
  persistirAtividadesAlteradasMapro_(
    abaAtividades, atividades, atividades.length, assinaturas
  );
  const abaParticipantes = obterAbaMaproParticipantes_();
  const vinculos = lerRegistros_(abaParticipantes, CABECALHOS_MAPRO_PARTICIPANTES);
  let alterouVinculo = false;
  vinculos.forEach(function (vinculo) {
    if ((idsIguaisMapro_(vinculo.ID_USUARIO, idUsuario) ||
        normalizarEmail_(vinculo.EMAIL) === normalizarEmail_(usuario.EMAIL)) &&
        String(vinculo.ATIVO || 'SIM').toUpperCase() !== 'NAO') {
      vinculo.ATIVO = 'NAO';
      alterouVinculo = true;
    }
  });
  if (alterouVinculo && vinculos.length) {
    abaParticipantes.getRange(2, 1, vinculos.length, CABECALHOS_MAPRO_PARTICIPANTES.length)
      .setValues(vinculos.map(function (vinculo) {
        return CABECALHOS_MAPRO_PARTICIPANTES.map(function (cabecalho) {
          return vinculo[cabecalho] == null ? '' : vinculo[cabecalho];
        });
      }));
  }
  const maprosPorId = {};
  lerRegistros_(obterAbaMapros_(), CABECALHOS_MAPROS).forEach(function (mapro) {
    maprosPorId[String(Number(mapro.ID_MAPRO))] = mapro;
  });
  const emailInativado = normalizarEmail_(usuario.EMAIL);
  return Object.keys(maprosPorId).map(function (idMapro) {
    const mapro = maprosPorId[idMapro];
    const liderInativado = idsIguaisMapro_(mapro['ID_LÍDER'], idUsuario) ||
      normalizarEmail_(mapro['EMAIL_LÍDER']) === emailInativado;
    const atividadesAfetadas = afetadasPorMapro[idMapro] || [];
    if (!atividadesAfetadas.length && !liderInativado) return null;
    const emails = obterDestinatariosAvisoInativacaoMapro_(
      vinculos, mapro, emailInativado
    );
    if (!emails.length) return null;
    return {
      mapro: mapro,
      usuario: {
        nome: String(usuario.NOME || 'Usuário'),
        email: emailInativado
      },
      atividades: atividadesAfetadas,
      liderInativado: liderInativado,
      destinatarios: emails,
      realizadoPor: normalizarEmail_(realizadoPor)
    };
  }).filter(Boolean);
}

function enviarAvisosInativacaoResponsavelMapro_(avisos) {
  (avisos || []).forEach(function (aviso) {
    const mapro = aviso.mapro;
    const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
    const url = montarUrlProjetoMapro_(mapro.ID_MAPRO);
    const listaTexto = aviso.atividades.map(function (nome) { return '- ' + nome; }).join('\n');
    const listaHtml = aviso.atividades.map(function (nome) {
      return '<li style="margin:0 0 6px">' + escaparHtml_(nome) + '</li>';
    }).join('');
    const textoAtividades = aviso.atividades.length
      ? 'As atividades abertas abaixo ficaram sem responsável e devem ser reatribuídas:\n\n' +
        listaTexto
      : '';
    const htmlAtividades = aviso.atividades.length
      ? '<p>As atividades abertas abaixo ficaram sem responsável e devem ser reatribuídas:</p>' +
        '<ul style="padding-left:20px">' + listaHtml + '</ul>'
      : '';
    const textoLider = aviso.liderInativado
      ? 'O usuário inativado também era o líder deste projeto. É necessário definir um novo líder.'
      : '';
    const htmlLider = aviso.liderInativado
      ? '<p style="padding:12px 14px;border-left:4px solid #ec0e37;background:#fff3f5"><strong>Atenção:</strong> o usuário inativado também era o líder deste projeto. É necessário definir um novo líder.</p>'
      : '';
    const partesTexto = ['Olá!', 'O usuário ' + aviso.usuario.nome + ' foi inativado.'];
    if (textoAtividades) partesTexto.push(textoAtividades);
    if (textoLider) partesTexto.push(textoLider);
    partesTexto.push('Acessar projeto: ' + url, 'CORPORATIVO | P&G | SGI');
    (aviso.destinatarios || []).forEach(function (destinatario) {
      try {
        const resultado = entregarEmailMapro_({
          to: destinatario,
          subject: aviso.liderInativado
            ? '[MAPRO] Reatribuição de atividades e novo líder necessários'
            : '[MAPRO] Reatribuição de atividades necessária',
          body: partesTexto.join('\n\n'),
          htmlBody: '<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px"><tr><td align="center">' +
            '<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="width:100%;max-width:580px;background:#fff;border-radius:16px;overflow:hidden">' +
            '<tr><td align="center" style="background:#06063d;padding:8px 20px;overflow:hidden">' +
            '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto;transform:scale(1.3);transform-origin:center"></td></tr>' +
            '<tr><td style="padding:30px 34px;font-size:14px;line-height:1.6">' +
            '<p style="margin:0 0 8px;color:#ec0e37;font-size:12px;font-weight:800;text-transform:uppercase">Atualização necessária</p>' +
            '<h1 style="margin:0 0 14px;font-size:22px">Um integrante do projeto foi inativado</h1>' +
            '<p>O usuário <strong>' + escaparHtml_(aviso.usuario.nome) + '</strong> foi inativado.</p>' +
            htmlAtividades + htmlLider +
            '<p><strong>Mapro:</strong> ' + escaparHtml_(formatarId_(Number(mapro.ID_MAPRO)) + ' — ' + String(mapro.NOME_PROJETO || '')) + '</p>' +
            '<p style="text-align:center;margin:24px 0 0"><a href="' + escaparHtml_(url) + '" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#06063d;color:#fff;text-decoration:none;font-weight:800">ATUALIZAR PROJETO</a></p>' +
            '</td></tr><tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800">CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI</td></tr>' +
            '</table></td></tr></table></body></html>',
          name: 'SGI MAPRO',
          tipo: 'INATIVACAO_RESPONSAVEL',
          contextoId: formatarId_(Number(mapro.ID_MAPRO)),
          chaveIdempotencia: 'INATIVACAO_RESPONSAVEL:' +
            formatarId_(Number(mapro.ID_MAPRO)) + ':' + aviso.usuario.email + ':' +
            destinatario
        });
        if (!resultado.enfileirado) {
          throw new Error(resultado.erro || 'Falha ao registrar e-mail.');
        }
      } catch (erro) {
        console.error(JSON.stringify({
          acao: 'FALHA_EMAIL_INATIVACAO_RESPONSAVEL_MAPRO',
          maproId: aviso && aviso.mapro && aviso.mapro.ID_MAPRO,
          destinatario: destinatario,
          erro: erro && erro.message
        }));
      }
    });
  });
}

function calcularSituacaoProjetoMapro_(situacaoAtual, atividades) {
  const atual = String(situacaoAtual || '').toUpperCase();
  if (atual === 'CANCELADA' || atual === 'ARQUIVADA') return atual;
  const ativas = atividades.filter(function (atividade) {
    return String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
  });
  const pais = {};
  ativas.forEach(function (atividade) {
    if (atividade.ID_ATIVIDADE_PAI) pais[String(atividade.ID_ATIVIDADE_PAI)] = true;
  });
  const folhas = ativas.filter(function (atividade) {
    return String(atividade.TIPO || '').toUpperCase() !== 'TOPICO' &&
      !pais[String(atividade.ID_ATIVIDADE)];
  });
  if (!folhas.length) return atual || 'AGUARDANDO_INICIO';
  const naoAplicaveis = folhas.filter(function (atividade) {
    return String(atividade.STATUS_ATIVIDADE).toUpperCase() === 'NAO_APLICAVEL';
  }).length;
  const concluidas = folhas.filter(function (atividade) {
    return String(atividade.STATUS_ATIVIDADE).toUpperCase() === 'CONCLUIDA';
  }).length;
  if (concluidas + naoAplicaveis !== folhas.length) return 'EM_ANDAMENTO';
  if (naoAplicaveis / folhas.length > 0.5) return 'NAO_APLICAVEL';
  if (concluidas / folhas.length > 0.5) return 'CONCLUIDA';
  return 'EM_ANDAMENTO';
}

/** Corrige em lote a situação das Mapros antigas usando as atividades-folha atuais. */
function recalcularSituacoesMaprosExistentes_(abaMapros, abaAtividades) {
  if (abaMapros.getLastRow() < 2) return;
  const mapros = lerRegistros_(abaMapros, CABECALHOS_MAPROS);
  const porMapro = agruparAtividadesPorMapro_(
    lerRegistros_(abaAtividades, CABECALHOS_MAPRO_ATIVIDADES)
  );
  let alterouStatus = false;
  let alterouConclusao = false;
  const status = [];
  const conclusoes = [];
  mapros.forEach(function (mapro) {
    const atual = String(mapro.STATUS_MAPRO || '').toUpperCase();
    const manterAguardando = ['AGUARDANDO_INICIO', 'AGUARDANDO_PREENCHIMENTO']
      .indexOf(atual) !== -1 && !mapro.ACOMPANHAMENTO_INICIADO_EM;
    const novo = manterAguardando ? atual : calcularSituacaoProjetoMapro_(
      atual,
      porMapro[String(Number(mapro.ID_MAPRO))] || []
    );
    const conclusao = normalizarSituacaoMapro_(novo) === 'CONCLUÍDA'
      ? (mapro.CONCLUIDA_EM || mapro.ATUALIZADO_EM || new Date().toISOString()) : '';
    status.push([novo]);
    conclusoes.push([conclusao]);
    if (novo !== atual) alterouStatus = true;
    if (String(conclusao || '') !== String(mapro.CONCLUIDA_EM || '')) alterouConclusao = true;
  });
  if (alterouStatus) {
    abaMapros.getRange(2, CABECALHOS_MAPROS.indexOf('STATUS_MAPRO') + 1, status.length, 1)
      .setValues(status);
  }
  if (alterouConclusao) {
    abaMapros.getRange(2, CABECALHOS_MAPROS.indexOf('CONCLUIDA_EM') + 1, conclusoes.length, 1)
      .setValues(conclusoes);
  }
}

function atualizarParticipantesLegadosMapro_(idMapro) {
  const participantes = obterParticipantesAtivosMapro_(idMapro).filter(function (item) {
    return item.papel !== 'LIDER';
  });
  const aba = obterAbaMapros_();
  const linha = buscarLinhaMaproPorId_(aba, idMapro);
  aba.getRange(linha, 8, 1, 3).setValues([[
    protegerTextoPlanilha_(participantes.map(function (item) { return item.id; }).join('; ')),
    protegerTextoPlanilha_(participantes.map(function (item) { return item.nome; }).join('; ')),
    protegerTextoPlanilha_(participantes.map(function (item) { return item.email; }).join('; '))
  ]]);
}

function obterParticipantesAtivosMapro_(idMapro) {
  return lerRegistros_(obterAbaMaproParticipantes_(), CABECALHOS_MAPRO_PARTICIPANTES)
    .filter(function (item) {
      return idsIguaisMapro_(item.ID_MAPRO, idMapro) &&
        String(item.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    }).map(function (item) {
      return {
        id: formatarId_(Number(item.ID_USUARIO)),
        nome: String(item.NOME || ''),
        email: normalizarEmail_(item.EMAIL),
        papel: normalizarPapelProjetoMapro_(item.PAPEL, String(item.PAPEL || '').toUpperCase() === 'LIDER')
      };
    });
}

function obterAbaMapros_() {
  return criarOuAtualizarAbaFlexivel_(obterPlanilha_(), CONFIG.abaMapros, CABECALHOS_MAPROS);
}

function obterAbaMaproParticipantes_() {
  return criarOuAtualizarAbaFlexivel_(
    obterPlanilha_(),
    CONFIG.abaMaproParticipantes,
    CABECALHOS_MAPRO_PARTICIPANTES
  );
}

function obterAbaMaproAtividades_() {
  return criarOuAtualizarAbaFlexivel_(
    obterPlanilha_(),
    CONFIG.abaMaproAtividades,
    CABECALHOS_MAPRO_ATIVIDADES
  );
}

function obterAbaMaproHistoricoDatas_() {
  return criarOuAtualizarAbaFlexivel_(
    obterPlanilha_(),
    CONFIG.abaMaproHistoricoDatas,
    CABECALHOS_MAPRO_HISTORICO_DATAS
  );
}

function obterAbaMaproHistoricoPrazo_() {
  return criarOuAtualizarAbaFlexivel_(
    obterPlanilha_(),
    CONFIG.abaMaproHistoricoPrazo,
    CABECALHOS_MAPRO_HISTORICO_PRAZO
  );
}

function obterAbaMaproNotificacoes_() {
  return criarOuAtualizarAbaFlexivel_(
    obterPlanilha_(),
    CONFIG.abaMaproNotificacoes,
    CABECALHOS_MAPRO_NOTIFICACOES
  );
}

function buscarLinhaMaproPorId_(aba, idMapro) {
  if (aba.getLastRow() < 2 || !/^\d+$/.test(String(idMapro || '').trim())) return 0;
  const procurado = String(Number(idMapro));
  const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getDisplayValues();
  const indice = valores.findIndex(function (linha) {
    return String(Number(linha[0])) === procurado;
  });
  return indice === -1 ? 0 : indice + 2;
}

function buscarLinhaAtividadeMaproPorId_(aba, idAtividade) {
  if (aba.getLastRow() < 2 || !idAtividade) return 0;
  const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getDisplayValues();
  const indice = valores.findIndex(function (linha) {
    return String(linha[0]) === String(idAtividade);
  });
  return indice === -1 ? 0 : indice + 2;
}

function obterProximaOrdemAtividadeMapro_(registros, idMapro) {
  return registros.reduce(function (maior, atividade) {
    return idsIguaisMapro_(atividade.ID_MAPRO, idMapro)
      ? Math.max(maior, Number(atividade.ORDEM) || 0)
      : maior;
  }, 0) + 1;
}

function agruparAtividadesPorMapro_(atividades) {
  return atividades.reduce(function (grupos, atividade) {
    const chave = String(Number(atividade.ID_MAPRO));
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(atividade);
    return grupos;
  }, {});
}

function chaveParticipanteMapro_(idMapro, email) {
  return String(Number(idMapro)) + '|' + normalizarEmail_(email);
}

function idsIguaisMapro_(a, b) {
  return String(Number(a)) === String(Number(b));
}

function normalizarSituacaoMapro_(valor) {
  const situacao = String(valor || '').trim().toUpperCase();
  const mapa = {
    AGUARDANDO_PREENCHIMENTO: 'AGUARDANDO INÍCIO',
    AGUARDANDO_INICIO: 'AGUARDANDO INÍCIO',
    EM_ANDAMENTO: 'EM ANDAMENTO',
    CONCLUIDA: 'CONCLUÍDA',
    NAO_APLICAVEL: 'NÃO APLICÁVEL'
  };
  return mapa[situacao] || situacao.replace(/_/g, ' ');
}

function dataIsoMapro_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !Number.isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, 'America/Sao_Paulo', 'yyyy-MM-dd');
  }
  const texto = String(valor).trim();
  const iso = texto.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? ''
    : Utilities.formatDate(data, 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function converterDataMapro_(valor) {
  if (!valor) return null;
  const data = Object.prototype.toString.call(valor) === '[object Date]'
    ? valor
    : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function validarDataIsoMapro_(valor, nomeCampo) {
  const data = String(valor || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(nomeCampo + ' inválida.');
  const partes = data.split('-').map(Number);
  const verificada = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
  if (verificada.getUTCFullYear() !== partes[0] ||
      verificada.getUTCMonth() !== partes[1] - 1 ||
      verificada.getUTCDate() !== partes[2]) {
    throw new Error(nomeCampo + ' inválida.');
  }
  return data;
}

function validarDataOpcionalMapro_(valor, nomeCampo) {
  const data = String(valor || '').trim();
  return data ? validarDataIsoMapro_(data, nomeCampo) : '';
}

function resolverLiderAtivoMapro_(entrada, maproAtual) {
  const idInformado = String(entrada.idLider || maproAtual['ID_LÍDER'] || '').trim();
  const emailInformado = normalizarEmail_(entrada.emailLider || maproAtual['EMAIL_LÍDER']);
  const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS);
  const lider = usuarios.find(function (usuario) {
    const ativo = String(usuario.STATUS || '').toUpperCase() === 'ATIVO';
    const mesmoId = idInformado && idsIguaisMapro_(usuario.ID, idInformado);
    const mesmoEmail = emailInformado && normalizarEmail_(usuario.EMAIL) === emailInformado;
    return ativo && (mesmoId || (!idInformado && mesmoEmail));
  });
  if (!lider) throw new Error('Selecione um líder ativo e cadastrado no sistema.');
  if (emailInformado && normalizarEmail_(lider.EMAIL) !== emailInformado) {
    throw new Error('O e-mail informado não corresponde ao líder selecionado.');
  }
  return lider;
}

function sincronizarTrocaLiderMapro_(idMapro, novoLider, emailAnterior, realizadoPor) {
  const aba = obterAbaMaproParticipantes_();
  const totalLinhas = Math.max(0, aba.getLastRow() - 1);
  const agora = new Date().toISOString();
  const emailNovo = normalizarEmail_(novoLider.EMAIL);
  let encontrouNovo = false;
  if (totalLinhas) {
    const intervalo = aba.getRange(2, 1, totalLinhas, CABECALHOS_MAPRO_PARTICIPANTES.length);
    const valores = intervalo.getValues();
    valores.forEach(function (linha) {
      if (!idsIguaisMapro_(linha[1], idMapro)) return;
      const emailLinha = normalizarEmail_(linha[4]);
      if (emailLinha === emailNovo) {
        linha[2] = formatarId_(Number(novoLider.ID));
        linha[3] = protegerTextoPlanilha_(novoLider.NOME);
        linha[4] = emailNovo;
        linha[5] = 'LIDER';
        linha[6] = 'SIM';
        encontrouNovo = true;
      } else if (emailLinha === emailAnterior && String(linha[5]).toUpperCase() === 'LIDER') {
        linha[5] = 'OBSERVADOR';
      }
    });
    intervalo.setValues(valores);
  }
  if (!encontrouNovo) {
    aba.getRange(aba.getLastRow() + 1, 1, 1, CABECALHOS_MAPRO_PARTICIPANTES.length)
      .setValues([[
        Utilities.getUuid(), formatarId_(Number(idMapro)), formatarId_(Number(novoLider.ID)),
        protegerTextoPlanilha_(novoLider.NOME), emailNovo, 'LIDER', 'SIM', agora,
        normalizarEmail_(realizadoPor)
      ]]);
  }
}

function calcularSemanaUtilMapro_(dataIso) {
  if (!dataIso) return '';
  const partes = dataIso.split('-').map(Number);
  if (partes.length !== 3 || partes.some(function (parte) { return !Number.isFinite(parte); })) {
    return '';
  }
  const data = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
  const diaOriginal = data.getUTCDay();
  if (diaOriginal === 6) data.setUTCDate(data.getUTCDate() + 2);
  if (diaOriginal === 0) data.setUTCDate(data.getUTCDate() + 1);
  const diaIso = data.getUTCDay() || 7;
  data.setUTCDate(data.getUTCDate() + 4 - diaIso);
  const primeiroDia = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((data - primeiroDia) / 86400000) + 1) / 7);
  return 'S' + semana + '/' + String(data.getUTCFullYear()).slice(-2);
}

function configurarGatilhoNotificacoesMapro_() {
  const funcao = 'enviarNotificacoesAtividadesMapro_';
  let existe = false;
  ScriptApp.getProjectTriggers().forEach(function (gatilho) {
    const manipulador = gatilho.getHandlerFunction();
    if (manipulador === funcao) existe = true;
    if (manipulador === 'enviarNotificacoesAtividadesMapro') {
      ScriptApp.deleteTrigger(gatilho);
    }
  });
  if (!existe) {
    ScriptApp.newTrigger(funcao).timeBased().everyDays(1).atHour(8)
      .inTimezone('America/Sao_Paulo').create();
  }
}

/** Execução manual protegida para diagnóstico administrativo. */
function executarNotificacoesAtividadesMapro() {
  exigirAdministrador_();
  return enviarNotificacoesAtividadesMapro_();
}

/** Handler privado do gatilho; não pode ser chamado pelo navegador. */
function enviarNotificacoesAtividadesMapro_() {
  garantirBancoConfigurado_();
  cancelarMaprosInativas_();
  const agora = new Date();
  const hoje = Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyy-MM-dd');
  const ontemData = new Date(agora.getTime() - 86400000);
  const ontem = Utilities.formatDate(ontemData, 'America/Sao_Paulo', 'yyyy-MM-dd');
  const segundaFeira = Number(Utilities.formatDate(agora, 'America/Sao_Paulo', 'u')) === 1;
  const semanaAtual = calcularSemanaUtilMapro_(hoje);
  const mapros = lerRegistros_(obterAbaMapros_(), CABECALHOS_MAPROS);
  const maprosPorId = {};
  mapros.forEach(function (mapro) { maprosPorId[String(Number(mapro.ID_MAPRO))] = mapro; });
  const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS);
  const usuariosPorId = {};
  usuarios.forEach(function (usuario) {
    usuariosPorId[String(Number(usuario.ID))] = usuario;
  });
  const todasAtividades = lerRegistros_(obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES);
  const idsComFilhos = {};
  todasAtividades.forEach(function (atividade) {
    if (String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO' && atividade.ID_ATIVIDADE_PAI) {
      idsComFilhos[String(atividade.ID_ATIVIDADE_PAI)] = true;
    }
  });
  const atividades = todasAtividades.filter(function (atividade) {
      const status = String(atividade.STATUS_ATIVIDADE || '').toUpperCase();
      return String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO' &&
        String(atividade.TIPO || '').toUpperCase() !== 'TOPICO' &&
        !idsComFilhos[String(atividade.ID_ATIVIDADE)] &&
        ['CONCLUIDA', 'NAO_APLICAVEL'].indexOf(status) === -1 &&
        Boolean(dataIsoMapro_(atividade.DATA_FINAL));
    });
  const abaLog = obterAbaMaproNotificacoes_();
  const existentes = {};
  lerRegistros_(abaLog, CABECALHOS_MAPRO_NOTIFICACOES).forEach(function (item) {
    existentes[
      String(item.ID_ATIVIDADE) + '|' + String(item.TIPO) + '|' + dataIsoMapro_(item.DATA_REFERENCIA)
    ] = true;
  });
  const novosLogs = [];
  atividades.forEach(function (atividade) {
    const prazo = dataIsoMapro_(atividade.DATA_FINAL);
    let tipo = '';
    if (prazo === ontem) tipo = 'ATRASO';
    else if (segundaFeira && calcularSemanaUtilMapro_(prazo) === semanaAtual && prazo >= hoje) {
      tipo = 'SEMANA_VENCIMENTO';
    }
    if (!tipo) return;
    const chave = String(atividade.ID_ATIVIDADE) + '|' + tipo + '|' + hoje;
    if (existentes[chave]) return;
    const mapro = maprosPorId[String(Number(atividade.ID_MAPRO))];
    if (!mapro) return;
    if (['CANCELADA', 'ARQUIVADA', 'CONCLUÍDA', 'NAO_APLICAVEL', 'NÃO APLICÁVEL']
        .indexOf(normalizarSituacaoMapro_(mapro.STATUS_MAPRO)) !== -1) return;
    const responsavel = usuariosPorId[String(Number(atividade.ID_RESPONSAVEL))];
    const destinatarios = destinatariosAtividadeMapro_(mapro, responsavel);
    if (!destinatarios.length) return;
    try {
      const numeroAtividade = calcularNumeracaoAtividadeMapro_(
        todasAtividades, atividade.ID_ATIVIDADE
      );
      const assunto = tipo === 'ATRASO'
          ? '[MAPRO] Atividade em atraso'
          : '[MAPRO] Atividade com vencimento nesta semana';
      const corpoTexto = montarCorpoEmailAtividadeMapro_(
          mapro,
          atividade,
          numeroAtividade,
          tipo === 'ATRASO'
            ? 'A atividade entrou em atraso.'
            : 'A atividade vence nesta semana.',
          ['Prazo: ' + formatarDataEmailMapro_(prazo)]
        );
      const corpoHtml = montarEmailAvisoPrazoHtmlMapro_(
        mapro, atividade, numeroAtividade, prazo, tipo
      );
      const entregas = destinatarios.map(function (destinatario) {
        return entregarEmailMapro_({
          to: destinatario,
          subject: assunto,
          body: corpoTexto,
          htmlBody: corpoHtml,
          name: 'SGI MAPRO',
          tipo: 'AVISO_' + tipo,
          contextoId: String(atividade.ID_ATIVIDADE),
          chaveIdempotencia: 'AVISO_ATIVIDADE:' + String(atividade.ID_ATIVIDADE) +
            ':' + tipo + ':' + hoje + ':' + destinatario
        });
      });
      if (!entregas.some(function (entrega) { return entrega.enfileirado; })) {
        throw new Error('Nenhum destinatário válido pôde ser registrado para envio.');
      }
      novosLogs.push([
        Utilities.getUuid(), formatarId_(Number(atividade.ID_MAPRO)),
        String(atividade.ID_ATIVIDADE), tipo, hoje,
        entregas.some(function (entrega) { return entrega.enviado; })
          ? new Date().toISOString() : '',
        destinatarios.join('; ')
      ]);
      existentes[chave] = true;
    } catch (erro) {
      console.error(JSON.stringify({
        acao: 'FALHA_NOTIFICACAO_ATIVIDADE_MAPRO',
        atividadeId: String(atividade.ID_ATIVIDADE),
        tipo: tipo,
        erro: erro && erro.message
      }));
    }
  });
  if (novosLogs.length) {
    abaLog.getRange(abaLog.getLastRow() + 1, 1, novosLogs.length, novosLogs[0].length)
      .setValues(novosLogs);
  }
}

function montarEmailAvisoPrazoHtmlMapro_(mapro, atividade, numero, prazo, tipo) {
  const emAtraso = tipo === 'ATRASO';
  const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
  const urlProjeto = montarUrlProjetoMapro_(mapro.ID_MAPRO);
  const titulo = emAtraso ? 'Atividade em atraso' : 'Atividade próxima ao vencimento';
  const introducao = emAtraso
    ? 'A atividade ultrapassou o prazo planejado e precisa de acompanhamento.'
    : 'A atividade está na semana de vencimento. Acompanhe o prazo para evitar atrasos.';
  const corDestaque = emAtraso ? '#d30912' : '#d89200';
  const fundoDestaque = emAtraso ? '#fff1f2' : '#fff8e6';
  const status = formatarStatusAtividadeEmailMapro_(atividade.STATUS_ATIVIDADE);
  return '<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="width:100%;max-width:580px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px">' +
    '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto"></td></tr>' +
    '<tr><td style="padding:30px 34px 34px;font-size:14px;line-height:1.6">' +
    '<p style="margin:0 0 8px;color:' + corDestaque + ';font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Aviso de prazo</p>' +
    '<h1 style="margin:0 0 14px;color:#06063d;font-size:22px;line-height:1.25">' + escaparHtml_(titulo) + '</h1>' +
    '<p style="margin:0 0 22px">' + escaparHtml_(introducao) + '</p>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7fa;border-radius:10px;margin-bottom:18px">' +
    montarLinhaEmail_('ID da Mapro', formatarId_(Number(mapro.ID_MAPRO))) +
    montarLinhaEmail_('Nome da Mapro', normalizarNomeProjeto_(mapro.NOME_PROJETO)) +
    montarLinhaEmail_('Portfólio', String(mapro['PORTFÓLIO'] || '')) +
    montarLinhaEmail_('Nº da atividade', String(numero || '—')) +
    montarLinhaEmail_('Descrição', String(atividade.NOME_ATIVIDADE || '')) +
    montarLinhaEmail_('Responsável', String(atividade.NOME_RESPONSAVEL || '')) +
    montarLinhaEmail_('Status da atividade', status) +
    '</table>' +
    '<p style="margin:0 0 22px;padding:15px 16px;border-radius:10px;border-left:4px solid ' + corDestaque + ';background:' + fundoDestaque + '">' +
    '<span style="display:block;color:#68697a;font-size:11px;font-weight:800;text-transform:uppercase">Prazo da atividade</span>' +
    '<strong style="display:block;margin-top:3px;color:' + corDestaque + ';font-size:18px">' +
      escaparHtml_(formatarDataEmailMapro_(prazo)) + '</strong></p>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">' +
    '<a href="' + escaparHtml_(urlProjeto) + '" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#06063d;color:#fff;text-decoration:none;font-weight:800">ACESSAR PROJETO</a>' +
    '</td></tr></table></td></tr>' +
    '<tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800;letter-spacing:.06em">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function enviarEmailReplanejamentoAtividadeMapro_(mapro, atividade, prazoAnterior, prazoNovo, registros) {
  try {
    const responsavel = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS)
      .find(function (usuario) { return idsIguaisMapro_(usuario.ID, atividade.idResponsavel); });
    const destinatarios = destinatariosAtividadeMapro_(mapro, responsavel);
    if (!destinatarios.length) return;
    const registroEmail = {
      ID_ATIVIDADE: atividade.idAtividade,
      ID_MAPRO: atividade.idMapro,
      NOME_ATIVIDADE: atividade.nomeAtividade,
      NOME_RESPONSAVEL: atividade.responsavel,
      STATUS_ATIVIDADE: atividade.status,
      OBSERVACAO: atividade.observacao
    };
    const numeroAtividade = calcularNumeracaoAtividadeMapro_(registros, atividade.idAtividade);
    const assunto = 'ALTERAÇÃO DE PRAZO - MAPRO ' + formatarId_(Number(mapro.ID_MAPRO)) +
      ' - ' + normalizarNomeProjeto_(mapro.NOME_PROJETO);
    const corpoTexto = montarCorpoEmailAtividadeMapro_(
        mapro,
        registroEmail,
        numeroAtividade,
        'O prazo da atividade foi replanejado.',
        [
          'Prazo anterior: ' + formatarDataEmailMapro_(prazoAnterior),
          'Novo prazo: ' + formatarDataEmailMapro_(prazoNovo)
        ]
      );
    const corpoHtml = montarEmailReplanejamentoHtmlMapro_(
      mapro, registroEmail, numeroAtividade, prazoAnterior, prazoNovo
    );
    const resultados = destinatarios.map(function (destinatario) {
      return entregarEmailMapro_({
        to: destinatario,
        subject: assunto,
        body: corpoTexto,
        htmlBody: corpoHtml,
        name: 'SGI MAPRO',
        tipo: 'REPLANEJAMENTO_ATIVIDADE',
        contextoId: String(atividade.idAtividade),
        chaveIdempotencia: 'REPLANEJAMENTO_ATIVIDADE:' + String(atividade.idAtividade) +
          ':' + String(prazoAnterior || '') + ':' + String(prazoNovo || '') + ':' +
          destinatario
      });
    });
    if (!resultados.some(function (resultado) { return resultado.enfileirado; })) {
      throw new Error('Nenhum e-mail de replanejamento pôde ser registrado.');
    }
  } catch (erro) {
    console.error(JSON.stringify({
      acao: 'FALHA_EMAIL_REPLANEJAMENTO_MAPRO',
      atividadeId: atividade.idAtividade,
      erro: erro && erro.message
    }));
  }
}

function montarEmailReplanejamentoHtmlMapro_(mapro, atividade, numero, prazoAnterior, prazoNovo) {
  const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
  const urlProjeto = montarUrlProjetoMapro_(mapro.ID_MAPRO);
  const status = formatarStatusAtividadeEmailMapro_(atividade.STATUS_ATIVIDADE || atividade.status);
  const observacao = String(atividade.OBSERVACAO || atividade.observacao || '').trim();
  return '<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="width:100%;max-width:580px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px">' +
    '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto"></td></tr>' +
    '<tr><td style="padding:30px 34px 34px;font-size:14px;line-height:1.6">' +
    '<p style="margin:0 0 8px;color:#68697a;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Replanejamento de atividade</p>' +
    '<h1 style="margin:0 0 14px;color:#06063d;font-size:22px;line-height:1.25">O prazo da atividade foi alterado</h1>' +
    '<p style="margin:0 0 22px">O responsável e o líder do projeto estão sendo informados sobre esta atualização.</p>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7fa;border-radius:10px;margin-bottom:18px">' +
    montarLinhaEmail_('ID da Mapro', formatarId_(Number(mapro.ID_MAPRO))) +
    montarLinhaEmail_('Nome da Mapro', normalizarNomeProjeto_(mapro.NOME_PROJETO)) +
    montarLinhaEmail_('Portfólio', String(mapro['PORTFÓLIO'] || '')) +
    montarLinhaEmail_('Nº da atividade', String(numero || '—')) +
    montarLinhaEmail_('Descrição', String(atividade.NOME_ATIVIDADE || atividade.nomeAtividade || '')) +
    montarLinhaEmail_('Responsável', String(atividade.NOME_RESPONSAVEL || atividade.responsavel || '')) +
    montarLinhaEmail_('Status da atividade', status) +
    '</table>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px"><tr>' +
    '<td width="48%" style="padding:13px 14px;border-radius:10px;background:#fff3f5;border-left:4px solid #ec0e37">' +
    '<span style="display:block;color:#68697a;font-size:11px;font-weight:800;text-transform:uppercase">Prazo anterior</span>' +
    '<strong style="display:block;margin-top:3px;color:#9f102b;font-size:17px">' + escaparHtml_(formatarDataEmailMapro_(prazoAnterior)) + '</strong></td>' +
    '<td width="4%"></td>' +
    '<td width="48%" style="padding:13px 14px;border-radius:10px;background:#eef8f0;border-left:4px solid #087f19">' +
    '<span style="display:block;color:#68697a;font-size:11px;font-weight:800;text-transform:uppercase">Novo prazo</span>' +
    '<strong style="display:block;margin-top:3px;color:#087f19;font-size:17px">' + escaparHtml_(formatarDataEmailMapro_(prazoNovo)) + '</strong></td>' +
    '</tr></table>' +
    (observacao ? '<p style="margin:0 0 22px;padding:13px 15px;border-radius:10px;background:#f7f7fa"><strong>Motivo informado:</strong><br>' +
      escaparHtml_(observacao) + '</p>' : '') +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">' +
    '<a href="' + escaparHtml_(urlProjeto) + '" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#06063d;color:#fff;text-decoration:none;font-weight:800">ACESSAR PROJETO</a>' +
    '</td></tr></table></td></tr>' +
    '<tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800;letter-spacing:.06em">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function formatarStatusAtividadeEmailMapro_(status) {
  const valores = {
    PLANEJADA: 'Não iniciada',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    NAO_APLICAVEL: 'Não aplicável'
  };
  const normalizado = String(status || '').trim().toUpperCase();
  return valores[normalizado] || String(status || '—');
}

function destinatariosAtividadeMapro_(mapro, responsavel) {
  const emails = [
    normalizarEmail_(mapro['EMAIL_LÍDER']),
    normalizarEmail_(responsavel && responsavel.EMAIL)
  ].filter(Boolean);
  return Array.from(new Set(emails));
}

function montarCorpoEmailAtividadeMapro_(mapro, atividade, numero, introducao, linhasPrazo) {
  return [
    introducao,
    '',
    'ID da Mapro: ' + formatarId_(Number(mapro.ID_MAPRO)),
    'Nome da Mapro: ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
    'Portfólio: ' + String(mapro['PORTFÓLIO'] || ''),
    'Nº da atividade: ' + String(numero || '—'),
    'Descrição: ' + String(atividade.NOME_ATIVIDADE || atividade.nomeAtividade || ''),
    'Responsável: ' + String(atividade.NOME_RESPONSAVEL || atividade.responsavel || ''),
    'Status da atividade: ' + formatarStatusAtividadeEmailMapro_(
      atividade.STATUS_ATIVIDADE || atividade.status
    ),
    ...(String(atividade.OBSERVACAO || atividade.observacao || '').trim()
      ? ['Motivo informado: ' + String(atividade.OBSERVACAO || atividade.observacao).trim()]
      : []),
    ...linhasPrazo
  ].join('\n');
}

function calcularNumeracaoAtividadeMapro_(atividades, idAtividade) {
  const alvo = atividades.find(function (item) {
    return String(item.ID_ATIVIDADE) === String(idAtividade);
  });
  if (!alvo) return '';
  const ativas = atividades.filter(function (item) {
    return idsIguaisMapro_(item.ID_MAPRO, alvo.ID_MAPRO) &&
      String(item.ATIVO || 'SIM').toUpperCase() !== 'NAO';
  }).sort(function (a, b) { return Number(a.ORDEM || 0) - Number(b.ORDEM || 0); });
  const porPai = {};
  ativas.forEach(function (item) {
    const pai = String(item.ID_ATIVIDADE_PAI || '');
    if (!porPai[pai]) porPai[pai] = [];
    porPai[pai].push(item);
  });
  const partes = [];
  let atual = alvo;
  while (atual) {
    const irmaos = porPai[String(atual.ID_ATIVIDADE_PAI || '')] || [];
    partes.unshift(irmaos.findIndex(function (item) {
      return String(item.ID_ATIVIDADE) === String(atual.ID_ATIVIDADE);
    }) + 1);
    atual = ativas.find(function (item) {
      return String(item.ID_ATIVIDADE) === String(atual.ID_ATIVIDADE_PAI || '');
    });
  }
  return partes.filter(function (parte) { return parte > 0; }).join('.');
}

function formatarDataEmailMapro_(dataIso) {
  const partes = dataIsoMapro_(dataIso).split('-');
  return partes.length === 3 ? partes[2] + '/' + partes[1] + '/' + partes[0] : '—';
}

function lerValoresBaseMapro_(aba, cabecalho) {
  if (!aba || aba.getLastRow() < 2) return [];
  const registros = lerRegistros_(aba, [cabecalho]);
  return Array.from(new Set(registros.map(function (item) {
    return String(item[cabecalho] || '').trim();
  }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
}

function validarOpcaoBaseMapro_(valor, opcoes, campo) {
  const selecionado = String(valor || '').trim();
  if (selecionado && opcoes.length && opcoes.indexOf(selecionado) === -1) {
    throw new Error('Selecione uma opção válida para ' + campo + '.');
  }
}

function obterDepartamentoCadastradoMapro_(usuario, departamentosValidos) {
  const departamento = String(usuario && usuario.DEPARTAMENTO || '').trim();
  if (!departamento) return '';
  validarOpcaoBaseMapro_(departamento, departamentosValidos || [], 'Departamento');
  return departamento;
}

function validarEstrategiaMapro_(entrada, estrategia) {
  const negocio = String(entrada.negocio || '').trim();
  const dimensao = String(entrada.dimensaoBsc || '').trim();
  const objetivo = String(entrada.objetivoBsc || '').trim();

  // Os campos são dependentes e o autosave é executado a cada seleção.
  // Uma combinação só pode ser avaliada depois que os três estiverem preenchidos.
  if (!negocio || !dimensao || !objetivo) return;

  const valida = estrategia.some(function (item) {
    return item.negocio === negocio && item.dimensaoBsc === dimensao &&
      item.objetivoBsc === objetivo;
  });
  if (estrategia.length && !valida) {
    throw new Error('A combinação de Negócio, Dimensão BSC e Objetivo BSC não é válida.');
  }
}

function validarTextoMapro_(valor, campo, limite) {
  const texto = String(valor || '').trim();
  if (texto.length > limite) throw new Error(campo + ' excede o tamanho permitido.');
  return texto;
}

function normalizarRespostaSimNaoMapro_(valor, campo, permitirVazio) {
  const resposta = String(valor || '').trim().toUpperCase();
  if (!resposta && permitirVazio) return '';
  if (['SIM', 'NÃO'].indexOf(resposta) === -1) {
    throw new Error('Selecione Sim ou Não no campo ' + campo + '.');
  }
  return resposta;
}

function validarVersaoMapro_(mapro, versaoRecebida) {
  if (Number(versaoRecebida || 0) !== Number(mapro.VERSION || 1)) {
    throw new Error('A Mapro foi alterada por outra pessoa. Reabra o projeto e tente novamente.');
  }
}

function validarVersaoAtividadeMapro_(atividade, versaoRecebida) {
  if (Number(versaoRecebida || 0) !== Number(atividade.VERSION || 1)) {
    throw new Error('A atividade foi alterada por outra pessoa. Reabra e tente novamente.');
  }
}
