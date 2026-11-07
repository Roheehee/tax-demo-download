// A query crosses documents. Keep a single visual timeline while the result renders.
(() => {
  const feedbackMs = 267;
  const revolutionMs = 1200;
  let hud;
  let started;
  let timer;

  function clear() {
    clearTimeout(timer);
    hud?.remove();
    hud = null;
  }

  function show(startedAt) {
    if (hud) return false;
    started = startedAt;
    hud = document.createElement('div');
    hud.className = 'income-loading-hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-label', '正在查询');
    // On a portrait iPhone the installed app starts below the native status bar.
    if (navigator.standalone && screen.width === innerWidth && matchMedia('(orientation: portrait)').matches) {
      const inset = Math.max(0, screen.height - innerHeight);
      hud.style.top = 'calc(50% - ' + inset / 2 + 'px)';
    }
    const wheel = document.createElement('span');
    wheel.className = 'income-loading-wheel';
    wheel.setAttribute('aria-hidden', 'true');
    wheel.style.animationDelay = '-' + ((Date.now() - started) % revolutionMs) + 'ms';
    for (let i = 0; i < 12; i++) {
      const spoke = document.createElement('i');
      spoke.style.transform = 'rotate(' + i * 30 + 'deg)';
      spoke.style.opacity = String(0.25 + 0.75 * i / 11);
      wheel.append(spoke);
    }
    hud.append(wheel);
    document.body.append(hud);
    // Release the query button if navigation was cancelled by the browser.
    timer = setTimeout(clear, 12000);
    return true;
  }

  function finish() {
    if (!hud) return;
    clearTimeout(timer);
    const remaining = feedbackMs - (Date.now() - started);
    if (remaining > 0) timer = setTimeout(clear, remaining);
    else clear();
  }

  window.TaxIncomeLoading = Object.freeze({ show, finish, clear });
  window.addEventListener('pagehide', clear);
  window.addEventListener('popstate', clear);
})();

// Only this income list uses a separate, normally scrolling document.
(() => {
  const directory = new URL('./', location.href);
  const listURL = () => new URL('income-view.html', directory);
  const shellURL = hash => {
    const url = new URL(location.protocol === 'file:' ? 'index.html' : './', directory);
    url.hash = hash;
    return url;
  };
  const isList = /\/income-view(?:\.html)?\/?$/.test(location.pathname);
  // The bundled WKWebView authorizes only index.html and uses the existing in-page list.
  if (location.protocol === 'file:') {
    if (!isList) return;
    location.replace(shellURL('income').href);
  }
  const ticketKey = 'tax-income-nav:' + directory.pathname;
  const putState = patch => history.replaceState({ ...history.state, ...patch }, '');
  const pathKey = url => url.pathname.replace(/\/index(?:\.html)?$/, '/').replace(/\/income-view\.html$/, '/income-view');
  const targetKey = url => pathKey(url) + url.search + url.hash;
  function visit(url, from, queryStartedAt) {
    try { sessionStorage.setItem(ticketKey, JSON.stringify({ from, to: targetKey(url), at: Date.now(), queryStartedAt })); } catch {}
    location.assign(url.href);
  }
  function acceptArrival() {
    try {
      const ticket = JSON.parse(sessionStorage.getItem(ticketKey) || 'null');
      if (!ticket) return;
      sessionStorage.removeItem(ticketKey);
      if (ticket.to === targetKey(new URL(location.href)) && Date.now() - ticket.at < 120000) {
        putState({ taxIncomeFrom: ticket.from });
        if (isList && Number.isFinite(ticket.queryStartedAt)) {
          window.TaxIncomeLoading.show(ticket.queryStartedAt);
        }
      }
    } catch {}
  }
  function arrivedFrom(kind) {
    if (history.length < 2) return false;
    if (history.state?.taxIncomeFrom) return history.state.taxIncomeFrom === kind;
    // If session storage is unavailable, only use Back for this application's exact local paths.
    try {
      const ref = new URL(document.referrer);
      const expected = kind === 'list' ? listURL() : shellURL('');
      return ref.origin === directory.origin && pathKey(ref) === pathKey(expected);
    } catch { return false; }
  }
  function openResults() { visit(listURL(), 'shell'); }
  function fromQuery(query, startedAt) {
    putState({ taxIncomeQuery: query });
    const url = listURL();
    url.searchParams.set('year', query.year);
    for (const type of query.types) url.searchParams.append('type', type);
    visit(url, 'shell', startedAt);
  }
  function forgetQuery() {
    if (!history.state?.taxIncomeQuery) return;
    const state = { ...history.state };
    delete state.taxIncomeQuery;
    history.replaceState(state, '');
  }
  function backFromResults() {
    if (arrivedFrom('shell')) history.back();
    else location.replace(shellURL('income-query').href);
  }
  function backFromDetail() {
    if (arrivedFrom('list')) history.back();
    else location.replace(listURL().href);
  }
  function restoreShell() {
    const hash = location.hash;
    if (hash === '#income') { location.replace(listURL().href); return; }
    if (hash.startsWith('#income-detail/')) {
      let id;
      try { id = decodeURIComponent(hash.slice('#income-detail/'.length)); } catch {}
      const record = demoRecords.find(r => String(r.id) === id);
      if (!record) { backFromDetail(); return; }
      showDemoDetail(record);
      flowPage.querySelector('.flow-back').onclick = backFromDetail;
      return;
    }
    if (hash === '#income-query') {
      history.replaceState({ tab: 'services' }, '', '#services');
      renderTab('services');
      showIncomeQuery();
      return;
    }
    const query = history.state?.taxIncomeQuery;
    if (!query || !Array.isArray(query.types) || !/^\d{4}$/.test(query.year)) return;
    incomeQueryYear = query.year;
    incomeQueryTypes = query.types.filter(t => demoTypes.includes(t));
    renderTab(query.tab === 'home' || Object.hasOwn(tabPages, query.tab) ? query.tab : 'home');
    showIncomeQuery();
    const more = flowPage.querySelector('.query-more');
    if ((more.getAttribute('aria-expanded') === 'true') !== query.expanded) more.click();
    flowPage.querySelector('.flow-body').scrollTop = query.scroll || 0;
  }
  window.TaxIncomeNavigation = Object.freeze({ openResults, fromQuery, forgetQuery, backFromResults });
  acceptArrival();
  if (!isList) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreShell, { once: true });
    else restoreShell();
    window.addEventListener('pageshow', e => { if (e.persisted) restoreShell(); });
    window.addEventListener('popstate', () => requestAnimationFrame(restoreShell));
  }
})();
