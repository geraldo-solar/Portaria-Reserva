/**
 * Gerenciamento de armazenamento offline usando IndexedDB
 */

const DB_NAME = 'portaria_offline';
const DB_VERSION = 2;
const STORE_NAME = 'offline_sales';
const TICKET_TYPES_STORE = 'ticket_types';

export interface OfflineSale {
  id?: number;
  timestamp: number;
  items: Array<{
    ticketTypeId: number;
    quantity: number;
    paymentMethod: string;
  }>;
  paymentMethod: string;
  synced: boolean;
  syncAttempts: number;
  error?: string;
}

// Abrir conexão com IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Criar object store para vendas offline
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Criar object store para tipos de ingressos (cache)
      if (!db.objectStoreNames.contains(TICKET_TYPES_STORE)) {
        db.createObjectStore(TICKET_TYPES_STORE, {
          keyPath: 'id',
        });
      }
    };
  });
}

// Salvar venda offline
export async function saveOfflineSale(sale: Omit<OfflineSale, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(sale);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

// Obter todas as vendas não sincronizadas
export async function getUnsyncedSales(): Promise<OfflineSale[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const allSales = request.result as OfflineSale[];
      const unsyncedSales = allSales.filter(sale => !sale.synced);
      resolve(unsyncedSales);
    };
    request.onerror = () => reject(request.error);
  });
}

// Marcar venda como sincronizada
export async function markAsSynced(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const sale = getRequest.result;
      if (sale) {
        sale.synced = true;
        const updateRequest = store.put(sale);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Atualizar tentativa de sincronização com erro
export async function updateSyncAttempt(id: number, error?: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const sale = getRequest.result;
      if (sale) {
        sale.syncAttempts = (sale.syncAttempts || 0) + 1;
        if (error) {
          sale.error = error;
        }
        const updateRequest = store.put(sale);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Obter contagem de vendas pendentes
export async function getPendingSalesCount(): Promise<number> {
  const sales = await getUnsyncedSales();
  return sales.length;
}

// Limpar vendas antigas sincronizadas (mais de 7 dias)
export async function cleanOldSyncedSales(): Promise<void> {
  const db = await openDB();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const sale = cursor.value as OfflineSale;
        if (sale.synced && sale.timestamp < sevenDaysAgo) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}


// ===== CACHE DE TIPOS DE INGRESSOS =====

export interface CachedTicketType {
  id: number;
  name: string;
  price: number;
  description: string | null;
  active: boolean;
  cachedAt: number;
}

// Salvar tipos de ingressos no cache
export async function cacheTicketTypes(ticketTypes: Omit<CachedTicketType, 'cachedAt'>[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKET_TYPES_STORE], 'readwrite');
    const store = transaction.objectStore(TICKET_TYPES_STORE);

    // Limpar cache antigo
    store.clear();

    // Adicionar novos dados
    const cachedAt = Date.now();
    for (const ticketType of ticketTypes) {
      store.put({ ...ticketType, cachedAt });
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Obter tipos de ingressos do cache
export async function getCachedTicketTypes(): Promise<CachedTicketType[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TICKET_TYPES_STORE], 'readonly');
    const store = transaction.objectStore(TICKET_TYPES_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Verificar se cache de tipos de ingressos está atualizado (menos de 1 hora)
export async function isTicketTypesCacheValid(): Promise<boolean> {
  const cached = await getCachedTicketTypes();
  if (cached.length === 0) return false;

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return cached[0]?.cachedAt > oneHourAgo;
}


// ===== CACHE DE RELATÓRIOS =====

const REPORTS_CACHE_STORE = 'reports_cache';

export interface CachedReportData {
  stats: {
    totalRevenue: number;
    paymentMethods: {
      dinheiro: { count: number; total: number };
      pix: { count: number; total: number };
      cartao: { count: number; total: number };
    };
    totalSales: number;
    totalCancelled: number;
    totalUsed: number;
    totalActive: number;
  };
  sales: Array<{
    id: number;
    ticketTypeName: string | null;
    price: number;
    paymentMethod: string;
    status: string;
    createdAt: Date;
  }>;
  cachedAt: number;
}

// Salvar dados de relatório no cache
export async function cacheReportData(data: Omit<CachedReportData, 'cachedAt'>): Promise<void> {
  const db = await openDB();
  
  // Verificar se a store existe, senão criar
  if (!db.objectStoreNames.contains(REPORTS_CACHE_STORE)) {
    db.close();
    // Incrementar versão e recriar
    const newDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION + 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(REPORTS_CACHE_STORE)) {
          db.createObjectStore(REPORTS_CACHE_STORE);
        }
      };
    });
    
    return new Promise((resolve, reject) => {
      const transaction = newDb.transaction([REPORTS_CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(REPORTS_CACHE_STORE);
      const cachedData: CachedReportData = { ...data, cachedAt: Date.now() };
      const request = store.put(cachedData, 'latest');
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REPORTS_CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(REPORTS_CACHE_STORE);
    const cachedData: CachedReportData = { ...data, cachedAt: Date.now() };
    const request = store.put(cachedData, 'latest');
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Obter dados de relatório do cache
export async function getCachedReportData(): Promise<CachedReportData | null> {
  const db = await openDB();
  
  if (!db.objectStoreNames.contains(REPORTS_CACHE_STORE)) {
    return null;
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REPORTS_CACHE_STORE], 'readonly');
    const store = transaction.objectStore(REPORTS_CACHE_STORE);
    const request = store.get('latest');
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
