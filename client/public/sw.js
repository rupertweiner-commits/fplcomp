const CACHE_NAME = 'fpl-live-tracker-v1.0.0';
const STATIC_CACHE = 'fpl-static-v1.0.0';
const DYNAMIC_CACHE = 'fpl-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-144x144.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/offline.html'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticFile(request)) {
    // Static files - cache first strategy
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request)) {
    // API requests - network first strategy
    event.respondWith(networkFirst(request));
  } else {
    // Other requests - network first strategy
    event.respondWith(networkFirst(request));
  }
});

// Check if request is for a static file
function isStaticFile(request) {
  const url = new URL(request.url);
  return (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.startsWith('/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.svg'
  );
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Cache first strategy for static files
async function cacheFirst(request) {
  try {
    // Try to get from cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache the response for future use
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache first strategy failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Network first strategy for dynamic content
async function networkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed, trying cache...');
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache and it's a navigation request, return offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle background sync
async function doBackgroundSync() {
  try {
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients about sync
    clients.forEach((client) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        message: 'Background sync completed'
      });
    });
    
    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received');
  
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'New FPL update available!',
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/icon-72x72.svg',
        image: '/icons/icon-512x512.svg',
        vibrate: [200, 100, 200],
        data: {
          url: data.url || '/',
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'view',
            title: 'View',
            icon: '/icons/icon-144x144.svg'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        requireInteraction: true,
        tag: 'fpl-notification'
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'FPL Live Tracker', options)
      );
    } catch (error) {
      console.error('❌ Failed to parse push data:', error);
      
      // Fallback notification
      const options = {
        body: 'New FPL update available!',
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/icon-72x72.svg'
      };
      
      event.waitUntil(
        self.registration.showNotification('FPL Live Tracker', options)
      );
    }
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Get the notification data
  const notificationData = event.notification.data;
  
  event.waitUntil(
    // Get all clients
    self.clients.matchAll({ type: 'window' })
      .then((clients) => {
        // Check if there's already a window/tab open
        for (const client of clients) {
          if (client.url.includes(notificationData.url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window/tab is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(notificationData.url);
        }
      })
  );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('💬 Message received from main thread:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker error:', event.error);
});

// Unhandled rejection handling
self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker unhandled rejection:', event.reason);
});

console.log('🚀 FPL Live Tracker Service Worker loaded successfully');
