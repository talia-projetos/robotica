/**
 * TORNEIO HUB — Camada de API
 * Cole este arquivo no mesmo projeto Apps Script do sistema principal.
 *
 * Publica como Web App:
 *   Executar como: Eu mesmo
 *   Acesso: Qualquer pessoa (ou da organização)
 *
 * Endpoints GET:
 *   ?action=ranking
 *   ?action=equipes
 *   ?action=deliberacao
 *   ?action=categorias&categoria=Arena|Projeto|Design|Core
 *
 * Endpoints POST (JSON body):
 *   action=rubrica     { juiz, pin, categoria, idEquipe, notas:[n1..n10] }
 *   action=arena       { juiz, pin, idEquipe, round, missoes:{M01:p,...}, penalidade:0 }
 *   action=comentario  { juiz, pin, texto }
 *   action=voto        { juiz, pin, idEquipe, categoria, favor }
 */

// ============================================================================
// HANDLERS PRINCIPAIS
// ============================================================================

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || '';
  const callback = params.callback || '';

  try {
    let resultado;

    if (action === 'ranking')       resultado = apiRanking_();
    else if (action === 'equipes')  resultado = apiEquipes_();
    else if (action === 'deliberacao') resultado = apiDeliberacao_();
    else if (action === 'categorias')  resultado = apiCategorias_(params.categoria || '');
    else if (action === 'config')      resultado = apiConfigPublica_();
    else {
      resultado = { ok: false, erro: 'Ação desconhecida: ' + action };
    }

    return jsonResponse_(resultado, callback);
  } catch (err) {
    return jsonResponse_({ ok: false, erro: err.message }, callback);
  }
}


function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (_) {
    return jsonResponse_({ ok: false, erro: 'JSON inválido.' });
  }

  const action = body.action || '';

  try {
    autenticarJuiz_(body.juiz, body.pin);

    let resultado;
    if (action === 'rubrica')      resultado = apiSalvarRubrica_(body);
    else if (action === 'arena')   resultado = apiSalvarArena_(body);
    else if (action === 'comentario') resultado = apiSalvarComentario_(body);
    else if (action === 'voto')    resultado = apiSalvarVoto_(body);
    else resultado = { ok: false, erro: 'Ação desconhecida.' };

    return jsonResponse_(resultado);
  } catch (err) {
    return jsonResponse_({ ok: false, erro: err.message });
  }
}


// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

function autenticarJuiz_(nome, pin) {
  if (!nome || !pin) throw new Error('Nome e PIN são obrigatórios.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName('HUB_JUIZES');

  if (!aba) {
    aba = ss.insertSheet('HUB_JUIZES');
    aba.getRange(1, 1, 1, 4).setValues([['Nome', 'PIN', 'Categoria', 'Ativo']]);
    return;
  }

  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nomeCadastrado = String(dados[i][0] || '').trim().toLowerCase();
    const pinCadastrado  = String(dados[i][1] || '').trim();
    const ativo = dados[i][3] !== false && dados[i][3] !== 'Não';

    if (nomeCadastrado === nome.trim().toLowerCase()) {
      if (pinCadastrado && pinCadastrado !== String(pin).trim()) {
        throw new Error('PIN incorreto para o juiz "' + nome + '".');
      }
      if (!ativo) throw new Error('Juiz "' + nome + '" está inativo.');
      return;
    }
  }
}


function apiConfigPublica_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = carregarConfig_(ss);
  return {
    ok: true,
    titulo: cfg.titulo,
    categorias: Object.values(TORNEIO.CATEGORIAS),
    maxArena: cfg.maxArena,
    maxRubricas: cfg.maxRubricas,
    criteriosEsperados: cfg.criteriosEsperados,
    metaKgAluno: cfg.metaKgAluno
  };
}


// ============================================================================
// LEITURA
// ============================================================================

function apiRanking_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(TORNEIO.ABAS.BASE);
  if (!aba || aba.getLastRow() < 2) return { ok: true, equipes: [] };

  const dados = aba.getDataRange().getValues();
  const cols = cabecalhosBase_();
  const idx = {};
  dados[0].forEach(function(h, i) { idx[h] = i; });

  const equipes = [];
  for (let r = 1; r < dados.length; r++) {
    const linha = dados[r];
    equipes.push({
      id:           linha[idx['ID_Equipe']] || '',
      turma:        linha[idx['Turma']] || '',
      turno:        linha[idx['Turno']] || '',
      tutor:        linha[idx['Tutor']] || '',
      alunos:       linha[idx['Qtde_Alunos']] || 0,
      arenaBruta:   linha[idx['Arena_Bruta_550']] || 0,
      arena20:      linha[idx['Arena_20']] || 0,
      projeto20:    linha[idx['Projeto_20']] || 0,
      design20:     linha[idx['Design_20']] || 0,
      core20:       linha[idx['Core_20']] || 0,
      tampinhas20:  linha[idx['Tampinhas_20']] || 0,
      total:        linha[idx['Total_100']] || 0,
      status:       linha[idx['Status_Geral']] || '',
      posGeral:     linha[idx['Posição_Geral']] || '',
      posArena:     linha[idx['Posição_Arena']] || '',
      posProjeto:   linha[idx['Posição_Projeto']] || '',
      posDesign:    linha[idx['Posição_Design']] || '',
      posCore:      linha[idx['Posição_Core']] || '',
      posTampinhas: linha[idx['Posição_Tampinhas']] || ''
    });
  }

  equipes.sort(function(a, b) {
    const pa = Number(a.posGeral) || 9999;
    const pb = Number(b.posGeral) || 9999;
    return pa - pb;
  });

  return { ok: true, equipes: equipes, atualizado: new Date().toISOString() };
}


function apiEquipes_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = carregarConfig_(ss);
  const ctx = lerEquipes_(ss, cfg, []);
  const lista = ctx.equipes.map(function(e) {
    return { id: e.id, turma: e.turma, turno: e.turno, tutor: e.tutor, alunos: e.alunos };
  });
  return { ok: true, equipes: lista };
}


function apiCategorias_(categoria) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(TORNEIO.ABAS.NOTAS_RUBRICAS);
  const abaArena = ss.getSheetByName(TORNEIO.ABAS.NOTAS_ARENA);

  const resultado = {};

  if (!categoria || categoria === TORNEIO.CATEGORIAS.ARENA) {
    resultado[TORNEIO.CATEGORIAS.ARENA] = lerAbaNotas_(abaArena);
  }

  [TORNEIO.CATEGORIAS.PROJETO, TORNEIO.CATEGORIAS.DESIGN, TORNEIO.CATEGORIAS.CORE].forEach(function(cat) {
    if (!categoria || categoria === cat) {
      resultado[cat] = lerAbaNotasFiltrada_(aba, cat);
    }
  });

  return { ok: true, dados: resultado };
}


function lerAbaNotas_(aba) {
  if (!aba || aba.getLastRow() < 2) return [];
  const dados = aba.getDataRange().getValues();
  const cabecalhos = dados[0];
  const linhas = [];
  for (let r = 1; r < dados.length; r++) {
    const obj = {};
    cabecalhos.forEach(function(h, i) { obj[h] = dados[r][i]; });
    linhas.push(obj);
  }
  return linhas;
}


function lerAbaNotasFiltrada_(aba, categoria) {
  if (!aba || aba.getLastRow() < 2) return [];
  const dados = aba.getDataRange().getValues();
  const cabecalhos = dados[0];
  const idxCat = cabecalhos.indexOf('Categoria');
  const linhas = [];
  for (let r = 1; r < dados.length; r++) {
    if (idxCat < 0 || dados[r][idxCat] === categoria) {
      const obj = {};
      cabecalhos.forEach(function(h, i) { obj[h] = dados[r][i]; });
      linhas.push(obj);
    }
  }
  return linhas;
}


function apiDeliberacao_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const comentarios = lerAbaDeliberacao_(ss, 'HUB_DELIBERACAO_CHAT');
  const votos = lerAbaDeliberacao_(ss, 'HUB_DELIBERACAO_VOTOS');
  return { ok: true, comentarios: comentarios, votos: votos };
}


function lerAbaDeliberacao_(ss, nomeAba) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() < 2) return [];
  const dados = aba.getDataRange().getValues();
  const cabecalhos = dados[0];
  const linhas = [];
  for (let r = 1; r < dados.length; r++) {
    if (dados[r].every(function(v) { return v === ''; })) continue;
    const obj = {};
    cabecalhos.forEach(function(h, i) {
      obj[h] = dados[r][i] instanceof Date
        ? dados[r][i].toISOString()
        : dados[r][i];
    });
    linhas.push(obj);
  }
  return linhas;
}


// ============================================================================
// ESCRITA
// ============================================================================

function apiSalvarRubrica_(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = carregarConfig_(ss);

  const campos = ['juiz', 'categoria', 'idEquipe', 'notas'];
  campos.forEach(function(c) {
    if (body[c] === undefined || body[c] === '') throw new Error('Campo obrigatório ausente: ' + c);
  });

  const notas = body.notas;
  if (!Array.isArray(notas) || notas.length !== cfg.criteriosEsperados) {
    throw new Error('São esperadas ' + cfg.criteriosEsperados + ' notas; recebidas: ' + (notas ? notas.length : 0));
  }

  notas.forEach(function(n, i) {
    const v = Number(n);
    if (isNaN(v) || v < 1 || v > 4) throw new Error('Nota ' + (i + 1) + ' inválida: deve ser de 1 a 4.');
  });

  const mapaNomeAba = {};
  mapaNomeAba[TORNEIO.CATEGORIAS.PROJETO] = cfg.abaProjeto;
  mapaNomeAba[TORNEIO.CATEGORIAS.DESIGN]  = cfg.abaDesign;
  mapaNomeAba[TORNEIO.CATEGORIAS.CORE]    = cfg.abaCore;

  const nomeAba = mapaNomeAba[body.categoria];
  if (!nomeAba) throw new Error('Categoria inválida: ' + body.categoria);

  let aba = ss.getSheetByName(nomeAba);
  if (!aba) {
    aba = ss.insertSheet(nomeAba);
    const cabHeader = ['Carimbo de data/hora', 'ID_Equipe', 'Nome do Juiz', 'Validado'];
    for (let i = 1; i <= cfg.criteriosEsperados; i++) cabHeader.push('Critério ' + i);
    aba.getRange(1, 1, 1, cabHeader.length).setValues([cabHeader]);
  }

  const linha = [new Date(), body.idEquipe, body.juiz, 'Sim'];
  notas.forEach(function(n) { linha.push(Number(n)); });
  aba.appendRow(linha);

  atualizarResultadosInterno_(ss);
  return { ok: true, mensagem: 'Rubrica salva com sucesso.' };
}


function apiSalvarArena_(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = carregarConfig_(ss);

  const campos = ['juiz', 'idEquipe', 'round', 'missoes'];
  campos.forEach(function(c) {
    if (body[c] === undefined || body[c] === '') throw new Error('Campo obrigatório ausente: ' + c);
  });

  let aba = ss.getSheetByName(cfg.abaArena);
  if (!aba) {
    aba = ss.insertSheet(cfg.abaArena);
  }

  if (aba.getLastRow() === 0) {
    const missaoKeys = Object.keys(body.missoes || {}).sort();
    const cabHeader = ['Carimbo de data/hora', 'ID_Equipe', 'Round', 'Árbitro', 'Penalidade', 'Validado'].concat(missaoKeys);
    aba.getRange(1, 1, 1, cabHeader.length).setValues([cabHeader]);
  }

  const cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const linha = new Array(cabecalhos.length).fill('');
  const set = function(nome, valor) {
    const idx = cabecalhos.indexOf(nome);
    if (idx >= 0) linha[idx] = valor;
  };

  set('Carimbo de data/hora', new Date());
  set('ID_Equipe', body.idEquipe);
  set('Round', body.round);
  set('Árbitro', body.juiz);
  set('Penalidade', Number(body.penalidade) || 0);
  set('Validado', 'Sim');

  Object.keys(body.missoes || {}).forEach(function(missao) {
    set(missao, Number(body.missoes[missao]) || 0);
  });

  aba.appendRow(linha);
  atualizarResultadosInterno_(ss);
  return { ok: true, mensagem: 'Resultado da Arena salvo com sucesso.' };
}


function apiSalvarComentario_(body) {
  if (!body.texto || !body.texto.trim()) throw new Error('Texto do comentário é obrigatório.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName('HUB_DELIBERACAO_CHAT');
  if (!aba) {
    aba = ss.insertSheet('HUB_DELIBERACAO_CHAT');
    aba.getRange(1, 1, 1, 4).setValues([['Data_Hora', 'Juiz', 'Categoria', 'Texto']]);
  }

  aba.appendRow([new Date(), body.juiz, body.categoria || '', body.texto.trim()]);
  return { ok: true, mensagem: 'Comentário registrado.' };
}


function apiSalvarVoto_(body) {
  const campos = ['idEquipe', 'categoria'];
  campos.forEach(function(c) {
    if (!body[c]) throw new Error('Campo obrigatório ausente: ' + c);
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName('HUB_DELIBERACAO_VOTOS');
  if (!aba) {
    aba = ss.insertSheet('HUB_DELIBERACAO_VOTOS');
    aba.getRange(1, 1, 1, 5).setValues([['Data_Hora', 'Juiz', 'ID_Equipe', 'Categoria', 'Aprovado']]);
  }

  aba.appendRow([
    new Date(),
    body.juiz,
    body.idEquipe,
    body.categoria,
    body.favor === true || body.favor === 'true' ? 'Sim' : 'Não'
  ]);
  return { ok: true, mensagem: 'Voto registrado.' };
}


// ============================================================================
// UTILITÁRIO
// ============================================================================

function definirConfig_(ss, chave, valor) {
  const aba = ss.getSheetByName(TORNEIO.ABAS.CONFIG);
  if (!aba) return;
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto_(dados[i][0]) === normalizarTexto_(chave)) {
      aba.getRange(i + 1, 2).setValue(valor);
      return;
    }
  }
  aba.appendRow([chave, valor, '']);
}


function jsonResponse_(dados, callback) {
  const json = JSON.stringify(dados);
  const conteudo = callback ? callback + '(' + json + ')' : json;
  return ContentService
    .createTextOutput(conteudo)
    .setMimeType(
      callback
        ? ContentService.MimeType.JAVASCRIPT
        : ContentService.MimeType.JSON
    );
}
