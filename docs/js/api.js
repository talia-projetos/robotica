/**
 * api.js — cliente HTTP para o Apps Script Web App
 * Defina window.API_URL antes de carregar este script.
 */

const API = (function () {
  function url() {
    if (!window.API_URL) throw new Error('window.API_URL não foi configurado.');
    return window.API_URL;
  }

  async function get(params) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(url() + '?' + qs, { redirect: 'follow' });
    if (!res.ok) throw new Error('Erro HTTP ' + res.status);
    return res.json();
  }

  async function post(body) {
    const res = await fetch(url(), {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Erro HTTP ' + res.status);
    return res.json();
  }

  return {
    ranking:     () => get({ action: 'ranking' }),
    equipes:     () => get({ action: 'equipes' }),
    deliberacao: () => get({ action: 'deliberacao' }),
    config:      () => get({ action: 'config' }),
    arena:       () => get({ action: 'arena' }),
    categorias:  (cat) => get({ action: 'categorias', categoria: cat || '' }),
    turma:       (id, pin) => get({ action: 'turma', id, pin }),

    salvarRubrica: (juiz, pin, categoria, idEquipe, notas) =>
      post({ action: 'rubrica', juiz, pin, categoria, idEquipe, notas }),

    salvarArena: (juiz, pin, idEquipe, round, missoes, penalidade) =>
      post({ action: 'arena', juiz, pin, idEquipe, round, missoes, penalidade: penalidade || 0 }),

    comentar: (juiz, pin, texto, categoria) =>
      post({ action: 'comentario', juiz, pin, texto, categoria: categoria || '' }),

    votar: (juiz, pin, idEquipe, categoria, favor) =>
      post({ action: 'voto', juiz, pin, idEquipe, categoria, favor })
  };
})();


// ── Toast global ────────────────────────────────────────────────
let _toastTimer;
function toast(msg, tipo = 'ok', ms = 3500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show ' + tipo;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, ms);
}


// ── Sessão do juiz (localStorage) ───────────────────────────────
const Sessao = {
  get juiz() { return localStorage.getItem('hub_juiz') || ''; },
  get pin()  { return localStorage.getItem('hub_pin')  || ''; },
  set(juiz, pin) {
    localStorage.setItem('hub_juiz', juiz);
    localStorage.setItem('hub_pin',  pin);
  },
  clear() {
    localStorage.removeItem('hub_juiz');
    localStorage.removeItem('hub_pin');
  },
  logado() { return Boolean(this.juiz && this.pin); }
};


// ── Polling simples ──────────────────────────────────────────────
function iniciarPolling(fn, intervaloMs = 8000) {
  fn();
  return setInterval(fn, intervaloMs);
}
