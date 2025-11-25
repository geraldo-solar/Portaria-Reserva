import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Printer, FileText, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import ThermalReportPrinter from "@/components/ThermalReportPrinter";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cacheReportData, getCachedReportData, type CachedReportData } from "@/lib/offlineStorage";
import { WifiOff } from "lucide-react";

export default function Reports() {
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState<number | null>(null);
  const [cachedData, setCachedData] = useState<CachedReportData | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const { isOnline } = useOfflineSync();

  const cancelMutation = trpc.tickets.cancel.useMutation({
    onSuccess: () => {
      salesQuery.refetch();
      statsQuery.refetch();
      setCancelDialogOpen(false);
      setTicketToCancel(null);
    },
  });

  const handleCancelClick = (ticketId: number) => {
    setTicketToCancel(ticketId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (ticketToCancel) {
      cancelMutation.mutate({ ticketId: ticketToCancel, reason: "Cancelado via relatório" });
    }
  };

  const salesQuery = trpc.reports.sales.useQuery(
    {
      startDate: new Date(startDate + "T00:00:00"),
      endDate: new Date(endDate + "T23:59:59"),
    },
    {
      enabled: isOnline, // Só buscar quando online
    }
  );

  const statsQuery = trpc.reports.stats.useQuery(
    {
      startDate: new Date(startDate + "T00:00:00"),
      endDate: new Date(endDate + "T23:59:59"),
    },
    {
      enabled: isOnline, // Só buscar quando online
    }
  );

  // Carregar dados de relatório (online ou cache)
  useEffect(() => {
    async function loadReportData() {
      if (isOnline && salesQuery.data && statsQuery.data) {
        // Online: cachear dados
        await cacheReportData({
          sales: salesQuery.data,
          stats: statsQuery.data,
        });
        setCachedData(null);
        setUsingCache(false);
      } else if (!isOnline) {
        // Offline: usar cache
        const cached = await getCachedReportData();
        setCachedData(cached);
        setUsingCache(cached !== null);
      }
    }
    loadReportData();
  }, [isOnline, salesQuery.data, statsQuery.data]);

  // Determinar quais dados usar
  const sales = usingCache && cachedData ? cachedData.sales : (salesQuery.data || []);
  const stats = usingCache && cachedData ? cachedData.stats : statsQuery.data;

  const handleSearch = () => {
    if (isOnline) {
      salesQuery.refetch();
      statsQuery.refetch();
    }
    // Se offline, os dados em cache já estão sendo usados
  };

  const handleExport = () => {
    if (sales.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }

    const csv = [
      ["ID", "Pre\u00e7o", "M\u00e9todo Pagamento", "Status", "Data", "Hor\u00e1rio"],
      ...sales.map((ticket) => [
        ticket.id,
        `R$ ${ticket.price.toFixed(2)}`,
        ticket.paymentMethod === "dinheiro" ? "Dinheiro" : ticket.paymentMethod === "pix" ? "PIX" : "Cart\u00e3o",
        ticket.status === "active" ? "Ativo" : ticket.status === "cancelled" ? "Cancelado" : "Usado",
        new Date(ticket.createdAt).toLocaleDateString("pt-BR"),
        new Date(ticket.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-emerald-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Selecionar Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inicial
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Final
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={salesQuery.isPending && isOnline}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {salesQuery.isPending && isOnline ? "Gerando..." : usingCache ? "Exibir Cache" : "Gerar Relatório"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(sales.length > 0 || usingCache) && (
          <>
            {/* Indicador de cache */}
            {usingCache && (
              <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg flex items-center gap-3">
                <WifiOff className="text-orange-600" size={20} />
                <div>
                  <p className="font-semibold text-orange-900">Modo Offline</p>
                  <p className="text-sm text-orange-700">
                    Exibindo dados em cache. Conecte-se à internet para atualizar.
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-purple-900 text-sm">Total Vendido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats?.totalSales || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-900 text-sm">Receita</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    R$ {(stats?.totalRevenue || 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-900 text-sm">Cancelados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">
                    {stats?.totalCancelled || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Resumo por Método de Pagamento */}
            <Card className="mb-8 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader>
                <CardTitle className="text-emerald-900">Resumo por Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">💵 Dinheiro</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      R$ {(
                        sales
                          .filter((t) => t.paymentMethod === "dinheiro" && t.status === "active")
                          .reduce((sum, t) => sum + t.price, 0) || 0
                      ).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {sales.filter((t) => t.paymentMethod === "dinheiro" && t.status === "active").length || 0} vendas
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">📱 PIX</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      R$ {(
                        sales
                          .filter((t) => t.paymentMethod === "pix" && t.status === "active")
                          .reduce((sum, t) => sum + t.price, 0) || 0
                      ).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {sales.filter((t) => t.paymentMethod === "pix" && t.status === "active").length || 0} vendas
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">💳 Cartão</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      R$ {(
                        sales
                          .filter((t) => t.paymentMethod === "cartao" && t.status === "active")
                          .reduce((sum, t) => sum + t.price, 0) || 0
                      ).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {sales.filter((t) => t.paymentMethod === "cartao" && t.status === "active").length || 0} vendas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalhes */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Detalhes das Vendas</CardTitle>
                <Button
                  onClick={() => setPrintDialogOpen(true)}
                  disabled={sales.length === 0 || !stats}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Printer size={16} />
                  Imprimir Relatório
                </Button>
              </CardHeader>
              <CardContent>
                {salesQuery.isPending && isOnline ? (
                  <p className="text-gray-500">Carregando...</p>
                ) : sales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">ID</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Produto</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Preço</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Pagamento</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Data</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Horário</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((ticket) => (
                          <tr key={ticket.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900">#{ticket.id}</td>
                            <td className="px-4 py-2 text-gray-700">
                              {ticket.ticketTypeName || "N/A"}
                            </td>
                            <td className="px-4 py-2 text-gray-900 font-semibold">
                              R$ {ticket.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-gray-700 capitalize">
                              {ticket.paymentMethod || "N/A"}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  ticket.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : ticket.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {ticket.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {new Date(ticket.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {ticket.status === "active" && (
                                <Button
                                  onClick={() => handleCancelClick(ticket.id)}
                                  disabled={cancelMutation.isPending}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle size={16} />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum ingresso encontrado neste período</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Modal de Impressão */}
      {statsQuery.data && (
        <ThermalReportPrinter
          open={printDialogOpen}
          onClose={() => setPrintDialogOpen(false)}
          reportData={{
            startDate: startDate,
            endDate: endDate,
            totalSales: statsQuery.data.totalSales,
            totalRevenue: statsQuery.data.totalRevenue,
            activeTickets: statsQuery.data.totalActive,
            cancelledTickets: statsQuery.data.totalCancelled,
            paymentMethods: statsQuery.data.paymentMethods,
          }}
        />
      )}

      {/* Modal de Confirmação de Cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Ingresso</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente cancelar o ingresso #{ticketToCancel}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
