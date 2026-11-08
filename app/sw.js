'use strict';
const VERSION = 'v52-profile-colors-20261109';
const BASE = new URL('./', self.location.href);
const PREFIX = 'tax-demo-cloud-' + encodeURIComponent(BASE.pathname) + '-';
const CACHE = PREFIX + VERSION;
// Match the exact asset revisions used by the income document. A newer shell
// asking an older worker for a different revision must still reach the network.
const INCOME_ASSETS = [
  'income.css?v=5', 'flows.css?v=44', 'typography.css?v=44', 'income-refinement.css?v=46',
  'income-preset.js?v=25', 'income-defaults.js?v=37', 'income-model.js?v=42', 'income-detail.js?v=42',
  'installed-headers.css?v=51', 'income-navigation.js?v=47', 'income-view.js?v=46', 'pwa.js'
];
const INCOME_PAGE = new URL('income-view.html', BASE).href;
const INCOME_ASSET_URLS = new Set(INCOME_ASSETS.map(file => new URL(file, BASE).href));
const FILES = [
  ...INCOME_ASSETS,
  "profile-display.js", "bank-card.css", "employment-page.css", "assets/profile-ui/cmb-mark.svg",
  "assets/home-ui/article-filing.png",
  "assets/home-ui/article-password.png",
  "assets/home-ui/article-refund.png",
  "assets/home-ui/article-rights.png",
  "assets/home-ui/city-strip.png",
  "assets/home-ui/tax-record-banner.png",

  "income-import-ui.js",
  "income-import.css",
  "profile-calibration.css?v=52",
  "assets/profile-ui/arrow.png",
  "assets/profile-ui/hero-top.png",
  "assets/profile-ui/hero.png",
  "assets/profile-ui/hero-left.png",
  "assets/profile-ui/hero-right.png",
  "assets/profile-ui/family.png",
  "assets/profile-ui/employment.png",
  "assets/profile-ui/bank.png",
  "assets/profile-ui/care.png",
  "assets/profile-ui/security.png",
  "assets/profile-ui/help.png",
  "assets/profile-ui/support.png",
  "assets/profile-ui/about.png",
  "app-shell.css",
  "tab-headers.css?v=51",
  "flow-header.css?v=51",
  "assets/bank-reference.svg",
  "assets/home-scroll.jpg",
  "assets/home-top.jpg",
  "assets/invoices.jpg",
  "assets/messages.svg",
  "assets/profile-latest.svg",
  "assets/profile.svg",
  "assets/queries.jpg",
  "assets/services.jpg",
  "assets/todo.jpg",
  "data-backup.css",
  "data-backup.js",
  "editor.css",
  "editor.js",
  "flows.js",
  "home-refinement.css",
  "icons/v50/app-192.png",
  "icons/v50/app-512.png",
  "icons/v50/app.svg",
  "icons/v50/apple-touch-icon.png",
  "income-view.html",
  "income.js",
  "index.html",
  "install.html",
  "manifest.webmanifest",
  "profile-refinement.css",
  "tabs-refinement.css",
  "tabs.css",
  "tabs.js",
  "tax-demo-qr.js",
  "tax-document.js",
  "tax-records.css",
  "tax-records.js",
];
const URLS = FILES.map(file => new URL(file, BASE).href);
const ALLOWED = new Map(URLS.map(url => [new URL(url).pathname, url]));
const PAGES = new Map([
  [new URL('index.html', BASE).href, { clean: './', marker: 'app' }],
  [new URL('install.html', BASE).href, { clean: 'install', marker: 'install' }],
  [INCOME_PAGE, { clean: 'income-view', marker: 'income' }]
]);
for (const [key, page] of PAGES) ALLOWED.set(new URL(page.clean, BASE).pathname, key);
function resource(url) {
  const parsed = new URL(url);
  return parsed.origin === BASE.origin ? ALLOWED.get(parsed.pathname) : undefined;
}
async function valid(response, key) {
  if (!response || response.status !== 200 || response.redirected || !['basic', 'default'].includes(response.type) || resource(response.url) !== key) return false;
  const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const path = new URL(key).pathname;
  if (path.endsWith('.html')) {
    const page = PAGES.get(key);
    if (type !== 'text/html' || !page) return false;
    return (await response.clone().text()).includes('<meta name="tax-demo-shell" content="' + page.marker + '">');
  }
  if (path.endsWith('.js')) return ['text/javascript', 'application/javascript', 'application/x-javascript'].includes(type);
  if (path.endsWith('.css')) return type === 'text/css';
  if (path.endsWith('.png')) return type === 'image/png';
  if (path.endsWith('.jpg')) return type === 'image/jpeg';
  if (path.endsWith('.svg')) return type === 'image/svg+xml';
  if (path.endsWith('.webmanifest')) return ['application/manifest+json', 'application/json'].includes(type);
  return false;
}
async function download(url, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const options = { cache: 'no-cache', credentials: 'omit', redirect: 'error', signal: controller.signal };
    const requested = new URL(url);
    const page = PAGES.get(key);
    let alternate;
    if (page && resource(requested.href) === key) {
      const clean = new URL(page.clean, BASE);
      alternate = requested.pathname === clean.pathname ? new URL(key) : clean;
      alternate.search = requested.search;
    }
    let response;
    try { response = await fetch(url, options); }
    catch (error) { if (!alternate) throw error; }
    // Try only this shell's other known path. Never follow a host redirect.
    if (alternate && (!response || response.status === 404)) response = await fetch(alternate.href, options);
    if (!await valid(response, key)) throw new Error('Unexpected app resource');
    return response;
  } finally { clearTimeout(timer); }
}
let preparing;
function prepare() {
  if (preparing) return preparing;
  preparing = (async () => {
    // Validate the complete bundle before writing; redirects/login pages never enter the cache.
    const responses = await Promise.all(URLS.map(url => download(url, url)));
    const cache = await caches.open(CACHE);
    await Promise.all(URLS.map((url, index) => cache.put(url, responses[index])));
  })().finally(() => { preparing = null; });
  return preparing;
}
async function ready() {
  const cache = await caches.open(CACHE);
  const stored = new Set((await cache.keys()).map(request => request.url));
  return URLS.every(url => stored.has(url));
}
self.addEventListener('install', event => {
  event.waitUntil(prepare().then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith(PREFIX) && key !== CACHE) || key === 'tax-demo-cloud-v14-20261104').map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (!event.data || !['TAX_PWA_STATUS', 'TAX_PWA_PREPARE'].includes(event.data.type) || !event.ports[0]) return;
  const source = event.source && resource(event.source.url);
  if (!PAGES.has(source)) return;
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'TAX_PWA_PREPARE') await prepare();
      event.ports[0].postMessage({ type: 'TAX_PWA_STATUS', ready: await ready(), version: VERSION });
    } catch { event.ports[0].postMessage({ type: 'TAX_PWA_STATUS', ready: false, version: VERSION }); }
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const key = resource(event.request.url);
  if (!key || (event.request.mode === 'navigate' && !PAGES.has(key))) return;
  event.respondWith((async () => {
    try {
      const image = /\.(png|jpg|svg)$/.test(new URL(key).pathname);
      // The result HTML is a static template; its script reads the current
      // filters from location.search and reads the records on this device.
      const preferCache = image || key === INCOME_PAGE || INCOME_ASSET_URLS.has(event.request.url);
      if (preferCache) {
        try {
          const cached = await (await caches.open(CACHE)).match(key);
          if (cached) return cached;
        } catch {
          // Unavailable local storage must not prevent a normal network download.
        }
      }
      const response = await download(event.request.url, key);
      if (preferCache) {
        // Restore a missing entry only after validating the network response.
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)).catch(() => {}));
      }
      return response;
    }
    catch {
      const cached = await (await caches.open(CACHE)).match(key);
      return cached || Response.error();
    }
  })());
});
