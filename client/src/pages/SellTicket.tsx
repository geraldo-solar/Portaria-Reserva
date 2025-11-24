import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Printer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ThermalTicketPrinter } from "@/components/ThermalTicketPrinter";

export default function SellTicket() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    ticketTypeId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [lastTicket, setLastTicket] = useState<any>(null);
  const [shouldPrint, setShouldPrint] = useState(false);

  const ticketTypesQuery = trpc.ticketTypes.list.useQuery();
  const createTicketMutation = trpc.tickets.create.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.customerName || !formData.ticketTypeId) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const ticket = await createTicketMutation.mutateAsync({
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || undefined,
        customerPhone: formData.customerPhone || undefined,
        ticketTypeId: parseInt(formData.ticketTypeId),
      });

      setLastTicket(ticket);
      setSuccess(true);
      setFormData({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        ticketTypeId: "",
      });

      // Marcar para impressão
      setShouldPrint(true);
    } catch (err: any) {
      setError(err.message || "Erro ao vender ingresso");
    }
  };

  const markPrintedMutation = trpc.tickets.markPrinted.useMutation();

  const handlePrint = async (ticketId: number) => {
    try {
      await markPrintedMutation.mutateAsync(ticketId);
      window.print();
    } catch (err) {
      console.error("Erro ao imprimir:", err);
    }
  };

  return (
    <>
      {shouldPrint && lastTicket && (
        <>
          <ThermalTicketPrinter ticket={lastTicket} />
          {/* Resetar após impressão */}
          {setTimeout(() => setShouldPrint(false), 2000)}
        </>
      )}
      <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Venda */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Vender Ingresso</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cliente *
                  </label>
                  <Input
                    type="text"
                    name="customerName"
                    placeholder="Digite o nome completo"
                    value={formData.customerName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="customerEmail"
                    placeholder="email@example.com"
                    value={formData.customerEmail}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    type="tel"
                    name="customerPhone"
                    placeholder="(11) 99999-9999"
                    value={formData.customerPhone}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Ingresso *
                  </label>
                  <Select value={formData.ticketTypeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, ticketTypeId: value }))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketTypesQuery.data?.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name} - R$ {type.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
                >
                  {createTicketMutation.isPending ? "Processando..." : "Vender Ingresso"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Último Ingresso Vendido */}
        {lastTicket && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={24} />
                <CardTitle className="text-green-700">Ingresso Vendido!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p><strong>Cliente:</strong> {lastTicket.customerName}</p>
                <p><strong>Tipo:</strong> {lastTicket.ticketType}</p>
                <p><strong>Preço:</strong> R$ {lastTicket.price.toFixed(2)}</p>
                <p><strong>QR Code:</strong> {lastTicket.qrCode.slice(0, 8)}...</p>
              </div>
              <Button
                onClick={() => handlePrint(lastTicket.id)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer size={16} className="mr-2" />
                Imprimir Ingresso
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  );
}
