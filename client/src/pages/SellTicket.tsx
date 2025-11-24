import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ThermalTicketPrinter } from "@/components/ThermalTicketPrinter";

interface SaleItem {
  id: string;
  ticketTypeId: string;
  paymentMethod: "dinheiro" | "pix" | "cartao";
}

export default function SellTicket() {
  const [, setLocation] = useLocation();
  const [saleItems, setSaleItems] = useState<SaleItem[]>([
    { id: "1", ticketTypeId: "", paymentMethod: "dinheiro" },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [ticketsToPrint, setTicketsToPrint] = useState<any[]>([]);
  const [currentPrintIndex, setCurrentPrintIndex] = useState(0);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const ticketTypesQuery = trpc.ticketTypes.list.useQuery();
  const createTicketMutation = trpc.tickets.create.useMutation();

  const handleAddItem = () => {
    setSaleItems([
      ...saleItems,
      { id: Date.now().toString(), ticketTypeId: "", paymentMethod: "dinheiro" },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: string, value: string) => {
    setSaleItems(
      saleItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handlePrintTicket = (ticket: any) => {
    const printWindow = window.open("", "", "width=400,height=600");
    if (!printWindow) return;

    const ticketType = ticketTypesQuery.data?.find(
      (t) => t.id === ticket.ticketTypeId
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Ingresso</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              padding: 3mm;
              background: white;
            }
            
            .ticket {
              text-align: center;
              border: 2px solid #000;
              padding: 5mm;
              min-height: 100mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            
            .header {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 3mm;
              text-transform: uppercase;
            }
            
            .title {
              font-size: 14px;
              font-weight: bold;
              margin: 2mm 0;
              text-transform: uppercase;
            }
            
            .info {
              font-size: 9px;
              margin: 1.5mm 0;
              text-align: center;
              word-wrap: break-word;
            }
            
            .footer {
              font-size: 8px;
              margin-top: 3mm;
              border-top: 1px dashed #000;
              padding-top: 3mm;
            }
            
            .ticket-id {
              font-size: 9px;
              font-weight: bold;
              margin: 2mm 0;
              word-break: break-all;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .ticket {
                border: none;
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div>
              <div class="header">🎫 INGRESSO</div>
              <div class="title">RESERVA SOLAR</div>
              
              <div class="info">
                <strong>ID:</strong> #${ticket.id}
              </div>
              
              <div class="info">
                <strong>Tipo:</strong> ${ticketType?.name || "Padrão"}
              </div>
              
              <div class="info">
                <strong>Preço:</strong> R$ ${ticketType?.price.toFixed(2) || "0.00"}
              </div>
              
              <div class="info">
                <strong>Data:</strong> ${new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
              </div>

            </div>
            
            <div class="footer">
              <div style="font-size: 7px; margin-bottom: 2mm;">
                Válido por 1 dia a partir da emissão
              </div>
              <div style="font-size: 7px;">
                Apresente este ingresso na entrada
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validar todos os itens
    for (const item of saleItems) {
      if (!item.ticketTypeId || !item.paymentMethod) {
        setError("Preencha todos os campos obrigatórios");
        return;
      }
    }

    try {
      let successCount = 0;
      const tickets: any[] = [];

      for (const item of saleItems) {
        const ticket = await createTicketMutation.mutateAsync({
          customerName: `Cliente ${Date.now()}`,
          ticketTypeId: parseInt(item.ticketTypeId),
          paymentMethod: item.paymentMethod,
        });

        tickets.push(ticket);
        successCount++;
      }

      setSuccessMessage(`${successCount} ingresso(s) vendido(s) com sucesso!`);
      setSuccess(true);
      setSaleItems([{ id: "1", ticketTypeId: "", paymentMethod: "dinheiro" }]);

      // Iniciar processo de impressão
      setTicketsToPrint(tickets);
      setCurrentPrintIndex(0);
      setShowPrintModal(true);

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao vender ingressos");
    }
  };

  return (
    <>
      {/* Header com botão voltar */}
      <div className="bg-white border-b border-emerald-200 shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft size={16} />
            Voltar
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Venda */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Venda de Ingressos</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Items de venda */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {saleItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 border border-emerald-200 rounded-lg bg-emerald-50"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-emerald-800">
                            Ingresso #{index + 1}
                          </h3>
                          {saleItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-emerald-800 mb-1">
                              Tipo de Ingresso *
                            </label>
                            <Select
                              value={item.ticketTypeId}
                              onValueChange={(value) =>
                                handleItemChange(item.id, "ticketTypeId", value)
                              }
                            >
                              <SelectTrigger className="border-emerald-300">
                                <SelectValue placeholder="Selecione um tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {ticketTypesQuery.data?.map((type) => (
                                  <SelectItem
                                    key={type.id}
                                    value={type.id.toString()}
                                  >
                                    {type.name} - R$ {type.price.toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-emerald-800 mb-1">
                              Método de Pagamento *
                            </label>
                            <Select
                              value={item.paymentMethod}
                              onValueChange={(value) =>
                                handleItemChange(item.id, "paymentMethod", value)
                              }
                            >
                              <SelectTrigger className="border-emerald-300">
                                <SelectValue placeholder="Selecione o método" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dinheiro">
                                  💵 Dinheiro
                                </SelectItem>
                                <SelectItem value="pix">💳 PIX</SelectItem>
                                <SelectItem value="cartao">
                                  🏧 Cartão
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botão adicionar */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={handleAddItem}
                  >
                    <Plus size={16} className="mr-2" />
                    Adicionar Ingresso
                  </Button>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      <CheckCircle size={16} />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={createTicketMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {createTicketMutation.isPending
                      ? "Processando..."
                      : "Vender e Imprimir"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Resumo */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumo da Venda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="text-gray-600">Quantidade de ingressos:</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {saleItems.length}
                    </p>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-sm text-gray-600 mb-2">
                      Métodos de pagamento:
                    </p>
                    <div className="space-y-1 text-sm">
                      {saleItems.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-gray-600">
                            {item.paymentMethod === "dinheiro" && "💵"}
                            {item.paymentMethod === "pix" && "💳"}
                            {item.paymentMethod === "cartao" && "🏧"}
                            {item.paymentMethod || "—"}
                          </span>
                          <span className="font-medium">
                            {ticketTypesQuery.data?.find(
                              (t) => t.id === parseInt(item.ticketTypeId)
                            )?.name || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-emerald-200 pt-3">
                    <p className="text-sm text-gray-600">Valor total:</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      R${" "}
                      {saleItems
                        .reduce((total, item) => {
                          const ticketType = ticketTypesQuery.data?.find(
                            (t) => t.id === parseInt(item.ticketTypeId)
                          );
                          return total + (ticketType?.price || 0);
                        }, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de impressão */}
      {showPrintModal && ticketsToPrint.length > 0 && (
        <ThermalTicketPrinter
          open={showPrintModal}
          onClose={() => {
            // Próximo ticket ou fechar
            if (currentPrintIndex < ticketsToPrint.length - 1) {
              setCurrentPrintIndex(currentPrintIndex + 1);
            } else {
              setShowPrintModal(false);
              setTicketsToPrint([]);
              setCurrentPrintIndex(0);
            }
          }}
          ticket={{
            id: ticketsToPrint[currentPrintIndex].id,
            customerName: ticketsToPrint[currentPrintIndex].customerName,
            ticketType:
              ticketTypesQuery.data?.find(
                (t) => t.id === ticketsToPrint[currentPrintIndex].ticketTypeId
              )?.name || "Padrão",
            price: ticketsToPrint[currentPrintIndex].price / 100,
            createdAt: new Date(ticketsToPrint[currentPrintIndex].createdAt),
          }}
        />
      )}
    </>
  );
}
