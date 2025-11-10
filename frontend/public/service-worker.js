/* eslint-disable no-restricted-globals */

// Версия кэша для управления обновлениями
const CACHE_VERSION = 'numerom-v1';
const CACHE_NAME = `numerom-cache-${CACHE_VERSION}`;

// Ресурсы для кэширования (офлайн режим)
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch((error) => {
        console.log('[ServiceWorker] Cache error:', error);
      })
  );
  // Активировать воркер немедленно
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Захватить контроль над всеми клиентами немедленно
  return self.clients.claim();
});

// Стратегия кэширования: Network First, падаем на Cache
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Обработка Push уведомлений
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);

  let notificationData = {
    title: 'NumerOM',
    body: 'Новое уведомление',
    icon: '/icon-192x192.svg',
    badge: '/icon-192x192.svg',
    tag: 'numerom-notification',
    requireInteraction: false,
    data: {
      url: '/'
    }
  };

  // Парсим данные уведомления
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: {
          url: data.url || data.click_action || '/',
          challengeDay: data.challengeDay,
          lessonId: data.lessonId
        }
      };
    } catch (e) {
      console.error('[ServiceWorker] Error parsing notification data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received.');

  event.notification.close();

  // Определяем URL для открытия
  let urlToOpen = event.notification.data?.url || '/';

  // Если есть данные о челлендже, формируем правильный URL
  if (event.notification.data?.lessonId) {
    urlToOpen = `/?lesson=${event.notification.data.lessonId}`;
    if (event.notification.data?.challengeDay) {
      urlToOpen += `&day=${event.notification.data.challengeDay}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Проверяем, есть ли уже открытое окно
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Если окна нет, открываем новое
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
