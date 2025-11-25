import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from './ui/button';

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncOfflineSales } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null; // Não mostrar nada quando está online e não há pendências
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg shadow-lg p-4 max-w-sm ${
        isOnline ? 'bg-blue-50 border-2 border-blue-200' : 'bg-red-50 border-2 border-red-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${isOnline ? 'text-blue-600' : 'text-red-600'}`}>
          {isOnline ? (
            <Cloud size={24} className="animate-pulse" />
          ) : (
            <CloudOff size={24} />
          )}
        </div>

        <div className="flex-1">
          <h3
            className={`font-semibold text-sm ${
              isOnline ? 'text-blue-900' : 'text-red-900'
            }`}
          >
            {isOnline ? 'Sincronizando...' : 'Modo Offline'}
          </h3>
          <p
            className={`text-xs mt-1 ${
              isOnline ? 'text-blue-700' : 'text-red-700'
            }`}
          >
            {isOnline ? (
              isSyncing ? (
                <>
                  Enviando {pendingCount} {pendingCount === 1 ? 'venda' : 'vendas'} para o
                  servidor...
                </>
              ) : (
                <>
                  {pendingCount} {pendingCount === 1 ? 'venda pendente' : 'vendas pendentes'}{' '}
                  de sincronização
                </>
              )
            ) : (
              <>
                Sem conexão. Vendas serão salvas localmente e sincronizadas quando a
                conexão voltar.
              </>
            )}
          </p>

          {isOnline && pendingCount > 0 && !isSyncing && (
            <Button
              size="sm"
              variant="outline"
              onClick={syncOfflineSales}
              className="mt-2 text-xs h-7 bg-blue-100 hover:bg-blue-200 border-blue-300"
            >
              <RefreshCw size={12} className="mr-1" />
              Sincronizar Agora
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
