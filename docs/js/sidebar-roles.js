/* Controle de visibilidade da sidebar e avatar por papel */
(function () {
  var isCoord = !!(localStorage.getItem('coord_nome') && localStorage.getItem('coord_pin'));
  var isJuiz  = !!(localStorage.getItem('hub_juiz')   && localStorage.getItem('hub_pin'));
  var isTurma = !!(localStorage.getItem('turma_id')   && localStorage.getItem('turma_pin'));

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
    /* coord vê tudo */
  } else if (isJuiz) {
    hide('arena.html');
    hide('turma.html');
    hide('coordenacao.html');
    hide('ranking.html');
    /* cronograma fica para todos */
  } else if (isTurma) {
    hide('arena.html');
    hide('juizes.html');
    hide('coordenacao.html');
    hide('ranking.html');
    /* cronograma fica para todos */
  } else {
    /* sem login: redireciona para login (exceto se já estiver lá) */
    if (location.pathname.indexOf('login.html') === -1) {
      location.replace('login.html');
      return;
    }
    var sb = document.querySelector('.app-sidebar');
    if (sb) sb.style.display = 'none';
  }

  /* ── Avatar no topbar ────────────────────────────────── */
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

    var av = document.createElement('div');
    av.className = 'topbar-avatar';
    av.innerHTML =
      '<div class="topbar-avatar__circle" style="background:' + color + '">' + initial + '</div>' +
      '<div class="topbar-avatar__info">' +
        '<div class="topbar-avatar__name">' + name + '</div>' +
        '<div class="topbar-avatar__role">' + role + '</div>' +
      '</div>';

    /* substitui o botão Entrar ou o badge de nome */
    var target = badge.querySelector('.btn-entrar') ||
                 badge.querySelector('#badge-nome') ||
                 badge.querySelector('#badge-juiz') ||
                 badge.querySelector('#badge-coord') ||
                 badge.querySelector('#badge-turma');
    if (target) {
      target.replaceWith(av);
    } else {
      badge.prepend(av);
    }

    /* esconde botão Sair se vier depois */
    setTimeout(function () {
      var sair = badge.querySelector('#btn-sessao, #btn-sair');
      if (sair) sair.style.display = 'none';
    }, 50);
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

    /* saudação por gênero: heurística simples por última letra */
    var last = name.trim().slice(-1).toLowerCase();
    var bv   = (last === 'a') ? 'Bem-vinda' : 'Bem-vindo';

    /* sobrescreve o h1 do hero */
    var h1 = hero.querySelector('h1');
    if (h1) {
      h1.innerHTML = 'Olá, <span class="hero-accent">' + name + '!</span>';
    }
    var eyebrow = hero.querySelector('.hero-eyebrow');
    if (eyebrow) eyebrow.textContent = bv + ' ao HUB Circuito.';

    /* adiciona CTA rápido */
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
