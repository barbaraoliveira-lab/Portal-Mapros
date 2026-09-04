const CABECALHOS_MAPRO_PARTICIPANTES = [
  'ID_VINCULO', 'ID_MAPRO', 'ID_USUARIO', 'NOME', 'EMAIL', 'PAPEL', 'ATIVO',
  'ADICIONADO_EM', 'ADICIONADO_POR'
];

const CABECALHOS_MAPRO_ATIVIDADES = [
  'ID_ATIVIDADE', 'ID_MAPRO', 'ID_ATIVIDADE_PAI', 'ORDEM', 'TIPO',
  'NOME_ATIVIDADE', 'ID_RESPONSAVEL', 'NOME_RESPONSAVEL', 'DEPARTAMENTO',
  'DATA_INICIO', 'DATA_FINAL', 'STATUS_ATIVIDADE', 'JUSTIFICATIVA', 'OBSERVACAO',
  'ATIVO', 'CRIADO_EM', 'ATUALIZADO_EM', 'VERSION', 'EVIDENCIA_ID',
  'EVIDENCIA_NOME', 'EVIDENCIA_TIPO', 'EVIDENCIA_URL', 'EVIDENCIA_ENVIADA_POR',
  'ID_ATIVIDADE_PREDECESSORA', 'DIAS_REPLANEJADOS'
];

const CABECALHOS_MAPRO_HISTORICO_DATAS = [
  'ID_HISTORICO', 'ID_MAPRO', 'ID_ATIVIDADE', 'CAMPO', 'VALOR_ANTERIOR',
  'VALOR_NOVO', 'ALTERADO_EM', 'ALTERADO_POR'
];

const CABECALHOS_MAPRO_HISTORICO_PRAZO = [
  'ID_HISTORICO', 'ID_MAPRO', 'PRAZO_ANTERIOR', 'PRAZO_NOVO',
  'ALTERADO_EM', 'ALTERADO_POR'
];

const CABECALHOS_MAPRO_NOTIFICACOES = [
  'ID_NOTIFICACAO', 'ID_MAPRO', 'ID_ATIVIDADE', 'TIPO', 'DATA_REFERENCIA',
  'ENVIADO_EM', 'DESTINATARIOS'
];

const CABECALHOS_BASE_CONTAGIRO = ['CONTAGIRO'];
const CABECALHOS_BASE_DEPARTAMENTOS = ['DEPARTAMENTO'];
const CABECALHOS_BASE_ESTRATEGIA = [
  'NEGOCIO', 'DIMENSAO_BSC', 'OBJETIVO_BSC', 'COR', 'ATIVO', 'LINK_BSC'
];

function configurarEstruturaMapros_(planilha, abaMapros, abaUsuarios) {
  const abaParticipantes = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaMaproParticipantes,
    CABECALHOS_MAPRO_PARTICIPANTES
  );
  const abaAtividades = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaMaproAtividades,
    CABECALHOS_MAPRO_ATIVIDADES
  );
  const abaHistorico = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaMaproHistoricoDatas,
    CABECALHOS_MAPRO_HISTORICO_DATAS
  );
  const abaHistoricoPrazo = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaMaproHistoricoPrazo,
    CABECALHOS_MAPRO_HISTORICO_PRAZO
  );
  const abaNotificacoes = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaMaproNotificacoes,
    CABECALHOS_MAPRO_NOTIFICACOES
  );
  const abaContagiro = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaBaseContagiro,
    CABECALHOS_BASE_CONTAGIRO
  );
  const abaDepartamentos = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaBaseDepartamentos,
    CABECALHOS_BASE_DEPARTAMENTOS
  );
  const abaEstrategia = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaBaseEstrategia,
    CABECALHOS_BASE_ESTRATEGIA
  );

  unificarIdsMaproComSolicitacao_(
    abaMapros,
    abaParticipantes,
    abaAtividades,
    abaHistorico,
    abaHistoricoPrazo,
    abaNotificacoes
  );
  migrarHierarquiaAtividadesMapro_(abaAtividades);
  normalizarEstadoInicialMapros_(abaMapros);
  sincronizarParticipantesMapros_(abaMapros, abaParticipantes, abaUsuarios);
  sincronizarDepartamentosCadastradosMapro_(abaMapros, abaAtividades, abaUsuarios);
  [abaParticipantes, abaAtividades, abaHistorico, abaHistoricoPrazo, abaNotificacoes,
    abaContagiro, abaDepartamentos, abaEstrategia].forEach(function (aba) {
    if (aba.getFrozenRows() < 1) formatarAba_(aba, aba.getLastColumn());
  });
}

/** Atualiza em lote os departamentos derivados do líder e dos responsáveis cadastrados. */
function sincronizarDepartamentosCadastradosMapro_(abaMapros, abaAtividades, abaUsuarios) {
  const usuariosPorId = {};
  lerRegistros_(abaUsuarios, CABECALHOS_USUARIOS).forEach(function (usuario) {
    usuariosPorId[String(Number(usuario.ID))] = String(usuario.DEPARTAMENTO || '').trim();
  });

  function sincronizar(aba, cabecalhos, cabecalhoUsuario) {
    if (aba.getLastRow() < 2) return;
    const registros = lerRegistros_(aba, cabecalhos);
    const indiceDepartamento = cabecalhos.indexOf('DEPARTAMENTO') + 1;
    const departamentos = registros.map(function (registro) {
      const chave = String(Number(registro[cabecalhoUsuario]));
      return [protegerTextoPlanilha_(usuariosPorId[chave] || '')];
    });
    aba.getRange(2, indiceDepartamento, departamentos.length, 1).setValues(departamentos);
  }

  sincronizar(abaMapros, CABECALHOS_MAPROS, 'ID_LÍDER');
  sincronizar(abaAtividades, CABECALHOS_MAPRO_ATIVIDADES, 'ID_RESPONSAVEL');
}

function migrarHierarquiaAtividadesMapro_(abaAtividades) {
  if (abaAtividades.getLastRow() < 2) return;
  const registros = lerRegistros_(abaAtividades, CABECALHOS_MAPRO_ATIVIDADES);
  const porId = {};
  registros.forEach(function (atividade) {
    porId[String(atividade.ID_ATIVIDADE || '')] = atividade;
  });
  let alterou = false;
  const tipos = registros.map(function (atividade) {
    let tipo = String(atividade.TIPO || '').toUpperCase();
    const pai = porId[String(atividade.ID_ATIVIDADE_PAI || '')];
    if (tipo === 'SUBATIVIDADE' && pai && String(pai.TIPO || '').toUpperCase() === 'TOPICO') {
      tipo = 'ATIVIDADE';
      alterou = true;
    }
    return [tipo];
  });
  if (!alterou) return;
  const indiceTipo = CABECALHOS_MAPRO_ATIVIDADES.indexOf('TIPO') + 1;
  abaAtividades.getRange(2, indiceTipo, tipos.length, 1).setValues(tipos);
}

/**
 * Mantém ID_MAPRO igual ao ID_SOLICITAÇÃO e atualiza todas as chaves relacionadas.
 * A escrita é feita em lote para preservar inclusive casos em que dois IDs trocam de posição.
 */
function unificarIdsMaproComSolicitacao_(
  abaMapros,
  abaParticipantes,
  abaAtividades,
  abaHistorico,
  abaHistoricoPrazo,
  abaNotificacoes
) {
  if (abaMapros.getLastRow() < 2) return;
  const registros = lerRegistros_(abaMapros, CABECALHOS_MAPROS);
  const destinos = {};
  const conversoes = {};
  let totalAlterado = 0;

  const idsUnificados = registros.map(function (mapro) {
    const idAntigoNumero = Number(mapro.ID_MAPRO);
    const idSolicitacaoNumero = Number(mapro['ID_SOLICITAÇÃO']);
    if (!Number.isInteger(idSolicitacaoNumero) || idSolicitacaoNumero < 1) {
      console.warn('Mapro sem ID de solicitação válido: ' + String(mapro.ID_MAPRO || ''));
      return [mapro.ID_MAPRO];
    }
    const chaveDestino = String(idSolicitacaoNumero);
    if (destinos[chaveDestino]) {
      throw new Error(
        'Há mais de uma Mapro vinculada à solicitação ' + formatarId_(idSolicitacaoNumero) + '.'
      );
    }
    destinos[chaveDestino] = true;
    const idUnificado = formatarId_(idSolicitacaoNumero);
    if (Number.isFinite(idAntigoNumero) && idAntigoNumero >= 1) {
      conversoes[String(idAntigoNumero)] = idUnificado;
    }
    if (String(idAntigoNumero) !== chaveDestino) totalAlterado += 1;
    return [idUnificado];
  });

  if (!totalAlterado) return;
  abaMapros.getRange(2, 1, idsUnificados.length, 1).setValues(idsUnificados);
  atualizarIdsMaproRelacionados_(abaParticipantes, conversoes);
  atualizarIdsMaproRelacionados_(abaAtividades, conversoes);
  atualizarIdsMaproRelacionados_(abaHistorico, conversoes);
  atualizarIdsMaproRelacionados_(abaHistoricoPrazo, conversoes);
  atualizarIdsMaproRelacionados_(abaNotificacoes, conversoes);
  console.info(JSON.stringify({
    acao: 'IDS_MAPRO_UNIFICADOS_COM_SOLICITACAO',
    total: totalAlterado
  }));
}

function atualizarIdsMaproRelacionados_(aba, conversoes) {
  if (!aba || aba.getLastRow() < 2) return;
  const valores = aba.getRange(2, 2, aba.getLastRow() - 1, 1).getValues();
  let alterou = false;
  const atualizados = valores.map(function (linha) {
    const chave = String(Number(linha[0]));
    if (!conversoes[chave]) return linha;
    if (String(linha[0]) !== conversoes[chave]) alterou = true;
    return [conversoes[chave]];
  });
  if (alterou) aba.getRange(2, 2, atualizados.length, 1).setValues(atualizados);
}

function normalizarEstadoInicialMapros_(abaMapros) {
  if (abaMapros.getLastRow() < 2) return;
  const registros = lerRegistros_(abaMapros, CABECALHOS_MAPROS);
  let alterouStatus = false;
  let alterouVersao = false;
  const status = registros.map(function (mapro) {
    const atual = String(mapro.STATUS_MAPRO || '').toUpperCase();
    if (!atual || atual === 'AGUARDANDO_PREENCHIMENTO') {
      alterouStatus = true;
      return ['AGUARDANDO_INICIO'];
    }
    return [atual];
  });
  const versoes = registros.map(function (mapro) {
    const versao = Number(mapro.VERSION);
    if (!Number.isFinite(versao) || versao < 1) {
      alterouVersao = true;
      return [1];
    }
    return [versao];
  });
  if (alterouStatus) abaMapros.getRange(2, 11, status.length, 1).setValues(status);
  if (alterouVersao) {
    const colunaVersao = CABECALHOS_MAPROS.indexOf('VERSION') + 1;
    abaMapros.getRange(2, colunaVersao, versoes.length, 1).setValues(versoes);
  }
}

function sincronizarParticipantesMapros_(abaMapros, abaParticipantes, abaUsuarios) {
  const mapros = lerRegistros_(abaMapros, CABECALHOS_MAPROS);
  if (!mapros.length) return;
  const usuarios = lerRegistros_(abaUsuarios, CABECALHOS_USUARIOS);
  const porEmail = {};
  usuarios.forEach(function (usuario) {
    porEmail[normalizarEmail_(usuario.EMAIL)] = usuario;
  });
  const solicitacoesPorId = {};
  lerRegistros_(obterAbaSolicitacoesMapro_(), CABECALHOS_SOLICITACOES_MAPRO)
    .forEach(function (solicitacao) {
      solicitacoesPorId[String(Number(solicitacao['ID_SOLICITAÇÃO']))] = solicitacao;
    });
  const vinculosExistentes = lerRegistros_(
    abaParticipantes,
    CABECALHOS_MAPRO_PARTICIPANTES
  );
  const existentes = {};
  vinculosExistentes.forEach(function (vinculo) {
    existentes[chaveParticipanteMapro_(vinculo.ID_MAPRO, vinculo.EMAIL)] = vinculo;
  });
  const agora = new Date().toISOString();
  const novasLinhas = [];
  let alterouVinculo = false;
  mapros.forEach(function (mapro) {
    const idMapro = formatarId_(Number(mapro.ID_MAPRO));
    const membrosPorEmail = {};
    const prioridadePapel = { ACESSO: 1, OBSERVADOR: 2, LIDER: 3, EDITOR: 4 };
    function incluirMembro(membro) {
      const email = normalizarEmail_(membro.email);
      if (!email) return;
      const atual = membrosPorEmail[email];
      if (!atual || prioridadePapel[membro.papel] > prioridadePapel[atual.papel]) {
        membrosPorEmail[email] = Object.assign({}, membro, { email: email });
      }
    }
    if (mapro['EMAIL_LÍDER']) {
      incluirMembro({
        email: normalizarEmail_(mapro['EMAIL_LÍDER']),
        nome: String(mapro['NOME_LÍDER'] || ''),
        id: String(mapro['ID_LÍDER'] || ''),
        papel: 'LIDER'
      });
    }
    const solicitacao = solicitacoesPorId[String(Number(mapro['ID_SOLICITAÇÃO']))];
    if (solicitacao && solicitacao['EMAIL_USUÁRIO']) {
      incluirMembro({
        email: normalizarEmail_(solicitacao['EMAIL_USUÁRIO']),
        nome: String(solicitacao.NOME || ''),
        id: String(solicitacao.ID_USUARIO || ''),
        papel: 'EDITOR'
      });
    }
    const emails = String(mapro.EMAILS_PARTICIPANTES || '').split(';');
    const nomes = String(mapro.NOMES_PARTICIPANTES || '').split(';');
    const ids = String(mapro.IDS_PARTICIPANTES || '').split(';');
    emails.forEach(function (email, indice) {
      const normalizado = normalizarEmail_(email);
      if (!normalizado) return;
      incluirMembro({
        email: normalizado,
        nome: String(nomes[indice] || '').trim(),
        id: String(ids[indice] || '').trim(),
        papel: 'ACESSO'
      });
    });
    Object.keys(membrosPorEmail).forEach(function (emailMembro) {
      const membro = membrosPorEmail[emailMembro];
      const chave = chaveParticipanteMapro_(idMapro, membro.email);
      const existente = existentes[chave];
      if (existente) {
        const papelAtual = String(existente.PAPEL || 'ACESSO').toUpperCase();
        const devePromover = prioridadePapel[membro.papel] > (prioridadePapel[papelAtual] || 0);
        const deveReativar = String(existente.ATIVO || 'SIM').toUpperCase() === 'NAO';
        if (devePromover) existente.PAPEL = membro.papel;
        if (deveReativar) existente.ATIVO = 'SIM';
        if (devePromover || deveReativar) alterouVinculo = true;
        return;
      }
      const usuario = porEmail[membro.email];
      novasLinhas.push([
        Utilities.getUuid(), idMapro,
        usuario ? formatarId_(Number(usuario.ID)) : membro.id,
        protegerTextoPlanilha_(usuario ? usuario.NOME : membro.nome),
        membro.email, membro.papel, 'SIM', agora, CONFIG.emailAdministrador
      ]);
      existentes[chave] = { PAPEL: membro.papel, ATIVO: 'SIM' };
    });
  });
  if (alterouVinculo && vinculosExistentes.length) {
    const valores = vinculosExistentes.map(function (vinculo) {
      return CABECALHOS_MAPRO_PARTICIPANTES.map(function (cabecalho) {
        return vinculo[cabecalho] == null ? '' : vinculo[cabecalho];
      });
    });
    abaParticipantes.getRange(2, 1, valores.length, CABECALHOS_MAPRO_PARTICIPANTES.length)
      .setValues(valores);
  }
  if (novasLinhas.length) {
    abaParticipantes.getRange(
      abaParticipantes.getLastRow() + 1,
      1,
      novasLinhas.length,
      CABECALHOS_MAPRO_PARTICIPANTES.length
    ).setValues(novasLinhas);
  }
}

function carregarPaginaMapros() {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const admin = String(usuario.NIVEL).toUpperCase() === 'ADMIN';
    if (admin) {
      try {
        configurarGatilhoNotificacoesMapro_();
      } catch (erroGatilho) {
        console.error(JSON.stringify({
          acao: 'FALHA_CONFIGURACAO_GATILHO_NOTIFICACOES',
          erro: erroGatilho && erroGatilho.message
        }));
      }
    }
    const mapros = obterMaprosAcessiveis_(usuario, admin);
    return montarConfiguracaoPaginaMapros_(usuario, admin, mapros);
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function carregarPaginaMaprosInicial() {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const admin = String(usuario.NIVEL).toUpperCase() === 'ADMIN';
    if (admin) {
      try {
        configurarGatilhoNotificacoesMapro_();
      } catch (erroGatilho) {
        console.error(JSON.stringify({
          acao: 'FALHA_CONFIGURACAO_GATILHO_NOTIFICACOES',
          erro: erroGatilho && erroGatilho.message
        }));
      }
    }
    const mapros = obterMaprosAcessiveis_(usuario, admin);
    const atividades = lerRegistros_(
      obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES
    );
    const porMapro = agruparAtividadesPorMapro_(atividades);
    return {
      configuracao: montarConfiguracaoPaginaMapros_(usuario, admin, mapros),
      mapros: {
        sucesso: true,
        dados: mapros.map(function (mapro) {
          return mapearResumoMapro_(
            mapro, porMapro[String(Number(mapro.ID_MAPRO))] || []
          );
        }).sort(function (a, b) { return Number(a.idMapro) - Number(b.idMapro); })
      }
    };
  } catch (erro) {
    return { configuracao: respostaDeErro_(erro), mapros: null };
  }
}

function montarConfiguracaoPaginaMapros_(usuario, admin, mapros) {
  const portfolios = Array.from(new Set(mapros.map(function (mapro) {
    return String(mapro['PORTFÓLIO'] || '').trim();
  }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  return {
    sucesso: true,
    dados: {
      admin: admin,
      titulo: admin ? 'MAPROS' : 'MINHAS MAPROS',
      usuario: {
        id: formatarId_(Number(usuario.ID)),
        nome: String(usuario.NOME || ''),
        email: normalizarEmail_(usuario.EMAIL)
      },
      portfolios: portfolios,
      logoUrl: 'https://drive.google.com/thumbnail?id=' + CONFIG.logoCadastroId + '&sz=w4000',
      logoEmpresaUrl: 'https://drive.google.com/thumbnail?id=' + CONFIG.logoEmpresaId + '&sz=w600',
      urlAplicacao: ScriptApp.getService().getUrl()
    }
  };
}

/** Retorna somente dados de projetos que o usuário atual está autorizado a consultar. */
function carregarDashboardMapro() {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const admin = String(usuario.NIVEL || '').toUpperCase() === 'ADMIN';
    const mapros = obterMaprosAcessiveis_(usuario, admin);
    const atividades = lerRegistros_(obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES);
    const porMapro = agruparAtividadesPorMapro_(atividades);
    const projetos = mapros.map(function (mapro) {
      const atividadesMapro = porMapro[String(Number(mapro.ID_MAPRO))] || [];
      const resumo = calcularResumoAtividadesMapro_(atividadesMapro);
      const statusPersistido = String(mapro.STATUS_MAPRO || '').toUpperCase();
      const status = ['AGUARDANDO_INICIO', 'AGUARDANDO_PREENCHIMENTO']
        .indexOf(statusPersistido) !== -1
        ? statusPersistido
        : calcularSituacaoProjetoMapro_(mapro.STATUS_MAPRO, atividadesMapro);
      const statusNormalizado = normalizarSituacaoMapro_(status);
      const canceladaPorInatividade = statusNormalizado === 'CANCELADA' &&
        normalizarTexto_(mapro.MOTIVO_CANCELAMENTO).indexOf('inatividade') !== -1;
      const atrasadas = atividadesMapro.filter(function (atividade) {
        return String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO' &&
          String(atividade.TIPO || '').toUpperCase() !== 'TOPICO' &&
          calcularSaudeAtividadeMapro_(atividade) === 'VERMELHO';
      }).map(function (atividade) {
        return {
          id: String(atividade.ID_ATIVIDADE || ''),
          descricao: String(atividade.NOME_ATIVIDADE || ''),
          responsavel: String(atividade.NOME_RESPONSAVEL || ''),
          prazo: dataIsoMapro_(atividade.DATA_FINAL)
        };
      });
      return {
        id: formatarId_(Number(mapro.ID_MAPRO)),
        nome: normalizarNomeProjeto_(mapro.NOME_PROJETO),
        portfolio: String(mapro['PORTFÓLIO'] || ''),
        contagiro: String(mapro.CONTAGIRO || ''),
        area: String(mapro.DEPARTAMENTO || ''),
        lider: String(mapro['NOME_LÍDER'] || ''),
        status: statusNormalizado,
        canceladaPorInatividade: canceladaPorInatividade,
        acompanhamentoIniciado: Boolean(mapro.ACOMPANHAMENTO_INICIADO_EM),
        acompanhamentoIniciadoEm: String(mapro.ACOMPANHAMENTO_INICIADO_EM || ''),
        motivoCancelamento: String(mapro.MOTIVO_CANCELAMENTO || ''),
        dataInicio: resumo.dataInicio || dataIsoMapro_(mapro.DATA_INICIO),
        prazo: resumo.dataFinal || dataIsoMapro_(mapro.DATA_FINAL),
        conclusaoEm: statusNormalizado === 'CONCLUÍDA'
          ? dataIsoMapro_(mapro.ATUALIZADO_EM) : '',
        percentual: resumo.percentual,
        totalAtividades: resumo.totalAtividades,
        atividadesAtrasadas: atrasadas
      };
    }).sort(function (a, b) { return Number(a.id) - Number(b.id); });
    return {
      sucesso: true,
      dados: {
        admin: admin,
        usuario: {nome: String(usuario.NOME || ''), email: normalizarEmail_(usuario.EMAIL)},
        projetos: projetos,
        logoUrl: 'https://drive.google.com/thumbnail?id=' + CONFIG.logoCadastroId + '&sz=w4000',
        logoEmpresaUrl: 'https://drive.google.com/thumbnail?id=' + CONFIG.logoEmpresaId + '&sz=w600',
        urlAplicacao: ScriptApp.getService().getUrl()
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function listarMaprosPagina(portfolio) {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const admin = String(usuario.NIVEL).toUpperCase() === 'ADMIN';
    const filtroPortfolio = String(portfolio || '').trim();
    const mapros = obterMaprosAcessiveis_(usuario, admin).filter(function (mapro) {
      return !filtroPortfolio || String(mapro['PORTFÓLIO'] || '') === filtroPortfolio;
    });
    const atividades = lerRegistros_(
      obterAbaMaproAtividades_(),
      CABECALHOS_MAPRO_ATIVIDADES
    );
    const porMapro = agruparAtividadesPorMapro_(atividades);
    return {
      sucesso: true,
      dados: mapros.map(function (mapro) {
        return mapearResumoMapro_(mapro, porMapro[String(Number(mapro.ID_MAPRO))] || []);
      }).sort(function (a, b) { return Number(a.idMapro) - Number(b.idMapro); })
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function obterDetalhesMapro(idMapro) {
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    const mapro = contexto.mapro;
    const registrosAtividades = lerRegistros_(
      obterAbaMaproAtividades_(),
      CABECALHOS_MAPRO_ATIVIDADES
    ).filter(function (atividade) {
      return idsIguaisMapro_(atividade.ID_MAPRO, mapro.ID_MAPRO) &&
        String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    });
    agregarTopicosMapro_(registrosAtividades);
    const resumoAtividades = calcularResumoAtividadesMapro_(registrosAtividades);
    const atividades = registrosAtividades.map(mapearAtividadeMaproParaCliente_)
      .sort(function (a, b) { return Number(a.ordem) - Number(b.ordem); });
    const detalhesMapro = mapearDetalhesMapro_(mapro);
    detalhesMapro.dataInicio = resumoAtividades.dataInicio;
    detalhesMapro.dataFinal = resumoAtividades.dataFinal;
    const participantes = contexto.participantes;
    const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS)
      .filter(function (item) { return String(item.STATUS).toUpperCase() === 'ATIVO'; })
      .map(function (item) {
        return {
          id: formatarId_(Number(item.ID)),
          nome: String(item.NOME || ''),
          email: normalizarEmail_(item.EMAIL),
          departamento: String(item.DEPARTAMENTO || '').trim()
        };
      }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    const idsResponsaveis = {};
    participantes.forEach(function (participante) {
      if (['LIDER', 'EDITOR', 'OBSERVADOR'].indexOf(participante.papel) !== -1) {
        idsResponsaveis[String(Number(participante.id))] = true;
      }
    });
    const responsaveis = usuarios.filter(function (usuario) {
      return Boolean(idsResponsaveis[String(Number(usuario.id))]);
    });
    return {
      sucesso: true,
      dados: {
        mapro: detalhesMapro,
        resumoProjeto: resumoAtividades,
        atividades: atividades,
        participantes: participantes,
        usuarios: usuarios,
        responsaveis: responsaveis,
        permissao: {
          papel: contexto.papel,
          podeEditarTudo: contexto.podeEditarTudo,
          podeEditarProprias: contexto.podeEditarProprias,
          podeIniciarAcompanhamento: contexto.podeIniciarAcompanhamento
        },
        podeGerenciarParticipantes: contexto.admin ||
          normalizarEmail_(mapro['EMAIL_LÍDER']) === normalizarEmail_(contexto.usuario.EMAIL),
        bases: obterBasesMapro_()
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function salvarCabecalhoMapro(dados) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const entrada = dados || {};
    const contexto = exigirAcessoMapro_(entrada.idMapro);
    exigirEdicaoCompletaMapro_(contexto);
    bloqueio.waitLock(10000);
    const aba = obterAbaMapros_();
    const linha = buscarLinhaMaproPorId_(aba, entrada.idMapro);
    const atual = lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPROS);
    validarVersaoMapro_(atual, entrada.version);
    const bases = obterBasesMapro_();
    const nivel = String(entrada.nivel || '').trim().toUpperCase();
    if (nivel && ['ESTRATÉGICO', 'TÁTICO', 'OPERACIONAL'].indexOf(nivel) === -1) {
      throw new Error('Selecione um nível válido.');
    }
    validarOpcaoBaseMapro_(entrada.contagiro, bases.contagiros, 'Contagiro');
    validarEstrategiaMapro_(entrada, bases.estrategia);
    const lider = resolverLiderAtivoMapro_(entrada, atual);
    const departamentoLider = obterDepartamentoCadastradoMapro_(lider, bases.departamentos);
    const emailLiderAnterior = normalizarEmail_(atual['EMAIL_LÍDER']);
    const liderFoiAlterado = emailLiderAnterior !== normalizarEmail_(lider.EMAIL);
    const usuarioAtualPodeTrocarLider = contexto.podeEditarTudo;
    if (liderFoiAlterado && !usuarioAtualPodeTrocarLider) {
      throw new Error('Somente o líder atual ou o ADMIN pode alterar o líder do projeto.');
    }
    const atividades = lerRegistros_(obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES)
      .filter(function (atividade) {
        return idsIguaisMapro_(atividade.ID_MAPRO, entrada.idMapro);
      });
    const resumoAtividades = calcularResumoAtividadesMapro_(atividades);
    const processoCritico = normalizarRespostaSimNaoMapro_(
      entrada.processoCritico, 'Processo crítico', true
    );
    const envolveSistema = normalizarRespostaSimNaoMapro_(
      entrada.envolveSistema, 'Envolve sistema', true
    );
    let sistemasEnvolvidos = validarTextoMapro_(
      entrada.sistemasEnvolvidos, 'Sistema(s) envolvido(s)', 3000
    );
    if (envolveSistema === 'SIM' && sistemasEnvolvidos.length < 3) {
      throw new Error('Informe qual ou quais sistemas estão envolvidos.');
    }
    if (envolveSistema !== 'SIM') sistemasEnvolvidos = '';
    const agora = new Date().toISOString();
    const alteracoes = {
      NOME_PROJETO: normalizarNomeProjeto_(entrada.nomeProjeto),
      O_QUE_E: validarTextoMapro_(entrada.oQueE, 'O que é o projeto', 3000),
      PORQUE: validarTextoMapro_(entrada.porque, 'Por que', 3000),
      RESULTADOS_ESPERADOS: validarTextoMapro_(
        entrada.resultadosEsperados,
        'Resultados esperados',
        3000
      ),
      CONTAGIRO: String(entrada.contagiro || '').trim(),
      NIVEL: nivel,
      DATA_INICIO: resumoAtividades.dataInicio,
      DATA_FINAL: resumoAtividades.dataFinal,
      ID_LÍDER: formatarId_(Number(lider.ID)),
      'NOME_LÍDER': String(lider.NOME || '').trim(),
      'EMAIL_LÍDER': normalizarEmail_(lider.EMAIL),
      DEPARTAMENTO: departamentoLider,
      NEGOCIO: String(entrada.negocio || '').trim(),
      DIMENSAO_BSC: String(entrada.dimensaoBsc || '').trim(),
      OBJETIVO_BSC: String(entrada.objetivoBsc || '').trim(),
      INDICADORES: validarTextoMapro_(entrada.indicadores, 'Indicadores', 3000),
      PROCESSO_CRITICO: processoCritico,
      ENVOLVE_SISTEMA: envolveSistema,
      SISTEMAS_ENVOLVIDOS: sistemasEnvolvidos,
      ATUALIZADO_EM: agora,
      VERSION: Number(atual.VERSION || 1) + 1
    };
    const linhaAtualizada = CABECALHOS_MAPROS.map(function (cabecalho) {
      const valor = Object.prototype.hasOwnProperty.call(alteracoes, cabecalho)
        ? alteracoes[cabecalho]
        : atual[cabecalho];
      return typeof valor === 'string' ? protegerTextoPlanilha_(valor) : valor;
    });
    aba.getRange(linha, 1, 1, CABECALHOS_MAPROS.length).setValues([linhaAtualizada]);
    if (liderFoiAlterado) {
      sincronizarTrocaLiderMapro_(
        entrada.idMapro,
        lider,
        emailLiderAnterior,
        contexto.usuario.EMAIL
      );
      atualizarParticipantesLegadosMapro_(entrada.idMapro);
    }
    console.info(JSON.stringify({
      acao: 'CABECALHO_MAPRO_ATUALIZADO',
      maproId: String(entrada.idMapro),
      realizadoPor: contexto.usuario.EMAIL
    }));
    return {
      sucesso: true,
      mensagem: 'Alterações salvas automaticamente.',
      dados: {
        version: alteracoes.VERSION,
        dataInicio: resumoAtividades.dataInicio,
        dataFinal: resumoAtividades.dataFinal,
        departamento: departamentoLider
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/** Salva a foto do líder no Drive e associa seus metadados à Mapro. */
function salvarFotoLiderMapro(dados) {
  const bloqueio = LockService.getDocumentLock();
  let arquivoNovo = null;
  try {
    garantirBancoConfigurado_();
    const entrada = dados || {};
    const idMapro = String(entrada.idMapro || '').trim();
    const contexto = exigirAcessoMapro_(idMapro);
    exigirEdicaoCompletaMapro_(contexto);
    const tipo = String(entrada.tipo || '').trim().toLowerCase();
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(tipo) === -1) {
      throw new Error('Selecione uma imagem PNG, JPG ou WEBP.');
    }
    const conteudoBase64 = String(entrada.conteudoBase64 || '').replace(/\s/g, '');
    if (!conteudoBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(conteudoBase64)) {
      throw new Error('O conteúdo da imagem é inválido.');
    }
    const bytes = Utilities.base64Decode(conteudoBase64);
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) {
      throw new Error('A imagem processada deve possuir no máximo 2 MB.');
    }
    validarAssinaturaImagemMapro_(bytes, tipo);
    bloqueio.waitLock(10000);
    const aba = obterAbaMapros_();
    const linha = buscarLinhaMaproPorId_(aba, idMapro);
    const atual = lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPROS);
    const extensoes = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'};
    const nome = 'foto-lider-mapro-' + formatarId_(Number(idMapro)) + extensoes[tipo];
    arquivoNovo = obterPastaFotosLideresMapro_().createFile(
      Utilities.newBlob(bytes, tipo, nome)
    );
    const idAnterior = String(atual.FOTO_LIDER_ID || '').trim();
    const agora = new Date().toISOString();
    const alteracoes = {
      FOTO_LIDER_ID: arquivoNovo.getId(),
      FOTO_LIDER_TIPO: tipo,
      FOTO_LIDER_ATUALIZADA_EM: agora,
      FOTO_LIDER_ATUALIZADA_POR: normalizarEmail_(contexto.usuario.EMAIL)
    };
    aba.getRange(linha, 1, 1, CABECALHOS_MAPROS.length).setValues([
      CABECALHOS_MAPROS.map(function (cabecalho) {
        return Object.prototype.hasOwnProperty.call(alteracoes, cabecalho)
          ? alteracoes[cabecalho]
          : atual[cabecalho];
      })
    ]);
    if (idAnterior && idAnterior !== arquivoNovo.getId()) excluirArquivoDriveMapro_(idAnterior);
    console.info(JSON.stringify({
      acao: 'FOTO_LIDER_ATUALIZADA',
      maproId: idMapro,
      realizadoPor: contexto.usuario.EMAIL
    }));
    return {
      sucesso: true,
      mensagem: 'Imagem do líder salva para todos os usuários.',
      dados: {imagem: 'data:' + tipo + ';base64,' + Utilities.base64Encode(bytes)}
    };
  } catch (erro) {
    if (arquivoNovo) excluirArquivoDriveMapro_(arquivoNovo.getId());
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/** Remove a associação e envia o arquivo anterior para a lixeira. */
function removerFotoLiderMapro(idMapro) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    exigirEdicaoCompletaMapro_(contexto);
    bloqueio.waitLock(10000);
    const aba = obterAbaMapros_();
    const linha = buscarLinhaMaproPorId_(aba, String(idMapro || '').trim());
    const atual = lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPROS);
    const idAnterior = String(atual.FOTO_LIDER_ID || '').trim();
    const limpar = ['FOTO_LIDER_ID', 'FOTO_LIDER_TIPO', 'FOTO_LIDER_ATUALIZADA_EM',
      'FOTO_LIDER_ATUALIZADA_POR'];
    aba.getRange(linha, 1, 1, CABECALHOS_MAPROS.length).setValues([
      CABECALHOS_MAPROS.map(function (cabecalho) {
        return limpar.indexOf(cabecalho) === -1 ? atual[cabecalho] : '';
      })
    ]);
    if (idAnterior) excluirArquivoDriveMapro_(idAnterior);
    console.info(JSON.stringify({
      acao: 'FOTO_LIDER_REMOVIDA', maproId: String(idMapro),
      realizadoPor: contexto.usuario.EMAIL
    }));
    return {sucesso: true, mensagem: 'Imagem do líder removida para todos os usuários.'};
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function excluirArquivoDriveMapro_(idArquivo) {
  try {
    DriveApp.getFileById(idArquivo).setTrashed(true);
  } catch (erro) {
    console.warn('Não foi possível enviar o arquivo substituído para a lixeira: ' + erro.message);
  }
}

function validarAssinaturaImagemMapro_(bytes, tipo) {
  const semSinal = bytes.map(function (valor) { return valor < 0 ? valor + 256 : valor; });
  const jpeg = semSinal.length >= 3 && semSinal[0] === 0xff && semSinal[1] === 0xd8 &&
    semSinal[2] === 0xff;
  const png = semSinal.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(function (valor, indice) {
      return semSinal[indice] === valor;
    });
  const webp = semSinal.length >= 12 &&
    String.fromCharCode.apply(null, semSinal.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode.apply(null, semSinal.slice(8, 12)) === 'WEBP';
  if ((tipo === 'image/jpeg' && jpeg) || (tipo === 'image/png' && png) ||
      (tipo === 'image/webp' && webp)) return;
  throw new Error('O conteúdo enviado não corresponde a uma imagem válida.');
}

function salvarAtividadeMapro(dados) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const entrada = validarAtividadeMapro_(dados);
    const confirmouReplanejamento = Boolean(dados && dados.confirmarReplanejamento);
    const contexto = exigirAcessoMapro_(entrada.idMapro);
    bloqueio.waitLock(10000);
    const aba = obterAbaMaproAtividades_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_ATIVIDADES);
    const linha = entrada.idAtividade
      ? buscarLinhaAtividadeMaproPorId_(aba, entrada.idAtividade)
      : 0;
    if (entrada.idAtividade && !linha) throw new Error('Atividade não encontrada.');
    const atual = linha
      ? lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPRO_ATIVIDADES)
      : null;
    if (atual && !idsIguaisMapro_(atual.ID_MAPRO, entrada.idMapro)) {
      throw new Error('A atividade não pertence a esta Mapro.');
    }
    if (atual) validarVersaoAtividadeMapro_(atual, entrada.version);
    if (!atual) {
      exigirEdicaoCompletaMapro_(contexto);
    } else if (!podeEditarAtividadeMapro_(contexto, atual)) {
      throw new Error('Você só pode editar atividades sob sua responsabilidade.');
    } else if (!contexto.podeEditarTudo &&
        !idsIguaisMapro_(atual.ID_RESPONSAVEL, entrada.idResponsavel)) {
      throw new Error('O observador não pode alterar o responsável da atividade.');
    } else if (!contexto.podeEditarTudo &&
        String(atual.ID_ATIVIDADE_PREDECESSORA || '') !== entrada.idAtividadePredecessora) {
      throw new Error('Somente editores podem alterar a atividade predecessora.');
    }
    validarPaiAtividadeMapro_(entrada, registros);
    validarPredecessoraAtividadeMapro_(entrada, registros);
    const dataInicioAnterior = atual ? dataIsoMapro_(atual.DATA_INICIO) : '';
    const dataFinalAnterior = atual ? dataIsoMapro_(atual.DATA_FINAL) : '';
    const acompanhamentoIniciado = Boolean(contexto.mapro.ACOMPANHAMENTO_INICIADO_EM);
    const houveReplanejamento = acompanhamentoIniciado && Boolean(atual) &&
      (dataInicioAnterior !== entrada.dataInicio || dataFinalAnterior !== entrada.dataFinal);
    if (houveReplanejamento && !confirmouReplanejamento) {
      throw new Error('Clique em SALVAR EDIÇÕES para confirmar o replanejamento.');
    }
    if (houveReplanejamento && (entrada.observacao.length < 5 ||
        entrada.observacao === String(atual.OBSERVACAO || '').trim())) {
      throw new Error('Preencha a observação com o motivo do replanejamento das datas.');
    }
    const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS);
    const responsavel = usuarios.find(function (usuario) {
      return idsIguaisMapro_(usuario.ID, entrada.idResponsavel) &&
        String(usuario.STATUS).toUpperCase() === 'ATIVO';
    });
    const responsavelRelacionado = responsavel && obterParticipantesAtivosMapro_(entrada.idMapro)
      .some(function (participante) {
        return idsIguaisMapro_(participante.id, responsavel.ID) &&
          ['LIDER', 'EDITOR', 'OBSERVADOR'].indexOf(participante.papel) !== -1;
      });
    if (entrada.tipo !== 'TOPICO' && !responsavel) {
      throw new Error('Selecione um responsável relacionado ao projeto.');
    }
    if (responsavel && !responsavelRelacionado) {
      throw new Error('Selecione um responsável relacionado ao projeto.');
    }
    const departamentoResponsavel = responsavel
      ? obterDepartamentoCadastradoMapro_(responsavel, obterBasesMapro_().departamentos)
      : '';
    const agora = new Date().toISOString();
    const idAtividade = atual ? String(atual.ID_ATIVIDADE) : Utilities.getUuid();
    const ordem = atual ? Number(atual.ORDEM) : obterProximaOrdemAtividadeMapro_(registros, entrada.idMapro);
    const deslocamentoPrazo = acompanhamentoIniciado && atual && dataFinalAnterior && entrada.dataFinal
      ? diferencaDiasMapro_(dataFinalAnterior, entrada.dataFinal) : 0;
    const diasReplanejados = Number(atual ? atual.DIAS_REPLANEJADOS || 0 : 0) + deslocamentoPrazo;
    const novaLinha = [
      idAtividade,
      formatarId_(Number(entrada.idMapro)),
      entrada.tipo === 'TOPICO' ? '' : entrada.idAtividadePai,
      ordem,
      entrada.tipo,
      protegerTextoPlanilha_(entrada.nomeAtividade),
      responsavel ? formatarId_(Number(responsavel.ID)) : '',
      responsavel ? protegerTextoPlanilha_(responsavel.NOME) : '',
      protegerTextoPlanilha_(departamentoResponsavel),
      entrada.dataInicio,
      entrada.dataFinal,
      entrada.status,
      protegerTextoPlanilha_(entrada.justificativa),
      protegerTextoPlanilha_(entrada.observacao),
      'SIM',
      atual ? String(atual.CRIADO_EM) : agora,
      agora,
      atual ? Number(atual.VERSION || 1) + 1 : 1,
      atual ? String(atual.EVIDENCIA_ID || '') : '',
      atual ? String(atual.EVIDENCIA_NOME || '') : '',
      atual ? String(atual.EVIDENCIA_TIPO || '') : '',
      atual ? String(atual.EVIDENCIA_URL || '') : '',
      atual ? normalizarEmail_(atual.EVIDENCIA_ENVIADA_POR) : '',
      entrada.tipo === 'TOPICO' ? '' : entrada.idAtividadePredecessora,
      diasReplanejados
    ];
    if (atual) {
      if (acompanhamentoIniciado) {
        registrarHistoricoDatasMapro_(atual, entrada, contexto.usuario.EMAIL);
      }
      aba.getRange(linha, 1, 1, CABECALHOS_MAPRO_ATIVIDADES.length).setValues([novaLinha]);
    } else {
      aba.appendRow(novaLinha);
    }
    const registroPersistido = {};
    CABECALHOS_MAPRO_ATIVIDADES.forEach(function (cabecalho, indice) {
      registroPersistido[cabecalho] = novaLinha[indice];
    });
    if (atual) {
      const indiceAtual = registros.findIndex(function (registro) {
        return String(registro.ID_ATIVIDADE) === idAtividade;
      });
      if (indiceAtual !== -1) registros[indiceAtual] = registroPersistido;
    } else {
      registros.push(registroPersistido);
    }
    const atividadesReplanejadas = atual && dataFinalAnterior && entrada.dataFinal
      ? propagarPrazoPredecessoraMapro_(
        registros,
        entrada.idMapro,
        idAtividade,
        diferencaDiasMapro_(dataFinalAnterior, entrada.dataFinal),
        acompanhamentoIniciado,
        contexto.usuario.EMAIL,
        agora
      ) : [];
    if (atividadesReplanejadas.length) {
      aba.getRange(2, 1, registros.length, CABECALHOS_MAPRO_ATIVIDADES.length).setValues(
        registros.map(function (registro) {
          return CABECALHOS_MAPRO_ATIVIDADES.map(function (cabecalho) {
            return registro[cabecalho] == null ? '' : registro[cabecalho];
          });
        })
      );
    }
    const resumoProjeto = atualizarResumoPersistidoMapro_(
      entrada.idMapro,
      contexto.usuario.EMAIL,
      registros
    );
    const atividadeCliente = {
      idAtividade: idAtividade,
      idMapro: formatarId_(Number(entrada.idMapro)),
      idAtividadePai: entrada.tipo === 'TOPICO' ? '' : entrada.idAtividadePai,
      idAtividadePredecessora: entrada.tipo === 'TOPICO' ? '' : entrada.idAtividadePredecessora,
      idAtividadePredecessoraRegistrada: entrada.tipo === 'TOPICO'
        ? '' : entrada.idAtividadePredecessora,
      ordem: ordem,
      tipo: entrada.tipo,
      nomeAtividade: entrada.nomeAtividade,
      idResponsavel: responsavel ? formatarId_(Number(responsavel.ID)) : '',
      responsavel: responsavel ? String(responsavel.NOME || '') : '',
      departamento: departamentoResponsavel,
      dataInicio: entrada.dataInicio,
      dataFinal: entrada.dataFinal,
      dataInicioRegistrada: entrada.dataInicio,
      dataFinalRegistrada: entrada.dataFinal,
      semanaInicio: calcularSemanaUtilMapro_(entrada.dataInicio),
      semanaFinal: calcularSemanaUtilMapro_(entrada.dataFinal),
      status: entrada.status,
      saude: calcularSaudeAtividadeMapro_({
        DATA_FINAL: entrada.dataFinal,
        STATUS_ATIVIDADE: entrada.status
      }),
      justificativa: entrada.justificativa,
      observacao: entrada.observacao,
      observacaoRegistrada: entrada.observacao,
      diasReplanejados: diasReplanejados,
      evidenciaId: atual ? String(atual.EVIDENCIA_ID || '') : '',
      evidenciaNome: atual ? String(atual.EVIDENCIA_NOME || '') : '',
      evidenciaTipo: atual ? String(atual.EVIDENCIA_TIPO || '') : '',
      evidenciaUrl: atual ? String(atual.EVIDENCIA_URL || '') : '',
      evidenciaEnviadaPor: atual ? normalizarEmail_(atual.EVIDENCIA_ENVIADA_POR) : '',
      version: atual ? Number(atual.VERSION || 1) + 1 : 1
    };
    if (bloqueio.hasLock()) bloqueio.releaseLock();
    if (acompanhamentoIniciado && atual && dataFinalAnterior !== entrada.dataFinal) {
      enviarEmailReplanejamentoAtividadeMapro_(
        contexto.mapro,
        atividadeCliente,
        dataFinalAnterior,
        entrada.dataFinal,
        registros
      );
    }
    return {
      sucesso: true,
      mensagem: atual ? 'Atividade atualizada automaticamente.' : 'Atividade adicionada com sucesso.',
      dados: {
        atividade: atividadeCliente,
        resumoProjeto: resumoProjeto,
        atividadesReplanejadas: atividadesReplanejadas
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/**
 * Persiste todas as linhas editadas em uma única transação lógica. Evita repetir, para
 * cada atividade, leituras completas da base e o recálculo do resumo da Mapro.
 */
function salvarEdicoesAtividadesMapro(dados) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const pacote = dados || {};
    const idMapro = String(pacote.idMapro || '').trim();
    const recebidas = Array.isArray(pacote.edicoes) ? pacote.edicoes : [];
    if (!/^\d+$/.test(idMapro)) throw new Error('ID da Mapro inválido.');
    if (!recebidas.length) throw new Error('Não há edições para salvar.');
    if (recebidas.length > 200) {
      throw new Error('Salve no máximo 200 atividades por vez.');
    }
    const contexto = exigirAcessoMapro_(idMapro);
    bloqueio.waitLock(10000);

    const aba = obterAbaMaproAtividades_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_ATIVIDADES);
    const quantidadeRegistrosOriginais = registros.length;
    const assinaturasOriginais = registros.map(assinarRegistroAtividadeMapro_);
    const idsNovosPorCliente = {};
    recebidas.forEach(function (dadosAtividade) {
      const idServidor = String(dadosAtividade.idAtividade || '').trim();
      const idCliente = String(dadosAtividade.idAtividadeCliente || idServidor).trim();
      if (!idServidor) idsNovosPorCliente[idCliente] = Utilities.getUuid();
    });
    const pesoTipo = { TOPICO: 0, ATIVIDADE: 1, SUBATIVIDADE: 2 };
    const ordenadas = recebidas.slice().sort(function (a, b) {
      return Number(pesoTipo[String(a.tipo || '').toUpperCase()] || 0) -
        Number(pesoTipo[String(b.tipo || '').toUpperCase()] || 0);
    });
    const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS);
    const usuariosPorId = {};
    usuarios.forEach(function (usuario) {
      if (String(usuario.STATUS || '').toUpperCase() === 'ATIVO') {
        usuariosPorId[String(Number(usuario.ID))] = usuario;
      }
    });
    const responsaveisPermitidos = {};
    contexto.participantes.forEach(function (participante) {
      if (['LIDER', 'EDITOR', 'OBSERVADOR'].indexOf(participante.papel) !== -1) {
        responsaveisPermitidos[String(Number(participante.id))] = true;
      }
    });
    const departamentos = lerValoresBaseMapro_(
      obterPlanilha_().getSheetByName(CONFIG.abaBaseDepartamentos), 'DEPARTAMENTO'
    );
    const agora = new Date().toISOString();
    const acompanhamentoIniciado = Boolean(contexto.mapro.ACOMPANHAMENTO_INICIADO_EM);
    const historicos = [];
    const alteracoesPrazo = [];
    const idsClientePorServidor = {};
    let maiorOrdem = registros.reduce(function (maior, atividade) {
      return Math.max(maior, Number(atividade.ORDEM || 0));
    }, 0);

    ordenadas.forEach(function (dadosAtividade) {
      const idRecebido = String(dadosAtividade.idAtividade || '').trim();
      const idCliente = String(dadosAtividade.idAtividadeCliente || idRecebido).trim();
      const idAtividade = idRecebido || idsNovosPorCliente[idCliente];
      const dadosNormalizados = Object.assign({}, dadosAtividade, {
        idAtividade: idAtividade,
        idMapro: idMapro,
        idAtividadePai: idsNovosPorCliente[String(dadosAtividade.idAtividadePai || '')] ||
          String(dadosAtividade.idAtividadePai || ''),
        idAtividadePredecessora:
          idsNovosPorCliente[String(dadosAtividade.idAtividadePredecessora || '')] ||
          String(dadosAtividade.idAtividadePredecessora || '')
      });
      const entrada = validarAtividadeMapro_(dadosNormalizados);
      const indiceAtual = registros.findIndex(function (atividade) {
        return String(atividade.ID_ATIVIDADE) === idAtividade;
      });
      const atual = indiceAtual === -1 ? null : registros[indiceAtual];
      if (atual && !idsIguaisMapro_(atual.ID_MAPRO, idMapro)) {
        throw new Error('Uma das atividades não pertence a esta Mapro.');
      }
      if (atual) validarVersaoAtividadeMapro_(atual, entrada.version);
      if (!atual) {
        exigirEdicaoCompletaMapro_(contexto);
      } else if (!podeEditarAtividadeMapro_(contexto, atual)) {
        throw new Error('Você só pode editar atividades sob sua responsabilidade.');
      } else if (!contexto.podeEditarTudo &&
          !idsIguaisMapro_(atual.ID_RESPONSAVEL, entrada.idResponsavel)) {
        throw new Error('O observador não pode alterar o responsável da atividade.');
      } else if (!contexto.podeEditarTudo &&
          String(atual.ID_ATIVIDADE_PREDECESSORA || '') !== entrada.idAtividadePredecessora) {
        throw new Error('Somente editores podem alterar a atividade predecessora.');
      }
      validarPaiAtividadeMapro_(entrada, registros);
      validarPredecessoraAtividadeMapro_(entrada, registros);

      const inicioAnterior = atual ? dataIsoMapro_(atual.DATA_INICIO) : '';
      const finalAnterior = atual ? dataIsoMapro_(atual.DATA_FINAL) : '';
      const houveReplanejamento = acompanhamentoIniciado && Boolean(atual) &&
        (inicioAnterior !== entrada.dataInicio || finalAnterior !== entrada.dataFinal);
      if (houveReplanejamento && !Boolean(dadosAtividade.confirmarReplanejamento)) {
        throw new Error('Clique em SALVAR EDIÇÕES para confirmar o replanejamento.');
      }
      if (houveReplanejamento && (entrada.observacao.length < 5 ||
          entrada.observacao === String(atual.OBSERVACAO || '').trim())) {
        throw new Error('Preencha a observação com o motivo do replanejamento das datas.');
      }

      const responsavel = usuariosPorId[String(Number(entrada.idResponsavel))] || null;
      if (entrada.tipo !== 'TOPICO' &&
          (!responsavel || !responsaveisPermitidos[String(Number(responsavel.ID))])) {
        throw new Error('Selecione um responsável relacionado ao projeto.');
      }
      if (responsavel && !responsaveisPermitidos[String(Number(responsavel.ID))]) {
        throw new Error('Selecione um responsável relacionado ao projeto.');
      }
      const departamentoResponsavel = responsavel
        ? obterDepartamentoCadastradoMapro_(responsavel, departamentos) : '';
      const deslocamentoDireto = acompanhamentoIniciado && atual && finalAnterior && entrada.dataFinal
        ? diferencaDiasMapro_(finalAnterior, entrada.dataFinal) : 0;
      const registro = {};
      CABECALHOS_MAPRO_ATIVIDADES.forEach(function (cabecalho) {
        registro[cabecalho] = atual && atual[cabecalho] != null ? atual[cabecalho] : '';
      });
      registro.ID_ATIVIDADE = idAtividade;
      registro.ID_MAPRO = formatarId_(Number(idMapro));
      registro.ID_ATIVIDADE_PAI = entrada.tipo === 'TOPICO' ? '' : entrada.idAtividadePai;
      registro.ORDEM = atual ? Number(atual.ORDEM) : ++maiorOrdem;
      registro.TIPO = entrada.tipo;
      registro.NOME_ATIVIDADE = protegerTextoPlanilha_(entrada.nomeAtividade);
      registro.ID_RESPONSAVEL = responsavel ? formatarId_(Number(responsavel.ID)) : '';
      registro.NOME_RESPONSAVEL = responsavel ? protegerTextoPlanilha_(responsavel.NOME) : '';
      registro.DEPARTAMENTO = protegerTextoPlanilha_(departamentoResponsavel);
      registro.DATA_INICIO = entrada.dataInicio;
      registro.DATA_FINAL = entrada.dataFinal;
      registro.STATUS_ATIVIDADE = entrada.status;
      registro.JUSTIFICATIVA = protegerTextoPlanilha_(entrada.justificativa);
      registro.OBSERVACAO = protegerTextoPlanilha_(entrada.observacao);
      registro.ATIVO = 'SIM';
      registro.CRIADO_EM = atual ? String(atual.CRIADO_EM || agora) : agora;
      registro.ATUALIZADO_EM = agora;
      registro.VERSION = atual ? Number(atual.VERSION || 1) + 1 : 1;
      registro.ID_ATIVIDADE_PREDECESSORA = entrada.tipo === 'TOPICO'
        ? '' : entrada.idAtividadePredecessora;
      registro.DIAS_REPLANEJADOS = Number(atual ? atual.DIAS_REPLANEJADOS || 0 : 0) +
        deslocamentoDireto;
      if (indiceAtual === -1) registros.push(registro);
      else registros[indiceAtual] = registro;

      if (acompanhamentoIniciado && atual) {
        Array.prototype.push.apply(
          historicos, criarLinhasHistoricoDatasMapro_(atual, entrada, contexto.usuario.EMAIL, agora)
        );
      }
      if (atual && finalAnterior && entrada.dataFinal && finalAnterior !== entrada.dataFinal) {
        alteracoesPrazo.push({
          idAtividade: idAtividade,
          anterior: finalAnterior,
          novo: entrada.dataFinal,
          deslocamento: diferencaDiasMapro_(finalAnterior, entrada.dataFinal)
        });
      }
      idsClientePorServidor[idAtividade] = idCliente || idAtividade;
    });

    alteracoesPrazo.forEach(function (alteracao) {
      propagarPrazoPredecessoraMapro_(
        registros, idMapro, alteracao.idAtividade, alteracao.deslocamento,
        acompanhamentoIniciado, contexto.usuario.EMAIL, agora, historicos
      );
    });

    const registrosDaMapro = registros.filter(function (atividade) {
      return idsIguaisMapro_(atividade.ID_MAPRO, idMapro) &&
        String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    });
    agregarTopicosMapro_(registrosDaMapro);
    persistirAtividadesAlteradasMapro_(
      aba, registros, quantidadeRegistrosOriginais, assinaturasOriginais
    );
    if (historicos.length) {
      const abaHistorico = obterAbaMaproHistoricoDatas_();
      abaHistorico.getRange(
        abaHistorico.getLastRow() + 1, 1, historicos.length, historicos[0].length
      ).setValues(historicos);
    }
    const resumoProjeto = atualizarResumoPersistidoMapro_(
      idMapro, contexto.usuario.EMAIL, registros,
      { atividadesJaAgregadas: true, persistirAtividades: false }
    );
    const atividadesCliente = registrosDaMapro.map(function (atividade) {
      const mapeada = mapearAtividadeMaproParaCliente_(atividade);
      mapeada.idAtividadeCliente = idsClientePorServidor[mapeada.idAtividade] || mapeada.idAtividade;
      return mapeada;
    }).sort(function (a, b) { return Number(a.ordem) - Number(b.ordem); });
    const porIdCliente = {};
    atividadesCliente.forEach(function (atividade) {
      porIdCliente[String(atividade.idAtividade)] = atividade;
    });

    if (bloqueio.hasLock()) bloqueio.releaseLock();
    if (acompanhamentoIniciado) {
      alteracoesPrazo.forEach(function (alteracao) {
        const atividade = porIdCliente[alteracao.idAtividade];
        if (!atividade) return;
        enviarEmailReplanejamentoAtividadeMapro_(
          contexto.mapro, atividade, alteracao.anterior, atividade.dataFinal, registros
        );
      });
    }
    return {
      sucesso: true,
      mensagem: recebidas.length === 1
        ? 'Edição salva com sucesso.' : recebidas.length + ' edições salvas com sucesso.',
      dados: { atividades: atividadesCliente, resumoProjeto: resumoProjeto }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function anexarEvidenciaAtividadeMapro(dados) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const entrada = dados || {};
    const idMapro = String(entrada.idMapro || '').trim();
    const idAtividade = String(entrada.idAtividade || '').trim();
    const contexto = exigirAcessoMapro_(idMapro);
    if (!idAtividade) throw new Error('Salve a atividade antes de anexar uma evidência.');
    const nomeOriginal = String(entrada.nome || '').trim();
    if (!nomeOriginal) throw new Error('O arquivo precisa possuir um nome válido.');
    const tipo = String(entrada.tipo || 'application/octet-stream').trim().slice(0, 150);
    const extensaoEncontrada = nomeOriginal.match(/(\.[A-Za-z0-9]{1,10})$/);
    const extensao = extensaoEncontrada ? extensaoEncontrada[1].toLowerCase() : '';
    validarArquivoEvidenciaMapro_(extensao, tipo);
    const conteudoBase64 = String(entrada.conteudoBase64 || '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(conteudoBase64)) {
      throw new Error('O conteúdo do arquivo é inválido.');
    }
    const bytes = Utilities.base64Decode(conteudoBase64);
    if (!bytes.length) throw new Error('O arquivo está vazio.');
    if (bytes.length > 20 * 1024 * 1024) {
      throw new Error('A evidência deve possuir no máximo 20 MB.');
    }
    bloqueio.waitLock(10000);
    const aba = obterAbaMaproAtividades_();
    const linha = buscarLinhaAtividadeMaproPorId_(aba, idAtividade);
    if (!linha) throw new Error('Atividade não encontrada.');
    const atual = lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPRO_ATIVIDADES);
    if (!idsIguaisMapro_(atual.ID_MAPRO, idMapro)) {
      throw new Error('A atividade não pertence a esta Mapro.');
    }
    // O acesso à Mapro já foi validado por exigirAcessoMapro_. A evidência possui
    // permissão própria e não concede autorização para editar os demais campos.
    const possuiEvidencia = Boolean(String(atual.EVIDENCIA_ID || atual.EVIDENCIA_URL || '').trim());
    const autorEvidencia = normalizarEmail_(atual.EVIDENCIA_ENVIADA_POR);
    const emailUsuario = normalizarEmail_(contexto.usuario.EMAIL);
    if (possuiEvidencia && !contexto.admin && autorEvidencia !== emailUsuario) {
      throw new Error('Somente o usuário que enviou a evidência ou o ADMIN pode substituí-la.');
    }
    validarVersaoAtividadeMapro_(atual, Number(entrada.version || 0));
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_ATIVIDADES);
    const numeroAtividade = calcularNumeracaoAtividadeMapro_(registros, idAtividade) || 'sem-numero';
    const nomePadrao = [
      formatarId_(Number(contexto.mapro.ID_MAPRO)),
      normalizarNomeProjeto_(contexto.mapro.NOME_PROJETO),
      numeroAtividade
    ].join(' - ');
    const nomeSeguro = (nomePadrao + extensao)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .slice(0, 180);
    const pasta = obterPastaEvidenciasMapro_();
    const arquivo = pasta.createFile(Utilities.newBlob(bytes, tipo, nomeSeguro));
    const agora = new Date().toISOString();
    const alteracoes = {
      EVIDENCIA_ID: arquivo.getId(),
      EVIDENCIA_NOME: protegerTextoPlanilha_(nomeSeguro),
      EVIDENCIA_TIPO: protegerTextoPlanilha_(tipo),
      EVIDENCIA_URL: protegerTextoPlanilha_(arquivo.getUrl()),
      EVIDENCIA_ENVIADA_POR: emailUsuario,
      ATUALIZADO_EM: agora,
      VERSION: Number(atual.VERSION || 1) + 1
    };
    const linhaAtualizada = CABECALHOS_MAPRO_ATIVIDADES.map(function (cabecalho) {
      return Object.prototype.hasOwnProperty.call(alteracoes, cabecalho)
        ? alteracoes[cabecalho]
        : atual[cabecalho];
    });
    aba.getRange(linha, 1, 1, CABECALHOS_MAPRO_ATIVIDADES.length).setValues([linhaAtualizada]);
    console.info(JSON.stringify({
      acao: 'EVIDENCIA_ATIVIDADE_ANEXADA',
      maproId: idMapro,
      atividadeId: idAtividade,
      realizadoPor: contexto.usuario.EMAIL
    }));
    return {
      sucesso: true,
      mensagem: 'Evidência anexada com sucesso.',
      dados: {
        evidenciaId: arquivo.getId(),
        evidenciaNome: nomeSeguro,
        evidenciaTipo: tipo,
        evidenciaUrl: arquivo.getUrl(),
        evidenciaEnviadaPor: emailUsuario,
        version: alteracoes.VERSION
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/** Bloqueia conteúdo ativo/executável e mantém os formatos corporativos usuais. */
function validarArquivoEvidenciaMapro_(extensao, tipo) {
  const extensoesPermitidas = [
    '.png', '.jpg', '.jpeg', '.webp', '.pdf', '.doc', '.docx',
    '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.txt'
  ];
  const tiposPermitidos = [
    'image/png', 'image/jpeg', 'image/webp', 'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv', 'text/plain', 'application/octet-stream'
  ];
  if (extensoesPermitidas.indexOf(String(extensao || '').toLowerCase()) === -1 ||
      tiposPermitidos.indexOf(String(tipo || '').toLowerCase()) === -1) {
    throw new Error(
      'Formato de evidência não permitido. Use imagem, PDF, Word, Excel, PowerPoint, CSV ou TXT.'
    );
  }
}

function obterPastaEvidenciasMapro_() {
  const propriedades = PropertiesService.getScriptProperties();
  const chave = CONFIG.propriedadePastaEvidencias;
  const idConfigurado = String(propriedades.getProperty(chave) || CONFIG.pastaEvidenciasId || '').trim();
  if (!idConfigurado) {
    throw new Error('A pasta de evidências não foi configurada.');
  }
  try {
    const pasta = DriveApp.getFolderById(idConfigurado);
    pasta.getName();
    propriedades.setProperty(chave, idConfigurado);
    return pasta;
  } catch (erro) {
    const contaExecutora = normalizarEmail_(Session.getEffectiveUser().getEmail());
    console.error(JSON.stringify({
      acao: 'PASTA_EVIDENCIAS_INACESSIVEL',
      pastaId: idConfigurado,
      contaExecutora: contaExecutora || 'NAO_IDENTIFICADA',
      erro: erro && erro.message ? String(erro.message).slice(0, 300) : 'ERRO_DESCONHECIDO'
    }));
    throw new Error(
      'Não foi possível acessar a pasta de evidências. Conceda permissão de Editor à conta que executa o sistema' +
      (contaExecutora ? ': ' + contaExecutora + '.' : '.')
    );
  }
}

/** Retorna a pasta configurada exclusivamente para as fotos dos líderes. */
function obterPastaFotosLideresMapro_() {
  const propriedades = PropertiesService.getScriptProperties();
  const chave = CONFIG.propriedadePastaFotosLideres;
  const idConfigurado = String(
    propriedades.getProperty(chave) || CONFIG.pastaFotosLideresId || ''
  ).trim();
  if (!idConfigurado) {
    throw new Error('A pasta de fotos dos líderes não foi configurada.');
  }
  try {
    const pasta = DriveApp.getFolderById(idConfigurado);
    pasta.getName();
    propriedades.setProperty(chave, idConfigurado);
    return pasta;
  } catch (erro) {
    const contaExecutora = normalizarEmail_(Session.getEffectiveUser().getEmail());
    console.error(JSON.stringify({
      acao: 'PASTA_FOTOS_LIDERES_INACESSIVEL',
      pastaId: idConfigurado,
      contaExecutora: contaExecutora || 'NAO_IDENTIFICADA',
      erro: erro && erro.message ? String(erro.message).slice(0, 300) : 'ERRO_DESCONHECIDO'
    }));
    throw new Error(
      'Não foi possível acessar a pasta de fotos dos líderes. Verifique o acesso da conta que executa o sistema' +
      (contaExecutora ? ': ' + contaExecutora + '.' : '.')
    );
  }
}

/**
 * Função pública para autorizar e testar o acesso do Apps Script à pasta.
 * Execute manualmente pelo seletor de funções usando a conta SGI.
 */
function autorizarAcessoPastaFotosLideres() {
  exigirAdministradorConfiguracao_();
  const pasta = obterPastaFotosLideresMapro_();
  return 'Acesso autorizado à pasta de fotos dos líderes: ' + pasta.getName();
}

function excluirAtividadeMapro(idMapro, idAtividade, version) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    exigirEdicaoCompletaMapro_(contexto);
    bloqueio.waitLock(10000);
    const aba = obterAbaMaproAtividades_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_ATIVIDADES);
    const alvo = registros.find(function (atividade) {
      return String(atividade.ID_ATIVIDADE) === String(idAtividade) &&
        idsIguaisMapro_(atividade.ID_MAPRO, idMapro);
    });
    if (!alvo) throw new Error('Atividade não encontrada.');
    validarVersaoAtividadeMapro_(alvo, Number(version || 0));
    const idsExcluidos = {};
    const incluirDescendentes = function (idPai) {
      idsExcluidos[String(idPai)] = true;
      registros.forEach(function (atividade) {
        if (String(atividade.ID_ATIVIDADE_PAI || '') === String(idPai)) {
          incluirDescendentes(atividade.ID_ATIVIDADE);
        }
      });
    };
    incluirDescendentes(idAtividade);
    const dependenteExterno = registros.find(function (atividade) {
      return !idsExcluidos[String(atividade.ID_ATIVIDADE)] &&
        idsExcluidos[String(atividade.ID_ATIVIDADE_PREDECESSORA || '')] &&
        String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    });
    if (dependenteExterno) {
      throw new Error(
        'Remova a predecessora das atividades dependentes antes de excluir este item.'
      );
    }
    const agora = new Date().toISOString();
    const ativos = [];
    const atualizados = [];
    registros.forEach(function (atividade) {
      const excluir = Boolean(idsExcluidos[String(atividade.ID_ATIVIDADE)]);
      ativos.push([excluir ? 'NAO' : String(atividade.ATIVO || 'SIM')]);
      atualizados.push([excluir ? agora : atividade.ATUALIZADO_EM]);
    });
    if (registros.length) {
      aba.getRange(2, 15, registros.length, 1).setValues(ativos);
      aba.getRange(2, 17, registros.length, 1).setValues(atualizados);
    }
    const resumo = atualizarResumoPersistidoMapro_(idMapro, contexto.usuario.EMAIL);
    console.info(JSON.stringify({
      acao: 'ATIVIDADE_MAPRO_EXCLUIDA',
      maproId: String(idMapro),
      atividadeId: String(idAtividade),
      quantidade: Object.keys(idsExcluidos).length,
      realizadoPor: contexto.usuario.EMAIL
    }));
    return {
      sucesso: true,
      mensagem: Object.keys(idsExcluidos).length > 1
        ? 'Tópico e itens internos excluídos com sucesso.'
        : 'Item excluído com sucesso.',
      dados: { resumoProjeto: resumo, idsExcluidos: Object.keys(idsExcluidos) }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function restaurarAtividadesMapro(idMapro, idsAtividades) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    exigirEdicaoCompletaMapro_(contexto);
    const ids = {};
    (Array.isArray(idsAtividades) ? idsAtividades : []).forEach(function (id) {
      ids[String(id || '').trim()] = true;
    });
    if (!Object.keys(ids).length) throw new Error('Não há alteração disponível para desfazer.');
    bloqueio.waitLock(10000);
    const aba = obterAbaMaproAtividades_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_ATIVIDADES);
    let restauradas = 0;
    const agora = new Date().toISOString();
    registros.forEach(function (atividade) {
      if (!ids[String(atividade.ID_ATIVIDADE)] || !idsIguaisMapro_(atividade.ID_MAPRO, idMapro)) return;
      atividade.ATIVO = 'SIM';
      atividade.ATUALIZADO_EM = agora;
      atividade.VERSION = Number(atividade.VERSION || 1) + 1;
      restauradas += 1;
    });
    if (!restauradas) throw new Error('Os itens excluídos não foram encontrados.');
    aba.getRange(2, 1, registros.length, CABECALHOS_MAPRO_ATIVIDADES.length).setValues(
      registros.map(function (atividade) {
        return CABECALHOS_MAPRO_ATIVIDADES.map(function (cabecalho) { return atividade[cabecalho]; });
      })
    );
    atualizarResumoPersistidoMapro_(idMapro, contexto.usuario.EMAIL);
    console.info(JSON.stringify({
      acao: 'EXCLUSAO_ATIVIDADE_MAPRO_DESFEITA', maproId: String(idMapro),
      quantidade: restauradas, realizadoPor: contexto.usuario.EMAIL
    }));
    return { sucesso: true, mensagem: 'Exclusão desfeita com sucesso.' };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function moverAtividadeMapro(idMapro, idAtividade, idDestino, version) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    exigirEdicaoCompletaMapro_(contexto);
    bloqueio.waitLock(10000);
    const aba = obterAbaMaproAtividades_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_ATIVIDADES);
    const atual = registros.find(function (atividade) {
      return String(atividade.ID_ATIVIDADE) === String(idAtividade) &&
        idsIguaisMapro_(atividade.ID_MAPRO, idMapro) &&
        String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    });
    if (!atual) throw new Error('Atividade não encontrada.');
    validarVersaoAtividadeMapro_(atual, Number(version || 0));
    const destino = registros.find(function (atividade) {
      return String(atividade.ID_ATIVIDADE) === String(idDestino) &&
        idsIguaisMapro_(atividade.ID_MAPRO, idMapro) &&
        String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    });
    if (!destino) throw new Error('O destino selecionado não existe mais.');
    const tipoAtual = String(atual.TIPO || '').toUpperCase();
    const tipoDestino = String(destino.TIPO || '').toUpperCase();
    if (tipoAtual === 'TOPICO' && tipoDestino !== 'TOPICO') {
      throw new Error('Um tópico só pode ser reposicionado em relação a outro tópico.');
    }
    const novoPai = tipoAtual === 'TOPICO'
      ? ''
      : tipoAtual === 'ATIVIDADE'
      ? (tipoDestino === 'TOPICO' ? String(destino.ID_ATIVIDADE) : String(destino.ID_ATIVIDADE_PAI || ''))
      : (tipoDestino === 'ATIVIDADE' ? String(destino.ID_ATIVIDADE) : String(destino.ID_ATIVIDADE_PAI || ''));
    validarPaiAtividadeMapro_({
      idMapro: String(idMapro),
      idAtividade: String(idAtividade),
      idAtividadePai: novoPai,
      tipo: String(atual.TIPO || '').toUpperCase()
    }, registros);
    const irParaDentro = (tipoAtual === 'ATIVIDADE' && tipoDestino === 'TOPICO') ||
      (tipoAtual === 'SUBATIVIDADE' && tipoDestino === 'ATIVIDADE');
    const irmas = registros.filter(function (item) {
      return idsIguaisMapro_(item.ID_MAPRO, idMapro) &&
        String(item.ID_ATIVIDADE_PAI || '') === novoPai &&
        String(item.ID_ATIVIDADE) !== String(idAtividade) &&
        String(item.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    }).sort(function (a, b) { return Number(a.ORDEM || 0) - Number(b.ORDEM || 0); });
    let novaOrdem;
    if (irParaDentro) {
      novaOrdem = irmas.length ? Number(irmas[irmas.length - 1].ORDEM || 0) + 1 : Number(destino.ORDEM || 0) + 0.1;
    } else {
      const indiceDestino = irmas.findIndex(function (item) {
        return String(item.ID_ATIVIDADE) === String(destino.ID_ATIVIDADE);
      });
      const proxima = indiceDestino >= 0 ? irmas[indiceDestino + 1] : null;
      novaOrdem = proxima
        ? (Number(destino.ORDEM || 0) + Number(proxima.ORDEM || 0)) / 2
        : Number(destino.ORDEM || 0) + 1;
    }
    const atualizado = Object.assign({}, atual, {
      ID_ATIVIDADE_PAI: novoPai,
      ORDEM: novaOrdem,
      ATUALIZADO_EM: new Date().toISOString(),
      VERSION: Number(atual.VERSION || 1) + 1
    });
    const linha = buscarLinhaAtividadeMaproPorId_(aba, idAtividade);
    aba.getRange(linha, 1, 1, CABECALHOS_MAPRO_ATIVIDADES.length).setValues([[
      ...CABECALHOS_MAPRO_ATIVIDADES.map(function (cabecalho) { return atualizado[cabecalho]; })
    ]]);
    const registrosAtualizados = registros.map(function (atividade) {
      return String(atividade.ID_ATIVIDADE) === String(idAtividade) ? atualizado : atividade;
    });
    const resumo = atualizarResumoPersistidoMapro_(
      idMapro,
      contexto.usuario.EMAIL,
      registrosAtualizados
    );
    console.info(JSON.stringify({
      acao: 'ATIVIDADE_MAPRO_MOVIDA',
      maproId: String(idMapro),
      atividadeId: String(idAtividade),
      novoPaiId: novoPai,
      realizadoPor: contexto.usuario.EMAIL
    }));
    return {
      sucesso: true,
      mensagem: tipoAtual === 'TOPICO'
        ? 'Tópico e itens internos movidos com sucesso.'
        : 'Atividade movida com sucesso.',
      dados: {
        atividade: mapearAtividadeMaproParaCliente_(atualizado),
        resumoProjeto: resumo
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function listarHistoricoReprogramacaoMapro(idMapro, idAtividade) {
  try {
    garantirBancoConfigurado_();
    exigirAcessoMapro_(idMapro);
    const atividadeExiste = lerRegistros_(
      obterAbaMaproAtividades_(),
      CABECALHOS_MAPRO_ATIVIDADES
    ).some(function (atividade) {
      return String(atividade.ID_ATIVIDADE) === String(idAtividade) &&
        idsIguaisMapro_(atividade.ID_MAPRO, idMapro);
    });
    if (!atividadeExiste) throw new Error('Atividade não encontrada.');
    const historico = lerRegistros_(
      obterAbaMaproHistoricoDatas_(),
      CABECALHOS_MAPRO_HISTORICO_DATAS
    ).filter(function (item) {
      return idsIguaisMapro_(item.ID_MAPRO, idMapro) &&
        String(item.ID_ATIVIDADE) === String(idAtividade);
    }).map(function (item) {
      return {
        campo: String(item.CAMPO || '') === 'DATA_INICIO' ? 'Data de início' : 'Data final',
        valorAnterior: dataIsoMapro_(item.VALOR_ANTERIOR),
        valorNovo: dataIsoMapro_(item.VALOR_NOVO),
        alteradoEm: item.ALTERADO_EM instanceof Date
          ? item.ALTERADO_EM.toISOString()
          : String(item.ALTERADO_EM || ''),
        alteradoPor: normalizarEmail_(item.ALTERADO_POR)
      };
    }).sort(function (a, b) {
      return String(b.alteradoEm).localeCompare(String(a.alteradoEm));
    });
    return { sucesso: true, dados: historico };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function listarHistoricoPrazoProjetoMapro(idMapro) {
  try {
    garantirBancoConfigurado_();
    exigirAcessoMapro_(idMapro);
    const historico = lerRegistros_(
      obterAbaMaproHistoricoPrazo_(),
      CABECALHOS_MAPRO_HISTORICO_PRAZO
    ).filter(function (item) {
      return idsIguaisMapro_(item.ID_MAPRO, idMapro);
    }).map(function (item) {
      return {
        prazoAnterior: dataIsoMapro_(item.PRAZO_ANTERIOR),
        prazoNovo: dataIsoMapro_(item.PRAZO_NOVO),
        alteradoEm: item.ALTERADO_EM instanceof Date
          ? item.ALTERADO_EM.toISOString()
          : String(item.ALTERADO_EM || ''),
        alteradoPor: normalizarEmail_(item.ALTERADO_POR)
      };
    }).sort(function (a, b) {
      return String(b.alteradoEm).localeCompare(String(a.alteradoEm));
    });
    return { sucesso: true, dados: historico };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

/** Converte o espelho visual já preenchido no navegador em um PDF para download. */
function gerarPdfProjetoMapro(idMapro, htmlProjeto) {
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    let conteudo = String(htmlProjeto || '').trim();
    if (!conteudo) throw new Error('Não foi possível preparar o conteúdo do projeto.');
    if (conteudo.length > 2500000) {
      throw new Error('O projeto é muito extenso para gerar o PDF em uma única operação.');
    }
    conteudo = conteudo
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<(?:iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed)>/gi, '')
      .replace(/<(?:iframe|object|embed|link|meta)\b[^>]*\/?\s*>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
      .replace(/javascript\s*:/gi, '');
    const estilos = HtmlService.createHtmlOutputFromFile('Styles').getContent() +
      HtmlService.createHtmlOutputFromFile('maprosCSS').getContent();
    const documento = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
      estilos + '</head><body class="imprimindo-projeto-mapro">' + conteudo + '</body></html>';
    const nomeArquivo = ('MAPRO-' + formatarId_(Number(contexto.mapro.ID_MAPRO)) + '-' +
      normalizarNomeProjeto_(contexto.mapro.NOME_PROJETO))
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .slice(0, 170) + '.pdf';
    const pdf = HtmlService.createHtmlOutput(documento).getAs(MimeType.PDF);
    if (!pdf) throw new Error('O serviço do Google não retornou o arquivo PDF.');
    pdf.setName(nomeArquivo);
    return {
      sucesso: true,
      mensagem: 'PDF gerado com sucesso.',
      dados: {
        nome: nomeArquivo,
        tipo: MimeType.PDF,
        conteudoBase64: Utilities.base64Encode(pdf.getBytes())
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function adicionarParticipantesMapro(idMapro, participantesInformados) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    const lider = normalizarEmail_(contexto.mapro['EMAIL_LÍDER']) ===
      normalizarEmail_(contexto.usuario.EMAIL);
    if (!contexto.admin && !lider) {
      throw new Error('Somente o líder do projeto ou o ADMIN pode adicionar participantes.');
    }
    const entradas = Array.isArray(participantesInformados) ? participantesInformados : [];
    const porId = {};
    entradas.forEach(function (entrada) {
      const objeto = typeof entrada === 'object' && entrada !== null
        ? entrada
        : { id: entrada, papel: 'OBSERVADOR' };
      const id = String(objeto.id || '').trim();
      const papel = String(objeto.papel || '').trim().toUpperCase();
      if (!id || ['ACESSO', 'EDITOR', 'OBSERVADOR'].indexOf(papel) === -1) {
        throw new Error('Informe um participante e uma permissão válida.');
      }
      porId[id] = { id: id, papel: papel };
    });
    const entradasUnicas = Object.keys(porId).map(function (id) { return porId[id]; });
    if (!entradasUnicas.length) throw new Error('Selecione ao menos um participante.');
    bloqueio.waitLock(10000);
    const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS);
    const selecionados = entradasUnicas.map(function (entrada) {
      const usuario = usuarios.find(function (item) {
        return idsIguaisMapro_(item.ID, entrada.id) && String(item.STATUS).toUpperCase() === 'ATIVO';
      });
      if (!usuario) throw new Error('Um dos participantes selecionados não é válido.');
      return { usuario: usuario, papel: entrada.papel };
    });
    const aba = obterAbaMaproParticipantes_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_PARTICIPANTES);
    const existentes = {};
    registros.forEach(function (item, indice) {
      existentes[chaveParticipanteMapro_(item.ID_MAPRO, item.EMAIL)] = { item: item, indice: indice };
    });
    const agora = new Date().toISOString();
    const novas = [];
    const selecionadosAlterados = [];
    let atualizados = 0;
    selecionados.forEach(function (selecionado) {
      const usuario = selecionado.usuario;
      const chave = chaveParticipanteMapro_(idMapro, usuario.EMAIL);
      const existente = existentes[chave];
      if (existente) {
        if (String(existente.item.PAPEL || '').toUpperCase() === 'LIDER') {
          throw new Error('O líder do projeto não pode ter sua permissão substituída.');
        }
        const mudouVinculo = String(existente.item.PAPEL || '').toUpperCase() !== selecionado.papel ||
          String(existente.item.ATIVO || 'SIM').toUpperCase() === 'NAO';
        if (!mudouVinculo) return;
        existente.item.PAPEL = selecionado.papel;
        existente.item.ATIVO = 'SIM';
        existente.item.ADICIONADO_EM = agora;
        existente.item.ADICIONADO_POR = normalizarEmail_(contexto.usuario.EMAIL);
        selecionadosAlterados.push(selecionado);
        atualizados += 1;
        return;
      }
      novas.push([
        Utilities.getUuid(), formatarId_(Number(idMapro)), formatarId_(Number(usuario.ID)),
        protegerTextoPlanilha_(usuario.NOME), normalizarEmail_(usuario.EMAIL),
        selecionado.papel, 'SIM', agora, normalizarEmail_(contexto.usuario.EMAIL)
      ]);
      selecionadosAlterados.push(selecionado);
    });
    if (atualizados && registros.length) {
      aba.getRange(2, 1, registros.length, CABECALHOS_MAPRO_PARTICIPANTES.length)
        .setValues(registros.map(function (item) {
          return CABECALHOS_MAPRO_PARTICIPANTES.map(function (cabecalho) { return item[cabecalho]; });
        }));
    }
    if (novas.length) {
      aba.getRange(aba.getLastRow() + 1, 1, novas.length, novas[0].length).setValues(novas);
    }
    if (novas.length || atualizados) atualizarParticipantesLegadosMapro_(idMapro);
    console.info(JSON.stringify({
      acao: 'PARTICIPANTES_MAPRO_RELACIONADOS',
      maproId: String(idMapro),
      quantidade: novas.length + atualizados,
      realizadoPor: contexto.usuario.EMAIL
    }));
    if (bloqueio.hasLock()) bloqueio.releaseLock();
    const resultadoEmails = enviarEmailsParticipantesRelacionadosMapro_(
      contexto.mapro,
      selecionadosAlterados
    );
    const totalAlterado = novas.length + atualizados;
    return {
      sucesso: true,
      mensagem: totalAlterado
        ? totalAlterado + ' participante(s) relacionado(s) ao projeto. ' +
          resultadoEmails.enviados + ' e-mail(s) enviado(s).' +
          (resultadoEmails.falhas.length ? ' Falha em ' + resultadoEmails.falhas.length + ' envio(s).' : '')
        : 'As permissões foram mantidas. ' + resultadoEmails.enviados +
          ' e-mail(s) de relacionamento enviado(s).' +
          (resultadoEmails.falhas.length ? ' Falha em ' + resultadoEmails.falhas.length + ' envio(s).' : ''),
      dados: {
        participantes: selecionados.map(function (selecionado) {
          return {
            id: formatarId_(Number(selecionado.usuario.ID)),
            nome: String(selecionado.usuario.NOME || ''),
            email: normalizarEmail_(selecionado.usuario.EMAIL),
            papel: selecionado.papel
          };
        })
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function removerParticipanteMapro(idMapro, idUsuario) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const contexto = exigirAcessoMapro_(idMapro);
    const lider = normalizarEmail_(contexto.mapro['EMAIL_LÍDER']) ===
      normalizarEmail_(contexto.usuario.EMAIL);
    if (!contexto.admin && !lider) {
      throw new Error('Somente o líder do projeto ou o ADMIN pode remover participantes.');
    }
    bloqueio.waitLock(10000);
    const aba = obterAbaMaproParticipantes_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPRO_PARTICIPANTES);
    const vinculo = registros.find(function (item) {
      return idsIguaisMapro_(item.ID_MAPRO, idMapro) &&
        idsIguaisMapro_(item.ID_USUARIO, idUsuario) &&
        String(item.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    });
    if (!vinculo) throw new Error('O participante não possui acesso ativo a este projeto.');
    if (String(vinculo.PAPEL || '').toUpperCase() === 'LIDER') {
      throw new Error('O acesso do líder não pode ser removido por esta opção.');
    }
    const possuiResponsabilidades = lerRegistros_(
      obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES
    ).some(function (atividade) {
      return idsIguaisMapro_(atividade.ID_MAPRO, idMapro) &&
        idsIguaisMapro_(atividade.ID_RESPONSAVEL, idUsuario) &&
        String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    });
    if (possuiResponsabilidades) {
      throw new Error('Reatribua as atividades deste participante antes de remover o acesso.');
    }
    vinculo.ATIVO = 'NAO';
    vinculo.ADICIONADO_EM = new Date().toISOString();
    vinculo.ADICIONADO_POR = normalizarEmail_(contexto.usuario.EMAIL);
    aba.getRange(2, 1, registros.length, CABECALHOS_MAPRO_PARTICIPANTES.length).setValues(
      registros.map(function (item) {
        return CABECALHOS_MAPRO_PARTICIPANTES.map(function (cabecalho) { return item[cabecalho]; });
      })
    );
    atualizarParticipantesLegadosMapro_(idMapro);
    console.info(JSON.stringify({
      acao: 'ACESSO_PARTICIPANTE_MAPRO_REMOVIDO', maproId: String(idMapro),
      usuarioId: String(idUsuario), realizadoPor: contexto.usuario.EMAIL
    }));
    return { sucesso: true, mensagem: 'Acesso do participante removido com sucesso.' };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function enviarEmailsParticipantesRelacionadosMapro_(mapro, selecionados) {
  let enviados = 0;
  const falhas = [];
  selecionados.forEach(function (selecionado) {
    const usuario = selecionado.usuario;
    const email = normalizarEmail_(usuario.EMAIL);
    if (!email) return;
    const urlProjeto = montarUrlProjetoMapro_(mapro.ID_MAPRO);
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'VOCÊ FOI RELACIONADO À MAPRO - ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
        body: montarEmailParticipanteRelacionadoTextoMapro_(usuario, selecionado.papel, mapro, urlProjeto),
        htmlBody: montarEmailParticipanteRelacionadoHtmlMapro_(usuario, selecionado.papel, mapro, urlProjeto),
        name: 'SGI MAPRO'
      });
      enviados += 1;
    } catch (erro) {
      try {
        MailApp.sendEmail(
          email,
          'VOCÊ FOI RELACIONADO À MAPRO - ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
          montarEmailParticipanteRelacionadoTextoMapro_(usuario, selecionado.papel, mapro, urlProjeto)
        );
        enviados += 1;
      } catch (erroFallback) {
        falhas.push(email);
        console.error(JSON.stringify({
          acao: 'FALHA_EMAIL_PARTICIPANTE_RELACIONADO_MAPRO',
          maproId: String(mapro.ID_MAPRO),
          email: email,
          erro: erroFallback && erroFallback.message,
          erroHtml: erro && erro.message
        }));
      }
    }
  });
  return { enviados: enviados, falhas: falhas };
}

function montarEmailParticipanteRelacionadoTextoMapro_(usuario, papel, mapro, urlProjeto) {
  return [
    'Olá, ' + String(usuario.NOME || '') + '!',
    '',
    'Você foi relacionado para um projeto como ' + formatarPapelProjetoMapro_(papel) + '.',
    '',
    'ID da Mapro: ' + formatarId_(Number(mapro.ID_MAPRO)),
    'Nome do projeto: ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
    'Líder do projeto: ' + String(mapro['NOME_LÍDER'] || ''),
    'Portfólio: ' + String(mapro['PORTFÓLIO'] || ''),
    'Permissão: ' + formatarPapelProjetoMapro_(papel),
    '',
    'Acessar projeto: ' + urlProjeto,
    '',
    'CORPORATIVO | P&G | SGI'
  ].join('\n');
}

function montarEmailParticipanteRelacionadoHtmlMapro_(usuario, papel, mapro, urlProjeto) {
  const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
  return '<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px"><img src="' + escaparHtml_(logoUrl) +
    '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto;transform:scale(1.3);transform-origin:center"></td></tr>' +
    '<tr><td style="padding:30px 34px 34px;font-size:14px;line-height:1.6">' +
    '<p style="margin:0 0 18px;font-weight:800;text-transform:uppercase">Olá, ' + escaparHtml_(usuario.NOME) + '!</p>' +
    '<p style="margin:0 0 22px">Você foi relacionado para um projeto como <strong>' +
      escaparHtml_(formatarPapelProjetoMapro_(papel)) + '</strong>.</p>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7fa;border-radius:10px;margin-bottom:22px">' +
    montarLinhaEmail_('ID da Mapro', formatarId_(Number(mapro.ID_MAPRO))) +
    montarLinhaEmail_('Nome do projeto', normalizarNomeProjeto_(mapro.NOME_PROJETO)) +
    montarLinhaEmail_('Líder do projeto', mapro['NOME_LÍDER']) +
    montarLinhaEmail_('Portfólio', mapro['PORTFÓLIO']) +
    montarLinhaEmail_('Permissão', formatarPapelProjetoMapro_(papel)) + '</table>' +
    '<table role="presentation" width="100%"><tr><td align="center"><a href="' + escaparHtml_(urlProjeto) +
    '" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#06063d;color:#fff;text-decoration:none;font-weight:800">ACESSAR PROJETO</a></td></tr></table>' +
    '</td></tr><tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI</td></tr></table></td></tr></table></body></html>';
}

function formatarPapelProjetoMapro_(papel) {
  const normalizado = String(papel || '').toUpperCase();
  if (normalizado === 'EDITOR') return 'Editor';
  if (normalizado === 'ACESSO') return 'Acesso';
  return 'Observador';
}

function verificarInatividadeMapros() {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const administrador = exigirAdministrador_();
    bloqueio.waitLock(10000);
    const aba = obterAbaMapros_();
    const registros = lerRegistros_(aba, CABECALHOS_MAPROS);
    const agora = new Date();
    let canceladas = 0;
    const status = [];
    const atualizadoEm = [];
    const motivos = [];
    registros.forEach(function (mapro) {
      let situacao = String(mapro.STATUS_MAPRO || '').toUpperCase();
      let atualizado = mapro.ATUALIZADO_EM;
      let motivo = mapro.MOTIVO_CANCELAMENTO;
      const prazo = converterDataMapro_(mapro.PRAZO_PREENCHIMENTO);
      if ((situacao === 'AGUARDANDO_INICIO' || situacao === 'AGUARDANDO_PREENCHIMENTO') &&
          !mapro.INICIADA_EM && prazo && prazo.getTime() < agora.getTime()) {
        situacao = 'CANCELADA';
        atualizado = agora.toISOString();
        motivo = 'INATIVIDADE DE PREENCHIMENTO';
        canceladas += 1;
      }
      status.push([situacao]);
      atualizadoEm.push([atualizado]);
      motivos.push([motivo]);
    });
    if (registros.length && canceladas) {
      aba.getRange(2, 11, registros.length, 1).setValues(status);
      aba.getRange(2, 14, registros.length, 1).setValues(atualizadoEm);
      const colunaMotivo = CABECALHOS_MAPROS.indexOf('MOTIVO_CANCELAMENTO') + 1;
      aba.getRange(2, colunaMotivo, registros.length, 1).setValues(motivos);
    }
    console.info(JSON.stringify({
      acao: 'INATIVIDADE_MAPROS_VERIFICADA',
      canceladas: canceladas,
      realizadoPor: administrador.EMAIL
    }));
    return {
      sucesso: true,
      mensagem: canceladas
        ? canceladas + ' Mapro(s) cancelada(s) por inatividade.'
        : 'Nenhuma Mapro inativa foi encontrada.'
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function obterMaprosAcessiveis_(usuario, admin) {
  const mapros = lerRegistros_(obterAbaMapros_(), CABECALHOS_MAPROS);
  if (admin) return mapros;
  const email = normalizarEmail_(usuario.EMAIL);
  const idsPermitidos = {};
  lerRegistros_(obterAbaMaproParticipantes_(), CABECALHOS_MAPRO_PARTICIPANTES)
    .forEach(function (vinculo) {
      if (normalizarEmail_(vinculo.EMAIL) === email &&
          String(vinculo.ATIVO || 'SIM').toUpperCase() !== 'NAO') {
        idsPermitidos[String(Number(vinculo.ID_MAPRO))] = true;
      }
    });
  return mapros.filter(function (mapro) {
    return Boolean(idsPermitidos[String(Number(mapro.ID_MAPRO))]) ||
      normalizarEmail_(mapro['EMAIL_LÍDER']) === email;
  });
}

function exigirAcessoMapro_(idMapro) {
  const usuario = exigirUsuarioAtivo_();
  const admin = String(usuario.NIVEL).toUpperCase() === 'ADMIN';
  const aba = obterAbaMapros_();
  const linha = buscarLinhaMaproPorId_(aba, idMapro);
  if (!linha) throw new Error('Mapro não encontrada.');
  const mapro = lerRegistroDaLinha_(aba, linha, CABECALHOS_MAPROS);
  const email = normalizarEmail_(usuario.EMAIL);
  const participantes = obterParticipantesAtivosMapro_(idMapro);
  const vinculo = participantes.find(function (item) {
    return normalizarEmail_(item.email) === email;
  });
  const usuarioLider = email === normalizarEmail_(mapro['EMAIL_LÍDER']);
  if (!admin) {
    if (!vinculo && !usuarioLider) throw new Error('Você não possui acesso a esta Mapro.');
  }
  const papel = admin ? 'ADMIN' : normalizarPapelProjetoMapro_(
    vinculo && vinculo.papel,
    usuarioLider
  );
  const podeIniciarAcompanhamento = admin || Boolean(
    vinculo && String(vinculo.papel || '').trim().toUpperCase() === 'EDITOR'
  );
  return {
    usuario: usuario,
    admin: admin,
    mapro: mapro,
    linha: linha,
    participantes: participantes,
    papel: papel,
    podeIniciarAcompanhamento: podeIniciarAcompanhamento,
    podeEditarTudo: ['ADMIN', 'LIDER', 'EDITOR'].indexOf(papel) !== -1,
    podeEditarProprias: papel === 'OBSERVADOR'
  };
}

function normalizarPapelProjetoMapro_(papel, lider) {
  if (lider) return 'LIDER';
  const normalizado = String(papel || 'ACESSO').trim().toUpperCase();
  if (normalizado === 'PARTICIPANTE') return 'OBSERVADOR';
  return ['LIDER', 'EDITOR', 'OBSERVADOR', 'ACESSO'].indexOf(normalizado) !== -1
    ? normalizado
    : 'ACESSO';
}

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
  const status = normalizarSituacaoMapro_(mapro.STATUS_MAPRO);
  return {
    idMapro: formatarId_(Number(mapro.ID_MAPRO)),
    portfolio: String(mapro['PORTFÓLIO'] || ''),
    nomeProjeto: normalizarNomeProjeto_(mapro.NOME_PROJETO),
    contagiro: String(mapro.CONTAGIRO || ''),
    dataInicio: resumo.dataInicio || dataIsoMapro_(mapro.DATA_INICIO),
    dataFinal: resumo.dataFinal || dataIsoMapro_(mapro.DATA_FINAL),
    percentualConclusao: resumo.percentual,
    situacao: status,
    saude: calcularSaudeMapro_(status, atividades)
  };
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
      : ' A abertura foi comunicada a ' + resultadoEmails.enviados + ' participante(s).';
    return {
      sucesso: true,
      mensagem: 'Acompanhamento iniciado. A Mapro está apta para acompanhamento na Contagiro designada.' +
        mensagemEmails,
      dados: {
        iniciadoEm: agora,
        version: alteracoes.VERSION,
        emailsEnviados: resultadoEmails.enviados,
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
  const resultado = {enviados: 0, falhas: []};
  Object.keys(destinatarios).forEach(function (email) {
    const destinatario = destinatarios[email];
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'ABERTURA DE PROJETO - ' + formatarId_(Number(mapro.ID_MAPRO)) +
          ' - ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
        body: montarEmailAberturaProjetoTextoMapro_(destinatario, mapro),
        htmlBody: montarEmailAberturaProjetoHtmlMapro_(destinatario, mapro),
        name: 'SGI MAPRO'
      });
      resultado.enviados += 1;
    } catch (erro) {
      resultado.falhas.push(email);
      console.error(JSON.stringify({
        acao: 'FALHA_EMAIL_ABERTURA_PROJETO_MAPRO',
        maproId: String(mapro.ID_MAPRO),
        email: email,
        erro: erro && erro.message ? String(erro.message).slice(0, 300) : 'ERRO_DESCONHECIDO'
      }));
    }
  });
  console.info(JSON.stringify({
    acao: 'EMAILS_ABERTURA_PROJETO_MAPRO_PROCESSADOS',
    maproId: String(mapro.ID_MAPRO),
    enviados: resultado.enviados,
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
    'Data de início: ' + formatarDataEmailMapro_(mapro.DATA_INICIO),
    'Data final: ' + formatarDataEmailMapro_(mapro.DATA_FINAL),
    'O que é o projeto: ' + String(mapro.O_QUE_E || 'Não informado'),
    'Por que: ' + String(mapro.PORQUE || 'Não informado'),
    'Resultados esperados: ' + String(mapro.RESULTADOS_ESPERADOS || 'Não informados'),
    'Indicadores: ' + String(mapro.INDICADORES || 'Não informados'),
    'Processo crítico: ' + String(mapro.PROCESSO_CRITICO || 'Não informado'),
    'Envolve sistema: ' + String(mapro.ENVOLVE_SISTEMA || 'Não informado'),
    'Sistema(s) envolvido(s): ' + String(mapro.SISTEMAS_ENVOLVIDOS || 'Não informados'),
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
    montarLinhaEmail_('Data de início', formatarDataEmailMapro_(mapro.DATA_INICIO)) +
    montarLinhaEmail_('Data final', formatarDataEmailMapro_(mapro.DATA_FINAL)) +
    montarLinhaEmail_('O que é o projeto', String(mapro.O_QUE_E || 'Não informado')) +
    montarLinhaEmail_('Por que', String(mapro.PORQUE || 'Não informado')) +
    montarLinhaEmail_('Resultados esperados', String(mapro.RESULTADOS_ESPERADOS || 'Não informados')) +
    montarLinhaEmail_('Indicadores', String(mapro.INDICADORES || 'Não informados')) +
    montarLinhaEmail_('Processo crítico', String(mapro.PROCESSO_CRITICO || 'Não informado')) +
    montarLinhaEmail_('Envolve sistema', String(mapro.ENVOLVE_SISTEMA || 'Não informado')) +
    montarLinhaEmail_('Sistema(s) envolvido(s)', String(mapro.SISTEMAS_ENVOLVIDOS || 'Não informados')) +
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
    idResponsavel: formatarId_(Number(atividade.ID_RESPONSAVEL)),
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
  if (atividades.some(function (item) { return calcularSaudeAtividadeMapro_(item) === 'VERMELHO'; })) {
    return 'VERMELHO';
  }
  if (atividades.some(function (item) { return calcularSaudeAtividadeMapro_(item) === 'AMARELO'; })) {
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

function validarAtividadeMapro_(dados) {
  const entrada = dados || {};
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
  if (atividade.tipo !== 'TOPICO' && !atividade.idResponsavel) {
    throw new Error('Selecione o responsável.');
  }
  if (atividade.tipo !== 'TOPICO' && (!atividade.dataInicio || !atividade.dataFinal)) {
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
  historicosAcumulados
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
  const novaVersao = Number(mapro.VERSION || 1) + 1;
  const linhaMaproAtualizada = CABECALHOS_MAPROS.map(function (cabecalho) {
    if (cabecalho === 'STATUS_MAPRO') return situacao;
    if (cabecalho === 'ATUALIZADO_EM') return agora;
    if (cabecalho === 'DATA_INICIO') return resumo.dataInicio;
    if (cabecalho === 'DATA_FINAL') return resumo.dataFinal;
    if (cabecalho === 'VERSION') return novaVersao;
    return mapro[cabecalho] == null ? '' : mapro[cabecalho];
  });
  abaMapros.getRange(linha, 1, 1, CABECALHOS_MAPROS.length)
    .setValues([linhaMaproAtualizada]);
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
    return !pais[String(atividade.ID_ATIVIDADE)];
  });
  if (!folhas.length) return 'EM_ANDAMENTO';
  const aplicaveis = folhas.filter(function (atividade) {
    return String(atividade.STATUS_ATIVIDADE).toUpperCase() !== 'NAO_APLICAVEL';
  });
  if (!aplicaveis.length) return 'NAO_APLICAVEL';
  const todasConcluidas = aplicaveis.every(function (atividade) {
    return String(atividade.STATUS_ATIVIDADE).toUpperCase() === 'CONCLUIDA';
  });
  return todasConcluidas ? 'CONCLUIDA' : 'EM_ANDAMENTO';
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
  const atividades = todasAtividades.filter(function (atividade) {
      const status = String(atividade.STATUS_ATIVIDADE || '').toUpperCase();
      return String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO' &&
        String(atividade.TIPO || '').toUpperCase() !== 'TOPICO' &&
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
      MailApp.sendEmail({
        to: destinatarios.join(','),
        subject: tipo === 'ATRASO'
          ? '[MAPRO] Atividade em atraso'
          : '[MAPRO] Atividade com vencimento nesta semana',
        body: montarCorpoEmailAtividadeMapro_(
          mapro,
          atividade,
          numeroAtividade,
          tipo === 'ATRASO'
            ? 'A atividade entrou em atraso.'
            : 'A atividade vence nesta semana.',
          ['Prazo: ' + formatarDataEmailMapro_(prazo)]
        ),
        htmlBody: montarEmailAvisoPrazoHtmlMapro_(
          mapro, atividade, numeroAtividade, prazo, tipo
        ),
        name: 'SGI MAPRO'
      });
      novosLogs.push([
        Utilities.getUuid(), formatarId_(Number(atividade.ID_MAPRO)),
        String(atividade.ID_ATIVIDADE), tipo, hoje, new Date().toISOString(),
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
    MailApp.sendEmail({
      to: destinatarios.join(','),
      subject: 'ALTERAÇÃO DE PRAZO - MAPRO ' + formatarId_(Number(mapro.ID_MAPRO)) +
        ' - ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
      body: montarCorpoEmailAtividadeMapro_(
        mapro,
        registroEmail,
        numeroAtividade,
        'O prazo da atividade foi replanejado.',
        [
          'Prazo anterior: ' + formatarDataEmailMapro_(prazoAnterior),
          'Novo prazo: ' + formatarDataEmailMapro_(prazoNovo)
        ]
      ),
      htmlBody: montarEmailReplanejamentoHtmlMapro_(
        mapro, registroEmail, numeroAtividade, prazoAnterior, prazoNovo
      ),
      name: 'SGI MAPRO'
    });
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
    PLANEJADA: 'Planejada',
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
  const partes = String(dataIso || '').split('-');
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
