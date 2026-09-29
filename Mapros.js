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
const CABECALHOS_BASE_DEPARTAMENTOS = ['DEPARTAMENTO', 'AREAS_RELACIONADAS'];
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
  recalcularSituacoesMaprosExistentes_(abaMapros, abaAtividades);
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
  vinculosExistentes.forEach(function (vinculo) {
    const usuarioVinculado = porEmail[normalizarEmail_(vinculo.EMAIL)];
    if (usuarioVinculado && String(usuarioVinculado.STATUS || '').toUpperCase() !== 'ATIVO' &&
        String(vinculo.ATIVO || 'SIM').toUpperCase() !== 'NAO') {
      vinculo.ATIVO = 'NAO';
      alterouVinculo = true;
    }
  });
  mapros.forEach(function (mapro) {
    const idMapro = formatarId_(Number(mapro.ID_MAPRO));
    const membrosPorEmail = {};
    const prioridadePapel = { ACESSO: 1, OBSERVADOR: 2, LIDER: 3, EDITOR: 4 };
    function incluirMembro(membro) {
      const email = normalizarEmail_(membro.email);
      if (!email) return;
      const usuarioCadastrado = porEmail[email];
      if (usuarioCadastrado &&
          String(usuarioCadastrado.STATUS || '').toUpperCase() !== 'ATIVO') return;
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
    cancelarMaprosInativas_();
    const admin = String(usuario.NIVEL).toUpperCase() === 'ADMIN';
    if (admin) {
      try {
        configurarGatilhoNotificacoesMapro_();
        configurarGatilhoFilaEmailsMapro_();
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
    cancelarMaprosInativas_();
    const admin = String(usuario.NIVEL).toUpperCase() === 'ADMIN';
    if (admin) {
      try {
        configurarGatilhoNotificacoesMapro_();
        configurarGatilhoFilaEmailsMapro_();
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
    cancelarMaprosInativas_();
    const admin = String(usuario.NIVEL || '').toUpperCase() === 'ADMIN';
    const mapros = obterMaprosAcessiveis_(usuario, admin);
    const atividades = lerRegistros_(obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES);
    const porMapro = agruparAtividadesPorMapro_(atividades);
    const maprosReplanejadas = obterIdsMaprosReplanejadasDashboardMapro_(
      lerRegistros_(obterAbaMaproHistoricoPrazo_(), CABECALHOS_MAPRO_HISTORICO_PRAZO)
    );
    const projetos = mapros.map(function (mapro) {
      const atividadesMapro = porMapro[String(Number(mapro.ID_MAPRO))] || [];
      const resumo = calcularResumoAtividadesMapro_(atividadesMapro);
      const operacionais = obterFolhasDashboardMapro_(atividadesMapro);
      const minhas = selecionarAtividadesDashboardMapro_(
        operacionais, usuario.ID, admin
      );
      const mapearMinha = function (atividade) {
        return {
          id: String(atividade.ID_ATIVIDADE || ''),
          descricao: String(atividade.NOME_ATIVIDADE || ''),
          prazo: dataIsoMapro_(atividade.DATA_FINAL),
          responsavel: String(atividade.NOME_RESPONSAVEL || ''),
          status: String(atividade.STATUS_ATIVIDADE || '').toUpperCase(),
          saude: calcularSaudeAtividadeMapro_(atividade)
        };
      };
      const statusPersistido = String(mapro.STATUS_MAPRO || '').toUpperCase();
      const status = ['AGUARDANDO_INICIO', 'AGUARDANDO_PREENCHIMENTO']
        .indexOf(statusPersistido) !== -1
        ? statusPersistido
        : calcularSituacaoProjetoMapro_(mapro.STATUS_MAPRO, atividadesMapro);
      const statusNormalizado = normalizarSituacaoMapro_(status);
      const canceladaPorInatividade = statusNormalizado === 'CANCELADA' &&
        normalizarTexto_(mapro.MOTIVO_CANCELAMENTO).indexOf('inatividade') !== -1;
      return {
        id: formatarId_(Number(mapro.ID_MAPRO)),
        nome: normalizarNomeProjeto_(mapro.NOME_PROJETO),
        portfolio: String(mapro['PORTFÓLIO'] || ''),
        contagiro: String(mapro.CONTAGIRO || ''),
        nivel: String(mapro.NIVEL || ''),
        iniciativaEstrategica: String(mapro.INICIATIVA_ESTRATEGICA || '').trim().toUpperCase(),
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
          ? dataIsoMapro_(mapro.CONCLUIDA_EM || mapro.ATUALIZADO_EM) : '',
        percentual: resumo.percentual,
        totalAtividades: resumo.totalAtividades,
        replanejada: Boolean(maprosReplanejadas[String(Number(mapro.ID_MAPRO))]),
        temNovasAtividades: Boolean(mapro.ACOMPANHAMENTO_INICIADO_EM) && operacionais.some(function (atividade) {
          return new Date(atividade.CRIADO_EM).getTime() > new Date(mapro.ACOMPANHAMENTO_INICIADO_EM).getTime();
        }),
        minhasAtividades: minhas.map(mapearMinha)
      };
    }).sort(function (a, b) { return Number(a.id) - Number(b.id); });
    return {
      sucesso: true,
      dados: {
        admin: admin,
        usuario: {nome: String(usuario.NOME || ''), email: normalizarEmail_(usuario.EMAIL)},
        projetos: projetos,
        atualizadoEm: new Date().toISOString(),
        logoUrl: 'https://drive.google.com/thumbnail?id=' + CONFIG.logoCadastroId + '&sz=w4000',
        logoEmpresaUrl: 'https://drive.google.com/thumbnail?id=' + CONFIG.logoEmpresaId + '&sz=w600',
        urlAplicacao: ScriptApp.getService().getUrl()
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

/** Admin consulta todas as atividades; demais perfis veem somente as próprias. */
function selecionarAtividadesDashboardMapro_(atividades, idUsuario, admin) {
  const registros = atividades || [];
  if (admin) return registros.slice();
  return registros.filter(function (atividade) {
    return idsIguaisMapro_(atividade.ID_RESPONSAVEL, idUsuario);
  });
}

function obterFolhasDashboardMapro_(atividades) {
  const ativas = atividades.filter(a => String(a.ATIVO || 'SIM').toUpperCase() !== 'NAO');
  const pais = {};
  ativas.forEach(a => { if (a.ID_ATIVIDADE_PAI) pais[String(a.ID_ATIVIDADE_PAI)] = true; });
  return ativas.filter(a => String(a.TIPO).toUpperCase() !== 'TOPICO' && !pais[String(a.ID_ATIVIDADE)]);
}

function obterIdsMaprosReplanejadasDashboardMapro_(historicos) {
  const ids = {};
  (historicos || []).forEach(function (historico) {
    const anterior = dataIsoMapro_(historico.PRAZO_ANTERIOR);
    const novo = dataIsoMapro_(historico.PRAZO_NOVO);
    if (anterior && novo && novo > anterior) {
      ids[String(Number(historico.ID_MAPRO))] = true;
    }
  });
  return ids;
}

function listarMaprosPagina(portfolio) {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    cancelarMaprosInativas_();
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
        podeGerenciarParticipantes: podeGerenciarParticipantesMapro_(contexto),
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
    const iniciativaEstrategica = normalizarRespostaSimNaoMapro_(
      entrada.iniciativaEstrategica, 'Iniciativa estratégica', true
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
      INICIATIVA_ESTRATEGICA: iniciativaEstrategica,
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
    const responsaveisPermitidos = {};
    obterParticipantesAtivosMapro_(entrada.idMapro).forEach(function (participante) {
      if (['LIDER', 'EDITOR', 'OBSERVADOR'].indexOf(participante.papel) !== -1) {
        responsaveisPermitidos[String(Number(participante.id))] = true;
      }
    });
    if (entrada.tipo !== 'TOPICO' && !responsavel) {
      throw new Error('Selecione um responsável relacionado ao projeto.');
    }
    if (responsavel && !responsavelPermitidoNaEdicaoMapro_(
      atual, responsavel, responsaveisPermitidos
    )) {
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
    const idsAtividadesComFilhos = {};
    registros.forEach(function (atividade) {
      if (!idsIguaisMapro_(atividade.ID_MAPRO, idMapro) ||
          String(atividade.ATIVO || 'SIM').toUpperCase() === 'NAO') return;
      const idPai = String(atividade.ID_ATIVIDADE_PAI || '').trim();
      if (idPai) idsAtividadesComFilhos[idPai] = true;
    });
    recebidas.forEach(function (dadosAtividade) {
      const idPaiCliente = String(dadosAtividade.idAtividadePai || '').trim();
      const idPai = idsNovosPorCliente[idPaiCliente] || idPaiCliente;
      if (idPai) idsAtividadesComFilhos[idPai] = true;
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
      const atividadeTemFilhos = Boolean(idsAtividadesComFilhos[idAtividade]);
      const entrada = validarAtividadeMapro_(dadosNormalizados, {
        permitirCamposOperacionaisVazios: atividadeTemFilhos
      });
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
        !atividadeTemFilhos &&
        (inicioAnterior !== entrada.dataInicio || finalAnterior !== entrada.dataFinal);
      if (houveReplanejamento && !Boolean(dadosAtividade.confirmarReplanejamento)) {
        throw new Error('Clique em SALVAR EDIÇÕES para confirmar o replanejamento.');
      }
      if (houveReplanejamento && (entrada.observacao.length < 5 ||
          entrada.observacao === String(atual.OBSERVACAO || '').trim())) {
        throw new Error('Preencha a observação com o motivo do replanejamento das datas.');
      }

      const responsavel = usuariosPorId[String(Number(entrada.idResponsavel))] || null;
      const atividadeFolha = entrada.tipo !== 'TOPICO' && !atividadeTemFilhos;
      if (atividadeFolha && !responsavel) {
        throw new Error('Selecione um responsável relacionado ao projeto.');
      }
      if (responsavel && !responsavelPermitidoNaEdicaoMapro_(
        atual, responsavel, responsaveisPermitidos
      )) {
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

    const idsComPrazoEditado = {};
    alteracoesPrazo.forEach(function (alteracao) {
      idsComPrazoEditado[String(alteracao.idAtividade)] = true;
    });
    alteracoesPrazo.forEach(function (alteracao) {
      propagarPrazoPredecessoraMapro_(
        registros, idMapro, alteracao.idAtividade, alteracao.deslocamento,
        acompanhamentoIniciado, contexto.usuario.EMAIL, agora, historicos,
        idsComPrazoEditado
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

/** Converte a logo configurada no Drive em uma fonte autocontida para o PDF. */
function obterLogoRelatorioMaproDataUri_() {
  try {
    const arquivo = DriveApp.getFileById(CONFIG.logoCadastroId);
    const blob = arquivo.getBlob();
    const tipo = String(blob.getContentType() || arquivo.getMimeType() || '').toLowerCase();
    if (!/^image\/(?:png|jpeg|gif)$/.test(tipo)) {
      throw new Error('O arquivo configurado para a logo não é uma imagem compatível.');
    }
    return 'data:' + tipo + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (erro) {
    console.error(JSON.stringify({
      acao: 'FALHA_LOGO_RELATORIO_MAPRO',
      erro: erro && erro.message
    }));
    return 'https://drive.google.com/thumbnail?id=' + CONFIG.logoCadastroId + '&sz=w400';
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
    conteudo = conteudo.replace(
      /__LOGO_SGI_RELATORIO_MAPRO__/g,
      obterLogoRelatorioMaproDataUri_()
    );
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
    if (!podeGerenciarParticipantesMapro_(contexto)) {
      throw new Error('Seu perfil não permite adicionar participantes nesta Mapro.');
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
          (resultadoEmails.pendentes.length ? ' ' + resultadoEmails.pendentes.length +
            ' e-mail(s) na fila automática.' : '') +
          (resultadoEmails.falhas.length ? ' Falha em ' + resultadoEmails.falhas.length + ' envio(s).' : '')
        : 'As permissões foram mantidas. ' + resultadoEmails.enviados +
          ' e-mail(s) de relacionamento enviado(s).' +
          (resultadoEmails.pendentes.length ? ' ' + resultadoEmails.pendentes.length +
            ' e-mail(s) na fila automática.' : '') +
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
    if (!podeGerenciarParticipantesMapro_(contexto)) {
      throw new Error('Seu perfil não permite remover participantes desta Mapro.');
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
  const pendentes = [];
  selecionados.forEach(function (selecionado) {
    const usuario = selecionado.usuario;
    const email = normalizarEmail_(usuario.EMAIL);
    if (!email) return;
    const urlProjeto = montarUrlProjetoMapro_(mapro.ID_MAPRO);
    const resultado = entregarEmailMapro_({
      to: email,
      subject: 'VOCÊ FOI RELACIONADO À MAPRO - ' + normalizarNomeProjeto_(mapro.NOME_PROJETO),
      body: montarEmailParticipanteRelacionadoTextoMapro_(usuario, selecionado.papel, mapro, urlProjeto),
      htmlBody: montarEmailParticipanteRelacionadoHtmlMapro_(usuario, selecionado.papel, mapro, urlProjeto),
      name: 'SGI MAPRO',
      tipo: 'PARTICIPANTE_RELACIONADO',
      contextoId: formatarId_(Number(mapro.ID_MAPRO)),
      chaveIdempotencia: 'PARTICIPANTE_RELACIONADO:' + formatarId_(Number(mapro.ID_MAPRO)) +
        ':' + formatarId_(Number(usuario.ID)) + ':' + String(selecionado.papel || ''),
      forcarNovo: true
    });
    if (resultado.enviado) enviados += 1;
    else if (resultado.enfileirado) pendentes.push(email);
    else falhas.push(email);
  });
  return { enviados: enviados, pendentes: pendentes, falhas: falhas };
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
  try {
    garantirBancoConfigurado_();
    const administrador = exigirAdministrador_();
    const canceladas = cancelarMaprosInativas_();
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
  }
}

/** Cancela automaticamente Mapros sem nenhum tópico após o prazo de preenchimento. */
function cancelarMaprosInativas_() {
  const aba = obterAbaMapros_();
  const registros = lerRegistros_(aba, CABECALHOS_MAPROS);
  if (!registros.length) return 0;
  const agora = new Date();
  const obterTopicosPorMapro = function () {
    const topicos = {};
    lerRegistros_(obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES)
      .forEach(function (atividade) {
      if (String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO' &&
          String(atividade.TIPO || '').toUpperCase() === 'TOPICO') {
        topicos[String(Number(atividade.ID_MAPRO))] = true;
      }
    });
    return topicos;
  };
  const topicosPorMapro = obterTopicosPorMapro();
  const deveCancelar = function (mapro, topicos) {
    const situacao = String(mapro.STATUS_MAPRO || '').toUpperCase();
    const prazo = converterDataMapro_(mapro.PRAZO_PREENCHIMENTO);
    return ['AGUARDANDO_INICIO', 'AGUARDANDO_PREENCHIMENTO'].indexOf(situacao) !== -1 &&
      !topicos[String(Number(mapro.ID_MAPRO))] && prazo &&
      prazo.getTime() < agora.getTime();
  };
  if (!registros.some(function (mapro) { return deveCancelar(mapro, topicosPorMapro); })) return 0;

  const bloqueio = LockService.getDocumentLock();
  try {
    bloqueio.waitLock(10000);
    const atuais = lerRegistros_(aba, CABECALHOS_MAPROS);
    const topicosAtuais = obterTopicosPorMapro();
    let canceladas = 0;
    atuais.forEach(function (mapro) {
      if (!deveCancelar(mapro, topicosAtuais)) return;
      mapro.STATUS_MAPRO = 'CANCELADA';
      mapro.ATUALIZADO_EM = agora.toISOString();
      mapro.MOTIVO_CANCELAMENTO = 'INATIVIDADE DE PREENCHIMENTO';
      canceladas += 1;
    });
    if (canceladas) {
      aba.getRange(2, 1, atuais.length, CABECALHOS_MAPROS.length).setValues(
        atuais.map(function (mapro) {
          return CABECALHOS_MAPROS.map(function (cabecalho) {
            return mapro[cabecalho] == null ? '' : mapro[cabecalho];
          });
        })
      );
    }
    return canceladas;
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
  const idsPermitidosPorArea = obterIdsMaprosPermitidosPorArea_(usuario);
  return mapros.filter(function (mapro) {
    if (String(mapro.STATUS_MAPRO || '').toUpperCase() === 'CANCELADA') return false;
    const id = String(Number(mapro.ID_MAPRO));
    return Boolean(idsPermitidos[id]) || Boolean(idsPermitidosPorArea[id]) ||
      normalizarEmail_(mapro['EMAIL_LÍDER']) === email;
  });
}

function obterAreasRelacionadasUsuarioMapro_(usuario) {
  if (['GERENTE', 'DIRETOR'].indexOf(String(usuario && usuario.NIVEL || '').toUpperCase()) === -1) {
    return [];
  }
  const vistas = {};
  return String(usuario.AREAS_RELACIONADAS || '').split(';').map(function (area) {
    return String(area || '').trim();
  }).filter(function (area) {
    const chave = normalizarTexto_(area);
    if (!chave || vistas[chave]) return false;
    vistas[chave] = true;
    return true;
  });
}

function obterIdsMaprosPermitidosPorArea_(usuario, atividadesCarregadas) {
  const areas = obterAreasRelacionadasUsuarioMapro_(usuario);
  if (!areas.length) return {};
  const areasNormalizadas = {};
  areas.forEach(function (area) { areasNormalizadas[normalizarTexto_(area)] = true; });
  const atividades = Array.isArray(atividadesCarregadas) ? atividadesCarregadas :
    lerRegistros_(obterAbaMaproAtividades_(), CABECALHOS_MAPRO_ATIVIDADES);
  const pais = {};
  atividades.forEach(function (atividade) {
    if (String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO' && atividade.ID_ATIVIDADE_PAI) {
      pais[String(atividade.ID_ATIVIDADE_PAI)] = true;
    }
  });
  const ids = {};
  atividades.forEach(function (atividade) {
    const ativa = String(atividade.ATIVO || 'SIM').toUpperCase() !== 'NAO';
    const operacional = String(atividade.TIPO || '').toUpperCase() !== 'TOPICO';
    const folha = !pais[String(atividade.ID_ATIVIDADE)];
    if (ativa && operacional && folha &&
        areasNormalizadas[normalizarTexto_(atividade.DEPARTAMENTO)]) {
      ids[String(Number(atividade.ID_MAPRO))] = true;
    }
  });
  return ids;
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
  const acessoPorArea = Boolean(obterIdsMaprosPermitidosPorArea_(usuario)[
    String(Number(mapro.ID_MAPRO))
  ]);
  if (!admin) {
    if (String(mapro.STATUS_MAPRO || '').toUpperCase() === 'CANCELADA') {
      throw new Error('Esta Mapro foi cancelada e está disponível somente para o SGI.');
    }
    if (!vinculo && !usuarioLider && !acessoPorArea) {
      throw new Error('Você não possui acesso a esta Mapro.');
    }
  }
  const papel = admin ? 'ADMIN' : acessoPorArea && !vinculo && !usuarioLider
    ? 'ACESSO_AREA' : normalizarPapelProjetoMapro_(vinculo && vinculo.papel, usuarioLider);
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
    acessoPorArea: acessoPorArea,
    podeIniciarAcompanhamento: podeIniciarAcompanhamento,
    podeEditarTudo: ['ADMIN', 'LIDER', 'EDITOR'].indexOf(papel) !== -1,
    podeEditarProprias: papel === 'OBSERVADOR'
  };
}

function podeGerenciarParticipantesMapro_(contexto) {
  const nivel = String(contexto && contexto.usuario && contexto.usuario.NIVEL || '')
    .trim().toUpperCase();
  const papel = String(contexto && contexto.papel || '').trim().toUpperCase();
  return Boolean(contexto && contexto.admin) ||
    ['GERENTE', 'DIRETOR'].indexOf(nivel) !== -1 ||
    ['LIDER', 'EDITOR'].indexOf(papel) !== -1;
}

function normalizarPapelProjetoMapro_(papel, lider) {
  if (lider) return 'LIDER';
  const normalizado = String(papel || 'ACESSO').trim().toUpperCase();
  if (normalizado === 'PARTICIPANTE') return 'OBSERVADOR';
  return ['LIDER', 'EDITOR', 'OBSERVADOR', 'ACESSO'].indexOf(normalizado) !== -1
    ? normalizado
    : 'ACESSO';
}
