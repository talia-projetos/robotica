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


const COMPS = Object.freeze(['FLL', 'OBR', 'Steam Racing']);

/** Retorna o slug normalizado da competição ('FLL', 'OBR' ou 'Steam Racing'). */
function normComp_(comp) {
  const c = norm_(comp || '');
  if (c === 'obr') return 'OBR';
  if (c.indexOf('steam') >= 0) return 'Steam Racing';
  return 'FLL';
}

/** Retorna os nomes de abas de resultado para cada competição. */
function abasComp_(comp) {
  const c = normComp_(comp);
  if (c === 'OBR') return {
    CONFIG: T.ABAS.CONFIG, EQUIPES: T.ABAS.EQUIPES, TAMPINHAS: T.ABAS.TAMPINHAS,
    BASE: 'BASE_OBR', RANKING: 'RANKING_OBR', RANK_CAT: 'RANKING_CAT_OBR',
    STATUS: 'STATUS_OBR', DIAG: 'DIAGNOSTICO_OBR', PAINEL: 'PAINEL_OBR'
  };
  if (c === 'Steam Racing') return {
    CONFIG: T.ABAS.CONFIG, EQUIPES: T.ABAS.EQUIPES, TAMPINHAS: T.ABAS.TAMPINHAS,
    BASE: 'BASE_STEAM', RANKING: 'RANKING_STEAM', RANK_CAT: 'RANKING_CAT_STEAM',
    STATUS: 'STATUS_STEAM', DIAG: 'DIAGNOSTICO_STEAM', PAINEL: 'PAINEL_STEAM'
  };
  return Object.assign({}, T.ABAS); // FLL: nomes originais
}


// ================================================================
// MENU E GATILHOS
// ================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏆 Torneio')
    .addItem('Instalar / atualizar (todas)',  'TORNEIO_instalar')
    .addItem('Recalcular todas as competições','TORNEIO_atualizar')
    .addSeparator()
    .addItem('Recalcular FLL',           'TORNEIO_atualizarFLL')
    .addItem('Recalcular OBR',           'TORNEIO_atualizarOBR')
    .addItem('Recalcular Steam Racing',  'TORNEIO_atualizarSteam')
    .addSeparator()
    .addItem('Ver Painel FLL',           'TORNEIO_abrirPainel')
    .addItem('Ver Painel OBR',           'TORNEIO_abrirPainelOBR')
    .addItem('Ver Painel Steam Racing',  'TORNEIO_abrirPainelSteam')
    .addSeparator()
    .addItem('Corrigir nomes de equipes','TORNEIO_corrigirNomes')
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
    const pinCriado = criarAbaHubJuizes_(ss);
    COMPS.forEach(function(comp) { atualizarInterno_(ss, comp); });
    instalarGatilho_(ss);
    const msg = pinCriado
      ? 'Sistema instalado! Coordenação criada → Nome: "Coordenação"  PIN: ' + pinCriado
      : 'Sistema instalado e resultados calculados (FLL + OBR + Steam Racing).';
    ss.toast(msg, '🏆 Torneio', 12);
  } finally {
    lock.releaseLock();
  }
}

function criarAbaHubJuizes_(ss) {
  let aba = ss.getSheetByName('HUB_JUIZES');
  if (!aba) {
    aba = ss.insertSheet('HUB_JUIZES');
    aba.getRange(1,1,1,5).setValues([['Nome','PIN','Categoria','Ativo','Competição']]);
  } else {
    // Garante coluna Competição se aba já existia
    const cab = aba.getRange(1,1,1,aba.getLastColumn()).getValues()[0];
    const temComp = cab.some(function(h){ return String(h).toLowerCase().indexOf('competi') >= 0; });
    if (!temComp) aba.getRange(1, cab.length + 1).setValue('Competição');
  }
  // Verifica se já existe algum coordenador
  const dados = aba.getLastRow() > 1 ? aba.getDataRange().getValues() : [[]];
  const temCoord = dados.slice(1).some(function(r) {
    return String(r[2]||'').toLowerCase().indexOf('coord') >= 0;
  });
  if (temCoord) return null; // já existe, não sobrescreve
  const pin = String(Math.floor(1000 + Math.random() * 9000)); // PIN de 4 dígitos
  aba.appendRow(['Coordenação', pin, 'Coordenação', 'Sim']);
  return pin;
}

function TORNEIO_atualizar() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) return;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    COMPS.forEach(function(comp) { atualizarInterno_(ss, comp); });
  } finally {
    lock.releaseLock();
  }
}

function TORNEIO_atualizarFLL()   { const l = LockService.getDocumentLock(); if (!l.tryLock(30000)) return; try { atualizarInterno_(SpreadsheetApp.getActiveSpreadsheet(), 'FLL');           } finally { l.releaseLock(); } }
function TORNEIO_atualizarOBR()   { const l = LockService.getDocumentLock(); if (!l.tryLock(30000)) return; try { atualizarInterno_(SpreadsheetApp.getActiveSpreadsheet(), 'OBR');           } finally { l.releaseLock(); } }
function TORNEIO_atualizarSteam() { const l = LockService.getDocumentLock(); if (!l.tryLock(30000)) return; try { atualizarInterno_(SpreadsheetApp.getActiveSpreadsheet(), 'Steam Racing'); } finally { l.releaseLock(); } }

function TORNEIO_corrigirNomes() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(T.ABAS.EQUIPES);
  if (!aba) { SpreadsheetApp.getUi().alert('Aba EQUIPES não encontrada.'); return; }

  // [ID, Nome_Equipe, Tutor, Competicao]
  const corretos = [
    ['TUR01', '6° A - Cyber Panter',      'Éverton',    'FLL'],
    ['TUR02', '6° B - Liga do Choque',    'Izabela',    'FLL'],
    ['TUR03', '6° C - Alpha Tech',        'Patrícia',   'FLL'],
    ['TUR04', '6° D - Pheonics Mecanics', 'Moaci',      'FLL'],
    ['TUR05', '6° E - TecShark',          'Yulo',       'FLL'],
    ['TUR06', '7° A - Hoppin Robots',     'João',       'FLL'],
    ['TUR07', '7° B - Bivoltx',           'Joseli',     'FLL'],
    ['TUR08', '7° C - Ecoshift',          'Ana Claudia','FLL'],
    ['TUR09', '7° D - Pantera Lego Team', 'Diego Lopes','FLL'],
    ['TUR10', '7° E - Império das Onças', 'Fabiana',    'FLL'],
    ['TUR11', '7° F - Poseidon',          'Marilia',    'FLL'],
    ['TUR12', '7° G - Arara Azul',        'Reinalda',   'FLL'],
    ['TUR13', '7° H - Nexos',             'Rute',       'FLL'],
    ['TUR14', '8° A',                     '',           'OBR'],
    ['TUR15', '8° B',                     '',           'OBR'],
    ['TUR16', '8° C',                     '',           'OBR'],
    ['TUR17', '8° D',                     '',           'OBR'],
    ['TUR18', '8° E',                     '',           'OBR'],
    ['TUR19', '8° F',                     '',           'OBR'],
    ['TUR20', '8° G',                     '',           'OBR'],
    ['TUR21', '8° H',                     '',           'OBR'],
    ['TUR22', '8° I',                     '',           'OBR'],
    ['TUR23', '8° J',                     '',           'OBR'],
    ['TUR24', '9° A',                     '',           'Steam Racing'],
    ['TUR25', '9° B',                     '',           'Steam Racing'],
    ['TUR26', '9° C',                     '',           'Steam Racing'],
    ['TUR27', '9° D',                     '',           'Steam Racing'],
    ['TUR28', '9° E',                     '',           'Steam Racing'],
    ['TUR29', '9° F',                     '',           'Steam Racing'],
    ['TUR30', '9° G',                     '',           'Steam Racing'],
    ['TUR31', '9° H',                     '',           'Steam Racing'],
    ['TUR32', '9° I',                     '',           'Steam Racing'],
    ['TUR33', '9° J',                     '',           'Steam Racing']
  ];

  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iId   = achaCab_(cab, ['id equipe','id_equipe','id'], 0);
  const iNome = achaCab_(cab, ['nome equipe','nome_equipe','turma'], 1);
  const iTutor= achaCab_(cab, ['tutor','professor'], 3);
  const iComp = achaCab_(cab, ['competicao','competição'], -1);

  const existentes = {};
  dados.slice(1).forEach(function(r, i) {
    const id = String(r[iId] || '').trim().toUpperCase();
    if (id) existentes[id] = i + 2;
  });

  corretos.forEach(function(c) {
    const id = c[0];
    if (existentes[id]) {
      const linha = existentes[id];
      aba.getRange(linha, iNome + 1).setValue(c[1]);
      if (c[2]) aba.getRange(linha, iTutor + 1).setValue(c[2]);
      if (iComp >= 0) aba.getRange(linha, iComp + 1).setValue(c[3]);
    } else {
      aba.appendRow([id, c[1], '', c[2], '', '', c[3]]);
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('Equipes atualizadas: FLL (TUR01–13) · OBR (TUR14–23) · Steam Racing (TUR24–33)', 'Torneio', 8);
}

function TORNEIO_instalarGatilho() {
  instalarGatilho_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getActiveSpreadsheet().toast('Gatilho reinstalado.', 'Torneio', 4);
}

function TORNEIO_aoEnviarForm(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    COMPS.forEach(function(comp) { try { atualizarInterno_(ss, comp); } catch(err) { console.error(comp, err); } });
  } catch (err) { console.error(err); }
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

function TORNEIO_abrirPainel()      { ativarAba_(T.ABAS.PAINEL);              }
function TORNEIO_abrirRanking()     { ativarAba_(T.ABAS.RANKING);             }
function TORNEIO_abrirDiagnostico() { ativarAba_(T.ABAS.DIAG);                }
function TORNEIO_abrirPainelOBR()   { ativarAba_(abasComp_('OBR').PAINEL);    }
function TORNEIO_abrirPainelSteam() { ativarAba_(abasComp_('Steam Racing').PAINEL); }

function TORNEIO_criarCronograma() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const NOME = 'CRONOGRAMA';
  let aba = ss.getSheetByName(NOME);
  if (aba) ss.deleteSheet(aba);
  aba = ss.insertSheet(NOME);

  const DADOS = [
    ['Dia','Horário','Evento','Equipe','Nome Equipe','Atividade'],
    // ── 08/10 · Steam Racing ──────────────────────────────────────
    ['08/10','07:30','Steam Racing','TUR24','9° A','1. ROUND A'],
    ['08/10','07:30','Steam Racing','TUR29','9° F','1. ROUND B'],
    ['08/10','07:35','Steam Racing','TUR25','9° B','1. ROUND A'],
    ['08/10','07:35','Steam Racing','TUR30','9° G','1. ROUND B'],
    ['08/10','07:40','Steam Racing','TUR26','9° C','1. ROUND A'],
    ['08/10','07:40','Steam Racing','TUR31','9° H','1. ROUND B'],
    ['08/10','07:45','Steam Racing','TUR27','9° D','1. ROUND A'],
    ['08/10','07:45','Steam Racing','TUR32','9° I','1. ROUND B'],
    ['08/10','07:50','Steam Racing','TUR28','9° E','1. ROUND A'],
    ['08/10','07:50','Steam Racing','TUR33','9° J','1. ROUND B'],
    ['08/10','08:00','Steam Racing','TUR24','9° A','Sala A'],
    ['08/10','08:00','Steam Racing','TUR29','9° F','Sala B'],
    ['08/10','08:15','Steam Racing','TUR25','9° B','Sala A'],
    ['08/10','08:15','Steam Racing','TUR30','9° G','Sala B'],
    ['08/10','08:30','Steam Racing','TUR26','9° C','Sala A'],
    ['08/10','08:30','Steam Racing','TUR31','9° H','Sala B'],
    ['08/10','08:45','Steam Racing','TUR27','9° D','Sala A'],
    ['08/10','08:45','Steam Racing','TUR32','9° I','Sala B'],
    ['08/10','09:00','Steam Racing','TUR28','9° E','Sala A'],
    ['08/10','09:00','Steam Racing','TUR33','9° J','Sala B'],
    ['08/10','09:15','Steam Racing','TUR24','9° A','2. ROUND A'],
    ['08/10','09:15','Steam Racing','TUR25','9° B','2. ROUND B'],
    ['08/10','09:20','Steam Racing','TUR26','9° C','2. ROUND A'],
    ['08/10','09:20','Steam Racing','TUR27','9° D','2. ROUND B'],
    ['08/10','09:25','Steam Racing','TUR28','9° E','2. ROUND A'],
    ['08/10','09:25','Steam Racing','TUR29','9° F','2. ROUND B'],
    ['08/10','09:30','Steam Racing','TUR30','9° G','2. ROUND A'],
    ['08/10','09:30','Steam Racing','TUR31','9° H','2. ROUND B'],
    ['08/10','09:35','Steam Racing','TUR32','9° I','2. ROUND A'],
    ['08/10','09:35','Steam Racing','TUR33','9° J','2. ROUND B'],
    ['08/10','09:50','Steam Racing','TUR29','9° F','3. ROUND A'],
    ['08/10','09:50','Steam Racing','TUR24','9° A','3. ROUND B'],
    ['08/10','09:55','Steam Racing','TUR30','9° G','3. ROUND A'],
    ['08/10','09:55','Steam Racing','TUR25','9° B','3. ROUND B'],
    ['08/10','10:00','Steam Racing','TUR31','9° H','3. ROUND A'],
    ['08/10','10:00','Steam Racing','TUR26','9° C','3. ROUND B'],
    ['08/10','10:05','Steam Racing','TUR32','9° I','3. ROUND A'],
    ['08/10','10:05','Steam Racing','TUR27','9° D','3. ROUND B'],
    ['08/10','10:10','Steam Racing','TUR33','9° J','3. ROUND A'],
    ['08/10','10:10','Steam Racing','TUR28','9° E','3. ROUND B'],
    // ── 09/10 · OBR ──────────────────────────────────────────────
    ['09/10','07:30','OBR','TUR14','8° A','1. ROUND A'],
    ['09/10','07:30','OBR','TUR19','8° F','1. ROUND B'],
    ['09/10','07:35','OBR','TUR15','8° B','1. ROUND A'],
    ['09/10','07:35','OBR','TUR20','8° G','1. ROUND B'],
    ['09/10','07:40','OBR','TUR16','8° C','1. ROUND A'],
    ['09/10','07:40','OBR','TUR21','8° H','1. ROUND B'],
    ['09/10','07:45','OBR','TUR17','8° D','1. ROUND A'],
    ['09/10','07:45','OBR','TUR22','8° I','1. ROUND B'],
    ['09/10','07:50','OBR','TUR18','8° E','1. ROUND A'],
    ['09/10','07:50','OBR','TUR23','8° J','1. ROUND B'],
    ['09/10','08:00','OBR','TUR14','8° A','Sala A'],
    ['09/10','08:00','OBR','TUR19','8° F','Sala B'],
    ['09/10','08:15','OBR','TUR15','8° B','Sala A'],
    ['09/10','08:15','OBR','TUR20','8° G','Sala B'],
    ['09/10','08:30','OBR','TUR16','8° C','Sala A'],
    ['09/10','08:30','OBR','TUR21','8° H','Sala B'],
    ['09/10','08:45','OBR','TUR17','8° D','Sala A'],
    ['09/10','08:45','OBR','TUR22','8° I','Sala B'],
    ['09/10','09:00','OBR','TUR18','8° E','Sala A'],
    ['09/10','09:00','OBR','TUR23','8° J','Sala B'],
    ['09/10','09:15','OBR','TUR14','8° A','2. ROUND A'],
    ['09/10','09:15','OBR','TUR15','8° B','2. ROUND B'],
    ['09/10','09:20','OBR','TUR16','8° C','2. ROUND A'],
    ['09/10','09:20','OBR','TUR17','8° D','2. ROUND B'],
    ['09/10','09:25','OBR','TUR18','8° E','2. ROUND A'],
    ['09/10','09:25','OBR','TUR19','8° F','2. ROUND B'],
    ['09/10','09:30','OBR','TUR20','8° G','2. ROUND A'],
    ['09/10','09:30','OBR','TUR21','8° H','2. ROUND B'],
    ['09/10','09:35','OBR','TUR22','8° I','2. ROUND A'],
    ['09/10','09:35','OBR','TUR23','8° J','2. ROUND B'],
    ['09/10','09:50','OBR','TUR19','8° F','3. ROUND A'],
    ['09/10','09:50','OBR','TUR14','8° A','3. ROUND B'],
    ['09/10','09:55','OBR','TUR20','8° G','3. ROUND A'],
    ['09/10','09:55','OBR','TUR15','8° B','3. ROUND B'],
    ['09/10','10:00','OBR','TUR21','8° H','3. ROUND A'],
    ['09/10','10:00','OBR','TUR16','8° C','3. ROUND B'],
    ['09/10','10:05','OBR','TUR22','8° I','3. ROUND A'],
    ['09/10','10:05','OBR','TUR17','8° D','3. ROUND B'],
    ['09/10','10:10','OBR','TUR23','8° J','3. ROUND A'],
    ['09/10','10:10','OBR','TUR18','8° E','3. ROUND B'],
    // ── 10/10 · FLL ──────────────────────────────────────────────
    ['10/10','07:30','FLL','TUR01','6° A - Cyber Panter','1. ROUND A'],
    ['10/10','07:30','FLL','TUR09','7° D - Pantera Lego Team','1. ROUND B'],
    ['10/10','07:35','FLL','TUR02','6° B - Liga do Choque','1. ROUND A'],
    ['10/10','07:35','FLL','TUR10','7° E - Imperio das Oncas','1. ROUND B'],
    ['10/10','07:40','FLL','TUR03','6° C - Alpha Tech','1. ROUND A'],
    ['10/10','07:40','FLL','TUR11','7° F - Poseidon','1. ROUND B'],
    ['10/10','07:45','FLL','TUR04','6° D - Pheonics Mecanics','1. ROUND A'],
    ['10/10','07:45','FLL','TUR12','7° G - Arara Azul','1. ROUND B'],
    ['10/10','07:50','FLL','TUR05','6° E - TecShark','1. ROUND A'],
    ['10/10','07:50','FLL','TUR13','7° H - Nexos','1. ROUND B'],
    ['10/10','07:55','FLL','TUR06','7° A - Hoppin Robots','1. ROUND A'],
    ['10/10','07:55','FLL','TUR07','7° B - Bivoltx','1. ROUND B'],
    ['10/10','08:00','FLL','TUR08','7° C - Ecoshift','1. ROUND A'],
    ['10/10','08:05','FLL','TUR07','7° B - Bivoltx','Sala A'],
    ['10/10','08:05','FLL','TUR13','7° H - Nexos','Sala B'],
    ['10/10','08:20','FLL','TUR01','6° A - Cyber Panter','Sala A'],
    ['10/10','08:20','FLL','TUR12','7° G - Arara Azul','Sala B'],
    ['10/10','08:35','FLL','TUR09','7° D - Pantera Lego Team','Sala A'],
    ['10/10','08:35','FLL','TUR10','7° E - Imperio das Oncas','Sala B'],
    ['10/10','08:50','FLL','TUR05','6° E - TecShark','Sala A'],
    ['10/10','08:50','FLL','TUR03','6° C - Alpha Tech','Sala B'],
    ['10/10','08:50','FLL','TUR07','7° B - Bivoltx','2. ROUND A'],
    ['10/10','08:50','FLL','TUR13','7° H - Nexos','2. ROUND A'],
    ['10/10','08:55','FLL','TUR11','7° F - Poseidon','2. ROUND A'],
    ['10/10','08:55','FLL','TUR04','6° D - Pheonics Mecanics','2. ROUND B'],
    ['10/10','09:00','FLL','TUR08','7° C - Ecoshift','2. ROUND A'],
    ['10/10','09:00','FLL','TUR02','6° B - Liga do Choque','2. ROUND B'],
    ['10/10','09:05','FLL','TUR04','6° D - Pheonics Mecanics','Sala A'],
    ['10/10','09:05','FLL','TUR10','7° E - Imperio das Oncas','2. ROUND A'],
    ['10/10','09:05','FLL','TUR06','7° A - Hoppin Robots','2. ROUND B'],
    ['10/10','09:10','FLL','TUR01','6° A - Cyber Panter','2. ROUND A'],
    ['10/10','09:10','FLL','TUR12','7° G - Arara Azul','2. ROUND B'],
    ['10/10','09:10','FLL','TUR08','7° C - Ecoshift','Sala B'],
    ['10/10','09:15','FLL','TUR05','6° E - TecShark','2. ROUND A'],
    ['10/10','09:15','FLL','TUR09','7° D - Pantera Lego Team','2. ROUND B'],
    ['10/10','09:20','FLL','TUR03','6° C - Alpha Tech','2. ROUND A'],
    ['10/10','09:20','FLL','TUR11','7° F - Poseidon','Sala A'],
    ['10/10','09:30','FLL','TUR06','7° A - Hoppin Robots','Sala B'],
    ['10/10','09:35','FLL','TUR02','6° B - Liga do Choque','Sala A'],
    ['10/10','09:55','FLL','TUR06','7° A - Hoppin Robots','3. ROUND A'],
    ['10/10','09:55','FLL','TUR12','7° G - Arara Azul','3. ROUND A'],
    ['10/10','10:00','FLL','TUR09','7° D - Pantera Lego Team','3. ROUND A'],
    ['10/10','10:00','FLL','TUR03','6° C - Alpha Tech','3. ROUND B'],
    ['10/10','10:05','FLL','TUR02','6° B - Liga do Choque','3. ROUND A'],
    ['10/10','10:05','FLL','TUR13','7° H - Nexos','3. ROUND B'],
    ['10/10','10:10','FLL','TUR10','7° E - Imperio das Oncas','3. ROUND A'],
    ['10/10','10:10','FLL','TUR04','6° D - Pheonics Mecanics','3. ROUND B'],
    ['10/10','10:15','FLL','TUR08','7° C - Ecoshift','3. ROUND A'],
    ['10/10','10:15','FLL','TUR01','6° A - Cyber Panter','3. ROUND B'],
    ['10/10','10:20','FLL','TUR11','7° F - Poseidon','3. ROUND A'],
    ['10/10','10:20','FLL','TUR05','6° E - TecShark','3. ROUND B'],
    ['10/10','10:25','FLL','TUR07','7° B - Bivoltx','3. ROUND A']
  ];

  aba.getRange(1, 1, DADOS.length, 6).setValues(DADOS);

  // Cabeçalho
  const cab = aba.getRange(1, 1, 1, 6);
  cab.setFontWeight('bold');
  cab.setBackground('#12355B');
  cab.setFontColor('#FFFFFF');

  // Faixas de cor por competição
  const COR = { 'Steam Racing': '#EAD9F9', 'OBR': '#D4EDDA', 'FLL': '#D0E4F7' };
  for (let i = 2; i <= DADOS.length; i++) {
    const comp = DADOS[i - 1][2];
    aba.getRange(i, 1, 1, 6).setBackground(COR[comp] || '#FFFFFF');
  }

  aba.setFrozenRows(1);
  aba.autoResizeColumns(1, 6);
  ss.setActiveSheet(aba);
  SpreadsheetApp.getUi().alert('Aba CRONOGRAMA criada com ' + (DADOS.length - 1) + ' linhas.');
}


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
    ['Aba Form Arena',               'FORM_ARENA',         '← FLL: Nome exato da aba de respostas do Form da Arena.'],
    ['Aba Form Projeto',             'FORM_PROJETO',       '← FLL: Nome exato da aba de respostas do Form de Projeto.'],
    ['Aba Form Design',              'FORM_DESIGN',        '← FLL: Nome exato da aba de respostas do Form de Design.'],
    ['Aba Form Core',                'FORM_CORE',          '← FLL: Nome exato da aba de respostas do Form de Core Values.'],
    ['Aba Form Arena OBR',           'FORM_ARENA_OBR',     '← OBR: Nome exato da aba de respostas do Form da Arena.'],
    ['Aba Form Projeto OBR',         'FORM_PROJETO_OBR',   '← OBR: Nome exato da aba de respostas do Form de Projeto.'],
    ['Aba Form Design OBR',          'FORM_DESIGN_OBR',    '← OBR: Nome exato da aba de respostas do Form de Design.'],
    ['Aba Form Core OBR',            'FORM_CORE_OBR',      '← OBR: Nome exato da aba de respostas do Form de Core Values.'],
    ['Aba Form Arena Steam',         'FORM_ARENA_STEAM',   '← Steam Racing: Nome exato da aba de respostas do Form da Arena.'],
    ['Aba Form Projeto Steam',       'FORM_PROJETO_STEAM', '← Steam Racing: Nome exato da aba de respostas do Form de Projeto.'],
    ['Aba Form Design Steam',        'FORM_ENGENHARIA_STEAM',  '← Steam Racing: Nome exato da aba de respostas do Form de Engenharia.'],
    ['Aba Form Core Steam',          'FORM_CORE_STEAM',    '← Steam Racing: Nome exato da aba de respostas do Form de Core Values.']
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
    aba.getRange(1, 1, 1, 7).setValues([['ID_Equipe', 'Nome_Equipe', 'Turno', 'Tutor', 'Qtde_Alunos', 'PIN', 'Competicao']]);
    aba.getRange(1, 1, 1, 7).setBackground(T.CORES.MARINHO).setFontColor('#FFF').setFontWeight('bold');
    aba.setColumnWidth(1, 110);
    aba.setColumnWidth(2, 240);
    aba.setColumnWidth(3, 120);
    aba.setColumnWidth(4, 200);
    aba.setColumnWidth(5, 120);
    aba.setColumnWidth(6, 100);
    aba.setColumnWidth(7, 140);
    aba.setFrozenRows(1);
  } else {
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    const temPin = cab.some(function(h) { return norm_(String(h)) === 'pin' || norm_(String(h)) === 'senha'; });
    if (!temPin) {
      const col = aba.getLastColumn() + 1;
      aba.getRange(1, col).setValue('PIN').setBackground(T.CORES.MARINHO).setFontColor('#FFF').setFontWeight('bold');
      aba.setColumnWidth(col, 100);
    }
    const temComp = cab.some(function(h) { return norm_(String(h)).indexOf('competicao') >= 0 || norm_(String(h)).indexOf('competição') >= 0; });
    if (!temComp) {
      const col = aba.getLastColumn() + 1;
      aba.getRange(1, col).setValue('Competicao').setBackground(T.CORES.MARINHO).setFontColor('#FFF').setFontWeight('bold');
      aba.setColumnWidth(col, 140);
    }
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

function atualizarInterno_(ss, comp) {
  const inicio = new Date();
  const diag   = [];
  const abas   = abasComp_(comp);
  const cfg    = lerConfig_(ss, diag, comp);
  const eq     = lerEquipes_(ss, cfg, diag, comp);
  const eqAll  = lerEquipes_(ss, cfg, [], null);  // todas as competições — tampinhas é transversal
  const arena  = lerArena_(ss, cfg, eq, diag);
  const proj   = lerRubrica_(ss, cfg.abaProj,  T.CAT.PROJETO, cfg, eq, diag);
  const desig  = lerRubrica_(ss, cfg.abaDes,   T.CAT.DESIGN,  cfg, eq, diag);
  const core   = lerRubrica_(ss, cfg.abaCore,  T.CAT.CORE,    cfg, eq, diag);
  const tamp   = lerTampinhas_(ss, cfg, eqAll, diag, eq);
  const dados  = calcularResultados_(eq, arena, [proj, desig, core], tamp, cfg);

  escreverBase_(ss, dados, abas);
  escreverRanking_(ss, dados, abas);
  escreverRankingCat_(ss, dados, cfg, abas);
  escreverStatus_(ss, dados, cfg, abas);
  escreverDiag_(ss, diag, cfg, inicio, abas);
  escreverPainel_(ss, dados, cfg, abas);
  ordenarAbas_(ss);
  ss.getSheets().forEach(function(s) { s.setHiddenGridlines(true); });
}


// ================================================================
// LEITURA DA CONFIGURAÇÃO
// ================================================================

function lerConfig_(ss, diag, comp) {
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
    juizes:      Math.max(1, Math.round(n('Juízes Esperados por Rubrica', 1))),
    rounds:      Math.max(1, Math.round(n('Rounds Esperados Arena', 3))),
    abaArena:    s('Aba Form Arena',   'FORM_ARENA'),
    abaProj:     s('Aba Form Projeto', 'FORM_PROJETO'),
    abaDes:      s('Aba Form Design',  'FORM_DESIGN'),
    abaCore:     s('Aba Form Core',    'FORM_CORE')
  };

  // Sobrescreve form sheets de acordo com a competição
  const c = normComp_(comp);
  cfg.compNorm = c;
  if (c === 'OBR') {
    cfg.abaArena = s('Aba Form Arena OBR',   'FORM_ARENA_OBR');
    cfg.abaProj  = s('Aba Form Projeto OBR', 'FORM_PROJETO_OBR');
    cfg.abaDes   = s('Aba Form Design OBR',  'FORM_DESIGN_OBR');
    cfg.abaCore  = s('Aba Form Core OBR',    'FORM_CORE_OBR');
    cfg.maxArena = n('Pontuação Máxima Arena OBR', 160); // OBR: Perigos = máx 160 pts
  } else if (c === 'Steam Racing') {
    cfg.abaArena = s('Aba Form Arena Steam',   'FORM_ARENA_STEAM');
    cfg.abaProj  = s('Aba Form Projeto Steam', 'FORM_PROJETO_STEAM');
    cfg.abaDes   = s('Aba Form Design Steam',  'FORM_ENGENHARIA_STEAM');
    // Migração: valor legado FORM_DESIGN_STEAM → FORM_ENGENHARIA_STEAM
    if (cfg.abaDes === 'FORM_DESIGN_STEAM') {
      cfg.abaDes = 'FORM_ENGENHARIA_STEAM';
      try {
        var _cfgAba = ss.getSheetByName(T.ABAS.CONFIG);
        if (_cfgAba) {
          var _cfgV = _cfgAba.getDataRange().getValues();
          for (var _ci = 1; _ci < _cfgV.length; _ci++) {
            if (norm_(_cfgV[_ci][0]) === 'aba form design steam') {
              _cfgAba.getRange(_ci + 1, 2).setValue('FORM_ENGENHARIA_STEAM');
              break;
            }
          }
        }
      } catch(_e) {}
    }
    cfg.abaCore  = s('Aba Form Core Steam',    'FORM_CORE_STEAM');
    // Steam: arena é pista racing (tempo em ms); maxArena = tempo máximo tolerado (ms)
    cfg.maxArena  = n('Pontuação Máxima Arena Steam', n('Pontuação Máxima Arena', 120000));
    cfg.pistaTempo = true; // flag: score = tempo (menor é melhor), invert na normalização
  }

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

function lerEquipes_(ss, cfg, diag, comp) {
  const aba = ss.getSheetByName(T.ABAS.EQUIPES);
  if (!aba || aba.getLastRow() < 2) {
    diag.push({ nivel: 'ATENÇÃO', cat: 'EQUIPES', msg: 'Cadastro de equipes vazio.' });
    return { lista: [], porId: {}, aliases: {} };
  }

  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iId   = achaCab_(cab, ['id equipe', 'id_equipe', 'codigo', 'n', 'numero'], 0);
  const iNome = achaCab_(cab, ['nome equipe', 'nome_equipe', 'turma'], 1);
  const iTurno= achaCab_(cab, ['turno'], 2);
  const iTutor= achaCab_(cab, ['tutor', 'professor', 'orientador'], 3);
  const iQtd  = achaCab_(cab, ['qtde alunos', 'qtd alunos', 'quantidade alunos', 'alunos'], 4);
  const iPin  = achaCab_(cab, ['pin', 'senha'], -1);
  const iComp = achaCab_(cab, ['competicao', 'competição'], -1);
  const compFiltro = comp ? normComp_(comp) : null;

  const lista   = [];
  const porId   = {};
  const aliases = {};

  dados.slice(1).forEach(function(r, i) {
    if (r.every(function(v) { return v === ''; })) return;
    const id = String(r[iId] || '').trim().toUpperCase();
    if (!id) { diag.push({ nivel: 'ATENÇÃO', cat: 'EQUIPES', msg: 'Linha ' + (i + 2) + ' sem ID.' }); return; }
    if (porId[id]) { diag.push({ nivel: 'ERRO', cat: 'EQUIPES', msg: 'ID duplicado: ' + id }); return; }

    const compEq = iComp >= 0 ? normComp_(String(r[iComp] || '')) : 'FLL';
    if (compFiltro && compEq !== compFiltro) return;

    const eq = {
      id:         id,
      nome:       String(r[iNome] || id).trim(),
      turno:      String(r[iTurno] || '').trim(),
      tutor:      String(r[iTutor] || '').trim(),
      alunos:     Math.max(0, num_(r[iQtd])),
      pin:        iPin >= 0 ? String(r[iPin] || '').trim() : '',
      competicao: compEq
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
  const cfg  = lerConfig_(ss, diag, p.comp);
  const eq   = lerEquipes_(ss, cfg, diag); // sem filtro de comp: busca pela equipe em todas
  const equipe = eq.porId[id];
  if (!equipe) return { ok: false, erro: 'Equipe não encontrada.' };
  if (equipe.pin) {
    if (!pin) return { ok: false, erro: 'PIN obrigatório.' };
    if (equipe.pin !== pin) return { ok: false, erro: 'PIN incorreto.' };
  }
  var scores = null;
  const compEq = equipe.competicao || 'FLL';
  const abaBase = ss.getSheetByName(abasComp_(compEq).BASE);
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
  const cfgEq = lerConfig_(ss, [], compEq);
  const comentarios = {};
  comentarios[T.CAT.PROJETO] = lerComentariosRubrica_(ss, cfgEq.abaProj, id, eq);
  comentarios[T.CAT.DESIGN]  = lerComentariosRubrica_(ss, cfgEq.abaDes,  id, eq);
  comentarios[T.CAT.CORE]    = lerComentariosRubrica_(ss, cfgEq.abaCore, id, eq);
  return {
    ok: true,
    equipe: { id: equipe.id, nome: equipe.nome, turno: equipe.turno, tutor: equipe.tutor, competicao: equipe.competicao },
    scores: scores,
    comentarios: comentarios
  };
}


// ================================================================
// API — VERIFICAÇÃO DE JUIZ / COORDENADOR
// ================================================================

function apiVerificarJuiz_(p) {
  const nome = String(p.juiz || '').trim();
  const pin  = String(p.pin  || '').trim();
  if (!nome) return { ok: false, erro: 'Nome obrigatório.' };
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('HUB_JUIZES');
  if (!aba || aba.getLastRow() < 2) return { ok: true, nome: nome, categoria: '', coordenador: false, competicao: '' };
  const dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    const n = String(dados[i][0] || '').trim().toLowerCase();
    if (n !== nome.toLowerCase()) continue;
    const p2raw = String(dados[i][1] || '').trim();
    const p2    = p2raw.replace(/^0+/, '') || '0'; // normaliza zeros à esquerda (ex: 219 == 0219)
    const cat   = String(dados[i][2] || '').trim();
    const ativo = dados[i][3] !== false && dados[i][3] !== 'Não';
    const comp  = String(dados[i][4] || '').trim(); // coluna Competição (pode ser vazia)
    if (!ativo) return { ok: false, erro: 'Usuário inativo.' };
    if (p2 && p2 !== pin.replace(/^0+/, '') && p2raw !== pin) return { ok: false, erro: 'PIN incorreto.' };
    const isCoord = norm_(cat).indexOf('coord') >= 0;
    return { ok: true, nome: dados[i][0], categoria: cat, coordenador: isCoord, competicao: comp };
  }
  return { ok: false, erro: 'Usuário não encontrado.' };
}


// ================================================================
// API — LOGIN UNIFICADO (juiz + turma em uma chamada)
// ================================================================

function apiLogin_(p) {
  const juizR = apiVerificarJuiz_(p);
  if (juizR.ok) return Object.assign({ tipo: 'juiz' }, juizR);
  const id = String(p.juiz || '').trim().toUpperCase();
  try {
    const turmaR = apiTurma_({ id: id, pin: p.pin });
    if (turmaR.ok) return Object.assign({ tipo: 'turma', id: id }, turmaR);
  } catch(_) {}
  return { ok: false, erro: 'Identificação ou PIN incorretos.' };
}


// ================================================================
// API — TODAS AS TURMAS (coordenação)
// ================================================================

function apiTodasTurmas_(p) {
  const auth = apiVerificarJuiz_(p);
  if (!auth.ok) return auth;
  if (!auth.coordenador) return { ok: false, erro: 'Acesso restrito à coordenação.' };
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const diag = [];
  const comp = p.comp || 'FLL';
  const cfg  = lerConfig_(ss, diag, comp);
  const eq   = lerEquipes_(ss, cfg, diag, comp);
  const scoresMap = {};
  const abaBase = ss.getSheetByName(abasComp_(comp).BASE);
  if (abaBase && abaBase.getLastRow() >= 2) {
    const dados = abaBase.getDataRange().getValues();
    const idx = {};
    dados[0].forEach(function(h, i) { if (h) idx[String(h).trim()] = i; });
    function g(r, col) { return idx[col] !== undefined ? r[idx[col]] : ''; }
    dados.slice(1).forEach(function(r) {
      const id = String(r[idx['ID']] || '').trim().toUpperCase();
      if (!id) return;
      scoresMap[id] = {
        arena20: num_(g(r,'Arena_20')), arenaBruta: num_(g(r,'Arena_Bruta')), arenaRounds: num_(g(r,'Rounds')),
        proj20:  num_(g(r,'Proj_20')),  projBruta:  num_(g(r,'Proj_Bruta')),  projJuizes:  num_(g(r,'Juizes_Proj')),
        des20:   num_(g(r,'Des_20')),   desBruta:   num_(g(r,'Des_Bruta')),   desJuizes:   num_(g(r,'Juizes_Des')),
        core20:  num_(g(r,'Core_20')),  coreBruta:  num_(g(r,'Core_Bruta')),  coreJuizes:  num_(g(r,'Juizes_Core')),
        tamp20:  num_(g(r,'Tamp_20')),  tampKg:     num_(g(r,'Tamp_kg')),     tampPes:     num_(g(r,'Pesagens')),
        total:   num_(g(r,'Total')),    status:     String(g(r,'Status') || ''),
        posGeral: num_(g(r,'Pos_Geral'))
      };
    });
  }
  const equipes = eq.lista.map(function(e) {
    return {
      equipe: { id: e.id, nome: e.nome, turno: e.turno, tutor: e.tutor },
      scores: scoresMap[e.id] || null,
      comentarios: {
        projeto: lerComentariosRubrica_(ss, cfg.abaProj, e.id, eq),
        design:  lerComentariosRubrica_(ss, cfg.abaDes,  e.id, eq),
        core:    lerComentariosRubrica_(ss, cfg.abaCore, e.id, eq)
      }
    };
  }).sort(function(a, b) {
    const pa = a.scores ? (a.scores.posGeral || 9999) : 9999;
    const pb = b.scores ? (b.scores.posGeral || 9999) : 9999;
    return pa - pb;
  });
  return { ok: true, equipes: equipes };
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

  // Steam pista: ignorar tempo total e tempo de reação; usar apenas Tempo_Efetivo_ms
  if (cfg.pistaTempo) {
    cab.forEach(function(h, i) {
      const hn = norm_(String(h || ''));
      if (hn.indexOf('total') >= 0 || hn.indexOf('reacao') >= 0 || hn.indexOf('reação') >= 0) ignora[i] = true;
    });
  }

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

  const _isSteamArena = cfg.pistaTempo;
  Object.keys(res.porEquipe).forEach(function(id) {
    const b = res.porEquipe[id];
    const validos = b.totais.filter(function(t) { return t > 0; });
    b.melhor   = _isSteamArena
      ? (validos.length ? Math.min.apply(null, validos) : 0)  // menor tempo = melhor
      : Math.max.apply(null, b.totais);                        // maior pts = melhor
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

// eqAll: todas as equipes (para resolver IDs); eq: apenas da competição atual (para ranking/diag)
function lerTampinhas_(ss, cfg, eqAll, diag, eq) {
  const eqComp = eq || eqAll;
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
    const idEq  = resolverEq_(r[iEq], eqAll);  // resolve contra todas as equipes
    const bruto = num_(r[iBruto]);
    const tara  = num_(r[iTara]);
    const liq   = (r[iLiq] !== '' && r[iLiq] !== null) ? num_(r[iLiq]) : Math.max(0, bruto - tara);
    const destaComp = Boolean(idEq && eqComp.porId[idEq]);  // pertence à comp atual?

    // Linha de outra competição (ou ID não cadastrado): silenciosamente ignorada.
    // Só reporta erro quando a equipe pertence à comp atual mas os dados estão inconsistentes.
    if (!destaComp) return;

    const ok = liq >= 0;
    if (!ok) {
      diag.push({ nivel: 'ATENÇÃO', cat: T.CAT.TAMP, msg: 'Pesagem inválida na linha ' + (ri + 2) + ': peso líquido negativo (' + liq.toFixed(3) + ' kg).' });
    } else {
      if (!res.porEquipe[idEq]) res.porEquipe[idEq] = { pesoTotal: 0, qtd: 0 };
      res.porEquipe[idEq].pesoTotal += liq;
      res.porEquipe[idEq].qtd++;
    }
    res.linhas.push({ data: r[iData], idEq: idEq, bruto: bruto, tara: tara, liq: liq, ok: ok, linha: ri + 2 });
  });

  Object.keys(res.porEquipe).forEach(function(id) {
    const b  = res.porEquipe[id];
    const e  = eqComp.porId[id];
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

    // Steam pista: tempo menor = melhor → inversão da normalização
  const a20 = cfg.pistaTempo
    ? (ar.melhor > 0 ? clamp_((1 - ar.melhor / cfg.maxArena) * cfg.pArena * 100, 0, cfg.pArena * 100) : 0)
    : clamp_((ar.melhor   / cfg.maxArena) * cfg.pArena * 100, 0, cfg.pArena * 100);
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

function escreverBase_(ss, dados, abas) {
  abas = abas || T.ABAS;
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

  const aba = escTabela_(ss, abas.BASE, cab, rows, T.CORES.MARINHO);
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

function escreverRanking_(ss, dados, abas) {
  abas = abas || T.ABAS;
  const cab = ['Pos', 'ID', 'Equipe', 'Turno', 'Tutor', 'Arena_20', 'Proj_20', 'Des_20', 'Core_20', 'Tamp_20', 'Total'];
  const rows = dados.rankingGeral.map(function(r) {
    const x = r.item;
    return [r.pos, x.id, x.nome, x.turno, x.tutor,
      arred_(x.arena20,2), arred_(x.proj20,2), arred_(x.des20,2), arred_(x.core20,2), arred_(x.tamp20,2), arred_(x.total,2)];
  });
  const aba = escTabela_(ss, abas.RANKING, cab, rows, T.CORES.MARINHO);
  if (rows.length > 0) {
    aba.getRange(2, 6, rows.length, 6).setNumberFormat('0.00');
    const hl = [[T.CORES.AMARELO_CLARO], ['#EDEDED'], ['#FCE5CD']];
    hl.forEach(function(cor, i) {
      if (rows.length > i) aba.getRange(i + 2, 1, 1, cab.length).setBackground(cor[0]);
    });
  }
}

function escreverRankingCat_(ss, dados, cfg, abas) {
  abas = abas || T.ABAS;
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

  escTabela_(ss, abas.RANK_CAT, cab, rows, T.CORES.MARINHO);
}

function escreverStatus_(ss, dados, cfg, abas) {
  abas = abas || T.ABAS;
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

  const aba = escTabela_(ss, abas.STATUS, cab, rows, T.CORES.MARINHO);
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

function escreverDiag_(ss, diag, cfg, inicio, abas) {
  abas = abas || T.ABAS;
  const cab  = ['Nível', 'Categoria', 'Mensagem'];
  const rows = diag.map(function(d) { return [d.nivel, d.cat, d.msg]; });
  rows.push(['INFO', 'SISTEMA', 'Versão: ' + T.VERSAO + ' | Tempo: ' + (new Date() - inicio) + 'ms']);
  const aba = escTabela_(ss, abas.DIAG, cab, rows, T.CORES.MARINHO);
  if (rows.length) {
    const r = aba.getRange(2, 1, rows.length, 1);
    aba.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ERRO').setBackground(T.CORES.VERMELHO_CLARO).setRanges([r]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ATENÇÃO').setBackground(T.CORES.AMARELO_CLARO).setRanges([r]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('OK').setBackground(T.CORES.VERDE_CLARO).setRanges([r]).build()
    ]);
  }
}

function escreverPainel_(ss, dados, cfg, abas) {
  abas = abas || T.ABAS;
  let aba = ss.getSheetByName(abas.PAINEL);
  if (!aba) aba = ss.insertSheet(abas.PAINEL);
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
  const ordem = [
    T.ABAS.PAINEL, 'PAINEL_OBR', 'PAINEL_STEAM',
    T.ABAS.RANKING, 'RANKING_OBR', 'RANKING_STEAM',
    T.ABAS.RANK_CAT, 'RANKING_CAT_OBR', 'RANKING_CAT_STEAM',
    T.ABAS.STATUS, 'STATUS_OBR', 'STATUS_STEAM',
    T.ABAS.BASE, 'BASE_OBR', 'BASE_STEAM',
    T.ABAS.CONFIG, T.ABAS.EQUIPES, T.ABAS.TAMPINHAS,
    T.ABAS.DIAG, 'DIAGNOSTICO_OBR', 'DIAGNOSTICO_STEAM'
  ];
  const existentes = ordem.filter(function(nome) { return ss.getSheetByName(nome); });
  existentes.forEach(function(nome, i) {
    const aba = ss.getSheetByName(nome);
    ss.setActiveSheet(aba);
    ss.moveActiveSheet(i + 1);
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
      case 'ranking':        r = apiRanking_(p);        break;
      case 'equipes':        r = apiEquipes_(p);        break;
      case 'deliberacao':    r = apiDeliberacao_();     break;
      case 'config':         r = apiConfig_();          break;
      case 'arena':          r = apiArenaDetalhe_(p);   break;
      case 'turma':          r = apiTurma_(p);          break;
      case 'coordenacao':    r = apiTodasTurmas_(p);    break;
      case 'auth':           r = apiVerificarJuiz_(p);  break;
      case 'login':          r = apiLogin_(p);          break;
      case 'chat':           r = apiChatReceber_(p);    break;
      case 'abas':           r = apiListarAbas_();      break;
      case 'competicoes':    r = apiCompetitions_();    break;
      default:               r = { ok: false, erro: 'Ação desconhecida: ' + (p.action || '(vazia)') };
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
      case 'pista':      r = apiSalvarPista_(body);      break;
      case 'comentario': r = apiSalvarComentario_(body); break;
      case 'chat_send':  r = apiChatEnviar_(body);       break;
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
    aba.getRange(1,1,1,5).setValues([['Nome','PIN','Categoria','Ativo','Competição']]);
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

function apiCompetitions_() {
  return { ok: true, competicoes: COMPS };
}

function apiArenaDetalhe_(p) {
  p = p || {};
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const diag = [];
  const comp = p.comp || 'FLL';
  const cfg  = lerConfig_(ss, diag, comp);
  const eq   = lerEquipes_(ss, cfg, diag, comp);
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

function apiRanking_(p) {
  p = p || {};
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const abas = abasComp_(p.comp);
  const aba  = ss.getSheetByName(abas.BASE);
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

function apiEquipes_(p) {
  p = p || {};
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const diag = [];
  const cfg  = lerConfig_(ss, diag, p.comp);
  const eq   = lerEquipes_(ss, cfg, diag, p.comp);
  const lista = eq.lista.map(function(e) {
    return { id: e.id, nome: e.nome, turno: e.turno, tutor: e.tutor, alunos: e.alunos, competicao: e.competicao };
  });
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
  const cfg = lerConfig_(ss, [], body.comp);
  if (!body.categoria || !body.idEquipe || !Array.isArray(body.notas)) throw new Error('Campos obrigatórios ausentes.');
  if (body.notas.length !== cfg.criterios) throw new Error('Esperadas ' + cfg.criterios + ' notas; recebidas: ' + body.notas.length + '.');
  body.notas.forEach(function(n,i){ const v=num_(n); if(v<1||v>4) throw new Error('Nota '+(i+1)+' inválida (1–4): '+n); });

  const aliases = {
    'projeto': T.CAT.PROJETO, 'design': T.CAT.DESIGN, 'core': T.CAT.CORE,
    'Projeto de Engenharia': T.CAT.DESIGN, 'Engenharia': T.CAT.DESIGN,
    [T.CAT.PROJETO]: T.CAT.PROJETO, [T.CAT.DESIGN]: T.CAT.DESIGN, [T.CAT.CORE]: T.CAT.CORE
  };
  const categoriaReal = aliases[body.categoria] || body.categoria;
  const mapa = {};
  mapa[T.CAT.PROJETO] = cfg.abaProj;
  mapa[T.CAT.DESIGN]  = cfg.abaDes;
  mapa[T.CAT.CORE]    = cfg.abaCore;
  const nomeAba = mapa[categoriaReal];
  if (!nomeAba) throw new Error('Categoria inválida: ' + body.categoria);

  let aba = ss.getSheetByName(nomeAba);
  if (!aba) {
    aba = ss.insertSheet(nomeAba);
    const h = ['Carimbo de data/hora','Juiz Avaliador','Sala de Avaliação','Selecione a Equipe','Validado'];
    for (let i = 1; i <= cfg.criterios; i++) h.push('Critério ' + i);
    h.push('Bom Trabalho', 'Reflitam');
    aba.getRange(1,1,1,h.length).setValues([h]);
  }

  /* Mapeamento dinâmico por nome de coluna (compatível com Form e aba própria) */
  const cab   = aba.getRange(1,1,1,aba.getLastColumn()).getValues()[0];
  const linha = new Array(cab.length).fill('');
  function set(nomes, val) {
    const lista = Array.isArray(nomes) ? nomes : [nomes];
    for (let k = 0; k < lista.length; k++) {
      const alvo = String(lista[k]).toUpperCase();
      for (let j = 0; j < cab.length; j++) {
        if (String(cab[j]).toUpperCase() === alvo ||
            String(cab[j]).toUpperCase().indexOf(alvo) === 0) {
          linha[j] = val; return;
        }
      }
    }
  }

  set(['Carimbo de data/hora','Timestamp'], new Date());
  set(['Juiz Avaliador','Nome do Juiz','Juiz','Avaliador','E-mail'], body.juiz);
  set(['Sala de Avaliação','Sala de Avaliacao','Sala'], body.categoria || categoriaReal);
  set(['Selecione a Equipe','ID_Equipe','Equipe Avaliada','Turma'], body.idEquipe);
  set(['Validado','Homologado'], 'Sim');

  /* Detecta colunas de critério em ordem (ignora colunas já mapeadas e texto livre) */
  const IGNORA = ['carimbo','timestamp','juiz','avaliador','sala','equipe','turma',
                  'id_equipe','validado','homologado','bom trabalho','reflita',
                  'observa','comentario','e mail','e-mail','email'];
  const colsScore = [];
  cab.forEach(function(h, i) {
    if (linha[i] !== '' && linha[i] !== 0) return;
    const hn = norm_(String(h || ''));
    if (!h || IGNORA.some(function(t) { return hn.indexOf(t) >= 0; })) return;
    colsScore.push(i);
  });
  body.notas.forEach(function(n, i) { if (colsScore[i] !== undefined) linha[colsScore[i]] = num_(n); });

  const obs = body.obs || {};
  set(['Bom trabalho!','Bom Trabalho','Bom trabalho'], String(obs.bom || '').trim());
  set(['Reflitam sobre','Reflitam','Reflita'], String(obs.melhorar || '').trim());

  aba.appendRow(linha);
  _agendarRecalculo_();
  return { ok: true, mensagem: 'Rubrica salva.' };
}

function apiSalvarArena_(body) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lerConfig_(ss, [], body.comp);
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
  function set(nomes, val){
    var lista = Array.isArray(nomes) ? nomes : [nomes];
    for (var k = 0; k < lista.length; k++) {
      var i = cab.indexOf(lista[k]);
      if (i < 0) {
        var pfx = String(lista[k]).toUpperCase();
        for (var j = 0; j < cab.length; j++) {
          if (String(cab[j]).toUpperCase().indexOf(pfx) === 0) { i = j; break; }
        }
      }
      if (i >= 0) { linha[i] = val; return; }
    }
  }
  set('Carimbo de data/hora', new Date());
  set(['Selecione a Equipe','ID_Equipe'], body.idEquipe);
  set(['Selecione o Round','Round'], body.round);
  set(['Árbitro','Juiz'], body.juiz);
  set(['Arena'], String(body.arena || ''));
  set('Penalidade', num_(body.penalidade));
  set('Validado', 'Sim');
  Object.keys(body.missoes).forEach(function(m){ set(m, num_(body.missoes[m])); });
  aba.appendRow(linha);
  _agendarRecalculo_();
  return { ok: true, mensagem: 'Arena salva.' };
}

function apiSalvarPista_(body) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lerConfig_(ss, [], 'Steam Racing');
  if (!body.idEquipe || !body.corridas) throw new Error('Campos obrigatórios: idEquipe, corridas.');

  const c        = body.corridas;
  const situacao = String(c.situacao || 'valida').trim();
  const invalida = situacao === 'falsa_largada' || situacao === 'dnf';
  const totalMs  = invalida ? '' : num_(c.total);
  const reacaoMs = invalida ? '' : num_(c.reacao);
  const efetivo  = (!invalida && totalMs !== '' && reacaoMs !== '')
    ? Math.max(0, totalMs - reacaoMs) : '';

  let aba = ss.getSheetByName(cfg.abaArena);
  if (!aba) {
    aba = ss.insertSheet(cfg.abaArena);
    aba.getRange(1,1,1,10).setValues([[
      'Carimbo_data_hora','ID_Equipe','Corrida','Raia','Árbitro',
      'Tempo_Total_ms','Tempo_Reacao_ms','Tempo_Efetivo_ms','Situacao','Validado'
    ]]);
    aba.setFrozenRows(1);
  }
  aba.appendRow([
    new Date(), body.idEquipe,
    String(c.id   || ''), String(c.raia || ''),
    String(body.juiz || ''),
    totalMs, reacaoMs, efetivo, situacao,
    invalida ? 'Não' : 'Sim'
  ]);
  _agendarRecalculo_();
  return { ok: true, mensagem: 'Corrida registrada.' };
}

/* Agenda recálculo via trigger assíncrono (debounce ~5 s) para não bloquear o POST */
function _agendarRecalculo_() {
  try {
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'TORNEIO_recalcDeferred') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('TORNEIO_recalcDeferred').timeBased().after(5000).create();
  } catch(e) { console.warn('_agendarRecalculo_:', e); }
}

function TORNEIO_recalcDeferred() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'TORNEIO_recalcDeferred') ScriptApp.deleteTrigger(t);
  });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  COMPS.forEach(function(c) { try { atualizarInterno_(ss, c); } catch(e) { console.error(c, e); } });
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
// API — CHAT (juizes.html)
// ================================================================

function apiListarAbas_() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const abas = ss.getSheets().map(function(s) {
    return { nome: s.getName(), linhas: s.getLastRow() };
  });
  return { ok: true, abas: abas };
}

function apiChatEnviar_(body) {
  const msg = String(body.msg || '').trim();
  if (!msg) throw new Error('Mensagem vazia.');
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let   aba = ss.getSheetByName('HUB_DELIBERACAO_CHAT');
  if (!aba) {
    aba = ss.insertSheet('HUB_DELIBERACAO_CHAT');
    aba.getRange(1,1,1,3).setValues([['Data_Hora','De','Mensagem']]);
  }
  aba.appendRow([new Date(), String(body.de || '').trim(), msg]);
  return { ok: true };
}

function apiChatReceber_(p) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('HUB_DELIBERACAO_CHAT');
  if (!aba || aba.getLastRow() < 2) return { ok: true, mensagens: [] };
  const dados = aba.getDataRange().getValues();
  const cab   = dados[0];
  const iTs  = achaCab_(cab, ['data hora','data_hora','timestamp','data'], 0);
  const iDe  = achaCab_(cab, ['de','juiz','nome'], 1);
  const iMsg = achaCab_(cab, ['mensagem','texto','msg'], 2);
  const lista = dados.slice(1).filter(function(r){ return r[iMsg] !== ''; }).map(function(r){
    return {
      hora: r[iTs] instanceof Date ? r[iTs].toISOString() : String(r[iTs]),
      de:   String(r[iDe]  || ''),
      msg:  String(r[iMsg] || '')
    };
  });
  return { ok: true, mensagens: lista };
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
      /^avalia[cç][aã]o[\s\[]/.test(hRaw) ||
      /^(identificar|comunicar|planejar|desenvolver|refletir|avaliar)[\s\[]/.test(h)
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

// Corrige duplo-encoding Windows-1252→UTF-8 (ex: "Â°"→"°", "Ã‰"→"É")
function fixEnc_(s) {
  if (!s || typeof s !== 'string') return s;
  // Mapa dos caracteres especiais Windows-1252 (0x80-0x9F) → byte value
  var w = {'€':0x80,'‚':0x82,'ƒ':0x83,'„':0x84,'…':0x85,
            '†':0x86,'‡':0x87,'ˆ':0x88,'‰':0x89,'Š':0x8A,
            '‹':0x8B,'Œ':0x8C,'Ž':0x8E,'‘':0x91,'’':0x92,
            '“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,
            '˜':0x98,'™':0x99,'š':0x9A,'›':0x9B,'œ':0x9C,
            'ž':0x9E,'Ÿ':0x9F};
  var bytes = [];
  for (var i = 0; i < s.length; i++) {
    var cp = s.charCodeAt(i);
    if (w[s[i]] !== undefined) bytes.push(w[s[i]]);
    else if (cp <= 0xFF) bytes.push(cp);
    else return s; // tem char fora de Latin-1/Win1252 → já está correto
  }
  try { return Utilities.newBlob(bytes).getDataAsString('UTF-8'); }
  catch(_) { return s; }
}

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
