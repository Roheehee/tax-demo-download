'use strict';
const VERSION = 'v18-content-20261105';
const BASE = new URL('./', self.location.href);
const PREFIX = 'tax-demo-cloud-' + encodeURIComponent(BASE.pathname) + '-';
const CACHE = PREFIX + VERSION;
const FILES = [
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
  "flows.css",
  "flows.js",
  "home-refinement.css",
  "icons/app-192.png",
  "icons/app-512.png",
  "icons/app.svg",
  "icons/apple-touch-icon.png",
  "income-refinement.css",
  "income.css",
  "income.js",
  "index.html",
  "install.html",
  "manifest.webmanifest",
  "profile-refinement.css",
  "pwa.js",
  "tabs-refinement.css",
  "tabs.css",
  "tabs.js",
  "tax-demo-qr.js",
  "tax-document.js",
  "tax-records.css",
  "tax-records.js",
  "typography.css"
];
const URLS = FILES.map(file => new URL(file, BASE).href);
const ALLOWED = new Map(URLS.map(url => [new URL(url).pathname, url]));
ALLOWED.set(BASE.pathname, new URL('index.html', BASE).href);
ALLOWED.set(new URL('install', BASE).pathname, new URL('install.html', BASE).href);
const APP = new URL('index.html', BASE).href;
const INSTALL = new URL('install.html', BASE).href;
function resource(url) {
  const parsed = new URL(url);
  return parsed.origin === BASE.origin ? ALLOWED.get(parsed.pathname) : undefined;
}
async function valid(response, key) {
  if (!response || response.status !== 200 || response.redirected || !['basic', 'default'].includes(response.type) || resource(response.url) !== key) return false;
  const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const path = new URL(key).pathname;
  if (path.endsWith('.html')) {
    if (type !== 'text/html') return false;
    const marker = key === APP ? 'app' : 'install';
    return (await response.clone().text()).includes('<meta name="tax-demo-shell" content="' + marker + '">');
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
    let response;
    try { response = await fetch(url, options); }
    catch (error) {
      // Cloud hosting redirects only these two HTML files to their clean URLs.
      // Retry the known URL directly, still rejecting every redirect it returns.
      const requested = new URL(url);
      if ((key !== APP && key !== INSTALL) || requested.origin !== BASE.origin || requested.pathname !== new URL(key).pathname) throw error;
      const canonical = new URL(key === APP ? './' : 'install', BASE);
      canonical.search = requested.search;
      response = await fetch(canonical.href, options);
    }
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
  return (await Promise.all(URLS.map(url => cache.match(url)))).every(Boolean);
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
  if (source !== APP && source !== INSTALL) return;
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
  if (!key || (event.request.mode === 'navigate' && key !== APP && key !== INSTALL)) return;
  event.respondWith((async () => {
    try { return await download(event.request.url, key); }
    catch {
      const cached = await (await caches.open(CACHE)).match(key);
      return cached || Response.error();
    }
  })());
});
