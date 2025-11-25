/**
 * Gerenciamento de armazenamento offline usando IndexedDB
 */

const DB_NAME = 'portaria-eventos-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-sales';

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

      // Criar object store se não existir
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
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
