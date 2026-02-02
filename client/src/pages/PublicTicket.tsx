import { useRoute } from "wouter";
import QRCode from "react-qr-code";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, User, Ticket as TicketIcon, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo-white.png";

export default function PublicTicket() {
    const [match, params] = useRoute("/ticket/:token");
    const token = params?.token;

    if (!match || !token) {
        return <div className="p-8 text-center">Token inválido</div>;
    }

    const { data: ticket, isLoading, error } = trpc.access.info.useQuery({ token });
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200 bg-red-50">
                    <CardContent className="p-8 text-center text-red-800">
                        <AlertCircle className="mx-auto mb-4" size={48} />
                        <h1 className="text-xl font-bold mb-2">Ingresso Não Encontrado</h1>
                        <p>O link acessado é inválido ou o ingresso não existe.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isExpired = ticket.validUntil && new Date(ticket.validUntil) < now;
    const isCancelled = ticket.status === 'cancelled';
    const isValid = !isExpired && !isCancelled;

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
            <Card className={`w-full max-w-sm shadow-xl overflow-hidden bg-white ${isValid ? 'ring-2 ring-emerald-500' : 'ring-2 ring-red-500'
                }`}>
                <div className={`h-2 w-full ${isValid ? 'bg-emerald-500' : 'bg-red-500'}`} />

                <CardHeader className="text-center pb-8 pt-10 bg-emerald-950 border-b border-emerald-900">
                    <div className="mx-auto mb-6">
                        <img src={logo} alt="Reserva Solar" className="h-20 mx-auto object-contain brightness-0 invert opacity-90" />
                    </div>
                    <CardTitle className="uppercase tracking-[0.3em] text-[10px] font-bold text-amber-500 shadow-black drop-shadow-sm">
                        Seu Ingresso Digital
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col items-center space-y-6 pt-4">

                    {/* Status Banner */}
                    {isValid ? (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-1 rounded-full text-sm font-bold uppercase">
                            <CheckCircle size={16} />
                            Válido para Entrada
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-700 bg-red-50 px-4 py-1 rounded-full text-sm font-bold uppercase">
                            <AlertCircle size={16} />
                            {isCancelled ? 'Cancelado' : 'Expirado'}
                        </div>
                    )}

                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100">
                        <QRCode value={token} size={200} />
                    </div>

                    {/* Customer Details */}
                    <div className="w-full space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                            <User className="text-gray-400" size={20} />
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Cliente</p>
                                <p className="font-bold text-gray-900">{ticket.customerName || "Visitante"}</p>
                                {(ticket.customerPhone || ticket.customerEmail) && (
                                    <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                                        {ticket.customerPhone && <p>📱 {ticket.customerPhone}</p>}
                                        {ticket.customerEmail && <p>📧 {ticket.customerEmail}</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <TicketIcon className="text-gray-400" size={20} />
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Tipo de Ingresso</p>
                                <p className="font-bold text-gray-900">{ticket.ticketTypeName}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Calendar className="text-gray-400" size={20} />
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Válido Até</p>
                                <p className={`font-bold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                                    {ticket.validUntil ? new Date(ticket.validUntil).toLocaleString('pt-BR', {
                                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                    }) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-xs text-gray-400 pb-2">
                        Apresente este código na entrada e para realizar pedidos.
                    </div>

                </CardContent>
            </Card>

            <div className="mt-8 text-center text-gray-400 text-xs">
                &copy; {new Date().getFullYear()} Reserva Solar
            </div>
        </div>
    );
}
