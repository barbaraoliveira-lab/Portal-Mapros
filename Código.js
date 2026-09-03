const CONFIG = {
  nomeSistema: 'MAPRO',
  emailAdministrador: 'sgi@integrajca.com.br',
  corPrincipal: '#030441',
  versaoEstrutura: '2026-09-02-01',
  logoCarregamentoId: '1xu3olDb4OIgL2QzIKreygYr-J_oC3cv3',
  logoId: '1KZzCBGZF8UV4s-Lk9XG9GzkHUuOh5UfN',
  logoEmpresaId: '1lh2A0JeKyfEmf3rDfJvLy32FLcInxza5',
  logoCadastroId: '1xu3olDb4OIgL2QzIKreygYr-J_oC3cv3',
  abaUsuarios: 'USUARIOS',
  abaSolicitacoes: 'SOLICITACOES_ACESSO',
  abaSolicitacoesMapro: 'SOLICITACOES_MAPRO',
  abaBasePortfolio: 'BASE_PORTFÓLIO',
  abaMapros: 'MAPROS',
  abaMaproParticipantes: 'MAPRO_PARTICIPANTES',
  abaMaproAtividades: 'MAPRO_ATIVIDADES',
  abaMaproHistoricoDatas: 'MAPRO_HISTORICO_DATAS',
  abaMaproHistoricoPrazo: 'MAPRO_HISTORICO_PRAZO',
  abaMaproNotificacoes: 'MAPRO_NOTIFICACOES',
  propriedadePastaEvidencias: 'MAPRO_EVIDENCIAS_FOLDER_ID',
  propriedadePastaFotosLideres: 'MAPRO_FOTOS_LIDERES_FOLDER_ID',
  pastaFotosLideresId: '1vYsmnpRNHpwAkvN-2FW6-nqlgbP78cqt',
  propriedadeUrlWebApp: 'MAPRO_WEB_APP_URL',
  pastaEvidenciasId: '14Y8kQVR0sLu73uGXwp3yvlrh6ZwbMDPq',
  abaBaseContagiro: 'BASE_CONTAGIRO',
  abaBaseDepartamentos: 'BASE_DEPARTAMENTOS',
  abaBaseEstrategia: 'BASE_ESTRATEGIA'
};

const CABECALHOS_USUARIOS = [
  'ID', 'EMAIL', 'NOME', 'NIVEL', 'STATUS', 'CRIADO_EM', 'ATUALIZADO_EM',
  'MATRICULA', 'DEPARTAMENTO'
];

let bancoConfiguradoNestaExecucao_ = false;

const CABECALHOS_SOLICITACOES = [
  'ID', 'EMAIL', 'STATUS', 'SOLICITADO_EM'
];

const CABECALHOS_SOLICITACOES_MAPRO = [
  'ID_USUARIO', 'NOME', 'ID_SOLICITAÇÃO', 'STATUS_SOLICITAÇÃO',
  'PORTFÓLIO_UNIDADES', 'NOME_PROJETO', 'LÍDER_PROJETO', 'PARTICIPANTES',
  'EMAIL_USUÁRIO', 'CRIADO_EM', 'ATUALIZADO_EM', 'MOTIVO_REJEIÇÃO',
  'ID_LÍDER', 'EMAIL_LÍDER', 'DEPARTAMENTO', 'CONTAGIRO', 'NIVEL',
  'NEGOCIO', 'DIMENSAO_BSC', 'OBJETIVO_BSC', 'O_QUE_E', 'PORQUE',
  'RESULTADOS_ESPERADOS', 'POSSUI_INDICADORES_DEFINIDOS', 'INDICADORES',
  'PROCESSO_CRITICO', 'ENVOLVE_SISTEMA', 'SISTEMAS_ENVOLVIDOS',
  'FOTO_LIDER_ID', 'FOTO_LIDER_TIPO',
  'FOTO_LIDER_ATUALIZADA_EM', 'FOTO_LIDER_ATUALIZADA_POR'
];

const CABECALHOS_MAPROS = [
  'ID_MAPRO', 'ID_SOLICITAÇÃO', 'NOME_PROJETO', 'PORTFÓLIO',
  'ID_LÍDER', 'NOME_LÍDER', 'EMAIL_LÍDER', 'IDS_PARTICIPANTES',
  'NOMES_PARTICIPANTES', 'EMAILS_PARTICIPANTES', 'STATUS_MAPRO',
  'PRAZO_PREENCHIMENTO', 'CRIADO_EM', 'ATUALIZADO_EM', 'O_QUE_E', 'PORQUE',
  'RESULTADOS_ESPERADOS', 'CONTAGIRO', 'NIVEL', 'DATA_INICIO', 'DATA_FINAL',
  'DEPARTAMENTO', 'NEGOCIO', 'DIMENSAO_BSC', 'OBJETIVO_BSC', 'INDICADORES',
  'POSSUI_INDICADORES_DEFINIDOS', 'PROCESSO_CRITICO', 'ENVOLVE_SISTEMA',
  'SISTEMAS_ENVOLVIDOS',
  'INICIADA_EM', 'INICIADA_POR', 'MOTIVO_CANCELAMENTO', 'VERSION',
  'ACOMPANHAMENTO_INICIADO_EM', 'ACOMPANHAMENTO_INICIADO_POR',
  'FOTO_LIDER_ID', 'FOTO_LIDER_TIPO', 'FOTO_LIDER_ATUALIZADA_EM',
  'FOTO_LIDER_ATUALIZADA_POR'
];

/** Carrega a página solicitada do Web App. */
function doGet(evento) {
  const paginaSolicitada = evento && evento.parameter
    ? evento.parameter.pagina
    : '';
  const paginas = {
    cadastrosDeUsuarios: 'cadastrosDeUsuarios',
    solicitacoesDeMapro: 'solicitacoesDeMapro',
    dashboard: 'Dashboard',
    mapros: 'mapros',
    minhasMapros: 'mapros'
  };
  const arquivo = paginas[paginaSolicitada] || 'Index';
  const template = HtmlService.createTemplateFromFile(arquivo);
  template.dadosIniciaisJson = serializarDadosIniciais_(
    montarDadosIniciaisPagina_(arquivo)
  );

  return template.evaluate()
    .setTitle(
      arquivo === 'cadastrosDeUsuarios'
        ? 'MAPRO | Cadastro de Usuário'
        : arquivo === 'solicitacoesDeMapro'
          ? 'MAPRO | Solicitações de Mapro'
          : arquivo === 'Dashboard'
            ? 'MAPRO | Dashboard'
          : arquivo === 'mapros'
            ? 'MAPRO | Projetos'
          : 'MAPRO | Gestão de Projetos'
    )
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Reúne no HTML inicial os dados já autorizados necessários para cada página. */
function montarDadosIniciaisPagina_(arquivo) {
  const dados = { pagina: arquivo, geradoEm: new Date().toISOString() };
  // A estrutura visual é entregue imediatamente; os dados são buscados em lote após a pintura.
  return dados;
}

function carregarPaginaUsuariosInicial() {
  const sistema = carregarSistema();
  const administrador = sistema.sucesso && sistema.dados.acesso &&
    String(sistema.dados.nivel).toUpperCase() === 'ADMIN';
  return {
    sistema: sistema,
    usuarios: administrador ? listarUsuarios({}) : null,
    departamentos: administrador ? listarDepartamentosCadastroUsuarios_() : []
  };
}

function carregarPaginaSolicitacoesInicial() {
  const configuracao = carregarPaginaSolicitacoesMapro();
  return {
    configuracao: configuracao,
    solicitacoes: configuracao.sucesso ? listarSolicitacoesMapro({}) : null
  };
}

/** Escapa JSON para inclusão segura em um elemento script application/json. */
function serializarDadosIniciais_(dados) {
  return JSON.stringify(dados || {})
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Permite incluir os arquivos CSS e JavaScript dentro do Index.html. */
function incluir(nomeArquivo) {
  return HtmlService.createHtmlOutputFromFile(nomeArquivo).getContent();
}

/**
 * Execute uma vez no editor do Apps Script.
 * Cria as abas do banco na planilha vinculada e cadastra a conta SGI.
 */
function configurarBancoDeDados() {
  const planilha = obterPlanilha_();
  const abaUsuarios = criarOuAtualizarAba_(
    planilha,
    CONFIG.abaUsuarios,
    CABECALHOS_USUARIOS
  );
  criarOuAtualizarAba_(
    planilha,
    CONFIG.abaSolicitacoes,
    CABECALHOS_SOLICITACOES
  );
  const abaSolicitacoesMapro = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaSolicitacoesMapro,
    CABECALHOS_SOLICITACOES_MAPRO
  );
  const abaMapros = criarOuAtualizarAbaFlexivel_(
    planilha,
    CONFIG.abaMapros,
    CABECALHOS_MAPROS
  );
  garantirAbaBasePortfolio_(planilha);

  if (!buscarUsuarioPorEmail_(CONFIG.emailAdministrador)) {
    const agora = new Date().toISOString();
    abaUsuarios.appendRow([
      Utilities.getUuid(),
      CONFIG.emailAdministrador,
      'SGI',
      'ADMIN',
      'ATIVO',
      agora,
      agora,
      '',
      ''
    ]);
  }

  normalizarIdsUsuarios_(abaUsuarios);
  normalizarPerfisEStatus_(abaUsuarios);
  sincronizarMaprosAprovadas_(abaSolicitacoesMapro, abaMapros, abaUsuarios);
  configurarEstruturaMapros_(planilha, abaMapros, abaUsuarios);

  formatarAba_(abaUsuarios, CABECALHOS_USUARIOS.length);
  formatarAba_(
    planilha.getSheetByName(CONFIG.abaSolicitacoes),
    CABECALHOS_SOLICITACOES.length
  );
  formatarAba_(abaSolicitacoesMapro, CABECALHOS_SOLICITACOES_MAPRO.length);
  formatarAba_(abaMapros, CABECALHOS_MAPROS.length);

  bancoConfiguradoNestaExecucao_ = true;
  try {
    CacheService.getScriptCache().put(
      'ESTRUTURA_BANCO_MAPRO',
      CONFIG.versaoEstrutura,
      21600
    );
  } catch (erroCache) {
    console.warn('Cache da estrutura indisponível: ' + erroCache.message);
  }

  return 'Banco de dados configurado com sucesso.';
}

/** Evita repetir migrações e formatações completas em toda chamada da interface. */
function garantirBancoConfigurado_() {
  if (bancoConfiguradoNestaExecucao_) return;
  try {
    const versaoEmCache = CacheService.getScriptCache().get('ESTRUTURA_BANCO_MAPRO');
    if (versaoEmCache === CONFIG.versaoEstrutura) {
      bancoConfiguradoNestaExecucao_ = true;
      return;
    }
  } catch (erroCache) {
    console.warn('Cache da estrutura indisponível: ' + erroCache.message);
  }
  configurarBancoDeDados();
}

/** Retorna os dados necessários para montar a tela inicial. */
function carregarSistema() {
  try {
    const email = obterEmailUsuario_();
    garantirBancoConfigurado_();
    const usuario = buscarUsuarioPorEmail_(email);
    const dadosBase = {
      logoUrl: 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000',
      logoEmpresaUrl: 'https://drive.google.com/thumbnail?id=' +
        CONFIG.logoEmpresaId + '&sz=w4000',
      logoCadastroUrl: 'https://drive.google.com/thumbnail?id=' +
        CONFIG.logoCadastroId + '&sz=w4000',
      urlAplicacao: ScriptApp.getService().getUrl(),
      corPrincipal: CONFIG.corPrincipal,
      email: email
    };

    if (!usuario || String(usuario.STATUS).toUpperCase() !== 'ATIVO') {
      return {
        sucesso: true,
        dados: Object.assign(dadosBase, {
          acesso: false,
          mensagem: 'Você ainda não tem acesso ao sistema.'
        })
      };
    }

    return {
      sucesso: true,
      dados: Object.assign(dadosBase, {
        acesso: true,
        nome: usuario.NOME || usuario.EMAIL,
        nivel: usuario.NIVEL,
        botoes: obterBotoesPorNivel_(usuario.NIVEL)
      })
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

/** Lista usuários. O servidor sempre revalida o perfil administrador. */
function listarUsuarios(filtros) {
  try {
    exigirAdministrador_();
    const aba = obterAbaUsuarios_();
    const criterios = filtros || {};
    const registros = lerRegistros_(aba, CABECALHOS_USUARIOS)
      .filter(function (usuario) {
        return correspondeAoFiltroId_(usuario.ID, criterios.id) &&
          correspondeAoFiltro_(usuario.NOME, criterios.nome) &&
          correspondeAoFiltro_(usuario.EMAIL, criterios.email) &&
          correspondeAoFiltro_(usuario.MATRICULA, criterios.matricula) &&
          correspondeAoFiltro_(usuario.DEPARTAMENTO, criterios.departamento) &&
          correspondeAoStatus_(usuario.STATUS, criterios.status);
      })
      .map(mapearUsuarioParaCliente_)
      .sort(function (a, b) {
        return Number(a.id) - Number(b.id);
      });

    return { sucesso: true, dados: registros };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

/** Cadastra ou edita um usuário. */
function salvarUsuario(dados) {
  const bloqueio = LockService.getDocumentLock();
  try {
    const administrador = exigirAdministrador_();
    const usuario = validarDadosUsuario_(dados);
    usuario.departamento = validarDepartamentoUsuario_(usuario.departamento);
    bloqueio.waitLock(10000);

    const aba = obterAbaUsuarios_();
    const registros = lerRegistros_(aba, CABECALHOS_USUARIOS);
    const linhaExistente = usuario.id ? buscarLinhaUsuarioPorId_(aba, usuario.id) : 0;

    if (usuario.id && !linhaExistente) {
      throw new Error('O usuário selecionado não foi encontrado.');
    }

    const duplicado = registros.find(function (item) {
      const outroRegistro = String(item.ID) !== usuario.id;
      const mesmoEmail = normalizarEmail_(item.EMAIL) === usuario.email;
      const mesmaMatricula = usuario.matricula &&
        String(item.MATRICULA).trim().toLowerCase() === usuario.matricula.toLowerCase();
      return outroRegistro && (mesmoEmail || mesmaMatricula);
    });
    if (duplicado) {
      throw new Error('Já existe um usuário com este e-mail ou matrícula.');
    }

    const agora = new Date().toISOString();
    if (linhaExistente) {
      const atual = lerRegistroDaLinha_(aba, linhaExistente, CABECALHOS_USUARIOS);
      if (normalizarEmail_(atual.EMAIL) === CONFIG.emailAdministrador &&
          (usuario.nivel !== 'ADMIN' || usuario.status !== 'ATIVO')) {
        throw new Error('A conta principal do SGI deve permanecer administradora e ativa.');
      }

      aba.getRange(linhaExistente, 1, 1, CABECALHOS_USUARIOS.length).setValues([[
        usuario.id,
        protegerTextoPlanilha_(usuario.email),
        protegerTextoPlanilha_(usuario.nome),
        usuario.nivel,
        usuario.status,
        atual.CRIADO_EM,
        agora,
        protegerTextoPlanilha_(usuario.matricula),
        protegerTextoPlanilha_(usuario.departamento)
      ]]);
    } else {
      usuario.id = obterProximoId_(registros);
      aba.appendRow([
        usuario.id,
        protegerTextoPlanilha_(usuario.email),
        protegerTextoPlanilha_(usuario.nome),
        usuario.nivel,
        usuario.status,
        agora,
        agora,
        protegerTextoPlanilha_(usuario.matricula),
        protegerTextoPlanilha_(usuario.departamento)
      ]);
    }

    console.info(JSON.stringify({
      acao: linhaExistente ? 'USUARIO_EDITADO' : 'USUARIO_CADASTRADO',
      usuarioId: usuario.id,
      realizadoPor: administrador.EMAIL
    }));
    return {
      sucesso: true,
      mensagem: linhaExistente
        ? 'Usuário editado com sucesso.'
        : 'Usuário cadastrado com sucesso.'
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/** Exclui o usuário selecionado. */
function excluirUsuario(id) {
  const bloqueio = LockService.getDocumentLock();
  try {
    const administrador = exigirAdministrador_();
    const idValidado = String(id || '').trim();
    if (!/^\d+$/.test(idValidado)) throw new Error('ID de usuário inválido.');

    bloqueio.waitLock(10000);
    const aba = obterAbaUsuarios_();
    const linha = buscarLinhaUsuarioPorId_(aba, idValidado);
    if (!linha) throw new Error('O usuário selecionado não foi encontrado.');

    const usuario = lerRegistroDaLinha_(aba, linha, CABECALHOS_USUARIOS);
    if (normalizarEmail_(usuario.EMAIL) === CONFIG.emailAdministrador) {
      throw new Error('A conta administradora principal não pode ser excluída.');
    }

    aba.deleteRow(linha);
    console.info(JSON.stringify({
      acao: 'USUARIO_EXCLUIDO',
      usuarioId: idValidado,
      realizadoPor: administrador.EMAIL
    }));
    return { sucesso: true, mensagem: 'Usuário excluído com sucesso.' };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/** Dados iniciais e opções da página de solicitações de Mapro. */
function carregarPaginaSolicitacoesMapro() {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const usuariosAtivos = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS)
      .filter(function (item) { return String(item.STATUS).toUpperCase() === 'ATIVO'; })
      .map(function (item) {
        return {
          id: formatarId_(Number(item.ID)),
          nome: String(item.NOME || ''),
          email: normalizarEmail_(item.EMAIL),
          departamento: String(item.DEPARTAMENTO || '').trim()
        };
      })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });

    return {
      sucesso: true,
      dados: {
        usuario: {
          id: formatarId_(Number(usuario.ID)),
          nome: String(usuario.NOME || ''),
          email: normalizarEmail_(usuario.EMAIL),
          nivel: String(usuario.NIVEL || '')
        },
        usuarios: usuariosAtivos,
        portfolios: lerOpcoesPortfolio_(),
        bases: obterBasesMapro_(),
        proximoIdSolicitacao: obterProximoIdSolicitacaoMapro_(
          lerRegistros_(obterAbaSolicitacoesMapro_(), CABECALHOS_SOLICITACOES_MAPRO)
        ),
        logoUrl: 'https://drive.google.com/thumbnail?id=' +
          CONFIG.logoCadastroId + '&sz=w4000',
        urlAplicacao: ScriptApp.getService().getUrl()
      }
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

/** Participantes veem as próprias solicitações; administradores veem todas. */
function listarSolicitacoesMapro(filtros) {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const administrador = String(usuario.NIVEL).toUpperCase() === 'ADMIN';
    const criterios = filtros || {};
    const registros = lerRegistros_(
      obterAbaSolicitacoesMapro_(),
      CABECALHOS_SOLICITACOES_MAPRO
    ).filter(function (item) {
      const pertenceAoUsuario = administrador ||
        normalizarEmail_(item['EMAIL_USUÁRIO']) === normalizarEmail_(usuario.EMAIL);
      return pertenceAoUsuario &&
        correspondeAoFiltroId_(item['ID_SOLICITAÇÃO'], criterios.id) &&
        correspondeAoFiltro_(item.NOME_PROJETO, criterios.projeto) &&
        correspondeAoFiltro_(item['PORTFÓLIO_UNIDADES'], criterios.portfolio) &&
        correspondeAoStatus_(item['STATUS_SOLICITAÇÃO'], criterios.status);
    }).map(mapearSolicitacaoMaproParaCliente_)
      .sort(function (a, b) { return Number(b.idSolicitacao) - Number(a.idSolicitacao); });

    return { sucesso: true, dados: registros };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

/** Cadastra ou edita uma solicitação do participante atual. */
function salvarSolicitacaoMapro(dados) {
  const bloqueio = LockService.getDocumentLock();
  let arquivoFotoNovo = null;
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    if (String(usuario.NIVEL).toUpperCase() !== 'PARTICIPANTE') {
      throw new Error('Somente participantes podem criar ou editar solicitações.');
    }
    const entrada = validarDadosSolicitacaoMapro_(dados);
    bloqueio.waitLock(10000);

    const aba = obterAbaSolicitacoesMapro_();
    const registros = lerRegistros_(aba, CABECALHOS_SOLICITACOES_MAPRO);
    const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS)
      .filter(function (item) { return String(item.STATUS).toUpperCase() === 'ATIVO'; });
    const lider = buscarUsuarioAtivoPorId_(usuarios, entrada.liderId);
    if (!lider) throw new Error('Selecione um líder de projeto válido.');
    const participantes = entrada.participanteIds.map(function (id) {
      const participante = buscarUsuarioAtivoPorId_(usuarios, id);
      if (!participante) {
        throw new Error('Um dos participantes iniciais selecionados não é válido.');
      }
      return participante;
    });
    if (lerOpcoesPortfolio_().indexOf(entrada.portfolio) === -1) {
      throw new Error('Selecione um portfólio válido.');
    }
    const bases = obterBasesMapro_();
    validarOpcaoBaseMapro_(entrada.contagiro, bases.contagiros, 'Contagiro');
    validarEstrategiaMapro_(entrada, bases.estrategia);
    const departamentoLider = obterDepartamentoCadastradoMapro_(lider, bases.departamentos);
    if (!departamentoLider) {
      throw new Error('O líder selecionado precisa possuir departamento cadastrado.');
    }
    if (!normalizarEmail_(lider.EMAIL)) {
      throw new Error('O líder selecionado precisa possuir e-mail cadastrado.');
    }
    entrada.departamento = departamentoLider;

    const agora = new Date().toISOString();
    const linhaExistente = entrada.idSolicitacao
      ? buscarLinhaSolicitacaoMapro_(aba, entrada.idSolicitacao)
      : 0;
    if (entrada.idSolicitacao && !linhaExistente) {
      throw new Error('A solicitação selecionada não foi encontrada.');
    }

    const atual = linhaExistente
      ? lerRegistroDaLinha_(aba, linhaExistente, CABECALHOS_SOLICITACOES_MAPRO)
      : {};
    if (linhaExistente) {
      if (normalizarEmail_(atual['EMAIL_USUÁRIO']) !== normalizarEmail_(usuario.EMAIL)) {
        throw new Error('Você não pode editar a solicitação de outro usuário.');
      }
      if (String(atual['STATUS_SOLICITAÇÃO']).toUpperCase() !== 'PENDENTE') {
        throw new Error('Somente solicitações pendentes podem ser editadas.');
      }
    }
    if (!entrada.fotoLiderBase64 &&
        (entrada.removerFotoLider || !String(atual.FOTO_LIDER_ID || '').trim())) {
      throw new Error('Adicione a imagem do líder antes de enviar a solicitação.');
    }

    const idPersistido = linhaExistente
      ? atual['ID_SOLICITAÇÃO']
      : obterProximoIdSolicitacaoMapro_(registros);
    const metadados = Object.assign({}, atual);
    const idFotoAnterior = String(atual.FOTO_LIDER_ID || '').trim();
    if (entrada.fotoLiderBase64) {
      const bytes = Utilities.base64Decode(entrada.fotoLiderBase64);
      if (!bytes.length || bytes.length > (2 * 1024 * 1024)) {
        throw new Error('A imagem do líder deve ter no máximo 2 MB após a otimização.');
      }
      validarAssinaturaImagemMapro_(bytes, entrada.fotoLiderTipo);
      const nomeArquivo = 'foto-lider-solicitacao-' +
        formatarId_(Number(idPersistido)) + '-' + Date.now() + '.jpg';
      arquivoFotoNovo = obterPastaFotosLideresMapro_().createFile(
        Utilities.newBlob(bytes, entrada.fotoLiderTipo, nomeArquivo)
      );
      metadados.FOTO_LIDER_ID = arquivoFotoNovo.getId();
      metadados.FOTO_LIDER_TIPO = entrada.fotoLiderTipo;
      metadados.FOTO_LIDER_ATUALIZADA_EM = agora;
      metadados.FOTO_LIDER_ATUALIZADA_POR = normalizarEmail_(usuario.EMAIL);
    } else if (entrada.removerFotoLider) {
      metadados.FOTO_LIDER_ID = '';
      metadados.FOTO_LIDER_TIPO = '';
      metadados.FOTO_LIDER_ATUALIZADA_EM = '';
      metadados.FOTO_LIDER_ATUALIZADA_POR = '';
    }

    const linhaDados = montarLinhaSolicitacaoMapro_(
      usuario, entrada, idPersistido,
      linhaExistente ? atual['STATUS_SOLICITAÇÃO'] : 'PENDENTE',
      linhaExistente ? atual.CRIADO_EM : agora,
      agora, lider, participantes, metadados
    );
    if (linhaExistente) {
      aba.getRange(linhaExistente, 1, 1, CABECALHOS_SOLICITACOES_MAPRO.length)
        .setValues([linhaDados]);
    } else {
      aba.appendRow(linhaDados);
    }
    if (idFotoAnterior && idFotoAnterior !== String(metadados.FOTO_LIDER_ID || '')) {
      excluirArquivoDriveMapro_(idFotoAnterior);
    }

    console.info(JSON.stringify({
      acao: linhaExistente ? 'SOLICITACAO_MAPRO_EDITADA' : 'SOLICITACAO_MAPRO_CRIADA',
      realizadoPor: usuario.EMAIL
    }));
    if (!linhaExistente) {
      bloqueio.releaseLock();
      enviarAvisoNovaSolicitacaoMaproSgi_(usuario.NOME);
    }
    return {
      sucesso: true,
      mensagem: linhaExistente
        ? 'Solicitação editada com sucesso.'
        : 'Solicitação enviada com sucesso.',
      dados: {idSolicitacao: formatarId_(Number(idPersistido))}
    };
  } catch (erro) {
    if (arquivoFotoNovo) excluirArquivoDriveMapro_(arquivoFotoNovo.getId());
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/** Avisa exclusivamente o SGI quando uma nova solicitação de Mapro é registrada. */
function enviarAvisoNovaSolicitacaoMaproSgi_(nomeSolicitante) {
  const destinatario = normalizarEmail_(CONFIG.emailAdministrador);
  if (!destinatario) {
    console.error(JSON.stringify({acao: 'FALHA_AVISO_NOVA_SOLICITACAO_MAPRO', erro: 'DESTINATARIO_NAO_CONFIGURADO'}));
    return false;
  }
  try {
    MailApp.sendEmail({
      to: destinatario,
      subject: 'NOVA SOLICITAÇÃO DE MAPRO',
      body: 'Olá, SGI!\n\nUma nova solicitação de Mapro foi recebida e está aguardando análise.\n\n' +
        'Solicitante: ' + String(nomeSolicitante || 'Não identificado') +
        '\n\nCORPORATIVO | P&G | SGI',
      htmlBody: montarEmailNovaSolicitacaoMaproSgiHtml_(nomeSolicitante),
      name: 'SGI MAPRO'
    });
    console.info(JSON.stringify({
      acao: 'AVISO_NOVA_SOLICITACAO_MAPRO_ENVIADO',
      destinatario: destinatario
    }));
    return true;
  } catch (erro) {
    console.error(JSON.stringify({
      acao: 'FALHA_AVISO_NOVA_SOLICITACAO_MAPRO',
      destinatario: destinatario,
      erro: erro && erro.message ? String(erro.message).slice(0, 300) : 'ERRO_DESCONHECIDO'
    }));
    return false;
  }
}

function montarEmailNovaSolicitacaoMaproSgiHtml_(nomeSolicitante) {
  const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
  const nome = String(nomeSolicitante || 'Não identificado');
  return '<!doctype html>' +
    '<html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px;overflow:hidden">' +
    '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto;transform:scale(1.3);transform-origin:center">' +
    '</td></tr>' +
    '<tr><td style="padding:34px;font-size:14px;line-height:1.6">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">' +
    '<div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;background:#fff0f3;color:#ec0e37;font-size:25px;line-height:52px;text-align:center">✦</div>' +
    '<p style="margin:0 0 7px;color:#ec0e37;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Nova solicitação</p>' +
    '<h1 style="margin:0 0 12px;color:#030441;font-size:22px;line-height:1.3">Uma Mapro aguarda sua análise</h1>' +
    '<p style="max-width:430px;margin:0 auto 24px;color:#5d5e70;font-size:15px;line-height:1.6">O SGI recebeu uma nova solicitação de Mapro. Acesse o portal para consultar e avaliar o pedido.</p>' +
    '</td></tr></table>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e3e4eb;border-radius:12px;background:#f7f7fa">' +
    '<tr><td style="padding:16px 18px">' +
    '<span style="display:block;margin-bottom:4px;color:#77788a;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Solicitante</span>' +
    '<strong style="display:block;color:#030441;font-size:16px;line-height:1.4">' + escaparHtml_(nome) + '</strong>' +
    '</td></tr></table>' +
    '</td></tr>' +
    '<tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800;letter-spacing:.06em">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI' +
    '</td></tr></table></td></tr></table></body></html>';
}

function excluirSolicitacaoMapro(idSolicitacao) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    if (String(usuario.NIVEL).toUpperCase() !== 'PARTICIPANTE') {
      throw new Error('Somente participantes podem excluir suas solicitações.');
    }
    bloqueio.waitLock(10000);
    const aba = obterAbaSolicitacoesMapro_();
    const linha = buscarLinhaSolicitacaoMapro_(aba, idSolicitacao);
    if (!linha) throw new Error('A solicitação selecionada não foi encontrada.');
    const registro = lerRegistroDaLinha_(aba, linha, CABECALHOS_SOLICITACOES_MAPRO);
    if (normalizarEmail_(registro['EMAIL_USUÁRIO']) !== normalizarEmail_(usuario.EMAIL)) {
      throw new Error('Você não pode excluir a solicitação de outro usuário.');
    }
    if (String(registro['STATUS_SOLICITAÇÃO']).toUpperCase() !== 'PENDENTE') {
      throw new Error('Somente solicitações pendentes podem ser excluídas.');
    }
    aba.deleteRow(linha);
    if (registro.FOTO_LIDER_ID) excluirArquivoDriveMapro_(String(registro.FOTO_LIDER_ID));
    console.info(JSON.stringify({
      acao: 'SOLICITACAO_MAPRO_EXCLUIDA',
      solicitacaoId: String(idSolicitacao),
      realizadoPor: usuario.EMAIL
    }));
    return { sucesso: true, mensagem: 'Solicitação excluída com sucesso.' };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function atualizarStatusSolicitacaoMapro(idSolicitacao, novoStatus, motivoRejeicao, urlWebAppAtual) {
  const bloqueio = LockService.getDocumentLock();
  try {
    garantirBancoConfigurado_();
    const administrador = exigirAdministrador_();
    registrarUrlPublicaAplicacao_(urlWebAppAtual);
    const status = String(novoStatus || '').trim().toUpperCase();
    if (['APROVADA', 'REJEITADA'].indexOf(status) === -1) {
      throw new Error('Status de aprovação inválido.');
    }
    bloqueio.waitLock(10000);
    const aba = obterAbaSolicitacoesMapro_();
    const linha = buscarLinhaSolicitacaoMapro_(aba, idSolicitacao);
    if (!linha) throw new Error('A solicitação selecionada não foi encontrada.');
    const registro = lerRegistroDaLinha_(aba, linha, CABECALHOS_SOLICITACOES_MAPRO);
    const nomeProjetoPadronizado = normalizarNomeProjeto_(registro.NOME_PROJETO);
    if (String(registro.NOME_PROJETO || '') !== nomeProjetoPadronizado) {
      aba.getRange(linha, 6).setValue(protegerTextoPlanilha_(nomeProjetoPadronizado));
      registro.NOME_PROJETO = nomeProjetoPadronizado;
    }
    const statusAtual = String(registro['STATUS_SOLICITAÇÃO']).toUpperCase();
    if (statusAtual === status) {
      return {
        sucesso: true,
        mensagem: status === 'APROVADA'
          ? 'Esta solicitação já estava aprovada.'
          : 'Esta solicitação já estava rejeitada.'
      };
    }
    if (statusAtual === 'APROVADA' && status === 'REJEITADA') {
      throw new Error('Uma solicitação aprovada não pode ser rejeitada.');
    }
    if (statusAtual !== 'PENDENTE') {
      throw new Error('Somente solicitações pendentes podem ser aprovadas ou rejeitadas.');
    }
    const motivo = status === 'REJEITADA'
      ? validarMotivoRejeicao_(motivoRejeicao)
      : '';
    const agora = new Date();
    aba.getRange(linha, 4).setValue(status);
    aba.getRange(linha, 11, 1, 2).setValues([[
      agora.toISOString(),
      protegerTextoPlanilha_(motivo)
    ]]);
    registro['STATUS_SOLICITAÇÃO'] = status;
    registro['MOTIVO_REJEIÇÃO'] = motivo;
    registro.ATUALIZADO_EM = agora.toISOString();
    if (status === 'APROVADA') {
      criarRegistroMaproAprovada_(
        registro,
        criarOuAtualizarAbaFlexivel_(
          obterPlanilha_(),
          CONFIG.abaMapros,
          CABECALHOS_MAPROS
        ),
        obterAbaUsuarios_()
      );
    }
    console.info(JSON.stringify({
      acao: status === 'APROVADA' ? 'SOLICITACAO_MAPRO_APROVADA' : 'SOLICITACAO_MAPRO_REJEITADA',
      solicitacaoId: String(idSolicitacao),
      realizadoPor: administrador.EMAIL
    }));
    bloqueio.releaseLock();

    let resultadoEmails = null;
    if (status === 'APROVADA') {
      resultadoEmails = enviarEmailsAprovacaoMapro_(registro, agora);
    } else {
      resultadoEmails = enviarEmailsRejeicaoMapro_(registro, motivo);
    }
    return {
      sucesso: true,
      mensagem: status === 'APROVADA'
        ? montarMensagemResultadoEmails_(resultadoEmails)
        : montarMensagemResultadoEmailsRejeicao_(resultadoEmails)
    };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

/** Registra uma solicitação e avisa o SGI por e-mail. */
function solicitarAcesso() {
  const bloqueio = LockService.getDocumentLock();
  try {
    const email = obterEmailUsuario_();
    bloqueio.waitLock(10000);

    if (buscarUsuarioPorEmail_(email)) {
      throw new Error('Sua conta já está cadastrada. Atualize a página.');
    }

    const aba = obterPlanilha_().getSheetByName(CONFIG.abaSolicitacoes);
    if (!aba) {
      throw new Error('Execute configurarBancoDeDados() antes de usar o sistema.');
    }

    const solicitacoes = lerRegistros_(aba, CABECALHOS_SOLICITACOES);
    const jaExiste = solicitacoes.some(function (item) {
      return normalizarEmail_(item.EMAIL) === email && item.STATUS === 'PENDENTE';
    });
    if (jaExiste) {
      throw new Error('Já existe uma solicitação pendente para sua conta.');
    }

    const protocolo = Utilities.getUuid();
    const agora = new Date();
    aba.appendRow([protocolo, email, 'PENDENTE', agora.toISOString()]);

    MailApp.sendEmail({
      to: CONFIG.emailAdministrador,
      subject: '[MAPRO] Nova solicitação de acesso',
      body: [
        'Uma nova solicitação de acesso foi registrada.',
        '',
        'E-mail: ' + email,
        'Data: ' + Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
        'Protocolo: ' + protocolo
      ].join('\n'),
      htmlBody: montarEmailSolicitacaoAcessoHtml_(email, agora, protocolo),
      name: CONFIG.nomeSistema
    });

    return { sucesso: true, mensagem: 'Solicitação enviada ao SGI com sucesso.' };
  } catch (erro) {
    return respostaDeErro_(erro);
  } finally {
    if (bloqueio.hasLock()) bloqueio.releaseLock();
  }
}

function montarEmailSolicitacaoAcessoHtml_(email, dataSolicitacao, protocolo) {
  const logoUrl = 'https://drive.google.com/thumbnail?id=' + CONFIG.logoId + '&sz=w4000';
  const dataFormatada = Utilities.formatDate(
    dataSolicitacao,
    'America/Sao_Paulo',
    'dd/MM/yyyy HH:mm:ss'
  );
  return '<!doctype html>' +
    '<html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px;overflow:hidden">' +
    '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto;transform:scale(1.3);transform-origin:center">' +
    '</td></tr>' +
    '<tr><td style="padding:34px;font-size:14px;line-height:1.6">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">' +
    '<div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;background:#fff0f3;color:#ec0e37;font-size:25px;line-height:52px;text-align:center">✦</div>' +
    '<p style="margin:0 0 7px;color:#ec0e37;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Solicitação de acesso</p>' +
    '<h1 style="margin:0 0 12px;color:#030441;font-size:22px;line-height:1.3">Um novo usuário aguarda análise</h1>' +
    '<p style="max-width:430px;margin:0 auto 24px;color:#5d5e70;font-size:15px;line-height:1.6">O SGI recebeu uma nova solicitação de acesso ao Portal Mapros.</p>' +
    '</td></tr></table>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e3e4eb;border-radius:12px;background:#f7f7fa">' +
    montarLinhaEmail_('E-mail solicitado', normalizarEmail_(email)) +
    montarLinhaEmail_('Data da solicitação', dataFormatada) +
    montarLinhaEmail_('Protocolo', String(protocolo || '')) +
    '</table>' +
    '</td></tr>' +
    '<tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800;letter-spacing:.06em">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI' +
    '</td></tr></table></td></tr></table></body></html>';
}

function obterPlanilha_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) {
    throw new Error(
      'Este código precisa estar vinculado à planilha que será usada como banco de dados.'
    );
  }
  return planilha;
}

function obterEmailUsuario_() {
  const email = normalizarEmail_(Session.getActiveUser().getEmail());
  if (!email) {
    throw new Error('Não foi possível identificar sua conta Google corporativa.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    throw new Error('A conta Google identificada não possui um e-mail válido.');
  }
  return email;
}

function buscarUsuarioPorEmail_(email) {
  const aba = obterPlanilha_().getSheetByName(CONFIG.abaUsuarios);
  if (!aba) return null;

  return lerRegistros_(aba, CABECALHOS_USUARIOS).find(function (usuario) {
    return normalizarEmail_(usuario.EMAIL) === normalizarEmail_(email);
  }) || null;
}

function lerRegistros_(aba, cabecalhos) {
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, cabecalhos.length)
    .getValues()
    .map(function (linha) {
      return cabecalhos.reduce(function (registro, coluna, indice) {
        registro[coluna] = linha[indice];
        return registro;
      }, {});
    });
}

function criarOuAtualizarAba_(planilha, nome, cabecalhos) {
  let aba = planilha.getSheetByName(nome);
  if (!aba) aba = planilha.insertSheet(nome);

  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  } else {
    const totalExistente = aba.getLastColumn();
    const existentes = aba.getRange(1, 1, 1, totalExistente).getValues()[0];
    const prefixoValido = existentes.every(function (cabecalho, indice) {
      return cabecalhos[indice] === cabecalho;
    });

    if (!prefixoValido && nome === CONFIG.abaUsuarios) {
      migrarCabecalhosUsuarios_(aba, existentes, cabecalhos);
    } else if (!prefixoValido) {
      throw new Error('Os cabeçalhos da aba ' + nome + ' não são compatíveis.');
    } else if (existentes.length < cabecalhos.length) {
      const faltantes = cabecalhos.slice(existentes.length);
      aba.getRange(1, existentes.length + 1, 1, faltantes.length).setValues([faltantes]);
    }
  }
  return aba;
}

function criarOuAtualizarAbaFlexivel_(planilha, nome, cabecalhos) {
  let aba = planilha.getSheetByName(nome);
  if (!aba) aba = planilha.insertSheet(nome);
  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
    return aba;
  }

  const existentes = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const existentesNormalizados = existentes.map(normalizarCabecalho_);
  const indicesUsados = {};
  const indicesPadrao = cabecalhos.map(function (cabecalho) {
    const procurado = normalizarCabecalho_(cabecalho);
    const indice = existentesNormalizados.findIndex(function (valor, posicao) {
      return !indicesUsados[posicao] && valor === procurado;
    });
    if (indice !== -1) indicesUsados[indice] = true;
    return indice;
  });
  const jaEstaNoPadrao = cabecalhos.every(function (cabecalho, indice) {
    return normalizarCabecalho_(existentes[indice]) === normalizarCabecalho_(cabecalho);
  });
  if (jaEstaNoPadrao) return aba;

  const indicesExtras = existentes.reduce(function (resultado, cabecalho, indice) {
    if (!indicesUsados[indice] && String(cabecalho || '').trim()) resultado.push(indice);
    return resultado;
  }, []);
  const cabecalhosExtras = indicesExtras.map(function (indice) { return existentes[indice]; });
  const novosCabecalhos = cabecalhos.concat(cabecalhosExtras);
  const dadosAntigos = aba.getLastRow() > 1
    ? aba.getRange(2, 1, aba.getLastRow() - 1, existentes.length).getValues()
    : [];
  const dadosMigrados = dadosAntigos.map(function (linha) {
    return indicesPadrao.map(function (indice) {
      return indice === -1 ? '' : linha[indice];
    }).concat(indicesExtras.map(function (indice) { return linha[indice]; }));
  });

  aba.getDataRange().clearContent();
  aba.getRange(1, 1, 1, novosCabecalhos.length).setValues([novosCabecalhos]);
  if (dadosMigrados.length) {
    aba.getRange(2, 1, dadosMigrados.length, novosCabecalhos.length)
      .setValues(dadosMigrados);
  }
  return aba;
}

function migrarCabecalhosUsuarios_(aba, existentes, cabecalhosPadrao) {
  const aliases = {
    ID: ['ID'],
    EMAIL: ['EMAIL', 'E_MAIL'],
    NOME: ['NOME', 'NAME', 'USUARIO'],
    NIVEL: ['NIVEL', 'PERFIL', 'ROLE'],
    STATUS: ['STATUS', 'SITUACAO'],
    CRIADO_EM: ['CRIADOEM', 'DATACRIACAO', 'CREATEDAT'],
    ATUALIZADO_EM: ['ATUALIZADOEM', 'ULTIMAATUALIZACAO', 'UPDATEDAT'],
    MATRICULA: ['MATRICULA', 'REGISTRO'],
    DEPARTAMENTO: ['DEPARTAMENTO', 'DEPARTMENT', 'AREA']
  };
  const normalizados = existentes.map(normalizarCabecalho_);
  const indicesUsados = {};
  const indicesPadrao = cabecalhosPadrao.map(function (cabecalho) {
    const opcoes = aliases[cabecalho] || [normalizarCabecalho_(cabecalho)];
    const indice = normalizados.findIndex(function (existente, posicao) {
      return !indicesUsados[posicao] && opcoes.indexOf(existente) !== -1;
    });
    if (indice !== -1) indicesUsados[indice] = true;
    return indice;
  });
  const indicesExtras = existentes.reduce(function (indices, cabecalho, indice) {
    if (!indicesUsados[indice] && String(cabecalho || '').trim()) indices.push(indice);
    return indices;
  }, []);
  const cabecalhosExtras = indicesExtras.map(function (indice) {
    return existentes[indice];
  });
  const novosCabecalhos = cabecalhosPadrao.concat(cabecalhosExtras);
  const totalLinhas = aba.getLastRow();
  const dadosAntigos = totalLinhas > 1
    ? aba.getRange(2, 1, totalLinhas - 1, existentes.length).getValues()
    : [];
  const dadosMigrados = dadosAntigos.map(function (linha) {
    const padrao = indicesPadrao.map(function (indice) {
      return indice === -1 ? '' : linha[indice];
    });
    const extras = indicesExtras.map(function (indice) { return linha[indice]; });
    return padrao.concat(extras);
  });

  aba.getDataRange().clearContent();
  aba.getRange(1, 1, 1, novosCabecalhos.length).setValues([novosCabecalhos]);
  if (dadosMigrados.length) {
    aba.getRange(2, 1, dadosMigrados.length, novosCabecalhos.length)
      .setValues(dadosMigrados);
  }
}

function normalizarCabecalho_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function normalizarIdsUsuarios_(aba) {
  if (aba.getLastRow() < 2) return;
  const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues();
  const usados = {};
  valores.forEach(function (linha) {
    const id = String(linha[0] || '').trim();
    if (/^\d+$/.test(id)) usados[Number(id)] = true;
  });

  let proximo = 1;
  const normalizados = valores.map(function (linha) {
    const atual = String(linha[0] || '').trim();
    if (/^\d+$/.test(atual)) return [formatarId_(Number(atual))];
    while (usados[proximo]) proximo += 1;
    usados[proximo] = true;
    return [formatarId_(proximo++)];
  });
  aba.getRange(2, 1, normalizados.length, 1)
    .setNumberFormat('@')
    .setValues(normalizados);
}

function normalizarPerfisEStatus_(aba) {
  if (aba.getLastRow() < 2) return;
  const total = aba.getLastRow() - 1;
  const emails = aba.getRange(2, 2, total, 1).getDisplayValues();
  const perfisEStatus = aba.getRange(2, 4, total, 2).getValues();
  const mapaPerfis = {
    ADMIN: 'ADMIN',
    LEADER: 'PARTICIPANTE',
    LIDER: 'PARTICIPANTE',
    PARTICIPANT: 'PARTICIPANTE',
    PARTICIPANTE: 'PARTICIPANTE'
  };
  const mapaStatus = {
    ACTIVE: 'ATIVO',
    ATIVO: 'ATIVO',
    INACTIVE: 'INATIVO',
    INATIVO: 'INATIVO'
  };

  const normalizados = perfisEStatus.map(function (linha, indice) {
    if (normalizarEmail_(emails[indice][0]) === CONFIG.emailAdministrador) {
      return ['ADMIN', 'ATIVO'];
    }
    const perfil = String(linha[0] || '').toUpperCase();
    const status = String(linha[1] || '').toUpperCase();
    return [mapaPerfis[perfil] || perfil, mapaStatus[status] || status];
  });
  aba.getRange(2, 4, total, 2).setValues(normalizados);
}

function exigirAdministrador_() {
  const email = obterEmailUsuario_();
  const usuario = buscarUsuarioPorEmail_(email);
  if (!usuario || String(usuario.STATUS).toUpperCase() !== 'ATIVO' ||
      String(usuario.NIVEL).toUpperCase() !== 'ADMIN') {
    throw new Error('Você não possui permissão para gerenciar usuários.');
  }
  return usuario;
}

function obterAbaUsuarios_() {
  const planilha = obterPlanilha_();
  const aba = criarOuAtualizarAba_(planilha, CONFIG.abaUsuarios, CABECALHOS_USUARIOS);
  normalizarIdsUsuarios_(aba);
  return aba;
}

function buscarLinhaUsuarioPorId_(aba, id) {
  if (aba.getLastRow() < 2) return 0;
  const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getDisplayValues();
  const idNormalizado = String(Number(id));
  const indice = valores.findIndex(function (linha) {
    return String(Number(linha[0])) === idNormalizado;
  });
  return indice === -1 ? 0 : indice + 2;
}

function lerRegistroDaLinha_(aba, linha, cabecalhos) {
  const valores = aba.getRange(linha, 1, 1, cabecalhos.length).getValues()[0];
  return cabecalhos.reduce(function (registro, cabecalho, indice) {
    registro[cabecalho] = valores[indice];
    return registro;
  }, {});
}

function obterProximoId_(registros) {
  const maior = registros.reduce(function (maximo, usuario) {
    const numero = Number(usuario.ID);
    return Number.isFinite(numero) ? Math.max(maximo, numero) : maximo;
  }, 0);
  return formatarId_(maior + 1);
}

function formatarId_(numero) {
  return String(numero).padStart(2, '0');
}

/** Retorna as opções vigentes da coluna DEPARTAMENTO da base corporativa. */
function listarDepartamentosCadastroUsuarios_() {
  const aba = obterPlanilha_().getSheetByName(CONFIG.abaBaseDepartamentos);
  if (!aba || aba.getLastRow() < 2) return [];
  const cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0];
  const indice = cabecalhos.map(normalizarCabecalho_).indexOf('DEPARTAMENTO');
  if (indice === -1) return [];
  const valores = aba.getRange(2, indice + 1, aba.getLastRow() - 1, 1).getDisplayValues();
  const vistos = {};
  return valores.map(function (linha) { return String(linha[0] || '').trim(); })
    .filter(function (departamento) {
      const chave = normalizarTexto_(departamento);
      if (!chave || vistos[chave]) return false;
      vistos[chave] = true;
      return true;
    })
    .sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
}

function validarDepartamentoUsuario_(departamento) {
  const informado = String(departamento || '').trim();
  const opcoes = listarDepartamentosCadastroUsuarios_();
  if (!opcoes.length) {
    throw new Error('A BASE_DEPARTAMENTOS não possui opções disponíveis.');
  }
  const correspondente = opcoes.find(function (opcao) {
    return normalizarTexto_(opcao) === normalizarTexto_(informado);
  });
  if (!correspondente) throw new Error('Selecione um departamento válido.');
  return correspondente;
}

function validarDadosUsuario_(dados) {
  const entrada = dados || {};
  const usuario = {
    id: String(entrada.id || '').trim(),
    nome: String(entrada.nome || '').trim(),
    email: normalizarEmail_(entrada.email),
    matricula: String(entrada.matricula || '').trim(),
    departamento: String(entrada.departamento || '').trim(),
    nivel: String(entrada.nivel || '').trim().toUpperCase(),
    status: String(entrada.status || '').trim().toUpperCase()
  };

  if (usuario.id && !/^\d+$/.test(usuario.id)) throw new Error('ID inválido.');
  if (usuario.nome.length < 2 || usuario.nome.length > 120) {
    throw new Error('Informe um nome entre 2 e 120 caracteres.');
  }
  const padraoEmail = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  if (!padraoEmail.test(usuario.email)) {
    throw new Error('Informe um e-mail válido do Grupo JCA.');
  }
  if (!usuario.matricula || usuario.matricula.length > 30) {
    throw new Error('Informe uma matrícula válida.');
  }
  if (!usuario.departamento) {
    throw new Error('Selecione o departamento do usuário.');
  }
  if (['ADMIN', 'PARTICIPANTE'].indexOf(usuario.nivel) === -1) {
    throw new Error('Selecione um nível de usuário válido.');
  }
  if (['ATIVO', 'INATIVO'].indexOf(usuario.status) === -1) {
    throw new Error('Selecione um status válido.');
  }
  return usuario;
}

function mapearUsuarioParaCliente_(usuario) {
  return {
    id: formatarId_(Number(usuario.ID)),
    nome: String(usuario.NOME || ''),
    email: normalizarEmail_(usuario.EMAIL),
    matricula: String(usuario.MATRICULA || ''),
    departamento: String(usuario.DEPARTAMENTO || ''),
    nivel: String(usuario.NIVEL || ''),
    status: String(usuario.STATUS || ''),
    atualizadoEm: String(usuario.ATUALIZADO_EM || '')
  };
}

function correspondeAoFiltro_(valor, filtro) {
  const termo = normalizarTexto_(filtro);
  return !termo || normalizarTexto_(valor).indexOf(termo) !== -1;
}

function correspondeAoFiltroId_(valor, filtro) {
  const termo = String(filtro == null ? '' : filtro).trim();
  if (!termo) return true;
  const valorTexto = String(valor == null ? '' : valor).trim();
  if (/^\d+$/.test(termo) && /^\d+$/.test(valorTexto)) {
    return Number(valorTexto) === Number(termo);
  }
  return valorTexto.toLowerCase().indexOf(termo.toLowerCase()) !== -1;
}

function correspondeAoStatus_(valor, filtro) {
  const status = String(filtro || '').trim().toUpperCase();
  return !status || status === 'TODOS' || String(valor || '').toUpperCase() === status;
}

function protegerTextoPlanilha_(valor) {
  const texto = String(valor == null ? '' : valor);
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function exigirUsuarioAtivo_() {
  const email = obterEmailUsuario_();
  const usuario = buscarUsuarioPorEmail_(email);
  if (!usuario || String(usuario.STATUS).toUpperCase() !== 'ATIVO') {
    throw new Error('Seu usuário não está ativo no sistema.');
  }
  if (['ADMIN', 'PARTICIPANTE'].indexOf(String(usuario.NIVEL).toUpperCase()) === -1) {
    throw new Error('Seu nível de usuário não é válido.');
  }
  return usuario;
}

function obterAbaSolicitacoesMapro_() {
  return criarOuAtualizarAbaFlexivel_(
    obterPlanilha_(),
    CONFIG.abaSolicitacoesMapro,
    CABECALHOS_SOLICITACOES_MAPRO
  );
}

function lerOpcoesPortfolio_() {
  const planilha = obterPlanilha_();
  const nomesAceitos = ['PORTFOLIO', 'PORTIFOLIO', 'PORTFOLIOUNIDADES'];
  const nomesAbasAceitos = ['BASEPORTFOLIO', 'BASEPORTIFOLIO'];
  const todasAsAbas = planilha.getSheets();
  let abasCandidatas = todasAsAbas.filter(function (aba) {
    return nomesAbasAceitos.indexOf(normalizarCabecalho_(aba.getName())) !== -1;
  });

  if (!abasCandidatas.length) {
    abasCandidatas = todasAsAbas.filter(function (aba) {
      if (aba.getName() === CONFIG.abaSolicitacoesMapro || aba.getLastColumn() < 1) return false;
      const cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0];
      return cabecalhos.some(function (cabecalho) {
        const nome = normalizarCabecalho_(cabecalho);
        return nome === 'PORTFOLIO' || nome === 'PORTIFOLIO';
      });
    });
  }

  if (!abasCandidatas.length) abasCandidatas = [garantirAbaBasePortfolio_(planilha)];
  const opcoes = [];
  let encontrouCabecalho = false;
  abasCandidatas.forEach(function (aba) {
    if (aba.getLastColumn() < 1) return;
    const cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0];
    const colunas = cabecalhos.reduce(function (resultado, cabecalho, indice) {
      if (nomesAceitos.indexOf(normalizarCabecalho_(cabecalho)) !== -1) {
        resultado.push(indice + 1);
      }
      return resultado;
    }, []);
    if (colunas.length) encontrouCabecalho = true;
    if (aba.getLastRow() < 2) return;
    colunas.forEach(function (coluna) {
      aba.getRange(2, coluna, aba.getLastRow() - 1, 1).getDisplayValues()
        .forEach(function (linha) {
          const valor = String(linha[0] || '').trim();
          if (valor) opcoes.push(valor);
        });
    });
  });

  if (!encontrouCabecalho) {
    throw new Error(
      'A aba BASE_PORTFÓLIO precisa ter uma coluna chamada PORTFÓLIO.'
    );
  }
  return Array.from(new Set(opcoes)).sort(function (a, b) {
    return a.localeCompare(b, 'pt-BR');
  });
}

function garantirAbaBasePortfolio_(planilha) {
  let aba = planilha.getSheetByName(CONFIG.abaBasePortfolio);
  if (!aba) {
    aba = planilha.insertSheet(CONFIG.abaBasePortfolio);
    aba.getRange(1, 1).setValue('PORTFÓLIO');
  } else if (aba.getLastRow() === 0) {
    aba.getRange(1, 1).setValue('PORTFÓLIO');
  }
  return aba;
}

function validarDadosSolicitacaoMapro_(dados) {
  const entrada = dados || {};
  const participanteIds = Array.isArray(entrada.participanteIds)
    ? entrada.participanteIds.map(function (id) { return String(id || '').trim(); })
    : [];
  const solicitacao = {
    idSolicitacao: String(entrada.idSolicitacao || '').trim(),
    portfolio: String(entrada.portfolio || '').trim(),
    nomeProjeto: normalizarNomeProjeto_(entrada.nomeProjeto),
    liderId: String(entrada.liderId || '').trim(),
    participanteIds: Array.from(new Set(participanteIds.filter(Boolean))),
    contagiro: String(entrada.contagiro || '').trim(),
    nivel: String(entrada.nivel || '').trim().toUpperCase(),
    negocio: String(entrada.negocio || '').trim(),
    dimensaoBsc: String(entrada.dimensaoBsc || '').trim(),
    objetivoBsc: String(entrada.objetivoBsc || '').trim(),
    oQueE: String(entrada.oQueE || '').trim(),
    porque: String(entrada.porque || '').trim(),
    resultadosEsperados: String(entrada.resultadosEsperados || '').trim(),
    possuiIndicadoresDefinidos: String(entrada.possuiIndicadoresDefinidos || '')
      .trim().toUpperCase(),
    indicadores: String(entrada.indicadores || '').trim(),
    processoCritico: String(entrada.processoCritico || '').trim().toUpperCase(),
    envolveSistema: String(entrada.envolveSistema || '').trim().toUpperCase(),
    sistemasEnvolvidos: String(entrada.sistemasEnvolvidos || '').trim(),
    fotoLiderTipo: String(entrada.fotoLiderTipo || '').trim().toLowerCase(),
    fotoLiderBase64: String(entrada.fotoLiderBase64 || '').replace(/\s/g, ''),
    removerFotoLider: Boolean(entrada.removerFotoLider)
  };
  if (solicitacao.idSolicitacao && !/^\d+$/.test(solicitacao.idSolicitacao)) {
    throw new Error('ID da solicitação inválido.');
  }
  if (!solicitacao.portfolio || solicitacao.portfolio.length > 160) {
    throw new Error('Selecione um portfólio válido.');
  }
  if (solicitacao.nomeProjeto.length < 3 || solicitacao.nomeProjeto.length > 160) {
    throw new Error('Informe um nome de projeto entre 3 e 160 caracteres.');
  }
  if (!/^\d+$/.test(solicitacao.liderId)) {
    throw new Error('Selecione o líder do projeto.');
  }
  if (!solicitacao.participanteIds.length ||
      solicitacao.participanteIds.some(function (id) { return !/^\d+$/.test(id); })) {
    throw new Error('Selecione ao menos um participante inicial.');
  }
  if (!solicitacao.contagiro) throw new Error('Selecione a Contagiro.');
  if (['ESTRATÉGICO', 'TÁTICO', 'OPERACIONAL'].indexOf(solicitacao.nivel) === -1) {
    throw new Error('Selecione um nível válido.');
  }
  if (!solicitacao.negocio || !solicitacao.dimensaoBsc || !solicitacao.objetivoBsc) {
    throw new Error('Preencha Negócio, Dimensão BSC e Objetivo BSC.');
  }
  validarTextoSolicitacaoMapro_(solicitacao.oQueE, 'O que é o projeto');
  validarTextoSolicitacaoMapro_(solicitacao.porque, 'Por que');
  validarTextoSolicitacaoMapro_(solicitacao.resultadosEsperados, 'Resultados esperados');
  validarRespostaSimNaoSolicitacaoMapro_(
    solicitacao.possuiIndicadoresDefinidos,
    'Informe se o projeto já possui indicadores definidos.'
  );
  validarRespostaSimNaoSolicitacaoMapro_(
    solicitacao.processoCritico,
    'Informe se é um processo crítico.'
  );
  validarRespostaSimNaoSolicitacaoMapro_(
    solicitacao.envolveSistema,
    'Informe se o projeto envolverá algum sistema.'
  );
  if (solicitacao.possuiIndicadoresDefinidos === 'SIM') {
    validarTextoSolicitacaoMapro_(solicitacao.indicadores, 'Indicadores');
  } else {
    solicitacao.indicadores = '';
  }
  if (solicitacao.envolveSistema === 'SIM') {
    validarTextoSolicitacaoMapro_(solicitacao.sistemasEnvolvidos, 'Sistema(s) envolvido(s)');
  } else {
    solicitacao.sistemasEnvolvidos = '';
  }
  if (solicitacao.fotoLiderBase64) {
    if (solicitacao.fotoLiderTipo !== 'image/jpeg' ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(solicitacao.fotoLiderBase64)) {
      throw new Error('O conteúdo da imagem do líder é inválido.');
    }
  }
  return solicitacao;
}

function validarTextoSolicitacaoMapro_(valor, campo) {
  const texto = String(valor || '').trim();
  if (texto.length < 3 || texto.length > 3000) {
    throw new Error('Preencha ' + campo + ' com 3 a 3.000 caracteres.');
  }
}

function validarRespostaSimNaoSolicitacaoMapro_(valor, mensagem) {
  if (['SIM', 'NÃO'].indexOf(String(valor || '').toUpperCase()) === -1) {
    throw new Error(mensagem);
  }
}

function validarMotivoRejeicao_(valor) {
  const motivo = String(valor || '').trim();
  if (motivo.length < 5 || motivo.length > 1000) {
    throw new Error('Informe um motivo de rejeição entre 5 e 1.000 caracteres.');
  }
  return motivo;
}

function buscarUsuarioAtivoPorId_(usuarios, id) {
  const procurado = String(Number(id));
  return usuarios.find(function (usuario) {
    return String(Number(usuario.ID)) === procurado;
  }) || null;
}

function montarLinhaSolicitacaoMapro_(
  usuario,
  entrada,
  idSolicitacao,
  status,
  criadoEm,
  atualizadoEm,
  lider,
  participantes,
  metadados
) {
  const estado = metadados || {};
  const valores = {
    ID_USUARIO: formatarId_(Number(usuario.ID)),
    NOME: protegerTextoPlanilha_(usuario.NOME),
    'ID_SOLICITAÇÃO': formatarId_(Number(idSolicitacao)),
    'STATUS_SOLICITAÇÃO': String(status).toUpperCase(),
    'PORTFÓLIO_UNIDADES': protegerTextoPlanilha_(entrada.portfolio),
    NOME_PROJETO: protegerTextoPlanilha_(entrada.nomeProjeto),
    'LÍDER_PROJETO': protegerTextoPlanilha_(lider.NOME),
    PARTICIPANTES: protegerTextoPlanilha_(participantes.map(function (item) {
      return item.NOME;
    }).join('; ')),
    'EMAIL_USUÁRIO': normalizarEmail_(usuario.EMAIL),
    CRIADO_EM: String(criadoEm),
    ATUALIZADO_EM: String(atualizadoEm),
    'MOTIVO_REJEIÇÃO': protegerTextoPlanilha_(estado['MOTIVO_REJEIÇÃO'] || ''),
    'ID_LÍDER': formatarId_(Number(lider.ID)),
    'EMAIL_LÍDER': normalizarEmail_(lider.EMAIL),
    DEPARTAMENTO: protegerTextoPlanilha_(entrada.departamento),
    CONTAGIRO: protegerTextoPlanilha_(entrada.contagiro),
    NIVEL: entrada.nivel,
    NEGOCIO: protegerTextoPlanilha_(entrada.negocio),
    DIMENSAO_BSC: protegerTextoPlanilha_(entrada.dimensaoBsc),
    OBJETIVO_BSC: protegerTextoPlanilha_(entrada.objetivoBsc),
    O_QUE_E: protegerTextoPlanilha_(entrada.oQueE),
    PORQUE: protegerTextoPlanilha_(entrada.porque),
    RESULTADOS_ESPERADOS: protegerTextoPlanilha_(entrada.resultadosEsperados),
    POSSUI_INDICADORES_DEFINIDOS: entrada.possuiIndicadoresDefinidos,
    INDICADORES: protegerTextoPlanilha_(entrada.indicadores),
    PROCESSO_CRITICO: entrada.processoCritico,
    ENVOLVE_SISTEMA: entrada.envolveSistema,
    SISTEMAS_ENVOLVIDOS: protegerTextoPlanilha_(entrada.sistemasEnvolvidos),
    FOTO_LIDER_ID: String(estado.FOTO_LIDER_ID || ''),
    FOTO_LIDER_TIPO: String(estado.FOTO_LIDER_TIPO || ''),
    FOTO_LIDER_ATUALIZADA_EM: String(estado.FOTO_LIDER_ATUALIZADA_EM || ''),
    FOTO_LIDER_ATUALIZADA_POR: String(estado.FOTO_LIDER_ATUALIZADA_POR || '')
  };
  return CABECALHOS_SOLICITACOES_MAPRO.map(function (cabecalho) {
    return Object.prototype.hasOwnProperty.call(valores, cabecalho)
      ? valores[cabecalho] : estado[cabecalho] || '';
  });
}

function obterProximoIdSolicitacaoMapro_(registros) {
  const maior = registros.reduce(function (maximo, item) {
    const numero = Number(item['ID_SOLICITAÇÃO']);
    return Number.isFinite(numero) ? Math.max(maximo, numero) : maximo;
  }, 0);
  return formatarId_(maior + 1);
}

function buscarLinhaSolicitacaoMapro_(aba, idSolicitacao) {
  if (aba.getLastRow() < 2 || !/^\d+$/.test(String(idSolicitacao || '').trim())) return 0;
  const procurado = String(Number(idSolicitacao));
  const valores = aba.getRange(2, 3, aba.getLastRow() - 1, 1).getDisplayValues();
  const indice = valores.findIndex(function (linha) {
    return String(Number(linha[0])) === procurado;
  });
  return indice === -1 ? 0 : indice + 2;
}

function mapearSolicitacaoMaproParaCliente_(item) {
  return {
    idUsuario: formatarId_(Number(item.ID_USUARIO)),
    nome: String(item.NOME || ''),
    idSolicitacao: formatarId_(Number(item['ID_SOLICITAÇÃO'])),
    status: String(item['STATUS_SOLICITAÇÃO'] || ''),
    portfolio: String(item['PORTFÓLIO_UNIDADES'] || ''),
    nomeProjeto: normalizarNomeProjeto_(item.NOME_PROJETO),
    liderProjeto: String(item['LÍDER_PROJETO'] || ''),
    participantes: String(item.PARTICIPANTES || ''),
    emailUsuario: normalizarEmail_(item['EMAIL_USUÁRIO']),
    criadoEm: String(item.CRIADO_EM || ''),
    atualizadoEm: String(item.ATUALIZADO_EM || ''),
    motivoRejeicao: String(item['MOTIVO_REJEIÇÃO'] || ''),
    idLider: item['ID_LÍDER'] ? formatarId_(Number(item['ID_LÍDER'])) : '',
    emailLider: normalizarEmail_(item['EMAIL_LÍDER']),
    departamento: String(item.DEPARTAMENTO || ''),
    contagiro: String(item.CONTAGIRO || ''),
    nivel: String(item.NIVEL || ''),
    negocio: String(item.NEGOCIO || ''),
    dimensaoBsc: String(item.DIMENSAO_BSC || ''),
    objetivoBsc: String(item.OBJETIVO_BSC || ''),
    oQueE: String(item.O_QUE_E || ''),
    porque: String(item.PORQUE || ''),
    resultadosEsperados: String(item.RESULTADOS_ESPERADOS || ''),
    possuiIndicadoresDefinidos: String(item.POSSUI_INDICADORES_DEFINIDOS || ''),
    indicadores: String(item.INDICADORES || ''),
    processoCritico: String(item.PROCESSO_CRITICO || ''),
    envolveSistema: String(item.ENVOLVE_SISTEMA || ''),
    sistemasEnvolvidos: String(item.SISTEMAS_ENVOLVIDOS || ''),
    possuiFotoLider: Boolean(item.FOTO_LIDER_ID)
  };
}

/** Retorna a foto compartilhada da solicitação apenas a quem pode visualizá-la. */
function obterFotoLiderSolicitacaoMapro(idSolicitacao) {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const aba = obterAbaSolicitacoesMapro_();
    const linha = buscarLinhaSolicitacaoMapro_(aba, idSolicitacao);
    if (!linha) throw new Error('A solicitação selecionada não foi encontrada.');
    const registro = lerRegistroDaLinha_(aba, linha, CABECALHOS_SOLICITACOES_MAPRO);
    const administrador = String(usuario.NIVEL || '').toUpperCase() === 'ADMIN';
    const proprietario = normalizarEmail_(registro['EMAIL_USUÁRIO']) ===
      normalizarEmail_(usuario.EMAIL);
    if (!administrador && !proprietario) {
      throw new Error('Você não possui acesso a esta solicitação.');
    }
    return {sucesso: true, dados: {imagem: obterFotoLiderMaproParaCliente_(registro)}};
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function sincronizarMaprosAprovadas_(abaSolicitacoes, abaMapros, abaUsuarios) {
  const solicitacoesAprovadas = lerRegistros_(
    abaSolicitacoes,
    CABECALHOS_SOLICITACOES_MAPRO
  ).filter(function (item) {
    return String(item['STATUS_SOLICITAÇÃO']).toUpperCase() === 'APROVADA';
  });
  if (!solicitacoesAprovadas.length) return;

  const usuarios = lerRegistros_(abaUsuarios, CABECALHOS_USUARIOS);
  const mapros = lerRegistros_(abaMapros, CABECALHOS_MAPROS);
  const solicitacoesExistentes = {};
  mapros.forEach(function (mapro) {
    solicitacoesExistentes[String(Number(mapro['ID_SOLICITAÇÃO']))] = true;
  });
  const novasLinhas = [];

  solicitacoesAprovadas.forEach(function (solicitacao) {
    const chave = String(Number(solicitacao['ID_SOLICITAÇÃO']));
    if (solicitacoesExistentes[chave]) return;
    novasLinhas.push(montarLinhaMaproAprovada_(solicitacao, usuarios));
    solicitacoesExistentes[chave] = true;
  });

  if (novasLinhas.length) {
    abaMapros.getRange(
      abaMapros.getLastRow() + 1,
      1,
      novasLinhas.length,
      CABECALHOS_MAPROS.length
    ).setValues(novasLinhas);
  }
}

function criarRegistroMaproAprovada_(solicitacao, abaMapros, abaUsuarios) {
  const mapros = lerRegistros_(abaMapros, CABECALHOS_MAPROS);
  const procurado = String(Number(solicitacao['ID_SOLICITAÇÃO']));
  const jaExiste = mapros.some(function (mapro) {
    return String(Number(mapro['ID_SOLICITAÇÃO'])) === procurado;
  });
  if (jaExiste) return false;

  const usuarios = lerRegistros_(abaUsuarios, CABECALHOS_USUARIOS);
  abaMapros.appendRow(montarLinhaMaproAprovada_(solicitacao, usuarios));
  sincronizarParticipantesMapros_(abaMapros, obterAbaMaproParticipantes_(), abaUsuarios);
  return true;
}

function montarLinhaMaproAprovada_(solicitacao, usuarios) {
  const numeroSolicitacao = Number(solicitacao['ID_SOLICITAÇÃO']);
  if (!Number.isInteger(numeroSolicitacao) || numeroSolicitacao < 1) {
    throw new Error('A solicitação aprovada possui um ID inválido.');
  }
  const idUnificado = formatarId_(numeroSolicitacao);
  const idLiderSolicitado = String(solicitacao['ID_LÍDER'] || '').trim();
  const lider = usuarios.find(function (item) {
    return idLiderSolicitado && String(Number(item.ID)) === String(Number(idLiderSolicitado));
  }) || encontrarUsuarioPorNome_(usuarios, solicitacao['LÍDER_PROJETO']);
  const nomesParticipantes = String(solicitacao.PARTICIPANTES || '').split(';')
    .map(function (nome) { return nome.trim(); }).filter(Boolean);
  const participantes = nomesParticipantes.map(function (nome) {
    return encontrarUsuarioPorNome_(usuarios, nome);
  }).filter(Boolean);
  const dataAprovacao = new Date(solicitacao.ATUALIZADO_EM || new Date());
  const dataValida = Number.isNaN(dataAprovacao.getTime()) ? new Date() : dataAprovacao;
  const prazo = new Date(dataValida.getTime() + (15 * 24 * 60 * 60 * 1000));

  const valores = {
    ID_MAPRO: idUnificado,
    'ID_SOLICITAÇÃO': idUnificado,
    NOME_PROJETO: protegerTextoPlanilha_(normalizarNomeProjeto_(solicitacao.NOME_PROJETO)),
    'PORTFÓLIO': protegerTextoPlanilha_(solicitacao['PORTFÓLIO_UNIDADES']),
    'ID_LÍDER': lider ? formatarId_(Number(lider.ID)) : idLiderSolicitado,
    'NOME_LÍDER': protegerTextoPlanilha_(lider ? lider.NOME : solicitacao['LÍDER_PROJETO']),
    'EMAIL_LÍDER': lider ? normalizarEmail_(lider.EMAIL) : normalizarEmail_(solicitacao['EMAIL_LÍDER']),
    IDS_PARTICIPANTES: protegerTextoPlanilha_(participantes.map(function (item) {
      return formatarId_(Number(item.ID));
    }).join('; ')),
    NOMES_PARTICIPANTES: protegerTextoPlanilha_(nomesParticipantes.join('; ')),
    EMAILS_PARTICIPANTES: protegerTextoPlanilha_(participantes.map(function (item) {
      return normalizarEmail_(item.EMAIL);
    }).join('; ')),
    STATUS_MAPRO: 'AGUARDANDO_INICIO',
    PRAZO_PREENCHIMENTO: prazo.toISOString(),
    CRIADO_EM: dataValida.toISOString(),
    ATUALIZADO_EM: dataValida.toISOString(),
    O_QUE_E: protegerTextoPlanilha_(solicitacao.O_QUE_E),
    PORQUE: protegerTextoPlanilha_(solicitacao.PORQUE),
    RESULTADOS_ESPERADOS: protegerTextoPlanilha_(solicitacao.RESULTADOS_ESPERADOS),
    CONTAGIRO: protegerTextoPlanilha_(solicitacao.CONTAGIRO),
    NIVEL: protegerTextoPlanilha_(solicitacao.NIVEL),
    DATA_INICIO: '',
    DATA_FINAL: '',
    DEPARTAMENTO: protegerTextoPlanilha_(lider ? lider.DEPARTAMENTO : solicitacao.DEPARTAMENTO),
    NEGOCIO: protegerTextoPlanilha_(solicitacao.NEGOCIO),
    DIMENSAO_BSC: protegerTextoPlanilha_(solicitacao.DIMENSAO_BSC),
    OBJETIVO_BSC: protegerTextoPlanilha_(solicitacao.OBJETIVO_BSC),
    INDICADORES: protegerTextoPlanilha_(solicitacao.INDICADORES),
    POSSUI_INDICADORES_DEFINIDOS: String(solicitacao.POSSUI_INDICADORES_DEFINIDOS || ''),
    PROCESSO_CRITICO: String(solicitacao.PROCESSO_CRITICO || ''),
    ENVOLVE_SISTEMA: String(solicitacao.ENVOLVE_SISTEMA || ''),
    SISTEMAS_ENVOLVIDOS: protegerTextoPlanilha_(solicitacao.SISTEMAS_ENVOLVIDOS),
    VERSION: 1,
    FOTO_LIDER_ID: String(solicitacao.FOTO_LIDER_ID || ''),
    FOTO_LIDER_TIPO: String(solicitacao.FOTO_LIDER_TIPO || ''),
    FOTO_LIDER_ATUALIZADA_EM: String(solicitacao.FOTO_LIDER_ATUALIZADA_EM || ''),
    FOTO_LIDER_ATUALIZADA_POR: String(solicitacao.FOTO_LIDER_ATUALIZADA_POR || '')
  };
  return CABECALHOS_MAPROS.map(function (cabecalho) {
    return Object.prototype.hasOwnProperty.call(valores, cabecalho) ? valores[cabecalho] : '';
  });
}

/** Fonte de dados da futura página Minhas Mapros. */
function listarMinhasMapros() {
  try {
    garantirBancoConfigurado_();
    const usuario = exigirUsuarioAtivo_();
    const email = normalizarEmail_(usuario.EMAIL);
    const mapros = lerRegistros_(
      criarOuAtualizarAbaFlexivel_(obterPlanilha_(), CONFIG.abaMapros, CABECALHOS_MAPROS),
      CABECALHOS_MAPROS
    ).filter(function (mapro) {
      const lider = normalizarEmail_(mapro['EMAIL_LÍDER']) === email;
      const participantes = String(mapro.EMAILS_PARTICIPANTES || '').split(';')
        .map(normalizarEmail_);
      return lider || participantes.indexOf(email) !== -1;
    }).map(mapearMaproParaCliente_);
    return { sucesso: true, dados: mapros };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

/** Fonte de dados da futura página administrativa Mapros. */
function listarMaprosAdmin() {
  try {
    garantirBancoConfigurado_();
    exigirAdministrador_();
    const mapros = lerRegistros_(
      criarOuAtualizarAbaFlexivel_(obterPlanilha_(), CONFIG.abaMapros, CABECALHOS_MAPROS),
      CABECALHOS_MAPROS
    ).map(mapearMaproParaCliente_);
    return { sucesso: true, dados: mapros };
  } catch (erro) {
    return respostaDeErro_(erro);
  }
}

function mapearMaproParaCliente_(mapro) {
  return {
    idMapro: formatarId_(Number(mapro.ID_MAPRO)),
    idSolicitacao: formatarId_(Number(mapro['ID_SOLICITAÇÃO'])),
    nomeProjeto: normalizarNomeProjeto_(mapro.NOME_PROJETO),
    portfolio: String(mapro['PORTFÓLIO'] || ''),
    lider: String(mapro['NOME_LÍDER'] || ''),
    participantes: String(mapro.NOMES_PARTICIPANTES || ''),
    status: String(mapro.STATUS_MAPRO || ''),
    prazoPreenchimento: String(mapro.PRAZO_PREENCHIMENTO || ''),
    atualizadoEm: String(mapro.ATUALIZADO_EM || '')
  };
}

function enviarEmailsAprovacaoMapro_(solicitacao, dataAprovacao) {
  solicitacao.NOME_PROJETO = normalizarNomeProjeto_(solicitacao.NOME_PROJETO);
  const dadosDestinatarios = obterDestinatariosSolicitacaoMapro_(solicitacao);
  const destinatarios = dadosDestinatarios.destinatarios;
  const naoEncontrados = dadosDestinatarios.naoEncontrados;
  const prazo = new Date(dataAprovacao.getTime() + (15 * 24 * 60 * 60 * 1000));
  const falhas = [];
  let enviados = 0;
  Object.keys(destinatarios).forEach(function (email) {
    const destinatario = destinatarios[email];
    const urlProjeto = montarUrlProjetoMapro_(formatarIdSolicitacaoEmail_(solicitacao));
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'NOVA MAPRO - ' + String(solicitacao.NOME_PROJETO),
        body: montarEmailAprovacaoTexto_(destinatario, solicitacao, prazo, urlProjeto),
        htmlBody: montarEmailAprovacaoHtml_(destinatario, solicitacao, prazo, urlProjeto),
        name: 'SGI MAPRO'
      });
      enviados += 1;
    } catch (erro) {
      falhas.push(email);
      console.error(JSON.stringify({
        acao: 'FALHA_EMAIL_APROVACAO_MAPRO',
        email: email,
        erro: erro && erro.message
      }));
    }
  });

  return {
    enviados: enviados,
    falhas: falhas,
    naoEncontrados: naoEncontrados
  };
}

function enviarEmailsRejeicaoMapro_(solicitacao, motivo) {
  solicitacao.NOME_PROJETO = normalizarNomeProjeto_(solicitacao.NOME_PROJETO);
  const dadosDestinatarios = obterDestinatariosSolicitacaoMapro_(solicitacao);
  const destinatarios = dadosDestinatarios.destinatarios;
  const falhas = [];
  let enviados = 0;
  Object.keys(destinatarios).forEach(function (email) {
    const destinatario = destinatarios[email];
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'MAPRO REJEITADA - ' + String(solicitacao.NOME_PROJETO),
        body: montarEmailRejeicaoTexto_(destinatario, solicitacao, motivo),
        htmlBody: montarEmailRejeicaoHtml_(destinatario, solicitacao, motivo),
        name: 'SGI MAPRO'
      });
      enviados += 1;
    } catch (erro) {
      falhas.push(email);
      console.error(JSON.stringify({
        acao: 'FALHA_EMAIL_REJEICAO_MAPRO',
        email: email,
        erro: erro && erro.message
      }));
    }
  });
  return {
    enviados: enviados,
    falhas: falhas,
    naoEncontrados: dadosDestinatarios.naoEncontrados
  };
}

function obterDestinatariosSolicitacaoMapro_(solicitacao) {
  const usuarios = lerRegistros_(obterAbaUsuarios_(), CABECALHOS_USUARIOS);
  const destinatarios = {};
  const naoEncontrados = [];

  adicionarDestinatarioEmail_(
    destinatarios,
    solicitacao['EMAIL_USUÁRIO'],
    solicitacao.NOME,
    'SOLICITANTE'
  );

  const lider = encontrarUsuarioPorNome_(usuarios, solicitacao['LÍDER_PROJETO']);
  if (lider) {
    adicionarDestinatarioEmail_(destinatarios, lider.EMAIL, lider.NOME, 'LÍDER');
  } else if (solicitacao['LÍDER_PROJETO']) {
    naoEncontrados.push(String(solicitacao['LÍDER_PROJETO']));
  }

  String(solicitacao.PARTICIPANTES || '').split(';')
    .map(function (nome) { return nome.trim(); })
    .filter(Boolean)
    .forEach(function (nome) {
      const participante = encontrarUsuarioPorNome_(usuarios, nome);
      if (participante) {
        adicionarDestinatarioEmail_(
          destinatarios,
          participante.EMAIL,
          participante.NOME,
          'PARTICIPANTE'
        );
      } else {
        naoEncontrados.push(nome);
      }
    });
  return {
    destinatarios: destinatarios,
    naoEncontrados: Array.from(new Set(naoEncontrados))
  };
}

function adicionarDestinatarioEmail_(destinatarios, email, nome, papel) {
  const normalizado = normalizarEmail_(email);
  if (!normalizado) return;
  if (!destinatarios[normalizado]) {
    destinatarios[normalizado] = {
      nome: String(nome || normalizado),
      papeis: []
    };
  }
  if (destinatarios[normalizado].papeis.indexOf(papel) === -1) {
    destinatarios[normalizado].papeis.push(papel);
  }
}

function encontrarUsuarioPorNome_(usuarios, nome) {
  const procurado = normalizarTexto_(nome);
  return usuarios.find(function (usuario) {
    return normalizarTexto_(usuario.NOME) === procurado;
  }) || null;
}

function normalizarTexto_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizarNomeProjeto_(valor) {
  return String(valor || '').trim().toLocaleUpperCase('pt-BR');
}

/** Gera um acesso direto pela implantação pública estável do Web App. */
function montarUrlProjetoMapro_(idMapro) {
  const parametros = [
    'pagina=mapros',
    'mapro=' + encodeURIComponent(String(idMapro || '').trim())
  ];
  return obterUrlPublicaAplicacao_() + '?' + parametros.join('&');
}

function registrarUrlPublicaAplicacao_(urlInformada) {
  const url = String(urlInformada || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) return;
  const propriedades = PropertiesService.getScriptProperties();
  if (propriedades.getProperty(CONFIG.propriedadeUrlWebApp) === url) return;
  propriedades.setProperty(CONFIG.propriedadeUrlWebApp, url);
  console.info(JSON.stringify({ acao: 'URL_PUBLICA_WEB_APP_ATUALIZADA', url: url }));
}

function obterUrlPublicaAplicacao_() {
  const propriedades = PropertiesService.getScriptProperties();
  const configurada = String(propriedades.getProperty(CONFIG.propriedadeUrlWebApp) || '')
    .trim().replace(/\/+$/, '');
  if (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(configurada)) {
    return configurada;
  }
  const urlServico = String(ScriptApp.getService().getUrl() || '').trim().replace(/\/+$/, '');
  if (!urlServico) throw new Error('A URL pública do Web App não está configurada.');
  return urlServico;
}

function montarMensagemResultadoEmails_(resultado) {
  if (!resultado) return 'Solicitação aprovada com sucesso.';
  const problemas = resultado.falhas.length + resultado.naoEncontrados.length;
  if (!problemas) {
    return 'Solicitação aprovada e ' + resultado.enviados +
      (resultado.enviados === 1 ? ' e-mail enviado.' : ' e-mails enviados.');
  }
  return 'Solicitação aprovada. Foram enviados ' + resultado.enviados +
    ' e-mail(s), mas ' + problemas + ' destinatário(s) não puderam ser notificados.';
}

function montarMensagemResultadoEmailsRejeicao_(resultado) {
  if (!resultado) return 'Solicitação rejeitada com sucesso.';
  const problemas = resultado.falhas.length + resultado.naoEncontrados.length;
  if (!problemas) {
    return 'Solicitação rejeitada e ' + resultado.enviados +
      (resultado.enviados === 1 ? ' e-mail enviado.' : ' e-mails enviados.');
  }
  return 'Solicitação rejeitada. Foram enviados ' + resultado.enviados +
    ' e-mail(s), mas ' + problemas + ' destinatário(s) não puderam ser notificados.';
}

function montarSecoesDadosSolicitacaoEmail_(solicitacao, rotuloId, valorId) {
  function valorOuPadrao(valor, padrao) {
    const texto = String(valor == null ? '' : valor).trim();
    return texto || padrao || 'Não informado';
  }

  return [
    {
      titulo: 'IDENTIFICAÇÃO DO PROJETO',
      campos: [
        [rotuloId, valorId],
        ['Nome do projeto', valorOuPadrao(solicitacao.NOME_PROJETO)],
        ['Portfólio', valorOuPadrao(solicitacao['PORTFÓLIO_UNIDADES'])],
        ['Solicitante', valorOuPadrao(solicitacao.NOME)],
        ['Líder do projeto', valorOuPadrao(solicitacao['LÍDER_PROJETO'])],
        ['Departamento', valorOuPadrao(solicitacao.DEPARTAMENTO)],
        ['E-mail do líder', valorOuPadrao(solicitacao['EMAIL_LÍDER'])],
        ['Participantes iniciais', valorOuPadrao(solicitacao.PARTICIPANTES, 'Não informados')]
      ]
    },
    {
      titulo: 'CLASSIFICAÇÃO E ACOMPANHAMENTO',
      campos: [
        ['Negócio', valorOuPadrao(solicitacao.NEGOCIO)],
        ['Dimensão BSC', valorOuPadrao(solicitacao.DIMENSAO_BSC)],
        ['Objetivo BSC', valorOuPadrao(solicitacao.OBJETIVO_BSC)],
        ['Nível do projeto', valorOuPadrao(solicitacao.NIVEL)],
        ['Contagiro de acompanhamento', valorOuPadrao(solicitacao.CONTAGIRO)]
      ]
    },
    {
      titulo: 'PLANO DO PROJETO',
      campos: [
        ['O que é o projeto', valorOuPadrao(solicitacao.O_QUE_E)],
        ['Por que', valorOuPadrao(solicitacao.PORQUE)],
        ['Resultados esperados', valorOuPadrao(solicitacao.RESULTADOS_ESPERADOS, 'Não informados')],
        ['Indicadores definidos?', valorOuPadrao(solicitacao.POSSUI_INDICADORES_DEFINIDOS)],
        ['Indicadores do projeto', valorOuPadrao(solicitacao.INDICADORES, 'Não informados')]
      ]
    },
    {
      titulo: 'INFORMAÇÕES COMPLEMENTARES',
      campos: [
        ['Processo crítico?', valorOuPadrao(solicitacao.PROCESSO_CRITICO)],
        ['Envolve sistema?', valorOuPadrao(solicitacao.ENVOLVE_SISTEMA)],
        ['Sistema(s) envolvido(s)', valorOuPadrao(solicitacao.SISTEMAS_ENVOLVIDOS, 'Não informados')]
      ]
    }
  ];
}

function montarSecoesDadosSolicitacaoTexto_(secoes) {
  const linhas = [];
  secoes.forEach(function (secao, indice) {
    if (indice) linhas.push('');
    linhas.push(secao.titulo);
    secao.campos.forEach(function (campo) {
      linhas.push(campo[0] + ': ' + campo[1]);
    });
  });
  return linhas.join('\n');
}

function montarSecoesDadosSolicitacaoHtml_(secoes) {
  return secoes.map(function (secao) {
    return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" ' +
      'style="background:#f7f7fa;border-radius:10px;margin-bottom:16px;overflow:hidden">' +
      '<tr><td style="padding:9px 14px;background:#06063d;color:#fff;font-size:12px;' +
      'font-weight:800;letter-spacing:.04em">' + escaparHtml_(secao.titulo) + '</td></tr>' +
      secao.campos.map(function (campo) {
        return montarLinhaEmail_(campo[0], campo[1]);
      }).join('') +
      '</table>';
  }).join('');
}

function montarEmailAprovacaoTexto_(destinatario, solicitacao, prazo, urlProjeto) {
  const solicitante = destinatario.papeis.indexOf('SOLICITANTE') !== -1;
  const papeisAcesso = obterPapeisAcesso_(destinatario);
  const idMapro = formatarIdSolicitacaoEmail_(solicitacao);
  const secoesProjeto = montarSecoesDadosSolicitacaoEmail_(
    solicitacao,
    'ID da Mapro',
    idMapro
  );
  const introducao = [];
  if (solicitante) introducao.push('Sua solicitação de Mapro foi aprovada.');
  if (papeisAcesso.length) {
    introducao.push('Você foi relacionado para um novo projeto.');
    introducao.push('Seu acesso será: ' + formatarPapeisAcesso_(papeisAcesso) + '.');
  }
  return [
    'Olá, ' + destinatario.nome + '!',
    '',
    introducao.join('\n'),
    '',
    montarSecoesDadosSolicitacaoTexto_(secoesProjeto),
    '',
    'O preenchimento da Mapro deverá ser iniciado em até 15 dias, até ' +
      Utilities.formatDate(prazo, 'America/Sao_Paulo', 'dd/MM/yyyy') + '.',
    'Se o preenchimento não for iniciado nesse prazo, a Mapro passará para o status ' +
      'CANCELADA, pelo motivo: Inatividade de preenchimento.',
    '',
    'Iniciar projeto: ' + urlProjeto,
    '',
    'CORPORATIVO | P&G | SGI'
  ].join('\n');
}

function montarEmailAprovacaoHtml_(destinatario, solicitacao, prazo, urlProjeto) {
  const solicitante = destinatario.papeis.indexOf('SOLICITANTE') !== -1;
  const papeisAcesso = obterPapeisAcesso_(destinatario);
  const idMapro = formatarIdSolicitacaoEmail_(solicitacao);
  const secoesProjeto = montarSecoesDadosSolicitacaoEmail_(
    solicitacao,
    'ID da Mapro',
    idMapro
  );
  const introducao = [];
  if (solicitante) {
    introducao.push('Sua solicitação de Mapro foi <strong>aprovada</strong>.');
  }
  if (papeisAcesso.length) {
    introducao.push('Você foi relacionado para um novo projeto.');
    introducao.push('Seu acesso será: <strong>' +
      escaparHtml_(formatarPapeisAcesso_(papeisAcesso)) + '</strong>.');
  }
  const logoUrl = 'https://drive.google.com/thumbnail?id=' +
    CONFIG.logoId + '&sz=w4000';
  const prazoFormatado = Utilities.formatDate(
    prazo,
    'America/Sao_Paulo',
    'dd/MM/yyyy'
  );

  return '<!doctype html>' +
    '<html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px;overflow:hidden">' +
    '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto;transform:scale(1.3);transform-origin:center">' +
    '</td></tr>' +
    '<tr><td style="padding:30px 34px 34px;font-size:14px;line-height:1.6">' +
    '<p style="margin:0 0 18px;font-weight:800;text-transform:uppercase">Olá, ' +
      escaparHtml_(destinatario.nome) + '!</p>' +
    '<p style="margin:0 0 22px">' + introducao.join('<br>') + '</p>' +
    montarSecoesDadosSolicitacaoHtml_(secoesProjeto) +
    '<p style="margin:0 0 24px;padding:14px 16px;border-left:4px solid #ec0e37;background:#fff3f5">' +
    '<strong>Prazo para iniciar o preenchimento:</strong> o preenchimento da Mapro deverá ser iniciado em até 15 dias, até <strong>' +
      escaparHtml_(prazoFormatado) + '</strong>. Se o preenchimento não for iniciado nesse prazo, a Mapro passará para o status <strong>CANCELADA</strong>, pelo motivo: <strong>Inatividade de preenchimento</strong>.</p>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding-top:4px">' +
    '<a href="' + escaparHtml_(urlProjeto) + '" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#06063d;color:#fff;text-decoration:none;font-weight:800">INICIAR PROJETO</a>' +
    '</td></tr></table>' +
    '</td></tr>' +
    '<tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800;letter-spacing:.06em">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI' +
    '</td></tr></table>' +
    '</td></tr></table></body></html>';
}

function obterPapeisAcesso_(destinatario) {
  return destinatario.papeis.filter(function (papel) {
    return papel !== 'SOLICITANTE';
  });
}

function formatarPapeisAcesso_(papeis) {
  if (papeis.length < 2) return String(papeis[0] || '');
  return papeis.slice(0, -1).join(', ') + ' E ' + papeis[papeis.length - 1];
}

function montarEmailRejeicaoTexto_(destinatario, solicitacao, motivo) {
  const solicitante = destinatario.papeis.indexOf('SOLICITANTE') !== -1;
  const idSolicitacao = formatarIdSolicitacaoEmail_(solicitacao);
  const secoesProjeto = montarSecoesDadosSolicitacaoEmail_(
    solicitacao,
    'ID da solicitação',
    idSolicitacao
  );
  return [
    'Olá, ' + destinatario.nome + '!',
    '',
    solicitante
      ? 'Sua solicitação de Mapro foi rejeitada.'
      : 'A solicitação de Mapro na qual você foi relacionado foi rejeitada.',
    '',
    montarSecoesDadosSolicitacaoTexto_(secoesProjeto),
    '',
    'Motivo da rejeição: ' + motivo,
    '',
    'CORPORATIVO | P&G | SGI'
  ].join('\n');
}

function montarEmailRejeicaoHtml_(destinatario, solicitacao, motivo) {
  const solicitante = destinatario.papeis.indexOf('SOLICITANTE') !== -1;
  const idSolicitacao = formatarIdSolicitacaoEmail_(solicitacao);
  const secoesProjeto = montarSecoesDadosSolicitacaoEmail_(
    solicitacao,
    'ID da solicitação',
    idSolicitacao
  );
  const introducao = solicitante
    ? 'Sua solicitação de Mapro foi <strong>rejeitada</strong>.'
    : 'A solicitação de Mapro na qual você foi relacionado foi <strong>rejeitada</strong>.';
  const logoUrl = 'https://drive.google.com/thumbnail?id=' +
    CONFIG.logoId + '&sz=w4000';

  return '<!doctype html>' +
    '<html><body style="margin:0;padding:0;background:#f3f4f7;font-family:Arial,sans-serif;color:#06063d">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f7;padding:28px 12px">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border-radius:16px;overflow:hidden">' +
    '<tr><td align="center" style="background:#06063d;padding:8px 20px;overflow:hidden">' +
    '<img src="' + escaparHtml_(logoUrl) + '" alt="SGI Mapro" width="320" style="display:block;width:72%;max-width:320px;height:auto;transform:scale(1.3);transform-origin:center">' +
    '</td></tr>' +
    '<tr><td style="padding:30px 34px 34px;font-size:14px;line-height:1.6">' +
    '<p style="margin:0 0 18px;font-weight:800;text-transform:uppercase">Olá, ' +
      escaparHtml_(destinatario.nome) + '!</p>' +
    '<p style="margin:0 0 22px">' + introducao + '</p>' +
    montarSecoesDadosSolicitacaoHtml_(secoesProjeto) +
    '<div style="padding:16px 18px;border-left:4px solid #ec0e37;background:#fff3f5;border-radius:4px">' +
    '<p style="margin:0 0 7px;color:#a3132e;font-weight:800">MOTIVO DA REJEIÇÃO</p>' +
    '<p style="margin:0;white-space:pre-line">' + escaparHtml_(motivo) + '</p>' +
    '</div>' +
    '</td></tr>' +
    '<tr><td align="center" style="background:#06063d;color:#fff;padding:15px;font-size:12px;font-weight:800;letter-spacing:.06em">' +
    'CORPORATIVO &nbsp;|&nbsp; P&amp;G &nbsp;|&nbsp; SGI' +
    '</td></tr></table>' +
    '</td></tr></table></body></html>';
}

function formatarIdSolicitacaoEmail_(solicitacao) {
  const valor = solicitacao ? solicitacao['ID_SOLICITAÇÃO'] : '';
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0
    ? formatarId_(numero)
    : String(valor || '—');
}

function montarLinhaEmail_(rotulo, valor) {
  return '<tr><td style="padding:10px 14px;border-bottom:1px solid #e7e7ec;color:#06063d">' +
    '<strong>' + escaparHtml_(rotulo) + ':</strong> ' + escaparHtml_(valor) +
    '</td></tr>';
}

function escaparHtml_(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarAba_(aba, totalColunas) {
  const primeiraFormatacao = aba.getFrozenRows() < 1;
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, totalColunas)
    .setBackground(CONFIG.corPrincipal)
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  if (primeiraFormatacao) aba.autoResizeColumns(1, totalColunas);
}

function obterBotoesPorNivel_(nivel) {
  if (String(nivel).toUpperCase() === 'ADMIN') {
    return [
      { id: 'mapros', texto: 'MAPROS' },
      { id: 'dashboard', texto: 'DASHBOARD' },
      { id: 'usuarios', texto: 'CADASTRO DE USUÁRIO' },
      { id: 'solicitacoes', texto: 'SOLICITAÇÕES DE MAPRO' }
    ];
  }

  return [
    { id: 'minhas-mapros', texto: 'MINHAS MAPROS' },
    { id: 'dashboard', texto: 'DASHBOARD' },
    { id: 'solicitacoes', texto: 'SOLICITAÇÕES DE MAPRO' }
  ];
}

function normalizarEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function respostaDeErro_(erro) {
  console.error(erro);
  return {
    sucesso: false,
    mensagem: erro && erro.message
      ? erro.message
      : 'Não foi possível concluir a operação.'
  };
}
