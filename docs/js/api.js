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
    verificarJuiz: (juiz, pin) => get({ action: 'auth', juiz, pin }),
    todasTurmas: (juiz, pin) => get({ action: 'coordenacao', juiz, pin }),

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


// ── Autenticação de Coordenação ──────────────────────────────────
const CoordAuth = {
  get nome() { return localStorage.getItem('coord_nome') || ''; },
  get pin()  { return localStorage.getItem('coord_pin')  || ''; },
  set(n, p)  { localStorage.setItem('coord_nome', n); localStorage.setItem('coord_pin', p); },
  clear()    { localStorage.removeItem('coord_nome'); localStorage.removeItem('coord_pin'); },
  logado()   { return Boolean(this.nome); }
};

async function iniciarGateCoord(onSuccess) {
  if (CoordAuth.logado()) {
    try {
      const r = await API.verificarJuiz(CoordAuth.nome, CoordAuth.pin);
      if (r.ok && r.coordenador) { onSuccess(CoordAuth.nome); return; }
    } catch(_) {}
    CoordAuth.clear();
  }
  _abrirGateCoord(onSuccess);
}

function _abrirGateCoord(onSuccess) {
  const gate = document.createElement('div');
  gate.id = 'coord-gate';
  gate.style.cssText = 'position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#0a1f3a 0%,#12355B 100%);display:flex;align-items:center;justify-content:center;padding:1rem';
  gate.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:2rem 2.25rem;width:100%;max-width:380px;box-shadow:0 12px 48px rgba(0,0,0,.35)">
      <div style="font-size:1.15rem;font-weight:800;color:#12355B;margin-bottom:.2rem">Acesso Restrito</div>
      <div style="font-size:.85rem;color:#6B7A90;margin-bottom:1.5rem">Entre com suas credenciais de coordenação.</div>
      <label style="font-size:.78rem;font-weight:700;color:#243447;display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.04em">Nome</label>
      <input id="cg-nome" type="text" placeholder="Seu nome" autocomplete="name"
        style="width:100%;padding:.55rem .8rem;border:1.5px solid #D9E2EC;border-radius:8px;font-family:inherit;font-size:.9rem;box-sizing:border-box;margin-bottom:.85rem;outline:none">
      <label style="font-size:.78rem;font-weight:700;color:#243447;display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.04em">PIN</label>
      <input id="cg-pin" type="password" placeholder="PIN" autocomplete="current-password"
        style="width:100%;padding:.55rem .8rem;border:1.5px solid #D9E2EC;border-radius:8px;font-family:inherit;font-size:.9rem;box-sizing:border-box;margin-bottom:.85rem;outline:none">
      <div id="cg-erro" style="color:#EB5757;font-size:.82rem;margin-bottom:.6rem;display:none"></div>
      <button id="cg-btn" style="width:100%;background:#12355B;color:#fff;border:none;padding:.7rem;border-radius:9px;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer;transition:opacity .15s">Entrar</button>
    </div>`;
  document.body.appendChild(gate);

  async function tentar() {
    const nome = document.getElementById('cg-nome').value.trim();
    const pin  = document.getElementById('cg-pin').value.trim();
    const erro = document.getElementById('cg-erro');
    const btn  = document.getElementById('cg-btn');
    erro.style.display = 'none';
    if (!nome || !pin) { erro.textContent = 'Preencha nome e PIN.'; erro.style.display = ''; return; }
    btn.disabled = true; btn.style.opacity = '.6'; btn.textContent = 'Verificando…';
    try {
      const r = await API.verificarJuiz(nome, pin);
      if (!r.ok)          { erro.textContent = r.erro || 'Credenciais inválidas.'; erro.style.display = ''; return; }
      if (!r.coordenador) { erro.textContent = 'Acesso restrito à coordenação.';   erro.style.display = ''; return; }
      CoordAuth.set(nome, pin);
      gate.remove();
      onSuccess(nome);
    } catch(e) {
      erro.textContent = 'Erro de conexão: ' + e.message;
      erro.style.display = '';
    } finally {
      btn.disabled = false; btn.style.opacity = ''; btn.textContent = 'Entrar';
    }
  }

  document.getElementById('cg-btn').addEventListener('click', tentar);
  document.getElementById('cg-pin').addEventListener('keydown', function(e) { if (e.key === 'Enter') tentar(); });
}
