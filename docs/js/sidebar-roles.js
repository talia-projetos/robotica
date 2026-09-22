/* Controle de visibilidade da sidebar, avatar e logout */
(function () {
  var isCoord = !!(localStorage.getItem('coord_nome') && localStorage.getItem('coord_pin'));
  var isJuiz  = !!(localStorage.getItem('hub_juiz')   && localStorage.getItem('hub_pin'));
  var isTurma = !!(localStorage.getItem('turma_id')   && localStorage.getItem('turma_pin'));
  var role    = isCoord ? 'coord' : isJuiz ? 'juiz' : isTurma ? 'professor' : '';

  /* Coordenação usa as mesmas credenciais nas áreas de avaliação/deliberação.
     Espelha a sessão para evitar novo login ao trocar de workspace. */
  if (isCoord && !isJuiz) {
    localStorage.setItem('hub_juiz', localStorage.getItem('coord_nome') || '');
    localStorage.setItem('hub_pin',  localStorage.getItem('coord_pin')  || '');
    isJuiz = true;
  }

  var currentFile = (location.pathname.split('/').pop() || 'index.html').split('?')[0] || 'index.html';
  var ALLOWED = {
    professor: ['turma.html','cronograma.html','documentos.html','arena.html'],
    juiz:      ['juizes.html','rubricas.html','documentos.html','arena.html'],
    coord:     ['index.html','arena.html','turma.html','juizes.html','coordenacao.html','deliberacao.html','ranking.html','cronograma.html','documentos.html','rubricas.html','relatorio.html']
  };
  var DEFAULT_ROUTE = { professor:'turma.html', juiz:'juizes.html', coord:'index.html' };

  var topbarBrand = document.querySelector('.topbar__brand');
  if (topbarBrand && role) topbarBrand.href = DEFAULT_ROUTE[role];
  var sidebarBrand = document.querySelector('.sidebar-brand');
  if (sidebarBrand && role) sidebarBrand.href = DEFAULT_ROUTE[role];

  if (role && currentFile !== 'login.html' && ALLOWED[role] && ALLOWED[role].indexOf(currentFile) === -1) {
    location.replace(DEFAULT_ROUTE[role]);
    return;
  }

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

  /* Injeta link Documentos na sidebar (para professor) */
  function addDocumentos() {
    var sidebar = document.querySelector('.app-sidebar');
    if (!sidebar || sidebar.querySelector('a[href="documentos.html"]')) return;
    var afterEl = sidebar.querySelector('a[href="cronograma.html"]');
    if (!afterEl) return;
    var a = document.createElement('a');
    a.href = 'documentos.html';
    a.className = 'sidebar-item' + (location.href.indexOf('documentos') !== -1 ? ' ativo' : '');
    a.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="1.5" width="10" height="13" rx="1.5"/>' +
        '<path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/>' +
      '</svg> Documentos';
    afterEl.insertAdjacentElement('afterend', a);
  }

  function addRubricas() {
    var sidebar = document.querySelector('.app-sidebar');
    if (!sidebar || sidebar.querySelector('a[href="rubricas.html"]')) return;
    var afterEl = sidebar.querySelector('a[href="juizes.html"]') || sidebar.querySelector('a[href="arena.html"]');
    if (!afterEl) return;
    var a = document.createElement('a');
    a.href = 'rubricas.html';
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'sidebar-item' + (currentFile === 'rubricas.html' ? ' ativo' : '');
    a.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 2.5h10v11H3z"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/>' +
      '</svg> Rubricas';
    afterEl.insertAdjacentElement('afterend', a);
  }

  function rename(href, label) {
    var el = document.querySelector('.app-sidebar a[href="' + href + '"]');
    if (!el) return;
    var textNode = Array.prototype.slice.call(el.childNodes).find(function(n){ return n.nodeType === 3; });
    if (textNode) textNode.nodeValue = ' ' + label;
  }

  if (role === 'coord') {
    addDelib();
    addDocumentos();
    addRubricas();
    rename('juizes.html', 'Avaliações');
  } else if (role === 'juiz') {
    hide('index.html');
    hide('turma.html');
    hide('coordenacao.html');
    hide('ranking.html');
    hide('cronograma.html');
    addDocumentos();
    addRubricas();
    rename('juizes.html', 'Avaliações');
  } else if (role === 'professor') {
    hide('index.html');
    hide('juizes.html');
    hide('coordenacao.html');
    hide('ranking.html');
    addDocumentos();
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
      role  = 'Juiz';
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

    /* Limpa o badge inteiro e insere só o avatar — sem sobras legadas */
    badge.innerHTML = '';
    badge.appendChild(wrap);

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

  /* ── Mapa de equipes (professor) ────────────────────── */
  var NOMES_TURMA = {
    TUR01:'6° A - Cyber Panter',    TUR02:'6° B - Liga do Choque',
    TUR03:'6° C - Alpha Tech',      TUR04:'6° D - Pheonics Mecanics',
    TUR05:'6° E - TecShark',        TUR06:'7° A - Hoppin Robots',
    TUR07:'7° B - Bivoltx',         TUR08:'7° C - Ecoshift',
    TUR09:'7° D - Pantera Lego Team', TUR10:'7° E - Império das Onças',
    TUR11:'7° F - Poseidon',        TUR12:'7° G - Arara Azul',
    TUR13:'7° H - Nexos'
  };

  /* ── Logo no topo da sidebar ────────────────────────── */
  function addSidebarBrand() {
    var sidebar = document.querySelector('.app-sidebar');
    if (!sidebar || sidebar.querySelector('.sidebar-brand')) return;
    var a   = document.createElement('a');
    a.href  = DEFAULT_ROUTE[role] || 'index.html';
    a.className = 'sidebar-brand';
    var img = document.createElement('img');
    img.src = 'logo-claro.svg';
    img.alt = 'HUB Circuito';
    img.className = 'sidebar-brand__img';
    a.appendChild(img);
    sidebar.insertBefore(a, sidebar.firstChild);
  }

  /* ── Toggle da sidebar ───────────────────────────────── */
  function addSidebarToggle() {
    var sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;
    var appBody = document.querySelector('.app-body');
    if (!appBody) return;

    /* Restaura estado salvo */
    if (localStorage.getItem('sb-collapsed') === '1') {
      appBody.classList.add('sidebar-collapsed');
    }

    /* Adiciona title para tooltip nativo em modo recolhido */
    sidebar.querySelectorAll('.sidebar-item').forEach(function (el) {
      var text = el.textContent.trim();
      if (text && !el.getAttribute('title')) el.setAttribute('title', text);
    });

    /* Botão toggle */
    var btn = document.createElement('button');
    btn.className = 'sidebar-toggle';
    btn.setAttribute('type', 'button');
    btn.setAttribute('title', 'Recolher menu');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="15 18 9 12 15 6"/>' +
      '</svg>' +
      '<span class="sidebar-toggle-label">Recolher</span>';
    sidebar.appendChild(btn);

    btn.addEventListener('click', function () {
      var collapsed = appBody.classList.toggle('sidebar-collapsed');
      localStorage.setItem('sb-collapsed', collapsed ? '1' : '0');
    });
  }

  /* ── Greeting personalizado na home ─────────────────── */
  function buildGreeting() {
    var hero = document.querySelector('.hub-hero');
    if (!hero) return;

    var h1      = hero.querySelector('h1');
    var eyebrow = hero.querySelector('.hero-eyebrow');
    var statsEl = hero.querySelector('.hero-stats');
    var cta, ctaHref;

    if (isCoord) {
      var coordNome = localStorage.getItem('coord_nome') || 'Coordenador';
      if (h1) h1.innerHTML = 'Olá, <span class="hero-accent">' + coordNome + '!</span>';
      if (eyebrow) eyebrow.textContent = 'Bem-vindo ao HUB Circuito.';
      cta = 'Ver situação das equipes'; ctaHref = 'coordenacao.html';

    } else if (isJuiz) {
      var juizNome = localStorage.getItem('hub_juiz') || 'Juiz';
      if (h1) h1.innerHTML = 'Olá, <span class="hero-accent">' + juizNome + '!</span>';
      if (eyebrow) eyebrow.textContent = 'Bem-vindo ao HUB Circuito.';
      cta = 'Ir para avaliações'; ctaHref = 'juizes.html';

    } else if (isTurma) {
      var turmaId  = localStorage.getItem('turma_id') || '';
      var raw      = NOMES_TURMA[turmaId] || turmaId;
      var partes   = raw.split(' - ');
      var nomeEq   = partes.length > 1 ? partes[1].trim() : raw;
      var serie    = partes.length > 1 ? partes[0].trim() : '';

      /* Greeting: nome da equipe, não o código */
      if (h1) h1.innerHTML = '<span class="hero-accent">' + nomeEq + '</span>';
      if (eyebrow) eyebrow.textContent = 'Minha Turma';

      /* Subtítulo com série e ID */
      var dateEl = hero.querySelector('.hero-date');
      if (dateEl && (serie || turmaId)) {
        var meta = document.createElement('div');
        meta.style.cssText = 'font-size:.75rem;color:#94A3B8;margin-bottom:.6rem;font-weight:500';
        meta.textContent = [serie, turmaId].filter(Boolean).join(' · ');
        dateEl.insertAdjacentElement('afterbegin', meta);
      }

      /* Adapta acessos rápidos para professor */
      adaptarAcessosProfessor();

      /* Tira de status da equipe (professor home) */
      if (!document.getElementById('prof-strip')) {
        var profCss = document.createElement('style');
        profCss.textContent =
          '.prof-strip{background:#162438;border-bottom:1px solid rgba(255,255,255,.06)}' +
          '.prof-strip-inner{max-width:1100px;margin:0 auto;padding:.7rem 2rem;display:flex;align-items:center;gap:2.5rem;flex-wrap:wrap}' +
          '.prof-stat{display:flex;flex-direction:column;gap:.04rem}' +
          '.prof-stat__label{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.38)}' +
          '.prof-stat__val{font-size:.88rem;font-weight:800;color:#fff}' +
          '.prof-strip-cta{margin-left:auto;font-size:.73rem;font-weight:700;color:#50CCC6;text-decoration:none;white-space:nowrap}' +
          '.prof-strip-cta:hover{text-decoration:underline}';
        document.head.appendChild(profCss);

        var strip = document.createElement('div');
        strip.className = 'prof-strip';
        strip.id = 'prof-strip';
        strip.innerHTML =
          '<div class="prof-strip-inner">' +
            '<div class="prof-stat"><span class="prof-stat__label">Posição geral</span><span class="prof-stat__val" id="ps-rank">...</span></div>' +
            '<div class="prof-stat"><span class="prof-stat__label">Avaliações</span><span class="prof-stat__val" id="ps-status">...</span></div>' +
            '<div class="prof-stat"><span class="prof-stat__label">Turma</span><span class="prof-stat__val">' + (turmaId || '') + '</span></div>' +
            '<a href="turma.html" class="prof-strip-cta">Ver minha turma →</a>' +
          '</div>';
        hero.insertAdjacentElement('afterend', strip);

        /* Preenche com dados da API */
        var tId  = turmaId;
        var tPin = localStorage.getItem('turma_pin') || '';

        if (typeof API !== 'undefined') {
          API.ranking().then(function(r) {
            var el = document.getElementById('ps-rank');
            if (!el) return;
            if (!r || !r.ok || !r.equipes) { el.textContent = '—'; return; }
            var idx = r.equipes.findIndex(function(e) { return e.id === tId; });
            el.textContent = idx >= 0 ? (idx + 1) + 'º de ' + r.equipes.length : '—';
          }).catch(function() {
            var el = document.getElementById('ps-rank');
            if (el) el.textContent = '—';
          });

          API.turma(tId, tPin).then(function(r) {
            var el = document.getElementById('ps-status');
            if (!el) return;
            if (!r || !r.ok || !r.scores) { el.textContent = '—'; return; }
            el.textContent = r.scores.status || '—';
          }).catch(function() {
            var el = document.getElementById('ps-status');
            if (el) el.textContent = '—';
          });
        }
      }

      cta = 'Ver desempenho da turma'; ctaHref = 'turma.html';

    } else {
      return;
    }

    if (statsEl && cta) {
      var link = document.createElement('a');
      link.href = ctaHref;
      link.className = 'hero-cta-btn';
      link.textContent = cta;
      statsEl.insertAdjacentElement('afterend', link);
    }
  }

  /* ── Acessos rápidos: versão professor ───────────────── */
  function adaptarAcessosProfessor() {
    var grid = document.querySelector('.acessos-grid');
    if (!grid) return;
    /* Substitui os 4 cards genéricos por 3 relevantes ao professor */
    grid.style.gridTemplateColumns = 'repeat(3,1fr)';
    grid.innerHTML =
      '<a href="turma.html" class="acesso acesso--turma">' +
        '<div class="acesso__icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>' +
        '<div class="acesso__body"><div class="acesso__name">Minha Turma</div><div class="acesso__desc">Pontuação e feedback</div></div>' +
      '</a>' +
      '<a href="cronograma.html" class="acesso acesso--arena">' +
        '<div class="acesso__icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg></div>' +
        '<div class="acesso__body"><div class="acesso__name">Cronograma</div><div class="acesso__desc">Horários da equipe</div></div>' +
      '</a>' +
      '<a href="ranking.html" class="acesso acesso--coord">' +
        '<div class="acesso__icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>' +
        '<div class="acesso__body"><div class="acesso__name">Classificação</div><div class="acesso__desc">Ranking geral</div></div>' +
      '</a>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildAvatar();
      buildGreeting();
      addSidebarToggle();
    });
  } else {
    buildAvatar();
    buildGreeting();
    addSidebarToggle();
  }
})();
