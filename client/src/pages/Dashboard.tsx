import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<any>(null);

  const ticketsQuery = trpc.tickets.list.useQuery();
  const statsQuery = trpc.reports.stats.useQuery({});

  useEffect(() => {
    if (statsQuery.data) {
      setStats(statsQuery.data);
    }
  }, [statsQuery.data]);

  const handleRefresh = () => {
    ticketsQuery.refetch();
    statsQuery.refetch();
  };

  const activeTickets = ticketsQuery.data?.filter((t) => t.status === "active") || [];
  const cancelledTickets = ticketsQuery.data?.filter((t) => t.status === "cancelled") || [];
  const usedTickets = ticketsQuery.data?.filter((t) => t.status === "used") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={ticketsQuery.isPending || statsQuery.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900 text-sm">Total Vendido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {stats?.totalSales || 0}
              </p>
              <p className="text-xs text-purple-700 mt-2">ingressos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900 text-sm">Receita Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                R$ {(stats?.totalRevenue || 0).toFixed(2)}
              </p>
              <p className="text-xs text-green-700 mt-2">em vendas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 text-sm">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.totalActive || 0}
              </p>
              <p className="text-xs text-blue-700 mt-2">ingressos válidos</p>
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
              <p className="text-xs text-red-700 mt-2">ingressos</p>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>Ingressos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsQuery.isPending ? (
              <p className="text-gray-500">Carregando...</p>
            ) : ticketsQuery.data && ticketsQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">ID</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Cliente</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Preço</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketsQuery.data.slice(0, 10).map((ticket) => (
                      <tr key={ticket.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">#{ticket.id}</td>
                        <td className="px-4 py-2 text-gray-700">-</td>
                        <td className="px-4 py-2 text-gray-900 font-semibold">
                          R$ {ticket.price.toFixed(2)}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum ingresso registrado</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
