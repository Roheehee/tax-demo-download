(() => {
  'use strict';
  const panel = document.querySelector('[data-pwa-status]');
  const retry = document.querySelector('[data-pwa-retry]');
  const install = document.querySelector('[data-pwa-install]');
  let registration, installPrompt, requestNumber = 0;
  let status = { ready: false, phase: 'preparing', version: null };
  function show(phase, title, detail, ready = false, version = null) {
    status = { phase, ready, version };
    if (!panel) return;
    panel.dataset.state = phase;
    panel.querySelector('[data-pwa-title]').textContent = title;
    panel.querySelector('[data-pwa-detail]').textContent = detail;
  }
  function networkDetail() {
    return navigator.onLine ? '当前浏览器已缓存完整应用。添加后请从桌面图标联网打开一次，再核对离线启动。' : '当前网络已断开，可以打开已缓存的应用。系统仍可能回收缓存，请保留 JSON 备份。';
  }
  async function inspect(worker, repair = false) {
    if (!worker) return;
    const number = ++requestNumber;
    try {
      const result = await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); reject(new Error('timeout')); }, repair ? 30000 : 6000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
        worker.postMessage({ type: repair ? 'TAX_PWA_PREPARE' : 'TAX_PWA_STATUS' }, [channel.port2]);
      });
      if (number !== requestNumber) return;
      if (result && result.type === 'TAX_PWA_STATUS' && result.ready === true) {
        show('ready', '离线资源已准备好', networkDetail(), true, result.version);
      } else show('error', '离线资源尚未完整', '请保持联网，再点“重新检查离线资源”。当前仍可在线打开应用。');
    } catch {
      if (number === requestNumber) show('error', '尚未确认离线可用', '请联网稍候后重新检查。完成前请不要依赖离线启动。');
    }
  }
  function watch(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') inspect(worker);
      if (worker.state === 'redundant') {
        if (registration && registration.active) inspect(registration.active);
        else show('error', '离线资源未能下载完成', '请检查网络后重试；应用仍可在线使用。');
      }
    });
  }
  async function check(repair = false) {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      show('error', '此环境暂不支持离线安装', '请用 Safari 或 Chrome 打开正式 HTTPS 地址。');
      return;
    }
    show('preparing', '正在检查离线资源…', navigator.onLine ? '首次请保持联网，等待资源下载完成。' : '当前网络已断开，正在核对已有缓存。');
    try {
      registration = await navigator.serviceWorker.getRegistration(new URL('./', location.href).href);
      if (!navigator.onLine && registration && registration.active) {
        await inspect(registration.active);
        return;
      }
      registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      registration.addEventListener('updatefound', () => watch(registration.installing));
      watch(registration.installing);
      if (registration.active) await inspect(registration.active, repair);
      navigator.serviceWorker.ready.then(reg => inspect(reg.active));
    } catch {
      const worker = navigator.serviceWorker.controller || (registration && registration.active);
      if (worker) await inspect(worker);
      else show('error', '离线缓存暂未启用', '请检查网络与浏览器设置后重试。当前仍可在线打开应用。');
    }
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => inspect(navigator.serviceWorker.controller));
  ['online', 'offline'].forEach(name => window.addEventListener(name, () => {
    if (status.ready) show('ready', '离线资源已准备好', networkDetail(), true, status.version);
  }));
  if (retry) retry.addEventListener('click', async () => {
    retry.disabled = true;
    await check(true);
    retry.disabled = false;
  });
  if (install) {
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; install.hidden = false; });
    install.addEventListener('click', async () => {
      if (!installPrompt) return;
      const prompt = installPrompt; installPrompt = null; install.hidden = true;
      try { await prompt.prompt(); } catch { /* The browser menu remains available. */ }
    });
    window.addEventListener('appinstalled', () => { installPrompt = null; install.hidden = true; });
  }
  window.TaxPWA = Object.freeze({ getStatus: () => ({ ...status }), check });
  check();
})();
