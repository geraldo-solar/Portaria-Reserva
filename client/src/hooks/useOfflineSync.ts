import { useEffect, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import {
  getUnsyncedSales,
  markAsSynced,
  updateSyncAttempt,
  getPendingSalesCount,
  cleanOldSyncedSales,
  type OfflineSale,
} from '@/lib/offlineStorage';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const utils = trpc.useUtils();

  // Atualizar contagem de vendas pendentes
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingSalesCount();
      setPendingCount(count);
    } catch (error) {
      console.error('[OfflineSync] Error updating pending count:', error);
    }
  }, []);

  // Sincronizar vendas offline com o backend
  const syncOfflineSales = useCallback(async () => {
    if (isSyncing || !isOnline) {
      return;
    }

    setIsSyncing(true);
    console.log('[OfflineSync] Starting sync...');

    try {
      const unsyncedSales = await getUnsyncedSales();
      console.log(`[OfflineSync] Found ${unsyncedSales.length} unsynced sales`);

      for (const sale of unsyncedSales) {
        try {
          // Tentar enviar cada item do carrinho como vendas separadas
          for (const item of sale.items) {
            // Criar quantidade de ingressos individuais
            for (let i = 0; i < item.quantity; i++) {
              await utils.client.tickets.create.mutate({
                customerName: 'Cliente (Venda Offline)',
                ticketTypeId: item.ticketTypeId,
                paymentMethod: sale.paymentMethod as 'dinheiro' | 'pix' | 'cartao',
              });
            }
          }

          // Marcar como sincronizado
          if (sale.id) {
            await markAsSynced(sale.id);
            console.log(`[OfflineSync] Sale ${sale.id} synced successfully`);
          }
        } catch (error) {
          console.error(`[OfflineSync] Error syncing sale ${sale.id}:`, error);
          if (sale.id) {
            await updateSyncAttempt(
              sale.id,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
      }

      // Invalidar queries para atualizar UI
      await utils.tickets.list.invalidate();
      await utils.reports.stats.invalidate();
      await utils.reports.sales.invalidate();

      // Atualizar contagem
      await updatePendingCount();

      // Limpar vendas antigas
      await cleanOldSyncedSales();

      console.log('[OfflineSync] Sync completed');
    } catch (error) {
      console.error('[OfflineSync] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, utils]);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Connection restored');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sincronizar automaticamente quando voltar online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      console.log('[OfflineSync] Auto-syncing after coming online');
      syncOfflineSales();
    }
  }, [isOnline, pendingCount, syncOfflineSales]);

  // Listener para mensagens do service worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
        console.log('[OfflineSync] Sync requested by service worker');
        syncOfflineSales();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [syncOfflineSales]);

  // Atualizar contagem inicial e periodicamente
  useEffect(() => {
    updatePendingCount();

    // Verificar a cada 30 segundos
    const interval = setInterval(updatePendingCount, 30000);

    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncOfflineSales,
    updatePendingCount,
  };
}
