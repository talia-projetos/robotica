/**
 * SISTEMA INTEGRADO — TORNEIO DE ROBÓTICA
 * Versão: 2026-08-23
 *
 * CATEGORIAS (20% cada → total máx 100 pts):
 *   Arena          — melhor round, máx 550 pts brutos
 *   Projeto        — média das rubricas dos juízes, máx 40 pts
 *   Design do Robô — média das rubricas dos juízes, máx 40 pts
 *   Core Values    — média das rubricas dos juízes, máx 40 pts
 *   Tampinhas      — peso líquido / nº alunos vs meta definida
 *
 * PRIMEIRO USO:
 *   1. Apps Script → cole este arquivo → Salve (Ctrl+S)
 *   2. Execute TORNEIO_instalar → Autorize as permissões
 *   3. Vincule seus Google Forms à planilha (veja INTEGRACAO_FORMS.md)
 *   4. Insira os nomes das abas dos Forms na aba CONFIG
 *   5. Execute TORNEIO_instalar novamente
 *
 * API DO HUB:
 *   Implantar → Nova implantação → Aplicativo da Web
 *   Executar como: Eu mesmo | Acesso: Qualquer pessoa
 */

// ================================================================
// CONSTANTES
// ================================================================

const T = Object.freeze({
  VERSAO: '2026-08-23',

  ABAS: Object.freeze({
    CONFIG:    'CONFIG',
    EQUIPES:   'EQUIPES',
    TAMPINHAS: 'TAMPINHAS',
    BASE:      'BASE_RESULTADOS',
    RANKING:   'RANKING_GERAL',
    RANK_CAT:  'RANKING_CATEGORIAS',
    STATUS:    'STATUS_AVALIACOES',
    DIAG:      'DIAGNOSTICO',
    PAINEL:    'PAINEL'
  }),

  CORES: Object.freeze({
    MARINHO:        '#12355B',
    AZUL:           '#2F80ED',
    VERDE:          '#27AE60',
    CORAL:          '#EB5757',
    ROXO:           '#8E5BD9',
    LARANJA:        '#F2994A',
    CINZA:          '#D9E2EC',
    VERDE_CLARO:    '#D9EAD3',
    AMARELO_CLARO:  '#FFF2CC',
    VERMELHO_CLARO: '#F4CCCC'
  }),

  CAT: Object.freeze({
    ARENA:    'Arena',
    PROJETO:  'Projeto de Inovação',
    DESIGN:   'Design do Robô',
    CORE:     'Core Values',
    TAMP:     'Tampinhas que Transformam'
  })
});


// ================================================================
// MENU E GATILHOS
// ================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏆 Torneio')
    .addItem('Instalar / atualizar',     'TORNEIO_instalar')
    .addItem('Recalcular resultados',    'TORNEIO_atualizar')
    .addSeparator()
    .addItem('Ver Painel',               'TORNEIO_abrirPainel')
    .addItem('Ver Ranking',              'TORNEIO_abrirRanking')
    .addItem('Ver Diagnóstico',          'TORNEIO_abrirDiagnostico')
    .addSeparator()
    .addItem('Reinstalar gatilho Forms', 'TORNEIO_instalarGatilho')
    .addToUi();
}

function TORNEIO_instalar() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Aguarde, outra atualização está em curso.', 'Torneio', 4);
    return;
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    criarAbaConfig_(ss);
    criarAbaEquipes_(ss);
    criarAbaTampinhas_(ss);
    atualizarInterno_(ss);
    instalarGatilho_(ss);
    ss.toast('Sistema instalado e resultados calculados.', '🏆 Torneio', 6);
  } finally {
    lock.releaseLock();
  }
}

function TORNEIO_atualizar() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) return;
  try {
    atualizarInterno_(SpreadsheetApp.getActiveSpreadsheet());
  } finally {
    lock.releaseLock();
  }
}

function TORNEIO_instalarGatilho() {
  instalarGatilho_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getActiveSpreadsheet().toast('Gatilho reinstalado.', 'Torneio', 4);
}

function TORNEIO_aoEnviarForm(e) {
  try { TORNEIO_atualizar(); } catch (err) { console.error(err); }
}

function onEdit(e) {
  if (!e || !e.range) return;
  const nome = e.range.getSheet().getName();
  if (nome === T.ABAS.CONFIG || nome === T.ABAS.EQUIPES || nome === T.ABAS.TAMPINHAS) {
    if (e.range.getRow() > 1) {
      try { TORNEIO_atualizar(); } catch (err) { console.error(err); }
    }
  }
}

function TORNEIO_abrirPainel()      { ativarAba_(T.ABAS.PAINEL);   }
function TORNEIO_abrirRanking()     { ativarAba_(T.ABAS.RANKING);  }
function TORNEIO_abrirDiagnostico() { ativarAba_(T.ABAS.DIAG);     }


// ================================================================
// INSTALAÇÃO DAS ABAS ESTRUTURAIS
// ================================================================

function criarAbaConfig_(ss) {
  let aba = ss.getSheetByName(T.ABAS.CONFIG);
  if (!aba) aba = ss.insertSheet(T.ABAS.CONFIG);

  const defaults = [
    ['Parâmetro',                    'Valor',         'Descrição'],
    ['Título do Painel',             'TORNEIO DE ROBÓTICA', 'Exibido no painel e no hub.'],
    ['Peso Arena',                   0.20,            'Peso na classificação geral (0.20 = 20%).'],
    ['Peso Projeto de Inovação',     0.20,            'Peso na classificação geral.'],
    ['Peso Design do Robô',          0.20,            'Peso na classificação geral.'],
    ['Peso Core Values',             0.20,            'Peso na classificação geral.'],
    ['Peso Tampinhas',               0.20,            'Peso na classificação geral.'],
    ['Pontuação Máxima Arena',       550,             'Pontuação bruta máxima da Arena (limita o resultado do round).'],
    ['Pontuação Máxima Rubricas',    40,              'Máximo possível em cada rubrica (10 critérios × 4 pts).'],
    ['Meta Tampinhas kg/aluno',      0.5,             'Ao atingir esta meta, a equipe recebe a nota máxima.'],
    ['Critérios por Rubrica',        10,              'Número de critérios com nota 1–4 em cada Form de rubrica.'],
    ['Juízes Esperados por Rubrica', 3,               'Avaliações esperadas por equipe em cada categoria.'],
    ['Rounds Esperados Arena',       3,               'O sistema usa o melhor round entre todos os válidos.'],
    ['Aba Form Arena',               'FORM_ARENA',    '← Nome exato da aba de respostas do Form da Arena.'],
    ['Aba Form Projeto',             'FORM_PROJETO',  '← Nome exato da aba de respostas do Form de Projeto.'],
    ['Aba Form Design',              'FORM_DESIGN',   '← Nome exato da aba de respostas do Form de Design.'],
    ['Aba Form Core',                'FORM_CORE',     '← Nome exato da aba de respostas do Form de Core Values.']
  ];

  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, defaults.length, 3).setValues(defaults);
    aba.getRange(1, 1, 1, 3).setBackground(T.CORES.MARINHO).setFontColor('#FFF').setFontWeight('bold');
    aba.getRange(3, 2, 5, 1).setNumberFormat('0%');
    aba.setColumnWidth(1, 260);
    aba.setColumnWidth(2, 200);
    aba.setColumnWidth(3, 500);
    aba.setFrozenRows(1);
  } else {
    // garante linhas obrigatórias que podem não existir ainda
    const atual = aba.getDataRange().getValues();
    const chaves = atual.slice(1).map(function(r) { return norm_(r[0]); });
    defaults.slice(1).forEach(function(d) {
      if (chaves.indexOf(norm_(d[0])) < 0) aba.appendRow(d);
    });
  }
}

function criarAbaEquipes_(ss) {
  let aba = ss.getSheetByName(T.ABAS.EQUIPES);
  if (!aba) {
    aba = ss.insertSheet(T.ABAS.EQUIPES);
    aba.getRange(1, 1, 1, 6).setValues([['ID_Equipe', 'Nome_Equipe', 'Turno', 'Tutor', 'Qtde_Alunos', 'PIN']]);
    aba.getRange(1, 1, 1, 6).setBackground(T.CORES.MARINHO).setFontColor('#FFF').setFontWeight('bold');
    aba.setColumnWidth(1, 110);
    aba.setColumnWidth(2, 240);
    aba.setColumnWidth(3, 120);
    aba.setColumnWidth(4, 200);
    aba.setColumnWidth(5, 120);
    aba.setColumnWidth(6, 100);
    aba.setFrozenRows(1);
  }
}

function criarAbaTampinhas_(ss) {
  let aba = ss.getSheetByName(T.ABAS.TAMPINHAS);
  if (!aba) {
    aba = ss.insertSheet(T.ABAS.TAMPINHAS);
    aba.getRange(1, 1, 1, 6).setValues([[
      'Data_Pesagem', 'ID_Equipe', 'Peso_Bruto_kg', 'Tara_kg', 'Peso_Liquido_kg', 'Responsavel'
    ]]);
    aba.getRange(1, 1, 1, 6).setBackground(T.CORES.CORAL).setFontColor('#FFF').setFontWeight('bold');
    aba.getRange('A2:A').setNumberFormat('dd/mm/yyyy');
    aba.getRange('C2:E').setNumberFormat('0.000');
    aba.setFrozenRows(1);
  }
}

function instalarGatilho_(ss) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'TORNEIO_aoEnviarForm') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('TORNEIO_aoEnviarForm').forSpreadsheet(ss).onFormSubmit().create();
}


// ================================================================
// MOTOR PRINCIPAL DE ATUALIZAÇÃO
// ================================================================

function atualizarInterno_(ss) {
  const inicio = new Date();
  const diag   = [];
  const cfg    = lerConfig_(ss, diag);
  const eq     = lerEquipes_(ss, cfg, diag);
  const arena  = lerArena_(ss, cfg, eq, diag);
  const proj   = lerRubrica_(ss, cfg.abaProj,  T.CAT.PROJETO, cfg, eq, diag);
  const desig  = lerRubrica_(ss, cfg.abaDes,   T.CAT.DESIGN,  cfg, eq, diag);
  const core   = lerRubrica_(ss, cfg.abaCore,  T.CAT.CORE,    cfg, eq, diag);
  const tamp   = lerTampinhas_(ss, cfg, eq, diag);
  const dados  = calcularResultados_(eq, arena, [proj, desig, core], tamp, cfg);

  escreverBase_(ss, dados);
  escreverRanking_(ss, dados);
  escreverRankingCat_(ss, dados, cfg);
  escreverStatus_(ss, dados, cfg);
  escreverDiag_(ss, diag, cfg, inicio);
  escreverPainel_(ss, dados, cfg);
  ordenarAbas_(ss);
}


// ================================================================
// LEITURA DA CONFIGURAÇÃO
// ================================================================

function lerConfig_(ss, diag) {
  const aba  = ss.getSheetByName(T.ABAS.CONFIG);
  const mapa = {};

  if (aba && aba.getLastRow() > 1) {
    aba.getDataRange().getValues().slice(1).forEach(function(r) {
      const k = norm_(r[0]);
      if (k) mapa[k] = r[1];
    });
  }

  function g(chave, pad) {
    const v = mapa[norm_(chave)];
    return (v === '' || v === null || v === undefined) ? pad : v;
  }
  function n(chave, pad) { return num_(g(chave, pad)); }
  function s(chave, pad) { return String(g(chave, pad) || pad).trim(); }

  const cfg = {
    titulo:      s('Título do Painel', 'TORNEIO DE ROBÓTICA'),
    pArena:      n('Peso Arena', 0.20),
    pProj:       n('Peso Projeto de Inovação', 0.20),
    pDes:        n('Peso Design do Robô', 0.20),
    pCore:       n('Peso Core Values', 0.20),
    pTamp:       n('Peso Tampinhas', 0.20),
    maxArena:    n('Pontuação Máxima Arena', 550),
    maxRub:      n('Pontuação Máxima Rubricas', 40),
    metaKg:      n('Meta Tampinhas kg/aluno', 0.5),
    criterios:   Math.max(1, Math.round(n('Critérios por Rubrica', 10))),
    juizes:      Math.max(1, Math.round(n('Juízes Esperados por Rubrica', 3))),
    rounds:      Math.max(1, Math.round(n('Rounds Esperados Arena', 3))),
    abaArena:    s('Aba Form Arena', 'FORM_ARENA'),
    abaProj:     s('Aba Form Projeto', 'FORM_PROJETO'),
    abaDes:      s('Aba Form Design', 'FORM_DESIGN'),
    abaCore:     s('Aba Form Core', 'FORM_CORE')
  };

  const soma = cfg.pArena + cfg.pProj + cfg.pDes + cfg.pCore + cfg.pTamp;
  if (Math.abs(soma - 1) > 0.001) {
    diag.push({ nivel: 'ERRO', cat: 'CONFIG', msg: 'Pesos somam ' + (soma * 100).toFixed(1) + '% (esperado: 100%).' });
  }
  if (cfg.metaKg <= 0) {
    diag.push({ nivel: 'ERRO', cat: 'CONFIG', msg: 'Meta de Tampinhas deve ser maior que zero.' });
  }

  return cfg;
}


// ================================================================
// LEITURA DE EQUIPES
// ================================================================

function lerEquipes_(ss, cfg, diag) {
  const aba = ss.getSheetByName(T.ABAS.EQUIPES);
  if (!aba || aba.getLastRow() < 2) {
    diag.push({ nivel: 'ATENÇÃO', cat: 'EQUIPES', msg: 'Cadastro de equipes vazio.' });
    return { lista: [], porId: {}, aliases: {} };
  }

  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iId   = achaCab_(cab, ['id equipe', 'id_equipe', 'codigo', 'n', 'numero'], 0);
  const iNome = achaCab_(cab, ['nome equipe', 'nome_equipe', 'equipe', 'turma'], 1);
  const iTurno= achaCab_(cab, ['turno'], 2);
  const iTutor= achaCab_(cab, ['tutor', 'professor', 'orientador'], 3);
  const iQtd  = achaCab_(cab, ['qtde alunos', 'qtd alunos', 'quantidade alunos', 'alunos'], 4);
  const iPin  = achaCab_(cab, ['pin', 'senha'], -1);

  const lista   = [];
  const porId   = {};
  const aliases = {};

  dados.slice(1).forEach(function(r, i) {
    if (r.every(function(v) { return v === ''; })) return;
    const id = String(r[iId] || '').trim().toUpperCase();
    if (!id) { diag.push({ nivel: 'ATENÇÃO', cat: 'EQUIPES', msg: 'Linha ' + (i + 2) + ' sem ID.' }); return; }
    if (porId[id]) { diag.push({ nivel: 'ERRO', cat: 'EQUIPES', msg: 'ID duplicado: ' + id }); return; }

    const eq = {
      id:    id,
      nome:  String(r[iNome] || id).trim(),
      turno: String(r[iTurno] || '').trim(),
      tutor: String(r[iTutor] || '').trim(),
      alunos: Math.max(0, num_(r[iQtd])),
      pin:   iPin >= 0 ? String(r[iPin] || '').trim() : ''
    };

    lista.push(eq);
    porId[id] = eq;
    [id, eq.nome, id + ' - ' + eq.nome, eq.nome + ' - ' + id].forEach(function(a) {
      const k = norm_(a);
      if (k) aliases[k] = id;
    });
  });

  if (!lista.length) diag.push({ nivel: 'ATENÇÃO', cat: 'EQUIPES', msg: 'Nenhuma equipe válida.' });
  return { lista: lista, porId: porId, aliases: aliases };
}


// ================================================================
// LEITURA DE COMENTÁRIOS DAS RUBRICAS (para visão do professor)
// ================================================================

function lerComentariosRubrica_(ss, nomeAba, idEquipe, eq) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() < 2) return [];
  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iEq   = achaCab_(cab, ['id equipe','id_equipe','equipe avaliada','selecione a equipe','selecione equipe','equipe','turma'], -1);
  const iVal  = achaCab_(cab, ['validado','homologado','considerar'], -1);
  const iJuiz = achaCab_(cab, ['nome do juiz','nome do avaliador','juiz','avaliador','email'], -1);
  const iBom  = achaCab_(cab, ['bom trabalho'], -1);
  const iRef  = achaCab_(cab, ['reflitam','reflita'], -1);
  if (iEq < 0 || (iBom < 0 && iRef < 0)) return [];
  const lista = [];
  dados.slice(1).forEach(function(r) {
    if (r.every(function(v) { return v === ''; })) return;
    if (resolverEq_(r[iEq], eq) !== idEquipe) return;
    if (iVal >= 0 && !respostaValida_(r[iVal])) return;
    const bom = iBom >= 0 ? String(r[iBom] || '').trim() : '';
    const ref = iRef >= 0 ? String(r[iRef] || '').trim() : '';
    if (!bom && !ref) return;
    lista.push({
      juiz: iJuiz >= 0 ? String(r[iJuiz] || '').trim() : '',
      bomTrabalho: bom,
      reflitam: ref
    });
  });
  return lista;
}


// ================================================================
// API — VISÃO DO PROFESSOR (por turma)
// ================================================================

function apiTurma_(p) {
  const id  = String(p.id  || '').trim().toUpperCase();
  const pin = String(p.pin || '').trim();
  if (!id) return { ok: false, erro: 'ID da equipe obrigatório.' };
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const diag = [];
  const cfg  = lerConfig_(ss, diag);
  const eq   = lerEquipes_(ss, cfg, diag);
  const equipe = eq.porId[id];
  if (!equipe) return { ok: false, erro: 'Equipe não encontrada.' };
  if (equipe.pin) {
    if (!pin) return { ok: false, erro: 'PIN obrigatório.' };
    if (equipe.pin !== pin) return { ok: false, erro: 'PIN incorreto.' };
  }
  var scores = null;
  const abaBase = ss.getSheetByName(T.ABAS.BASE);
  if (abaBase && abaBase.getLastRow() >= 2) {
    const dados = abaBase.getDataRange().getValues();
    const idx = {};
    dados[0].forEach(function(h, i) { if (h) idx[String(h).trim()] = i; });
    function g(r, col) { return idx[col] !== undefined ? r[idx[col]] : ''; }
    const row = dados.slice(1).find(function(r) {
      return String(r[idx['ID']] || '').trim().toUpperCase() === id;
    });
    if (row) scores = {
      arena20: num_(g(row,'Arena_20')),   arenaBruta: num_(g(row,'Arena_Bruta')), arenaRounds: num_(g(row,'Rounds')),
      proj20:  num_(g(row,'Proj_20')),    projBruta:  num_(g(row,'Proj_Bruta')),  projJuizes:  num_(g(row,'Juizes_Proj')),
      des20:   num_(g(row,'Des_20')),     desBruta:   num_(g(row,'Des_Bruta')),   desJuizes:   num_(g(row,'Juizes_Des')),
      core20:  num_(g(row,'Core_20')),    coreBruta:  num_(g(row,'Core_Bruta')),  coreJuizes:  num_(g(row,'Juizes_Core')),
      tamp20:  num_(g(row,'Tamp_20')),    tampKg:     num_(g(row,'Tamp_kg')),     tampPes:     num_(g(row,'Pesagens')),
      total:   num_(g(row,'Total')),      status:     String(g(row,'Status') || '')
    };
  }
  const comentarios = {};
  comentarios[T.CAT.PROJETO] = lerComentariosRubrica_(ss, cfg.abaProj,  id, eq);
  comentarios[T.CAT.DESIGN]  = lerComentariosRubrica_(ss, cfg.abaDes,   id, eq);
  comentarios[T.CAT.CORE]    = lerComentariosRubrica_(ss, cfg.abaCore,  id, eq);
  return {
    ok: true,
    equipe: { id: equipe.id, nome: equipe.nome, turno: equipe.turno, tutor: equipe.tutor },
    scores: scores,
    comentarios: comentarios
  };
}


// ================================================================
// LEITURA DA ARENA
// ================================================================

function lerArena_(ss, cfg, eq, diag) {
  const res = { porEquipe: {}, linhas: [] };
  const aba = ss.getSheetByName(cfg.abaArena);
  if (!aba || aba.getLastRow() < 2) {
    diag.push({ nivel: 'ATENÇÃO', cat: T.CAT.ARENA, msg: 'Aba "' + cfg.abaArena + '" não encontrada ou vazia.' });
    return res;
  }

  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iEq   = achaCab_(cab, ['id equipe','id_equipe','equipe','turma'], -1);
  const iRound= achaCab_(cab, ['round','rodada','partida','tentativa'], -1);
  const iJuiz = achaCab_(cab, ['arbitro','árbitro','juiz','avaliador','email'], -1);
  const iVal  = achaCab_(cab, ['validado','valida','homologado'], -1);
  const iPen  = achaCab_(cab, ['penalidade','penalidades','penalty'], -1);
  const iTS   = achaCab_(cab, ['carimbo','timestamp','data hora','data'], 0);

  if (iEq < 0) {
    diag.push({ nivel: 'ERRO', cat: T.CAT.ARENA, msg: 'Coluna de equipe não encontrada em "' + aba.getName() + '".' });
    return res;
  }

  const ignora = {};
  [iEq, iRound, iJuiz, iVal, iPen, iTS].forEach(function(i) { if (i >= 0) ignora[i] = true; });
  const cMissoes = detectarNumericas_(dados, ignora);

  if (!cMissoes.length) {
    diag.push({ nivel: 'ERRO', cat: T.CAT.ARENA, msg: 'Nenhuma coluna de pontuação encontrada em "' + aba.getName() + '".' });
  } else {
    diag.push({ nivel: 'OK', cat: T.CAT.ARENA, msg: cMissoes.length + ' colunas de missão detectadas em "' + aba.getName() + '".' });
  }

  dados.slice(1).forEach(function(r, ri) {
    if (r.every(function(v) { return v === ''; })) return;

    const idEq  = resolverEq_(r[iEq], eq);
    const round = iRound >= 0 ? String(r[iRound] || '').trim() || ('Resp.' + (ri + 2)) : ('Resp.' + (ri + 2));
    const juiz  = iJuiz >= 0 ? String(r[iJuiz] || '').trim() : '';
    const val   = iVal < 0 || respostaValida_(r[iVal]);
    const pen   = iPen >= 0 ? Math.abs(num_(r[iPen])) : 0;
    const soma  = cMissoes.reduce(function(s, c) { return s + Math.max(0, num_(r[c])); }, 0);
    const total = Math.min(cfg.maxArena, Math.max(0, soma - pen));
    const ts    = r[iTS] instanceof Date ? r[iTS] : null;

    if (!idEq) diag.push({ nivel: 'ATENÇÃO', cat: T.CAT.ARENA, msg: 'Equipe não reconhecida na linha ' + (ri + 2) + ': "' + r[iEq] + '".' });

    res.linhas.push({ ts: ts, idEq: idEq || String(r[iEq] || ''), round: round, juiz: juiz, total: total, valido: Boolean(idEq && val), linha: ri + 2 });
  });

  // melhor round por equipe (mais recente em caso de empate)
  const melhor = {};
  res.linhas.filter(function(l) { return l.valido; }).forEach(function(l) {
    const k = l.idEq + '|' + norm_(l.round);
    const cur = melhor[k];
    if (!cur || (l.ts && (!cur.ts || l.ts >= cur.ts))) melhor[k] = l;
  });

  Object.values(melhor).forEach(function(l) {
    if (!res.porEquipe[l.idEq]) res.porEquipe[l.idEq] = { totais: [], rounds: [] };
    res.porEquipe[l.idEq].totais.push(l.total);
    res.porEquipe[l.idEq].rounds.push(l.round);
  });

  Object.keys(res.porEquipe).forEach(function(id) {
    const b = res.porEquipe[id];
    b.melhor   = Math.max.apply(null, b.totais);
    b.qtdRounds = b.totais.length;
  });

  return res;
}


// ================================================================
// LEITURA DE RUBRICAS (Projeto / Design / Core)
// ================================================================

function lerRubrica_(ss, nomeAba, categoria, cfg, eq, diag) {
  const res = { categoria: categoria, porEquipe: {}, linhas: [] };
  const aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() < 2) {
    diag.push({ nivel: 'ATENÇÃO', cat: categoria, msg: 'Aba "' + nomeAba + '" não encontrada ou vazia.' });
    return res;
  }

  const dados = aba.getDataRange().getValues();
  const exib  = aba.getDataRange().getDisplayValues();
  const cab   = dados[0];

  const iEq   = achaCab_(cab, ['id equipe','id_equipe','equipe avaliada','selecione a equipe','selecione equipe','equipe','turma'], -1);
  const iJuiz = achaCab_(cab, ['nome do juiz','nome do avaliador','juiz','avaliador','email','e mail'], -1);
  const iVal  = achaCab_(cab, ['validado','homologado','considerar'], -1);
  const iTS   = achaCab_(cab, ['carimbo','timestamp','data hora','data'], 0);

  if (iEq < 0) {
    diag.push({ nivel: 'ERRO', cat: categoria, msg: 'Coluna de equipe não encontrada em "' + aba.getName() + '".' });
    return res;
  }

  const ignora = {};
  [iEq, iJuiz, iVal, iTS].forEach(function(i) { if (i >= 0) ignora[i] = true; });
  // Ignora colunas de texto livre que não são critérios de rubrica
  const IGNORA_TEXTO = ['bom trabalho','reflitam','observacao','observação','comentario','comentário','sala','turma'];
  cab.forEach(function(h, i) {
    const hn = norm_(h);
    if (IGNORA_TEXTO.some(function(k) { return hn.indexOf(k) >= 0; })) ignora[i] = true;
  });
  const cCrit = detectarRubrica_(dados, exib, ignora, cfg.criterios);

  if (cCrit.length !== cfg.criterios) {
    diag.push({ nivel: 'ATENÇÃO', cat: categoria, msg: cCrit.length + ' critérios encontrados em "' + aba.getName() + '" (esperado: ' + cfg.criterios + ').' });
  } else {
    diag.push({ nivel: 'OK', cat: categoria, msg: 'Aba "' + aba.getName() + '": ' + cCrit.length + ' critérios.' });
  }

  dados.slice(1).forEach(function(r, ri) {
    if (r.every(function(v) { return v === ''; })) return;

    const idEq  = resolverEq_(r[iEq], eq);
    const juiz  = iJuiz >= 0 ? String(r[iJuiz] || '').trim() : ('Resp.' + (ri + 2));
    const val   = iVal < 0 || respostaValida_(r[iVal]);
    const notas = cCrit.map(function(c) { return pontoRubrica_(r[c]); }).filter(function(v) { return v !== null; });
    const completa = notas.length === cfg.criterios;
    const total = notas.reduce(function(s, v) { return s + v; }, 0);
    const ts    = r[iTS] instanceof Date ? r[iTS] : null;

    if (!idEq) diag.push({ nivel: 'ATENÇÃO', cat: categoria, msg: 'Equipe não reconhecida na linha ' + (ri + 2) + ': "' + r[iEq] + '".' });

    const ok = Boolean(idEq && val && completa);
    let status = 'Válida';
    if (!idEq) status = 'Equipe não reconhecida';
    else if (!val) status = 'Não validada';
    else if (!completa) status = 'Incompleta (' + notas.length + '/' + cfg.criterios + ')';

    res.linhas.push({ ts: ts, idEq: idEq || String(r[iEq] || ''), juiz: juiz, notas: notas.length, total: total, valido: ok, status: status, linha: ri + 2 });
  });

  // avaliação mais recente por juiz×equipe
  const recente = {};
  res.linhas.filter(function(l) { return l.valido; }).forEach(function(l) {
    const k = l.idEq + '|' + norm_(l.juiz);
    const cur = recente[k];
    if (!cur || (l.ts && (!cur.ts || l.ts >= cur.ts))) recente[k] = l;
  });

  Object.values(recente).forEach(function(l) {
    if (!res.porEquipe[l.idEq]) res.porEquipe[l.idEq] = { totais: [], juizes: [] };
    res.porEquipe[l.idEq].totais.push(l.total);
    res.porEquipe[l.idEq].juizes.push(l.juiz);
  });

  Object.keys(res.porEquipe).forEach(function(id) {
    const b = res.porEquipe[id];
    b.media    = media_(b.totais);
    b.qtdJuizes = b.totais.length;
  });

  return res;
}


// ================================================================
// LEITURA DAS TAMPINHAS
// ================================================================

function lerTampinhas_(ss, cfg, eq, diag) {
  const res = { porEquipe: {}, linhas: [] };
  const aba = ss.getSheetByName(T.ABAS.TAMPINHAS);
  if (!aba || aba.getLastRow() < 2) return res;

  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iEq   = achaCab_(cab, ['id equipe','equipe','turma'], 1);
  const iBruto= achaCab_(cab, ['peso bruto','bruto'], 2);
  const iTara = achaCab_(cab, ['tara'], 3);
  const iLiq  = achaCab_(cab, ['peso liquido','liquido','líquido'], 4);
  const iData = achaCab_(cab, ['data'], 0);

  dados.slice(1).forEach(function(r, ri) {
    if (r.every(function(v) { return v === ''; })) return;
    const idEq = resolverEq_(r[iEq], eq);
    const bruto = num_(r[iBruto]);
    const tara  = num_(r[iTara]);
    const liq   = (r[iLiq] !== '' && r[iLiq] !== null) ? num_(r[iLiq]) : Math.max(0, bruto - tara);
    const ok    = Boolean(idEq && liq >= 0);

    if (!ok) {
      diag.push({ nivel: 'ATENÇÃO', cat: T.CAT.TAMP, msg: 'Pesagem inválida na linha ' + (ri + 2) + '.' });
    } else {
      if (!res.porEquipe[idEq]) res.porEquipe[idEq] = { pesoTotal: 0, qtd: 0 };
      res.porEquipe[idEq].pesoTotal += liq;
      res.porEquipe[idEq].qtd++;
    }
    res.linhas.push({ data: r[iData], idEq: idEq || String(r[iEq] || ''), bruto: bruto, tara: tara, liq: liq, ok: ok, linha: ri + 2 });
  });

  Object.keys(res.porEquipe).forEach(function(id) {
    const b  = res.porEquipe[id];
    const e  = eq.porId[id];
    const al = e ? e.alunos : 0;
    b.kgAluno = al > 0 ? b.pesoTotal / al : 0;
    b.nota40  = cfg.metaKg > 0 ? Math.min(cfg.maxRub, (b.kgAluno / cfg.metaKg) * cfg.maxRub) : 0;
    if (!al) diag.push({ nivel: 'ERRO', cat: T.CAT.TAMP, msg: 'Equipe ' + id + ' sem quantidade de alunos.' });
  });

  return res;
}


// ================================================================
// CÁLCULO DE RESULTADOS
// ================================================================

function calcularResultados_(eq, arena, rubricas, tamp, cfg) {
  const rubPorCat = {};
  rubricas.forEach(function(r) { rubPorCat[r.categoria] = r; });

  function getRub(cat, id) {
    const r = rubPorCat[cat];
    return (r && r.porEquipe[id]) || { media: 0, qtdJuizes: 0 };
  }

  const linhas = eq.lista.map(function(e) {
    const ar = arena.porEquipe[e.id]  || { melhor: 0, qtdRounds: 0 };
    const pr = getRub(T.CAT.PROJETO,  e.id);
    const de = getRub(T.CAT.DESIGN,   e.id);
    const co = getRub(T.CAT.CORE,     e.id);
    const ta = tamp.porEquipe[e.id]   || { pesoTotal: 0, kgAluno: 0, nota40: 0, qtd: 0 };

    const a20 = clamp_((ar.melhor   / cfg.maxArena) * cfg.pArena * 100, 0, cfg.pArena * 100);
    const p20 = clamp_((pr.media    / cfg.maxRub)   * cfg.pProj  * 100, 0, cfg.pProj  * 100);
    const d20 = clamp_((de.media    / cfg.maxRub)   * cfg.pDes   * 100, 0, cfg.pDes   * 100);
    const c20 = clamp_((co.media    / cfg.maxRub)   * cfg.pCore  * 100, 0, cfg.pCore  * 100);
    const t20 = clamp_((ta.nota40   / cfg.maxRub)   * cfg.pTamp  * 100, 0, cfg.pTamp  * 100);

    const completo = ar.qtdRounds >= cfg.rounds && pr.qtdJuizes >= cfg.juizes &&
                     de.qtdJuizes >= cfg.juizes && co.qtdJuizes >= cfg.juizes &&
                     ta.qtd > 0 && e.alunos > 0;
    const semDados = ar.qtdRounds === 0 && pr.qtdJuizes === 0 &&
                     de.qtdJuizes === 0 && co.qtdJuizes === 0 && ta.qtd === 0;

    return {
      id: e.id, nome: e.nome, turno: e.turno, tutor: e.tutor, alunos: e.alunos,
      arenaBruta: ar.melhor, arena20: a20, arenaRounds: ar.qtdRounds,
      projBruta: pr.media,   proj20: p20,  projJuizes: pr.qtdJuizes,
      desBruta: de.media,    des20: d20,   desJuizes: de.qtdJuizes,
      coreBruta: co.media,   core20: c20,  coreJuizes: co.qtdJuizes,
      tampKg: ta.pesoTotal,  tampKgAl: ta.kgAluno, tampBruta: ta.nota40,
      tamp20: t20, tampPes: ta.qtd,
      total: a20 + p20 + d20 + c20 + t20,
      status: completo ? 'Completo' : (semDados ? 'Sem dados' : 'Pendente'),
      posGeral: '', posArena: '', posProj: '', posDes: '', posCore: '', posTamp: ''
    };
  });

  function ranquear(lista, fnChave) {
    const ord = lista.slice().sort(function(a, b) {
      const ca = fnChave(a), cb = fnChave(b);
      for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
        const d = num_(cb[i]) - num_(ca[i]);
        if (Math.abs(d) > 1e-6) return d;
      }
      return String(a.id).localeCompare(String(b.id), 'pt-BR');
    });
    let pos = 0, prevChave = null;
    return ord.map(function(item, i) {
      const ch = fnChave(item).map(function(v) { return arred_(num_(v), 6); });
      const igual = prevChave && ch.length === prevChave.length && ch.every(function(v, j) { return Math.abs(v - prevChave[j]) <= 1e-6; });
      if (!igual) pos = i + 1;
      prevChave = ch;
      return { item: item, pos: pos };
    });
  }

  function aplicar(rank, campo) {
    const m = {};
    rank.forEach(function(r) { m[r.item.id] = r.pos; });
    linhas.forEach(function(l) { l[campo] = m[l.id] || ''; });
    return rank;
  }

  const rkGeral = aplicar(ranquear(linhas.filter(function(x) { return x.status === 'Completo'; }), function(x) { return [x.total]; }), 'posGeral');
  aplicar(ranquear(linhas.filter(function(x) { return x.arenaRounds > 0; }),  function(x) { return [x.arenaBruta]; }), 'posArena');
  aplicar(ranquear(linhas.filter(function(x) { return x.projJuizes > 0; }),   function(x) { return [x.projBruta]; }),  'posProj');
  aplicar(ranquear(linhas.filter(function(x) { return x.desJuizes > 0; }),    function(x) { return [x.desBruta]; }),   'posDes');
  aplicar(ranquear(linhas.filter(function(x) { return x.coreJuizes > 0; }),   function(x) { return [x.coreBruta]; }), 'posCore');
  aplicar(ranquear(linhas.filter(function(x) { return x.tampPes > 0; }),      function(x) { return [x.tampKgAl, x.tampKg]; }), 'posTamp');

  return { linhas: linhas, rankingGeral: rkGeral };
}


// ================================================================
// ESCRITA DOS RESULTADOS
// ================================================================

function escreverBase_(ss, dados) {
  const agora = new Date();
  const cab = [
    'ID', 'Nome', 'Turno', 'Tutor', 'Alunos',
    'Arena_Bruta', 'Arena_20', 'Rounds',
    'Proj_Bruta',  'Proj_20',  'Juizes_Proj',
    'Des_Bruta',   'Des_20',   'Juizes_Des',
    'Core_Bruta',  'Core_20',  'Juizes_Core',
    'Tamp_kg',     'Tamp_kg_aluno', 'Tamp_Bruta', 'Tamp_20', 'Pesagens',
    'Total', 'Status', 'Pos_Geral',
    'Pos_Arena', 'Pos_Proj', 'Pos_Des', 'Pos_Core', 'Pos_Tamp', 'Atualizado'
  ];
  const rows = dados.linhas.map(function(x) { return [
    x.id, x.nome, x.turno, x.tutor, x.alunos,
    arred_(x.arenaBruta,2), arred_(x.arena20,2), x.arenaRounds,
    arred_(x.projBruta,2),  arred_(x.proj20,2),  x.projJuizes,
    arred_(x.desBruta,2),   arred_(x.des20,2),   x.desJuizes,
    arred_(x.coreBruta,2),  arred_(x.core20,2),  x.coreJuizes,
    arred_(x.tampKg,3), arred_(x.tampKgAl,3), arred_(x.tampBruta,2), arred_(x.tamp20,2), x.tampPes,
    arred_(x.total,2), x.status, x.posGeral,
    x.posArena, x.posProj, x.posDes, x.posCore, x.posTamp, agora
  ]; });

  const aba = escTabela_(ss, T.ABAS.BASE, cab, rows, T.CORES.MARINHO);
  if (rows.length) {
    aba.getRange(2, 6, rows.length, 2).setNumberFormat('0.00');
    aba.getRange(2, 9, rows.length, 2).setNumberFormat('0.00');
    aba.getRange(2, 12, rows.length, 2).setNumberFormat('0.00');
    aba.getRange(2, 15, rows.length, 2).setNumberFormat('0.00');
    aba.getRange(2, 18, rows.length, 4).setNumberFormat('0.000');
    aba.getRange(2, 23, rows.length, 1).setNumberFormat('0.00');
    aba.getRange(2, 31, rows.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    const rSt = aba.getRange(2, 24, rows.length, 1);
    aba.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Completo').setBackground(T.CORES.VERDE_CLARO).setRanges([rSt]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Pendente').setBackground(T.CORES.AMARELO_CLARO).setRanges([rSt]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Sem dados').setBackground(T.CORES.VERMELHO_CLARO).setRanges([rSt]).build()
    ]);
  }
}

function escreverRanking_(ss, dados) {
  const cab = ['Pos', 'ID', 'Equipe', 'Turno', 'Tutor', 'Arena_20', 'Proj_20', 'Des_20', 'Core_20', 'Tamp_20', 'Total'];
  const rows = dados.rankingGeral.map(function(r) {
    const x = r.item;
    return [r.pos, x.id, x.nome, x.turno, x.tutor,
      arred_(x.arena20,2), arred_(x.proj20,2), arred_(x.des20,2), arred_(x.core20,2), arred_(x.tamp20,2), arred_(x.total,2)];
  });
  const aba = escTabela_(ss, T.ABAS.RANKING, cab, rows, T.CORES.MARINHO);
  if (rows.length > 0) {
    aba.getRange(2, 6, rows.length, 6).setNumberFormat('0.00');
    const hl = [[T.CORES.AMARELO_CLARO], ['#EDEDED'], ['#FCE5CD']];
    hl.forEach(function(cor, i) {
      if (rows.length > i) aba.getRange(i + 2, 1, 1, cab.length).setBackground(cor[0]);
    });
  }
}

function escreverRankingCat_(ss, dados, cfg) {
  const cab  = ['Categoria', 'Pos', 'ID', 'Equipe', 'Nota_Bruta', 'Maximo', 'Parcela_20', 'Qtd'];
  const rows = [];

  function add(cat, campo, max, parcela, qtd) {
    dados.linhas.slice().sort(function(a, b) {
      const pa = num_(a['pos' + campo]) || 9999;
      const pb = num_(b['pos' + campo]) || 9999;
      return pa - pb;
    }).filter(function(x) { return num_(x['pos' + campo]) > 0; }).forEach(function(x) {
      rows.push([cat, x['pos' + campo], x.id, x.nome, arred_(num_(x[max]),2), campo === 'Arena' ? cfg.maxArena : cfg.maxRub, arred_(num_(x[parcela]),2), x[qtd]]);
    });
  }

  add(T.CAT.ARENA,   'Arena', 'arenaBruta', 'arena20', 'arenaRounds');
  add(T.CAT.PROJETO, 'Proj',  'projBruta',  'proj20',  'projJuizes');
  add(T.CAT.DESIGN,  'Des',   'desBruta',   'des20',   'desJuizes');
  add(T.CAT.CORE,    'Core',  'coreBruta',  'core20',  'coreJuizes');
  add(T.CAT.TAMP,    'Tamp',  'tampBruta',  'tamp20',  'tampPes');

  escTabela_(ss, T.ABAS.RANK_CAT, cab, rows, T.CORES.MARINHO);
}

function escreverStatus_(ss, dados, cfg) {
  const cab = [
    'ID', 'Equipe', 'Status',
    'Rounds', 'Arena_OK',
    'Jz_Proj', 'Proj_OK',
    'Jz_Des',  'Des_OK',
    'Jz_Core', 'Core_OK',
    'Pesagens','Tamp_OK'
  ];
  const ok = function(v, min) { return v >= min ? '✔' : '✘'; };
  const rows = dados.linhas.map(function(x) { return [
    x.id, x.nome, x.status,
    x.arenaRounds, ok(x.arenaRounds, cfg.rounds),
    x.projJuizes,  ok(x.projJuizes, cfg.juizes),
    x.desJuizes,   ok(x.desJuizes, cfg.juizes),
    x.coreJuizes,  ok(x.coreJuizes, cfg.juizes),
    x.tampPes,     ok(x.tampPes, 1)
  ]; });

  const aba = escTabela_(ss, T.ABAS.STATUS, cab, rows, T.CORES.MARINHO);
  if (rows.length) {
    const colunasCerto = [5,7,9,11,13];
    const regras = [];
    colunasCerto.forEach(function(c) {
      const r = aba.getRange(2, c, rows.length, 1);
      regras.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✔').setBackground(T.CORES.VERDE_CLARO).setRanges([r]).build());
      regras.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✘').setBackground(T.CORES.VERMELHO_CLARO).setRanges([r]).build());
    });
    aba.setConditionalFormatRules(regras);
  }
}

function escreverDiag_(ss, diag, cfg, inicio) {
  const cab  = ['Nível', 'Categoria', 'Mensagem'];
  const rows = diag.map(function(d) { return [d.nivel, d.cat, d.msg]; });
  rows.push(['INFO', 'SISTEMA', 'Versão: ' + T.VERSAO + ' | Tempo: ' + (new Date() - inicio) + 'ms']);
  const aba = escTabela_(ss, T.ABAS.DIAG, cab, rows, T.CORES.MARINHO);
  if (rows.length) {
    const r = aba.getRange(2, 1, rows.length, 1);
    aba.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ERRO').setBackground(T.CORES.VERMELHO_CLARO).setRanges([r]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ATENÇÃO').setBackground(T.CORES.AMARELO_CLARO).setRanges([r]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('OK').setBackground(T.CORES.VERDE_CLARO).setRanges([r]).build()
    ]);
  }
}

function escreverPainel_(ss, dados, cfg) {
  let aba = ss.getSheetByName(T.ABAS.PAINEL);
  if (!aba) aba = ss.insertSheet(T.ABAS.PAINEL);
  aba.clearContents();
  aba.clearFormats();
  aba.setTabColor(T.CORES.MARINHO);

  aba.getRange(1, 1, 1, 9).mergeAcross()
    .setValue(cfg.titulo)
    .setBackground(T.CORES.MARINHO).setFontColor('#FFF')
    .setFontSize(22).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  aba.setRowHeight(1, 64);

  const sub = 'Atualizado em ' + new Date().toLocaleString('pt-BR');
  aba.getRange(2, 1, 1, 9).mergeAcross().setValue(sub)
    .setBackground('#1d4a7a').setFontColor('rgba(255,255,255,.7)').setFontSize(10).setHorizontalAlignment('center');
  aba.setRowHeight(2, 24);

  const cabRk = ['Pos', 'ID', 'Equipe', 'Arena', 'Projeto', 'Design', 'Core', 'Tampinhas', 'TOTAL'];
  aba.getRange(3, 1, 1, 9).setValues([cabRk])
    .setBackground(T.CORES.AZUL).setFontColor('#FFF').setFontWeight('bold').setHorizontalAlignment('center');
  aba.setRowHeight(3, 32);

  const top = dados.rankingGeral.slice(0, 15);
  top.forEach(function(r, i) {
    const x   = r.item;
    const row = 4 + i;
    const corBg = i === 0 ? '#FFF9C4' : (i === 1 ? '#F5F5F5' : (i === 2 ? '#FFF3E0' : '#FFFFFF'));
    aba.getRange(row, 1, 1, 9).setValues([[
      r.pos, x.id, x.nome,
      arred_(x.arena20,2), arred_(x.proj20,2), arred_(x.des20,2), arred_(x.core20,2), arred_(x.tamp20,2),
      arred_(x.total,2)
    ]]).setBackground(corBg).setHorizontalAlignment('center');
    aba.getRange(row, 3).setHorizontalAlignment('left');
    aba.setRowHeight(row, 30);
  });

  if (!top.length) {
    aba.getRange(4, 1, 1, 9).mergeAcross().setValue('Nenhuma equipe com avaliação completa ainda.')
      .setHorizontalAlignment('center').setFontColor('#6B7A90');
  }

  aba.setColumnWidth(1, 45);
  aba.setColumnWidth(2, 80);
  aba.setColumnWidth(3, 220);
  aba.setColumnWidths(4, 6, 75);
  aba.setFrozenRows(3);
  aba.setHiddenGridlines(true);
}

function ordenarAbas_(ss) {
  const ordem = [T.ABAS.PAINEL, T.ABAS.RANKING, T.ABAS.RANK_CAT, T.ABAS.STATUS,
                 T.ABAS.BASE, T.ABAS.CONFIG, T.ABAS.EQUIPES, T.ABAS.TAMPINHAS, T.ABAS.DIAG];
  ordem.forEach(function(nome, i) {
    const aba = ss.getSheetByName(nome);
    if (aba) { ss.setActiveSheet(aba); ss.moveActiveSheet(i + 1); }
  });
}


// ================================================================
// API WEB — GET
// ================================================================

function doGet(e) {
  const p  = (e && e.parameter) || {};
  const cb = p.callback || '';
  try {
    let r;
    switch (p.action) {
      case 'ranking':     r = apiRanking_();        break;
      case 'equipes':     r = apiEquipes_();        break;
      case 'deliberacao': r = apiDeliberacao_();    break;
      case 'config':      r = apiConfig_();         break;
      case 'arena':       r = apiArenaDetalhe_();   break;
      case 'turma':       r = apiTurma_(p);         break;
      default:            r = { ok: false, erro: 'Ação desconhecida: ' + (p.action || '(vazia)') };
    }
    return jsonOut_(r, cb);
  } catch (err) {
    return jsonOut_({ ok: false, erro: err.message }, cb);
  }
}


// ================================================================
// API WEB — POST
// ================================================================

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (_) { return jsonOut_({ ok: false, erro: 'JSON inválido.' }); }
  try {
    autenticarJuiz_(body.juiz, body.pin);
    let r;
    switch (body.action) {
      case 'rubrica':    r = apiSalvarRubrica_(body);    break;
      case 'arena':      r = apiSalvarArena_(body);      break;
      case 'comentario': r = apiSalvarComentario_(body); break;
      case 'voto':       r = apiSalvarVoto_(body);       break;
      default:           r = { ok: false, erro: 'Ação desconhecida.' };
    }
    return jsonOut_(r);
  } catch (err) {
    return jsonOut_({ ok: false, erro: err.message });
  }
}


// ================================================================
// API — AUTENTICAÇÃO
// ================================================================

function autenticarJuiz_(nome, pin) {
  if (!nome) throw new Error('Nome do juiz é obrigatório.');
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let aba   = ss.getSheetByName('HUB_JUIZES');
  if (!aba) {
    aba = ss.insertSheet('HUB_JUIZES');
    aba.getRange(1,1,1,4).setValues([['Nome','PIN','Categoria','Ativo']]);
    return; // primeira chamada: cria a aba e aceita
  }
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const n = String(dados[i][0]||'').trim().toLowerCase();
    if (n === nome.trim().toLowerCase()) {
      const p    = String(dados[i][1]||'').trim();
      const ativo = dados[i][3] !== false && dados[i][3] !== 'Não';
      if (!ativo) throw new Error('Juiz "' + nome + '" está inativo.');
      if (p && p !== String(pin||'').trim()) throw new Error('PIN incorreto.');
      return;
    }
  }
  // juiz não cadastrado → aceita (modo aberto)
}


// ================================================================
// API — LEITURA
// ================================================================

function apiArenaDetalhe_() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const diag = [];
  const cfg  = lerConfig_(ss, diag);
  const eq   = lerEquipes_(ss, cfg, diag);
  const aba  = ss.getSheetByName(cfg.abaArena);
  if (!aba || aba.getLastRow() < 2) return { ok: true, equipes: [], roundsOrdem: [] };

  const dados  = aba.getDataRange().getValues();
  const cab    = dados[0];
  const iEq    = achaCab_(cab, ['id equipe','id_equipe','equipe','turma'], -1);
  const iRound = achaCab_(cab, ['round','rodada','partida','tentativa'], -1);
  const iJuiz  = achaCab_(cab, ['arbitro','árbitro','juiz','avaliador','email'], -1);
  const iVal   = achaCab_(cab, ['validado','homologado','considerar'], -1);
  const iPen   = achaCab_(cab, ['penalidade','penalidades','penalty'], -1);
  const iTS    = achaCab_(cab, ['carimbo','timestamp','data hora','data'], 0);
  if (iEq < 0) return { ok: true, equipes: [], roundsOrdem: [] };

  const ignora = {};
  [iEq, iRound, iJuiz, iVal, iPen, iTS].forEach(function(i) { if (i >= 0) ignora[i] = true; });
  const cMissoes = detectarNumericas_(dados, ignora);

  const melhorMap = {};
  dados.slice(1).forEach(function(r) {
    if (r.every(function(v) { return v === ''; })) return;
    const idEq = resolverEq_(r[iEq], eq);
    if (!idEq) return;
    if (iVal >= 0 && !respostaValida_(r[iVal])) return;
    const round = iRound >= 0 ? String(r[iRound] || '').trim() : 'Round';
    if (!round) return;
    const ts   = r[iTS] instanceof Date ? r[iTS] : null;
    const pen  = iPen >= 0 ? Math.abs(num_(r[iPen])) : 0;
    const soma = cMissoes.reduce(function(s, c) { return s + Math.max(0, num_(r[c])); }, 0);
    const total = Math.min(cfg.maxArena, Math.max(0, soma - pen));
    const k = idEq + '||' + norm_(round);
    const cur = melhorMap[k];
    if (!cur || (ts && (!cur.ts || ts >= cur.ts))) melhorMap[k] = { idEq: idEq, round: round, total: total, ts: ts };
  });

  const roundsVistos = {};
  Object.values(melhorMap).forEach(function(l) { roundsVistos[norm_(l.round)] = l.round; });
  const roundsOrdem = Object.values(roundsVistos).sort(function(a, b) {
    return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
  });

  const byEq = {};
  Object.values(melhorMap).forEach(function(l) {
    if (!byEq[l.idEq]) byEq[l.idEq] = {};
    byEq[l.idEq][l.round] = l.total;
  });

  const eqMap = {};
  eq.lista.forEach(function(e) { eqMap[e.id] = e; });

  const equipes = Object.keys(byEq).map(function(id) {
    const scores = byEq[id];
    const vals   = Object.values(scores);
    const melhor = vals.length ? Math.max.apply(null, vals) : 0;
    return { id: id, nome: eqMap[id] ? eqMap[id].nome : id, melhor: melhor, rounds: scores };
  }).sort(function(a, b) { return b.melhor - a.melhor; });

  return { ok: true, equipes: equipes, roundsOrdem: roundsOrdem };
}

function apiRanking_() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(T.ABAS.BASE);
  if (!aba || aba.getLastRow() < 2) return { ok: true, equipes: [] };
  const dados = aba.getDataRange().getValues();
  const idx   = {};
  dados[0].forEach(function(h, i) { idx[h] = i; });
  function g(r, col) { return r[idx[col]] !== undefined ? r[idx[col]] : ''; }
  const equipes = dados.slice(1).map(function(r) { return {
    id: g(r,'ID'), nome: g(r,'Nome'), turno: g(r,'Turno'), tutor: g(r,'Tutor'),
    arena20: num_(g(r,'Arena_20')), proj20: num_(g(r,'Proj_20')),
    des20: num_(g(r,'Des_20')),     core20: num_(g(r,'Core_20')),
    tamp20: num_(g(r,'Tamp_20')),   total: num_(g(r,'Total')),
    status: g(r,'Status'),
    posGeral: g(r,'Pos_Geral'), posArena: g(r,'Pos_Arena'),
    posProj: g(r,'Pos_Proj'),   posDes: g(r,'Pos_Des'),
    posCore: g(r,'Pos_Core'),   posTamp: g(r,'Pos_Tamp')
  }; }).sort(function(a,b){ return (num_(a.posGeral)||9999) - (num_(b.posGeral)||9999); });
  return { ok: true, equipes: equipes, atualizado: new Date().toISOString() };
}

function apiEquipes_() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(T.ABAS.EQUIPES);
  if (!aba || aba.getLastRow() < 2) return { ok: true, equipes: [] };
  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iId   = achaCab_(cab, ['id equipe','id_equipe','id'], 0);
  const iNome = achaCab_(cab, ['nome equipe','nome_equipe','equipe','turma'], 1);
  const iTurno= achaCab_(cab, ['turno'], 2);
  const iTutor= achaCab_(cab, ['tutor'], 3);
  const iQtd  = achaCab_(cab, ['qtde','qtd','alunos'], 4);
  const lista = dados.slice(1).filter(function(r){ return r[iId]; }).map(function(r){ return {
    id: String(r[iId]||'').trim().toUpperCase(),
    nome: String(r[iNome]||'').trim(),
    turno: String(r[iTurno]||'').trim(),
    tutor: String(r[iTutor]||'').trim(),
    alunos: num_(r[iQtd])
  }; });
  return { ok: true, equipes: lista };
}

function apiConfig_() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lerConfig_(ss, []);
  return { ok: true, titulo: cfg.titulo, maxArena: cfg.maxArena, maxRub: cfg.maxRub, criterios: cfg.criterios };
}

function apiDeliberacao_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    ok: true,
    comentarios: lerAbaHub_(ss, 'HUB_DELIBERACAO_CHAT'),
    votos:       lerAbaHub_(ss, 'HUB_DELIBERACAO_VOTOS')
  };
}

function lerAbaHub_(ss, nome) {
  const aba = ss.getSheetByName(nome);
  if (!aba || aba.getLastRow() < 2) return [];
  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  return dados.slice(1).filter(function(r){ return r.some(function(v){ return v!==''; }); }).map(function(r){
    const obj = {};
    cab.forEach(function(h,i){ obj[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
    return obj;
  });
}


// ================================================================
// API — ESCRITA
// ================================================================

function apiSalvarRubrica_(body) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lerConfig_(ss, []);
  if (!body.categoria || !body.idEquipe || !Array.isArray(body.notas)) throw new Error('Campos obrigatórios ausentes.');
  if (body.notas.length !== cfg.criterios) throw new Error('Esperadas ' + cfg.criterios + ' notas; recebidas: ' + body.notas.length + '.');
  body.notas.forEach(function(n,i){ const v=num_(n); if(v<1||v>4) throw new Error('Nota '+(i+1)+' inválida (1–4): '+n); });

  const mapa = {};
  mapa[T.CAT.PROJETO] = cfg.abaProj;
  mapa[T.CAT.DESIGN]  = cfg.abaDes;
  mapa[T.CAT.CORE]    = cfg.abaCore;
  const nomeAba = mapa[body.categoria];
  if (!nomeAba) throw new Error('Categoria inválida: ' + body.categoria);

  let aba = ss.getSheetByName(nomeAba);
  if (!aba) {
    aba = ss.insertSheet(nomeAba);
    const h = ['Carimbo de data/hora','ID_Equipe','Nome do Juiz','Validado'];
    for (let i = 1; i <= cfg.criterios; i++) h.push('Critério ' + i);
    aba.getRange(1,1,1,h.length).setValues([h]);
  }
  const linha = [new Date(), body.idEquipe, body.juiz, 'Sim'];
  body.notas.forEach(function(n){ linha.push(num_(n)); });
  aba.appendRow(linha);
  atualizarInterno_(ss);
  return { ok: true, mensagem: 'Rubrica salva.' };
}

function apiSalvarArena_(body) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lerConfig_(ss, []);
  if (!body.idEquipe || !body.round || !body.missoes) throw new Error('Campos obrigatórios ausentes.');

  let aba = ss.getSheetByName(cfg.abaArena);
  if (!aba) aba = ss.insertSheet(cfg.abaArena);
  if (aba.getLastRow() === 0) {
    const missKeys = Object.keys(body.missoes).sort();
    const h = ['Carimbo de data/hora','ID_Equipe','Round','Árbitro','Penalidade','Validado'].concat(missKeys);
    aba.getRange(1,1,1,h.length).setValues([h]);
  }
  const cab   = aba.getRange(1,1,1,aba.getLastColumn()).getValues()[0];
  const linha = new Array(cab.length).fill('');
  function set(nome, val){ const i=cab.indexOf(nome); if(i>=0) linha[i]=val; }
  set('Carimbo de data/hora', new Date());
  set('ID_Equipe', body.idEquipe);
  set('Round', body.round);
  set('Árbitro', body.juiz);
  set('Penalidade', num_(body.penalidade));
  set('Validado', 'Sim');
  Object.keys(body.missoes).forEach(function(m){ set(m, num_(body.missoes[m])); });
  aba.appendRow(linha);
  atualizarInterno_(ss);
  return { ok: true, mensagem: 'Arena salva.' };
}

function apiSalvarComentario_(body) {
  if (!body.texto||!body.texto.trim()) throw new Error('Texto obrigatório.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba  = ss.getSheetByName('HUB_DELIBERACAO_CHAT');
  if (!aba) { aba = ss.insertSheet('HUB_DELIBERACAO_CHAT'); aba.getRange(1,1,1,4).setValues([['Data_Hora','Juiz','Categoria','Texto']]); }
  aba.appendRow([new Date(), body.juiz, body.categoria||'', body.texto.trim()]);
  return { ok: true };
}

function apiSalvarVoto_(body) {
  if (!body.idEquipe||!body.categoria) throw new Error('Campos obrigatórios ausentes.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba  = ss.getSheetByName('HUB_DELIBERACAO_VOTOS');
  if (!aba) { aba = ss.insertSheet('HUB_DELIBERACAO_VOTOS'); aba.getRange(1,1,1,5).setValues([['Data_Hora','Juiz','ID_Equipe','Categoria','Aprovado']]); }
  aba.appendRow([new Date(), body.juiz, body.idEquipe, body.categoria, body.favor===true||body.favor==='true'?'Sim':'Não']);
  return { ok: true };
}


// ================================================================
// UTILITÁRIOS — DETECÇÃO DE COLUNAS
// ================================================================

function detectarNumericas_(dados, ignora) {
  const cab  = dados[0];
  const lim  = Math.min(dados.length, 51);
  const res  = [];
  for (let c = 0; c < cab.length; c++) {
    if (ignora[c]) continue;
    const h = norm_(cab[c]);
    const ehMissao = /^m\s*0?\d+/.test(h) || /\bmissao/.test(h) || /precision/.test(h);
    let prench = 0, num = 0;
    for (let r = 1; r < lim; r++) {
      const v = dados[r][c];
      if (v === '' || v === null || v === undefined) continue;
      prench++;
      if (!isNaN(Number(String(v).replace(',','.'))) && Number(String(v).replace(',','.')) >= 0) num++;
    }
    if (ehMissao || (prench > 0 && num / prench >= 0.75)) res.push(c);
  }
  return res;
}

function detectarRubrica_(dados, exib, ignora, esperados) {
  const cab = dados[0];
  const lim = Math.min(dados.length, 51);
  const por_codigo = [], por_dados = [];
  for (let c = 0; c < cab.length; c++) {
    if (ignora[c]) continue;
    const h    = norm_(cab[c]);
    const hRaw = String(cab[c]).toLowerCase();
    // Detecta: "P01", "Critério 1", "Avaliação [Nome]", "Avaliacao Nome"
    if (
      /^(p|d|cv|c|criterio)\s*0?\d+/.test(h) ||
      /^avaliacao[\s\[]/.test(h) ||
      /^avalia[cç][aã]o[\s\[]/.test(hRaw)
    ) { por_codigo.push(c); continue; }
    let prench = 0, validos = 0;
    for (let r = 1; r < lim; r++) {
      const v = exib[r][c];
      if (v === '') continue;
      prench++;
      if (pontoRubrica_(v) !== null) validos++;
    }
    if (prench > 0 && validos / prench >= 0.65) por_dados.push(c);
  }
  let colunas = uniq_(por_codigo.concat(por_dados));
  if (colunas.length > esperados) colunas = colunas.slice(0, esperados);
  return colunas;
}


// ================================================================
// UTILITÁRIOS — ESCRITA DE TABELAS
// ================================================================

function escTabela_(ss, nome, cab, rows, cor) {
  let aba = ss.getSheetByName(nome);
  if (!aba) aba = ss.insertSheet(nome);
  aba.clearContents();
  aba.clearConditionalFormatRules();
  aba.setTabColor(cor);
  const nr = 1 + rows.length;
  const nc = cab.length;
  aba.getRange(1,1,1,nc).setValues([cab])
    .setBackground(cor).setFontColor('#FFF').setFontWeight('bold').setHorizontalAlignment('center');
  if (rows.length) aba.getRange(2,1,rows.length,nc).setValues(rows);
  aba.setFrozenRows(1);
  aba.getRange(1,1,nr,nc).setVerticalAlignment('middle');
  for (let c = 1; c <= Math.min(nc,20); c++) {
    aba.autoResizeColumn(c);
    aba.setColumnWidth(c, Math.min(Math.max(aba.getColumnWidth(c), 55), 300));
  }
  return aba;
}

function ativarAba_(nome) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (aba) SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(aba);
}

function jsonOut_(dados, cb) {
  const json = JSON.stringify(dados);
  const body = cb ? cb + '(' + json + ')' : json;
  return ContentService.createTextOutput(body).setMimeType(
    cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON
  );
}


// ================================================================
// UTILITÁRIOS — TEXTO / NÚMERO
// ================================================================

function norm_(v) {
  if (v === null || v === undefined) return '';
  return String(v).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}

function num_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(String(v).replace(',','.'));
  return isNaN(n) ? 0 : n;
}

function arred_(v, c) { const f = Math.pow(10,c); return Math.round(num_(v)*f)/f; }
function media_(arr) { if (!arr||!arr.length) return 0; return arr.reduce(function(s,v){return s+v;},0)/arr.length; }
function clamp_(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
function uniq_(arr) { const s={}; return arr.filter(function(v){ if(s[v]) return false; s[v]=true; return true; }); }


// ================================================================
// UTILITÁRIOS — FORMS
// ================================================================

function respostaValida_(v) {
  const s = norm_(v);
  return s !== 'nao' && s !== 'n' && s !== 'false' && s !== '0' && s !== 'nulo' && s !== '';
}

function pontoRubrica_(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',','.'));
  if (!isNaN(n) && n >= 1 && n <= 4) return n;
  const s = norm_(String(v));
  if (/^1|comeca|inicial|abaixo|começa/.test(s)) return 1;
  if (/^2|desenvolvimento|basico/.test(s)) return 2;
  if (/^3|realizado|atende|adequado/.test(s)) return 3;
  if (/^4|exemplar|supera|excelente/.test(s)) return 4;
  return null;
}

function achaCab_(cab, opcoes, padrao) {
  for (let i = 0; i < cab.length; i++) {
    const h = norm_(cab[i]);
    for (let j = 0; j < opcoes.length; j++) {
      if (h === opcoes[j] || h.indexOf(opcoes[j]) >= 0) return i;
    }
  }
  return (padrao !== undefined && padrao >= 0 && padrao < cab.length) ? padrao : -1;
}

function resolverEq_(valor, eq) {
  if (!valor) return null;
  const s = String(valor).trim();
  const k = norm_(s);
  if (eq.aliases[k]) return eq.aliases[k];
  const id = s.toUpperCase().replace(/\s+/g,'_').slice(0,12);
  if (eq.porId[id]) return id;
  const chaves = Object.keys(eq.aliases);
  for (let i = 0; i < chaves.length; i++) {
    if (chaves[i].indexOf(k) >= 0 || k.indexOf(chaves[i]) >= 0) return eq.aliases[chaves[i]];
  }
  return null;
}
