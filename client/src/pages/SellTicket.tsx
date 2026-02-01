import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, ArrowLeft, Plus, Minus, Ticket, WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { saveOfflineSale, cacheTicketTypes, getCachedTicketTypes, type CachedTicketType } from "@/lib/offlineStorage";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import QRCode from "react-qr-code";
import { Share2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CartItem {
  ticketTypeId: number;
  ticketTypeName: string;
  price: number;
  quantity: number;
}

export default function SellTicket() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"dinheiro" | "pix" | "cartao">("dinheiro");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [soldTickets, setSoldTickets] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cachedTicketTypes, setCachedTicketTypes] = useState<CachedTicketType[]>([]);
  const [usingCache, setUsingCache] = useState(false);

  const { isOnline, updatePendingCount } = useOfflineSync();
  const ticketTypesQuery = trpc.ticketTypes.list.useQuery(undefined, {
    enabled: isOnline, // Só buscar quando online
  });
  const createTicketMutation = trpc.tickets.create.useMutation();

  // Carregar tipos de ingressos (online ou cache)
  useEffect(() => {
    async function loadTicketTypes() {
      if (isOnline && ticketTypesQuery.data) {
        // Online: cachear dados e usar do servidor
        await cacheTicketTypes(ticketTypesQuery.data.map(t => ({
          id: t.id,
          name: t.name,
          price: t.price,
          description: t.description,
          active: true,
        })));
        setCachedTicketTypes([]);
        setUsingCache(false);
      } else if (!isOnline) {
        // Offline: usar cache
        const cached = await getCachedTicketTypes();
        setCachedTicketTypes(cached);
        setUsingCache(cached.length > 0);
      }
    }
    loadTicketTypes();
  }, [isOnline, ticketTypesQuery.data]);

  // Determinar qual lista usar
  const ticketTypes = usingCache ? cachedTicketTypes : (ticketTypesQuery.data || []);

  const handleSelectTicketType = (ticketTypeId: number) => {
    const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);
    if (!ticketType) return;

    const existingItem = cart.find((item) => item.ticketTypeId === ticketTypeId);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.ticketTypeId === ticketTypeId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          price: ticketType.price,
          quantity: 1,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (ticketTypeId: number, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.ticketTypeId === ticketTypeId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (ticketTypeId: number) => {
    setCart(cart.filter((item) => item.ticketTypeId !== ticketTypeId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalQuantity = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (cart.length === 0) {
      setError("Adicione pelo menos um ingresso ao carrinho");
      return;
    }

    try {
      const tickets: any[] = [];

      // Se estiver offline, salvar localmente
      if (!isOnline) {
        console.log('[OFFLINE] Salvando venda offline...', { cart, paymentMethod });

        try {
          const saleId = await saveOfflineSale({
            timestamp: Date.now(),
            items: cart.map(item => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              paymentMethod: paymentMethod,
            })),
            paymentMethod: paymentMethod,
            synced: false,
            syncAttempts: 0,
          });

          console.log('[OFFLINE] Venda salva com ID:', saleId);

          // Criar tickets simulados para impressão offline
          for (const item of cart) {
            for (let i = 0; i < item.quantity; i++) {
              tickets.push({
                id: Math.floor(Math.random() * 900000) + 100000, // ID temporário
                ticketTypeId: item.ticketTypeId,
                ticketTypeName: item.ticketTypeName,
                price: item.price,
                paymentMethod: paymentMethod,
                status: 'active',
                createdAt: new Date(),
              });
            }
          }

          console.log('[OFFLINE] Tickets criados:', tickets.length);
          await updatePendingCount();
          console.log('[OFFLINE] Contador de pendências atualizado');

          setSuccessMessage(`✅ ${tickets.length} ingresso(s) salvo(s) offline! Serão sincronizados quando a conexão voltar.`);
        } catch (offlineError) {
          console.error('[OFFLINE] Erro ao salvar venda offline:', offlineError);
          throw new Error(`Erro ao salvar offline: ${offlineError instanceof Error ? offlineError.message : 'Erro desconhecido'}`);
        }
      } else {
        // Se estiver online, enviar para o servidor
        for (const item of cart) {
          for (let i = 0; i < item.quantity; i++) {
            const ticket = await createTicketMutation.mutateAsync({
              customerName: `Cliente ${Date.now()}`,
              ticketTypeId: item.ticketTypeId,
              paymentMethod: paymentMethod,
            });
            tickets.push(ticket);
          }
        }

        setSuccessMessage(`${tickets.length} ingresso(s) vendido(s) com sucesso!`);
      }

      setSuccess(true);
      setCart([]);
      setPaymentMethod("dinheiro");

      // Iniciar processo de impressão
      setSuccess(true);
      setCart([]);
      setPaymentMethod("dinheiro");

      // Mostrar modal de sucesso/compartilhamento
      setSoldTickets(tickets);
      setShowSuccessModal(true);
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
          {/* Seleção de Produtos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Selecione os Ingressos</span>
                  {usingCache && (
                    <span className="text-xs font-normal text-orange-600 flex items-center gap-1">
                      <WifiOff size={14} />
                      Dados em cache
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketTypesQuery.isPending && isOnline ? (
                  <div className="text-center py-8 text-gray-500">
                    Carregando tipos de ingressos...
                  </div>
                ) : ticketTypes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ticketTypes.map((ticketType) => (
                      <button
                        key={ticketType.id}
                        onClick={() => handleSelectTicketType(ticketType.id)}
                        className="p-6 border-2 border-emerald-300 rounded-lg bg-gradient-to-br from-emerald-50 to-white hover:from-emerald-100 hover:to-emerald-50 hover:border-emerald-500 transition-all duration-200 text-left group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-600 rounded-lg group-hover:bg-emerald-700 transition-colors">
                              <Ticket className="text-white" size={24} />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-emerald-900">
                                {ticketType.name}
                              </h3>
                              <p className="text-2xl font-bold text-emerald-700">
                                R$ {ticketType.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-emerald-600 font-medium">
                          Clique para adicionar ao carrinho
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !isOnline ? (
                  <div className="text-center py-12 text-orange-600 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <WifiOff className="mx-auto mb-3" size={48} />
                    <p className="font-semibold text-lg mb-2">⚠️ Modo Offline</p>
                    <p className="text-sm">
                      Nenhum dado em cache. Conecte-se à internet pelo menos uma vez para carregar os tipos de ingressos.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum tipo de ingresso cadastrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Carrinho e Resumo */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Carrinho</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Carrinho vazio
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {cart.map((item) => (
                          <div
                            key={item.ticketTypeId}
                            className="p-4 border border-emerald-200 rounded-lg bg-emerald-50"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-emerald-900">
                                    {item.ticketTypeName}
                                  </h4>
                                  <p className="text-sm text-emerald-700">
                                    R$ {item.price.toFixed(2)} cada
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(item.ticketTypeId)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Remover
                                </button>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-emerald-800 mb-2">
                                  Quantidade
                                </label>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateQuantity(item.ticketTypeId, -1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus size={16} />
                                  </Button>
                                  <span className="text-lg font-bold text-emerald-900 min-w-[3ch] text-center">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateQuantity(item.ticketTypeId, 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus size={16} />
                                  </Button>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-emerald-200">
                                <div className="flex justify-between text-sm font-semibold text-emerald-900">
                                  <span>Subtotal:</span>
                                  <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between text-sm text-emerald-800">
                          <span>Total de Ingressos:</span>
                          <span className="font-semibold">{getTotalQuantity()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-emerald-900">
                          <span>Total a Pagar:</span>
                          <span>R$ {getTotalAmount().toFixed(2)}</span>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-emerald-800 mb-2">
                            Forma de Pagamento
                          </label>
                          <Select
                            value={paymentMethod}
                            onValueChange={(value: any) => setPaymentMethod(value)}
                          >
                            <SelectTrigger className="border-emerald-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                              <SelectItem value="pix">📱 PIX</SelectItem>
                              <SelectItem value="cartao">💳 Cartão</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={createTicketMutation.isPending}
                      >
                        {createTicketMutation.isPending
                          ? "Processando..."
                          : "Finalizar Venda"}
                      </Button>
                    </>
                  )}

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
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de impressão */}
      {/* Modal de Sucesso e Compartilhamento */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Venda Realizada! 🎉</span>
              <Button variant="ghost" size="sm" onClick={() => setShowSuccessModal(false)}>
                <X size={16} />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-center mb-4">
            <p className="font-bold text-lg">Entregar ao cliente</p>
            <p className="text-sm">Peça para o cliente ler o QR Code ou envie no WhatsApp.</p>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-1">
              {soldTickets.map((ticket, index) => (
                <div key={ticket.id || index} className="border rounded-xl p-4 bg-white shadow-sm flex flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="font-bold text-lg">{ticket.ticketTypeName || "Ingresso"}</p>
                    <p className="text-xs text-gray-500 font-mono">#{ticket.id}</p>
                  </div>

                  {ticket.qrToken && (
                    <div className="bg-white p-2 border rounded-lg">
                      <QRCode value={window.location.origin + "/ticket/" + ticket.qrToken} size={150} />
                    </div>
                  )}

                  <div className="w-full">
                    <Button
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                      onClick={() => {
                        const link = `${window.location.origin}/ticket/${ticket.qrToken}`;
                        const text = `Olá! Aqui está o seu ingresso digital para o Reserva Solar: ${link}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                    >
                      <Share2 className="mr-2" size={18} />
                      Enviar no WhatsApp
                    </Button>
                    <p className="text-center text-[10px] text-gray-400 mt-2">
                      Válido até: {ticket.validUntil ? new Date(ticket.validUntil).toLocaleString('pt-BR') :
                        new Date(new Date().getTime() + 12 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4">
            <Button variant="outline" className="w-full" onClick={() => setShowSuccessModal(false)}>
              Fechar e Nova Venda
            </Button>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
