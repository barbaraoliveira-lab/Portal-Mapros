# AGENTS.md — Portal Mapros

Este arquivo define regras permanentes para qualquer agente ou desenvolvedor que altere este repositório. Requisitos funcionais temporários não pertencem aqui.

## Contexto e tecnologias

- Aplicação corporativa multiusuário implantada como Web App do Google Apps Script.
- Backend em Google Apps Script, runtime V8; frontend em HTML Service, HTML semântico, CSS e JavaScript compatível com o ambiente.
- Desenvolvimento no GitHub/Codespaces e sincronização consciente via CLASP. Git é a fonte de verdade do código.
- Interface, documentação e mensagens destinadas ao usuário em português do Brasil; timezone principal `America/Sao_Paulo` até decisão explícita em contrário.
- Nome, empresa, identidade visual, ambiente, versão e feature flags devem ficar em configuração central, sem valores repetidos.

## Arquitetura

- Usar camadas com dependências nesta direção: UI -> API/Controller -> Policy/Authorization -> Service -> Repository -> persistência.
- Controllers validam o envelope da requisição, obtêm o contexto e delegam; não contêm acesso direto a dados nem regras extensas.
- Services concentram regras e casos de uso; repositories encapsulam toda dependência da tecnologia de persistência.
- Validators, policies, mappers, audit, errors e utilitários genéricos têm responsabilidades separadas. `Utils` não é depósito de código.
- Frontend separa estrutura, design tokens/estilos, cliente de API, estado, componentes e páginas. Não espalhar `google.script.run`; usar um wrapper Promise central.
- Preferir módulos coesos e arquivos pequenos. Não criar `Code.gs` ou `Index.html` monolíticos.
- Apps Script não fornece módulos ES no servidor: namespaces globais imutáveis e prefixos/nomes de arquivos devem evitar colisões. Não usar APIs exclusivas de Node no runtime.

## Organização planejada

```text
src/
  server/
    config/ controllers/ auth/ policies/ services/ repositories/
    validators/ mappers/ audit/ errors/ migrations/ utils/
  client/
    shell/ styles/ api/ state/ components/ pages/
docs/
tests/
appsscript.json
```

- O layout físico pode evoluir, mas a separação conceitual é obrigatória.
- Arquivos enviados ao Apps Script devem usar extensões suportadas (`.gs` e `.html`). Ferramentas locais ficam fora da árvore enviada ou são excluídas pelo CLASP.

## Segurança, identidade e autorização

- Preferir identidade Google Workspace; nunca implementar senha própria ou armazenar tokens/senhas em Sheets.
- A estratégia final depende do modo de deployment e do domínio. Não assumir que `Session.getActiveUser().getEmail()` sempre retorna e-mail; falha de identificação deve negar acesso com segurança.
- Autenticação e autorização são separadas. Toda função exposta revalida no servidor: usuário identificado, domínio permitido, cadastro, status atual e permissão.
- Usar RBAC centralizado com permissões granulares e policies contextuais para escopo de registros. Menu oculto não é controle de acesso.
- Aplicar menor privilégio nos OAuth scopes. Nunca versionar segredos, `.clasprc.json`, credenciais, tokens ou chaves privadas.
- Tratar todo payload do navegador como não confiável: validar tipo, limites, formato, enum, relacionamento, versão e autorização.
- Prevenir IDOR em leitura e escrita, XSS no frontend e formula injection ao persistir texto em Sheets. Não enviar dados sensíveis ao navegador nem stack traces ao usuário.
- Dados pessoais devem ser minimizados, protegidos e omitidos de logs; requisitos de LGPD precisam de avaliação própria, não de declaração automática de conformidade.

## Dados e concorrência

- Não escolher Google Sheets por padrão. Registrar volume, concorrência, relacionamentos, transações, consultas, crescimento e custo antes da decisão.
- Services nunca acessam diretamente Sheets, JDBC ou outra persistência; somente repositories.
- Entidades usam IDs imutáveis (preferencialmente UUID), timestamps consistentes, autoria e, quando necessário, `status`, `version` e soft delete. Número de linha não é ID.
- Se Sheets for adotado: schemas/cabeçalhos centralizados, leituras e escritas em lote, proteção contra fórmulas, migrations idempotentes e nenhum acesso célula a célula em loops.
- Paginação deve ser server-side para conjuntos grandes. Evitar full scans e N+1; medir antes de criar índices complexos.
- Proteger regiões críticas pequenas com locks apropriados. Usar concorrência otimista em entidades sujeitas a edição simultânea e retornar `RECORD_CHANGED` em conflito.
- Cache é otimização, nunca fonte única para autorização ou estado crítico; chaves e invalidação devem ser padronizadas.

## API, erros, logs e auditoria

- Respostas seguem envelope estável: sucesso `{ok:true,data,meta}`; erro `{ok:false,error:{code,message,requestId}}`.
- Usar códigos previsíveis, incluindo `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RECORD_CHANGED`, `DUPLICATE`, `RATE_LIMITED` e `INTERNAL_ERROR`.
- Gerar `requestId` em operações relevantes. Expor mensagem segura ao usuário e manter detalhes técnicos apenas em logs protegidos.
- Logs técnicos servem a diagnóstico; auditoria registra quem fez o quê, quando, resultado e entidade. Não misturar conceitos nem registrar conteúdo sensível.
- Auditar mutações e tentativas administrativas/proibidas relevantes. Auditoria não pode ser alterada por usuários comuns.

## Frontend e UX

- Usar design tokens centrais para cores, tipografia, espaçamento, raios e sombras; identidade visual deve ser configurável.
- Componentes reutilizáveis devem cobrir shell, navegação, botões, campos, tabelas, modais, confirmação, toast, badges e estados loading/empty/error.
- Toda tela assíncrona comunica loading, vazio, erro e sucesso. Desabilitar submissões em andamento; backend continua responsável por idempotência quando necessária.
- HTML semântico, labels reais, foco visível, teclado, contraste e ARIA quando necessário são obrigatórios. Conteúdo do usuário entra via `textContent`, não `innerHTML` inseguro.
- Layout responsivo para desktop, tablet e celular. Tabelas grandes usam paginação e busca com debounce; não renderizar milhares de linhas.

## Código e convenções

- Usar nomes descritivos em inglês para identificadores técnicos e português do Brasil para texto de interface.
- Preferir `const`, `let`, funções pequenas e coesas, valores nomeados e JSDoc em contratos, entidades, services e repositories.
- Datas persistidas em formato não ambíguo e consistente; formatação brasileira somente na apresentação.
- Evitar abstração prematura, dependências externas sem justificativa, globals mutáveis, duplicação, código morto e TODO indefinido.
- Comentários explicam decisões e restrições, não a sintaxe.

## Git, CLASP e ambientes

- Antes de editar, verificar `git status` e preservar alterações do usuário. Não reformatar arquivos não relacionados.
- Não fazer commit, push, `clasp pull`, `clasp push`, versionamento ou deployment sem solicitação explícita.
- Antes de sincronizar: validar manifesto, lint/testes, diff e destino. Nunca usar operação que sobrescreva local/remoto sem revisão.
- Não editar simultaneamente no editor online e no repositório sem reconciliação consciente.
- Ambientes dev/staging/prod devem poder usar projetos Apps Script e propriedades distintos; configuração sensível fica em Script Properties ou mecanismo aprovado.
- Commits, quando solicitados, seguem Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

## Testes e revisão

- Separar regras puras de serviços Google para permitir testes locais; adicionar toolchain leve somente quando trouxer valor claro.
- Testar casos felizes, validação, falhas, autorização por papel/escopo, usuário inativo, ID adulterado, XSS/formula injection, conflito de versão e duplicidade quando aplicável.
- Antes de concluir, revisar segurança, permissões, concorrência, chamadas a serviços, scans, payloads, erros, acessibilidade e responsividade.
- Alterações de schema exigem migration idempotente e atualização de `docs/DATA_MODEL.md`; alterações de permissão atualizam `docs/PERMISSIONS.md`; decisões arquiteturais atualizam os documentos correspondentes.

## Documentação

- Manter `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/PERMISSIONS.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md` e `docs/ROADMAP.md` conforme o projeto ganhar decisões concretas.
- Registrar decisões importantes com contexto, alternativas, decisão, motivo e consequências; usar ADR quando a complexidade justificar.
- Não criar documentação vazia nem afirmar comportamento, quota ou API sem validação na documentação oficial atual quando o dado puder mudar.

## Definição de pronto

Uma funcionalidade só está pronta quando está integrada, validada no cliente e servidor, autorizada no servidor, trata erros e concorrência pertinentes, dá feedback de UI, audita quando necessário, tem testes proporcionais, documentação atualizada e não introduz regressão ou vulnerabilidade evidente.

## Práticas proibidas

- Confiar no frontend para autorização, status, ownership ou integridade.
- Hardcode de usuário administrador, domínio, segredo, ID de banco, cor institucional ou configuração de ambiente em múltiplos arquivos.
- Acesso direto à persistência em controllers/UI/services ou chamadas a serviços Google dentro de loops quando operações em lote são possíveis.
- IDs baseados em linha/posição, exclusão física de registros auditáveis sem decisão explícita ou bypass permanente de superadministrador.
- `innerHTML` com conteúdo não confiável, stack trace no cliente, dados sensíveis em logs ou cache como autorização definitiva.
- Arquivos gigantes, funções multifuncionais, `google.script.run` espalhado, dependências pesadas sem avaliação ou código Node no runtime Apps Script.
