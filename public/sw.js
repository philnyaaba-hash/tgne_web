/* LandLedger — offline shell for the staff dashboard only.
   The public storefront is never cached or served offline: it stays live. */
const VERSION = 'landledger-next-v14';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';
const OFFLINE_PAGE = '/offline';
const DASHBOARD = '/dashboard';

const LEGACY_SCRIPTS = [
  'store', 'notifications', 'auth', 'core', 'finance-core', 'finance-app',
  'views-dashboard', 'views-land', 'views-sales', 'views-buyers',
  'views-accounting', 'views-finance', 'staff', 'operations', 'modals',
  'records', 'accounting', 'client-vault', 'complaints', 'events', 'command-palette'
];

const BASE_ASSETS = [
  DASHBOARD,
  OFFLINE_PAGE,
  '/manifest.json',
  '/assets/brand-logo.jpg',
  ...LEGACY_SCRIPTS.map((name) => '/legacy/' + name + '.js')
];

async function addAll(cache, urls) {
  await Promise.all(urls.map((url) => cache.add(url).catch(() => null)));
}

async function precacheBuildAssets(cache) {
  for (const page of [DASHBOARD, OFFLINE_PAGE]) {
    try {
      const response = await fetch(page, { cache: 'reload', credentials: 'same-origin' });
      if (!response.ok) continue;
      const html = await response.clone().text();
      await cache.put(page, response);
      const urls = new Set();
      const pattern = /(?:href|src)="(\/_next\/static\/[^"]+)"/g;
      let match = pattern.exec(html);
      while (match) {
        urls.add(match[1]);
        match = pattern.exec(html);
      }
      await addAll(cache, [...urls]);
    } catch (error) {
      // Keep whatever the browser already has.
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await addAll(cache, BASE_ASSETS);
      await precacheBuildAssets(cache);
    })
  );
  // No skipWaiting here: the new worker waits, the page offers a reload
  // (components/OfflineBanner.jsx posts 'skipWaiting' when the user accepts).
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function isDashboard(pathname) {
  return pathname === DASHBOARD || pathname.startsWith(DASHBOARD + '/');
}

function isPrivate(pathname) {
  return pathname.startsWith('/api/') || pathname.startsWith('/office/');
}

function isBuildAsset(pathname) {
  return pathname.startsWith('/_next/static/');
}

function isContentAsset(pathname) {
  return pathname.startsWith('/assets/') || pathname.startsWith('/legacy/');
}

async function offlineFallback() {
  const cache = await caches.open(SHELL_CACHE);
  return (await cache.match(OFFLINE_PAGE)) || Response.error();
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic' && isDashboard(new URL(request.url).pathname)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await caches.match(request));
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match(DASHBOARD);
      if (shell) return shell;
      return offlineFallback();
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return Response.error();
  }
}

// /legacy/ and /assets/ URLs are stable across deploys while their content
// changes, so serve the cached copy immediately and refresh SHELL_CACHE in the
// background — the next load picks up the new file.
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok && response.type === 'basic') {
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const fresh = await refresh;
  return fresh || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;
  if (request.method !== 'GET' || isPrivate(url.pathname)) return;

  if (request.mode === 'navigate') {
    // Only the dashboard and the offline notice are served from the shell.
    if (isDashboard(url.pathname) || url.pathname === OFFLINE_PAGE) {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  if (isDashboard(url.pathname) && request.headers.get('RSC') === '1') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isBuildAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (isContentAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
