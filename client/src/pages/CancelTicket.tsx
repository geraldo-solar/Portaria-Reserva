import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function CancelTicket() {
  const [ticketId, setTicketId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<any>(null);

  const getTicketQuery = trpc.tickets.getById.useQuery(
    ticketId ? parseInt(ticketId) : (null as any),
    { enabled: !!ticketId }
  );
  const cancelMutation = trpc.tickets.cancel.useMutation();

  const handleSearch = () => {
    if (ticketId) {
      getTicketQuery.refetch();
    }
  };

  const handleCancel = async () => {
    setError("");
    setSuccess(false);

    if (!ticketId || !reason) {
      setError("Preencha todos os campos");
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        ticketId: parseInt(ticketId),
        reason,
      });
      setSuccess(true);
      setTicketId("");
      setReason("");
      setTicketInfo(null);
    } catch (err: any) {
      setError(err.message || "Erro ao cancelar ingresso");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Busca */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cancelar Ingresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID do Ingresso
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Digite o ID do ingresso"
                    value={ticketId}
                    onChange={(e) => {
                      setTicketId(e.target.value);
                      setTicketInfo(null);
                      setError("");
                    }}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={!ticketId || getTicketQuery.isPending}
                    variant="outline"
                  >
                    Buscar
                  </Button>
                </div>
              </div>

              {getTicketQuery.data && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Ingresso Encontrado</h3>
                  <div className="text-sm space-y-1 text-blue-800">
                    <p><strong>ID:</strong> {getTicketQuery.data.id}</p>
                    <p><strong>Status:</strong> {getTicketQuery.data.status}</p>
                    <p><strong>Preço:</strong> R$ {getTicketQuery.data.price.toFixed(2)}</p>
                    <p><strong>Data:</strong> {new Date(getTicketQuery.data.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {getTicketQuery.data && getTicketQuery.data.status === "active" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo do Cancelamento *
                    </label>
                    <textarea
                      placeholder="Explique o motivo do cancelamento"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleCancel}
                    disabled={!reason || cancelMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
                  </Button>
                </>
              )}

              {getTicketQuery.data && getTicketQuery.data.status !== "active" && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                  <AlertCircle size={16} />
                  <span>Este ingresso não pode ser cancelado (Status: {getTicketQuery.data.status})</span>
                </div>
              )}

              {getTicketQuery.isError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <XCircle size={16} />
                  <span>Ingresso não encontrado</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status */}
        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={24} />
                <CardTitle className="text-green-700">Cancelado!</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700">
                O ingresso foi cancelado com sucesso e não poderá mais ser utilizado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
