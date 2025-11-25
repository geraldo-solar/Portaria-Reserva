const CACHE_NAME = 'portaria-eventos-v1';
const RUNTIME_CACHE = 'portaria-runtime-v1';

// Arquivos essenciais para cache offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Instalar service worker e cachear arquivos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativar service worker e limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de outros domínios (exceto API)
  if (url.origin !== location.origin && !url.pathname.startsWith('/api')) {
    return;
  }

  // Para requisições de API: Network First (tentar rede primeiro)
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear resposta bem-sucedida
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Se falhar, tentar cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Retornar resposta offline genérica
            return new Response(
              JSON.stringify({ offline: true, error: 'Sem conexão' }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }
            );
          });
        })
    );
    return;
  }

  // Para assets estáticos: Cache First (tentar cache primeiro)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se não estiver no cache, buscar da rede e cachear
      return fetch(request).then((response) => {
        // Apenas cachear respostas bem-sucedidas
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Listener para sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-sales') {
    event.waitUntil(syncOfflineSales());
  }
});

// Função para sincronizar vendas offline
async function syncOfflineSales() {
  console.log('[SW] Syncing offline sales...');
  
  try {
    // Enviar mensagem para o cliente para iniciar sincronização
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA',
      });
    });
  } catch (error) {
    console.error('[SW] Error syncing offline sales:', error);
    throw error;
  }
}

// Listener para mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
