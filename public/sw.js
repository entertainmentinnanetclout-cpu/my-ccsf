// My CCSF service worker — institutional PWA shell and push notifications.

const CACHE_PREFIX = 'my-ccsf';
const CACHE_VERSION = 'phase7-2026-07-19-v4';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const OFFLINE_SHELL = '/index.html';

const PRECACHE_ASSETS = [
  '/',
  OFFLINE_SHELL,
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/app-icon-192.png',
  '/app-icon-512.png',
  '/maskable-icon-512.png',
  '/apple-touch-icon.png',
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isCacheableResponse(response) {
  return response && response.ok && response.type === 'basic';
}

async function putIfCacheable(cacheName, request, response) {
  if (!isCacheableResponse(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(PRECACHE_ASSETS.map(async (asset) => {
      const response = await fetch(asset, { cache: 'reload' });
      if (isCacheableResponse(response)) await cache.put(asset, response);
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && ![STATIC_CACHE, RUNTIME_CACHE].includes(name))
      .map((name) => caches.delete(name)));

    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

async function networkFirstNavigation(event) {
  const preload = await event.preloadResponse;
  if (preload) {
    await putIfCacheable(RUNTIME_CACHE, OFFLINE_SHELL, preload);
    return preload;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(event.request, { signal: controller.signal, cache: 'no-store' });
    await putIfCacheable(RUNTIME_CACHE, OFFLINE_SHELL, response);
    return response;
  } catch {
    return (await caches.match(OFFLINE_SHELL))
      || (await caches.match('/'))
      || new Response('My CCSF is temporarily offline. Reconnect and retry.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
  } finally {
    clearTimeout(timeout);
  }
}

async function staleWhileRevalidate(request, event) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await putIfCacheable(RUNTIME_CACHE, request, response);
      return response;
    });

  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }

  try {
    return await network;
  } catch {
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect fill="#f3f4f6" width="160" height="100"/><text x="80" y="54" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="12">Image unavailable offline</text></svg>',
        { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } },
      );
    }
    return new Response('Resource unavailable offline.', { status: 503 });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;
  if (url.pathname === '/sw.js') return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  const cacheableDestination = ['script', 'style', 'font', 'image', 'manifest'].includes(request.destination);
  if (cacheableDestination) event.respondWith(staleWhileRevalidate(request, event));
});

self.addEventListener('push', (event) => {
  let data = { title: 'My CCSF Alert', body: 'A new CCSF notification is available.', data: {} };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Keep the safe default payload.
  }

  const options = {
    body: data.body,
    icon: '/app-icon-192.png',
    badge: '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: 'view', title: 'Open My CCSF' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: data.tag || 'ccsf-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  let urlToOpen = '/';
  try {
    const requested = new URL(event.notification.data?.url || '/', self.location.origin);
    if (requested.origin === self.location.origin) urlToOpen = `${requested.pathname}${requested.search}${requested.hash}`;
  } catch {
    urlToOpen = '/';
  }

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        if ('navigate' in client) await client.navigate(urlToOpen);
        return client.focus();
      }
    }
    return self.clients.openWindow ? self.clients.openWindow(urlToOpen) : undefined;
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'CCSF_SW_VERSION', version: CACHE_VERSION });
    return;
  }

  if (event.data?.type === 'CLEAR_RUNTIME_CACHE') {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
});
