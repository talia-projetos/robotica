(function () {
  'use strict';

  function currentPage() {
    var file = (location.pathname.split('/').pop() || 'index.html').split('?')[0];
    return file.replace(/\.html$/i, '') || 'index';
  }

  function addPageClass() {
    document.body.classList.add('page-' + currentPage());
  }

  function markCurrentNavigation() {
    var active = document.querySelector('.app-sidebar .sidebar-item.ativo');
    if (active) active.setAttribute('aria-current', 'page');
  }

  function svgArrow() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  }

  function buttonLink(href, text) {
    return '<a class="btn btn-outline btn-sm" href="' + href + '">' + text + svgArrow() + '</a>';
  }

  function enhanceJudges() {
    var wrap = document.querySelector('.painel-wrap');
    if (!wrap || wrap.querySelector('.workspace-head') || wrap.querySelector('.judge-workspace-head')) return;

    var head = document.createElement('div');
    head.className = 'workspace-head';
    head.innerHTML =
      '<div class="workspace-head__copy">' +
        '<div class="workspace-eyebrow">Workspace de avaliação</div>' +
        '<h1>Avaliações</h1>' +
        '<p class="workspace-sub" id="judge-workspace-sub">Acesse as rubricas e registre as avaliações da sua área.</p>' +
      '</div>' +
      '<div class="workspace-actions">' + buttonLink('documentos.html', 'Documentos') + '</div>';

    var first = wrap.querySelector('.jh');
    if (first) first.insertAdjacentElement('afterend', head);
    else wrap.insertBefore(head, wrap.firstChild);

    function syncJudgeContext() {
      var nome = document.getElementById('juiz-nome');
      var cat = document.getElementById('juiz-cat');
      var sub = document.getElementById('judge-workspace-sub');
      if (!sub) return;
      var n = nome && nome.textContent && nome.textContent !== '—' ? nome.textContent.trim() : '';
      var c = cat && cat.textContent && cat.textContent !== '—' ? cat.textContent.trim() : '';
      if (n && c) sub.textContent = n + ' · ' + c + ' · selecione a próxima atividade para avaliar.';
      else if (c) sub.textContent = c + ' · selecione a próxima atividade para avaliar.';
    }

    syncJudgeContext();
    ['juiz-nome','juiz-cat'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || typeof MutationObserver === 'undefined') return;
      new MutationObserver(syncJudgeContext).observe(el, { childList:true, subtree:true, characterData:true });
    });
  }

  function enhanceCoordination() {
    var panel = document.getElementById('view-coord');
    if (!panel || panel.querySelector('.workspace-head')) return;

    var head = document.createElement('div');
    head.className = 'workspace-head';
    head.innerHTML =
      '<div class="workspace-head__copy">' +
        '<div class="workspace-eyebrow">Gestão do torneio</div>' +
        '<h1>Coordenação</h1>' +
        '<p class="workspace-sub">Acompanhe pendências, avaliações, indicadores e resultados em um único espaço.</p>' +
      '</div>' +
      '<div class="workspace-actions">' +
        buttonLink('cronograma.html', 'Cronograma') +
        buttonLink('deliberacao.html', 'Deliberação') +
      '</div>';

    panel.insertBefore(head, panel.firstChild);
  }

  function enhanceRanking() {
    var title = document.querySelector('.page-title');
    if (!title) return;
    var shell = title.parentElement;
    if (!shell || shell.classList.contains('ranking-head-shell')) return;
    shell.classList.add('ranking-head-shell');
    var copy = document.createElement('div');
    copy.className = 'workspace-head__copy';
    var sub = document.createElement('p');
    sub.className = 'workspace-sub';
    sub.textContent = 'Classificação geral e desempenho por categoria.';
    title.parentNode.insertBefore(copy, title);
    copy.appendChild(title);
    copy.appendChild(sub);
  }

  function enhanceDocumentLinks() {
    /* PDFs disponíveis — sem bloqueio */
  }

  function enhanceDocuments() {
    var hd = document.querySelector('.page-hd');
    if (!hd) return;
    var p = hd.querySelector('p');
    if (p) p.textContent = 'Materiais oficiais do torneio · Escola SESI Reitor Miguel Calmon';
    enhanceDocumentLinks();
  }

  function enhanceTeam() {
    var header = document.getElementById('eq-header');
    var tabs = document.querySelector('.turma-tabs');
    if (header && tabs && !document.querySelector('.team-actionbar') && !document.querySelector('.team-workspace-head')) {
      var params = new URLSearchParams(location.search);
      var id = params.get('equipe') || localStorage.getItem('turma_id') || '';
      var isCoordView = !!localStorage.getItem('coord_nome');
      var bar = document.createElement('div');
      bar.className = 'team-actionbar';
      bar.innerHTML =
        '<a data-team-agenda href="cronograma.html' + (id ? '?equipe=' + encodeURIComponent(id) : '') + '">' + (isCoordView ? 'Agenda da equipe' : 'Minha agenda') + '</a>' +
        '<a href="turma.html#metodologia">Metodologia</a>' +
        '<a href="documentos.html">Documentos oficiais</a>';
      header.insertAdjacentElement('afterend', bar);
    }

    function openFromHash() {
      var tab = (location.hash || '').replace('#','').toLowerCase();
      if (!tab || ['resumo','metodologia','documentos','feedback'].indexOf(tab) === -1) return;
      if (typeof window.mudarTTab === 'function') window.mudarTTab(tab);
    }

    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    document.querySelectorAll('.ttab[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = this.getAttribute('data-tab');
        if (!tab) return;
        history.replaceState(null, '', tab === 'resumo' ? location.pathname + location.search : '#' + tab);
      });
    });
  }

  function parseTimeStart(text) {
    var m = String(text || '').match(/(\d{1,2}):(\d{2})/);
    if (!m) return 9999;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function enhanceSchedule() {
    var gantt = document.querySelector('.gantt-card');
    if (!gantt || document.getElementById('schedule-agenda')) return;

    var viewbar = document.createElement('div');
    viewbar.className = 'schedule-viewbar';
    viewbar.innerHTML =
      '<div>' +
        '<div class="schedule-viewbar__title">Agenda detalhada por equipe</div>' +
        '<div class="schedule-viewbar__sub">Horário exato, atividade e local de cada turma.</div>' +
      '</div>' +
      '<div class="schedule-segmented" role="group" aria-label="Visualização do cronograma">' +
        '<button type="button" class="ativo" data-view="agenda">Agenda</button>' +
        '<button type="button" data-view="timeline">Linha do tempo</button>' +
      '</div>';

    var agenda = document.createElement('div');
    agenda.id = 'schedule-agenda';
    agenda.className = 'schedule-agenda';

    var rows = Array.prototype.slice.call(document.querySelectorAll('.g-row'));
    rows.forEach(function (row, idx) {
      var idEl = row.querySelector('.g-lbl__id');
      var nameEl = row.querySelector('.g-lbl__nome');
      var id = idEl ? idEl.textContent.trim() : 'Equipe';
      var name = nameEl ? nameEl.textContent.trim() : '';
      var slots = Array.prototype.slice.call(row.querySelectorAll('.gb')).map(function (block) {
        var title = block.getAttribute('title') || '';
        var parts = title.split('·');
        var time = (parts[0] || '').trim();
        var desc = (parts[1] || '').trim();
        var isEval = block.classList.contains('gb-s1') || block.classList.contains('gb-s2');
        var round = block.classList.contains('gb-r1') ? 'Round 1' :
                    block.classList.contains('gb-r2') ? 'Round 2' :
                    block.classList.contains('gb-r3') ? 'Round 3' : '';
        return {
          time: time,
          order: parseTimeStart(time),
          activity: isEval ? 'Avaliação por categoria' : (round || desc),
          place: isEval ? desc : 'Arena',
          type: isEval ? 'avaliacao' : 'round'
        };
      }).sort(function (a,b) { return a.order - b.order; });

      var team = document.createElement('article');
      team.className = 'schedule-team';
      team.setAttribute('data-source-index', String(idx));
      team.setAttribute('data-equipe-id', id.toLowerCase());
      team.innerHTML =
        '<div class="schedule-team__head">' +
          '<div class="schedule-team__id">' + id + '</div>' +
          '<div class="schedule-team__name">' + name + '</div>' +
        '</div>' +
        '<div class="schedule-team__items">' +
          slots.map(function (s) {
            return '<div class="schedule-slot schedule-slot--' + s.type + '">' +
              '<div class="schedule-slot__time">' + s.time + '</div>' +
              '<div class="schedule-slot__activity">' + s.activity + '</div>' +
              '<div class="schedule-slot__place">' + s.place + '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      agenda.appendChild(team);
    });

    gantt.parentNode.insertBefore(viewbar, gantt);
    gantt.parentNode.insertBefore(agenda, gantt);
    gantt.classList.add('schedule-hidden');

    function setView(view) {
      var agendaMode = view !== 'timeline';
      agenda.classList.toggle('schedule-hidden', !agendaMode);
      gantt.classList.toggle('schedule-hidden', agendaMode);
      viewbar.querySelectorAll('[data-view]').forEach(function (b) {
        b.classList.toggle('ativo', b.getAttribute('data-view') === view);
      });
      try { sessionStorage.setItem('hub-schedule-view', view); } catch (_) {}
    }

    viewbar.querySelectorAll('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(this.getAttribute('data-view')); });
    });

    var initialView = 'agenda';
    try {
      var saved = sessionStorage.getItem('hub-schedule-view');
      if (saved === 'timeline' && window.innerWidth > 700) initialView = 'timeline';
    } catch (_) {}
    setView(initialView);

    function syncAgendaVisibility() {
      var visible = 0;
      rows.forEach(function (row, idx) {
        var item = agenda.querySelector('[data-source-index="' + idx + '"]');
        if (!item) return;
        var show = row.style.display !== 'none';
        item.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      var empty = agenda.querySelector('.schedule-empty');
      if (!visible && !empty) {
        empty = document.createElement('div');
        empty.className = 'schedule-empty';
        empty.textContent = 'Nenhuma equipe corresponde aos filtros atuais.';
        agenda.appendChild(empty);
      } else if (visible && empty) {
        empty.remove();
      }
    }

    var search = document.getElementById('search-equipe');
    if (search) search.addEventListener('input', function () { setTimeout(syncAgendaVisibility, 0); });
    document.querySelectorAll('.filter-sala').forEach(function (btn) {
      btn.addEventListener('click', function () { setTimeout(syncAgendaVisibility, 0); });
    });

    var params = new URLSearchParams(location.search);
    var team = params.get('equipe') || localStorage.getItem('turma_id') || '';
    if (team && search) {
      search.value = team;
      search.dispatchEvent(new Event('input', { bubbles:true }));
      var hd = document.querySelector('.page-hd');
      if (hd && !hd.querySelector('.schedule-context')) {
        var ctx = document.createElement('p');
        ctx.className = 'schedule-context';
        ctx.style.cssText = 'margin:.55rem 0 0;font-size:.74rem;font-weight:650;color:#3979B8';
        ctx.textContent = 'Agenda da sua equipe · ' + team;
        hd.appendChild(ctx);
      }
    }

    setTimeout(syncAgendaVisibility, 0);
  }

  function enhanceArena() {
    var timer = document.getElementById('crono-display');
    var state = document.getElementById('crono-estado');
    var sync = document.getElementById('arena-update');
    if (timer) {
      timer.setAttribute('role','timer');
      timer.setAttribute('aria-live','off');
    }
    if (state) state.setAttribute('aria-live','polite');
    if (sync) sync.setAttribute('aria-live','polite');
  }

  function setupMobileNav() {
    var topbar = document.querySelector('.topbar');
    var sidebar = document.querySelector('.app-sidebar');
    if (!topbar || !sidebar || document.querySelector('.mobile-nav-toggle')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-nav-toggle';
    btn.setAttribute('aria-label', 'Abrir navegação');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

    var brand = topbar.querySelector('.topbar__brand');
    if (brand && brand.nextSibling) topbar.insertBefore(btn, brand.nextSibling);
    else topbar.appendChild(btn);

    var backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    function setOpen(open) {
      document.body.classList.toggle('sidebar-mobile-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
    }

    btn.addEventListener('click', function () {
      setOpen(!document.body.classList.contains('sidebar-mobile-open'));
    });
    backdrop.addEventListener('click', function () { setOpen(false); });
    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 700) setOpen(false);
    });
  }

  function init() {
    addPageClass();
    markCurrentNavigation();
    setupMobileNav();

    var page = currentPage();
    if (page === 'coordenacao') enhanceCoordination();
    if (page === 'ranking') enhanceRanking();
    if (page === 'documentos') enhanceDocuments();
    if (page === 'turma') { enhanceTeam(); enhanceDocumentLinks(); }
    if (page === 'cronograma') enhanceSchedule();
    if (page === 'arena') enhanceArena();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();