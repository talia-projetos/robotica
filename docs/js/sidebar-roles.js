/* Controle de visibilidade da sidebar, avatar e logout */
(function () {
  var isCoord = !!(localStorage.getItem('coord_nome') && localStorage.getItem('coord_pin'));
  var isJuiz  = !!(localStorage.getItem('hub_juiz')   && localStorage.getItem('hub_pin'));
  var isTurma = !!(localStorage.getItem('turma_id')   && localStorage.getItem('turma_pin'));

  /* ── Logout global ───────────────────────────────────── */
  function sair() {
    ['coord_nome','coord_pin','hub_juiz','hub_pin','turma_id','turma_pin'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    location.replace('login.html');
  }

  /* ── CSS do dropdown (injetado uma vez) ──────────────── */
  var css = document.createElement('style');
  css.textContent =
    '.av-wrap{position:relative}' +
    '.av-btn{display:flex;align-items:center;gap:.45rem;background:none;border:none;cursor:pointer;padding:0;border-radius:8px;' +
            'outline-offset:3px}' +
    '.av-btn:focus-visible{outline:2px solid #508FCB}' +
    '.topbar-avatar__circle{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
                            'font-size:.82rem;font-weight:800;color:#fff;flex-shrink:0}' +
    '.topbar-avatar__name{font-size:.78rem;font-weight:700;color:rgba(255,255,255,.9)}' +
    '.topbar-avatar__role{font-size:.62rem;color:rgba(255,255,255,.45);margin-top:.05rem}' +
    '.av-chevron{width:14px;height:14px;stroke:rgba(255,255,255,.45);fill:none;stroke-width:2;' +
                'stroke-linecap:round;stroke-linejoin:round;transition:transform .15s}' +
    '.av-wrap.open .av-chevron{transform:rotate(180deg)}' +
    '.av-dropdown{position:absolute;top:calc(100% + 10px);right:0;min-width:180px;' +
                 'background:#fff;border:1px solid #E2EBF4;border-radius:12px;' +
                 'box-shadow:0 8px 24px rgba(15,23,42,.12);padding:.4rem;z-index:9999;' +
                 'display:none}' +
    '.av-wrap.open .av-dropdown{display:block}' +
    '.av-dd-header{padding:.55rem .75rem .4rem;border-bottom:1px solid #F1F5F9;margin-bottom:.3rem}' +
    '.av-dd-name{font-size:.8rem;font-weight:800;color:#0F1F33}' +
    '.av-dd-role{font-size:.68rem;color:#7A8FA6}' +
    '.av-dd-item{display:flex;align-items:center;gap:.55rem;padding:.52rem .75rem;' +
                'border-radius:8px;font-size:.82rem;font-weight:600;color:#374151;' +
                'cursor:pointer;border:none;background:none;width:100%;text-align:left;' +
                'transition:background .12s}' +
    '.av-dd-item:hover{background:#FEF2F2;color:#DC2626}' +
    '.av-dd-item:hover svg{stroke:#DC2626}' +
    '.av-dd-item svg{width:15px;height:15px;fill:none;stroke:#7A8FA6;stroke-width:1.8;' +
                    'stroke-linecap:round;stroke-linejoin:round}';
  document.head.appendChild(css);

  /* ── Visibilidade da sidebar ─────────────────────────── */
  function hide(href) {
    var el = document.querySelector('.app-sidebar a[href="' + href + '"]');
    if (el) el.style.display = 'none';
  }

  function addDelib() {
    var after = document.querySelector('.app-sidebar a[href="coordenacao.html"]');
    if (!after || document.querySelector('.app-sidebar a[href="deliberacao.html"]')) return;
    var a = document.createElement('a');
    a.href = 'deliberacao.html';
    a.className = 'sidebar-item' + (location.href.indexOf('deliberacao') !== -1 ? ' ativo' : '');
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5l5.5 3.5v7L8 15.5 2.5 12v-7z"/><path d="M8 6v4M6 8h4"/></svg> Deliberação';
    after.insertAdjacentElement('afterend', a);
  }

  if (isCoord) {
    addDelib();
  } else if (isJuiz) {
    hide('arena.html');
    hide('turma.html');
    hide('coordenacao.html');
    hide('ranking.html');
  } else if (isTurma) {
    hide('arena.html');
    hide('juizes.html');
    hide('coordenacao.html');
    hide('ranking.html');
  } else {
    if (location.pathname.indexOf('login.html') === -1) {
      location.replace('login.html');
      return;
    }
    var sb = document.querySelector('.app-sidebar');
    if (sb) sb.style.display = 'none';
  }

  /* ── Avatar + dropdown ───────────────────────────────── */
  function buildAvatar() {
    var name, role, color;
    if (isCoord) {
      name  = localStorage.getItem('coord_nome') || 'C';
      role  = 'Coordenação';
      color = '#2563EB';
    } else if (isJuiz) {
      name  = localStorage.getItem('hub_juiz') || 'J';
      role  = 'Juíz';
      color = '#7C3AED';
    } else if (isTurma) {
      name  = localStorage.getItem('turma_id') || 'T';
      role  = 'Professor';
      color = '#059669';
    } else {
      return;
    }

    var initial = name.charAt(0).toUpperCase();
    var badge   = document.querySelector('.topbar__badge');
    if (!badge) return;

    /* Wrapper com botão clicável */
    var wrap = document.createElement('div');
    wrap.className = 'av-wrap';
    wrap.innerHTML =
      '<button class="av-btn" type="button" aria-haspopup="true" aria-expanded="false">' +
        '<div class="topbar-avatar__circle" style="background:' + color + '">' + initial + '</div>' +
        '<div class="topbar-avatar__info">' +
          '<div class="topbar-avatar__name">' + name + '</div>' +
          '<div class="topbar-avatar__role">' + role + '</div>' +
        '</div>' +
        '<svg class="av-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</button>' +
      '<div class="av-dropdown" role="menu">' +
        '<div class="av-dd-header">' +
          '<div class="av-dd-name">' + name + '</div>' +
          '<div class="av-dd-role">' + role + '</div>' +
        '</div>' +
        '<button class="av-dd-item" id="av-sair">' +
          '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>' +
          '<polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
          'Sair' +
        '</button>' +
      '</div>';

    /* Substitui qualquer badge/botão existente */
    var target = badge.querySelector('.btn-entrar') ||
                 badge.querySelector('#badge-nome')  ||
                 badge.querySelector('#badge-juiz')  ||
                 badge.querySelector('#badge-coord') ||
                 badge.querySelector('#badge-turma');
    if (target) target.replaceWith(wrap);
    else badge.prepend(wrap);

    /* Limpa spans de nome legados que ficaram visíveis */
    setTimeout(function () {
      var old = badge.querySelector('#btn-sessao, #btn-sair');
      if (old) old.style.display = 'none';
      var nm = badge.querySelector('#badge-nome');
      if (nm) nm.textContent = '';
    }, 50);

    /* Toggle dropdown */
    var btn = wrap.querySelector('.av-btn');
    var dd  = wrap.querySelector('.av-dropdown');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    /* Fecha ao clicar fora */
    document.addEventListener('click', function () {
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });

    /* Ação Sair */
    wrap.querySelector('#av-sair').addEventListener('click', sair);
  }

  /* ── Greeting personalizado na home ─────────────────── */
  function buildGreeting() {
    var hero = document.querySelector('.hub-hero');
    if (!hero) return;

    var name, cta, ctaHref;
    if (isCoord) {
      name    = localStorage.getItem('coord_nome') || 'Coordenador';
      cta     = 'Ver situação das equipes';
      ctaHref = 'coordenacao.html';
    } else if (isJuiz) {
      name    = localStorage.getItem('hub_juiz') || 'Juiz';
      cta     = 'Ir para avaliações';
      ctaHref = 'juizes.html';
    } else if (isTurma) {
      name    = localStorage.getItem('turma_id') || 'Turma';
      cta     = 'Ver resultados da minha turma';
      ctaHref = 'turma.html';
    } else {
      return;
    }

    var last = name.trim().slice(-1).toLowerCase();
    var bv   = (last === 'a') ? 'Bem-vinda' : 'Bem-vindo';

    var h1 = hero.querySelector('h1');
    if (h1) h1.innerHTML = 'Olá, <span class="hero-accent">' + name + '!</span>';

    var eyebrow = hero.querySelector('.hero-eyebrow');
    if (eyebrow) eyebrow.textContent = bv + ' ao HUB Circuito.';

    var statsEl = hero.querySelector('.hero-stats');
    if (statsEl) {
      var link = document.createElement('a');
      link.href = ctaHref;
      link.className = 'hero-cta-btn';
      link.textContent = cta;
      statsEl.insertAdjacentElement('afterend', link);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildAvatar();
      buildGreeting();
    });
  } else {
    buildAvatar();
    buildGreeting();
  }
})();
