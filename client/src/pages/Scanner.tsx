import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Scanner() {
    const [, setLocation] = useLocation();
    const [scanResult, setScanResult] = useState<{
        status: "valid" | "expired" | "invalid" | "used";
        message: string;
        customer?: string;
        ticket?: any;
    } | null>(null);
    const [scanning, setScanning] = useState(true);

    const validateMutation = trpc.access.validate.useMutation();
    const checkInMutation = trpc.access.checkIn.useMutation();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Inicializar scanner apenas se estiver no modo de escaneamento
        if (scanning && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
            );

            scanner.render(
                async (decodedText) => {
                    // Pausar scanner ao detectar
                    scanner.clear();
                    scannerRef.current = null;
                    setScanning(false);

                    try {
                        const result = await validateMutation.mutateAsync({ token: decodedText });
                        setScanResult({
                            status: result.status,
                            message: result.message,
                            customer: result.ticket?.customerName || (result as any).customer,
                            ticket: result.ticket,
                            ...result
                        } as any);
                    } catch (error) {
                        setScanResult({
                            status: "invalid",
                            message: "Erro ao validar QR Code",
                        });
                    }
                },
                (errorMessage) => {
                    // Ignorar erros de leitura frame a frame
                }
            );

            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [scanning, validateMutation]);

    const handleReset = () => {
        setScanResult(null);
        setScanning(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                    <ArrowLeft size={20} />
                </Button>
                <h1 className="text-lg font-bold">Validador de Acesso</h1>
            </div>

            <div className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col items-center justify-center">
                {scanning ? (
                    <Card className="w-full">
                        <CardContent className="p-4">
                            <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
                            <p className="text-center text-sm text-gray-500 mt-4">
                                Aponte a câmera para o QR Code do ingresso
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className={`w-full border-2 ${scanResult?.status === 'valid' ? 'border-green-500 bg-green-50' :
                        scanResult?.status === 'expired' ? 'border-yellow-500 bg-yellow-50' :
                            scanResult?.status === 'used' ? 'border-orange-500 bg-orange-50' :
                                'border-red-500 bg-red-50'
                        }`}>
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                            {validateMutation.isPending ? (
                                <Loader2 className="animate-spin text-gray-500" size={48} />
                            ) : (
                                <>
                                    {scanResult?.status === 'valid' && (
                                        <CheckCircle className="text-green-600" size={64} />
                                    )}
                                    {scanResult?.status === 'expired' && (
                                        <AlertCircle className="text-yellow-600" size={64} />
                                    )}
                                    {scanResult?.status === 'used' && (
                                        <AlertCircle className="text-orange-600" size={64} />
                                    )}
                                    {scanResult?.status === 'invalid' && (
                                        <XCircle className="text-red-600" size={64} />
                                    )}

                                    <div>
                                        <h2 className="text-2xl font-bold uppercase mb-2">
                                            {scanResult?.status === 'valid' ? 'LIBERADO' :
                                                scanResult?.status === 'used' ? 'JÁ UTILIZADO' :
                                                    scanResult?.status === 'expired' ? 'EXPIRADO' : 'INVÁLIDO'}
                                        </h2>
                                        <p className="text-lg font-medium">
                                            {scanResult?.message}
                                        </p>
                                    </div>

                                    {scanResult?.customer && (
                                        <div className="bg-white/50 p-4 rounded-lg w-full">
                                            <p className="text-sm opacity-75">Cliente</p>
                                            <p className="text-xl font-bold">{scanResult.customer}</p>

                                            {(scanResult as any).usedAt && (
                                                <div className="mt-2 text-orange-800 bg-orange-100 p-2 rounded">
                                                    <p className="text-xs font-bold">Utilizado em:</p>
                                                    <p className="text-sm">
                                                        {new Date((scanResult as any).usedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            )}

                                            {scanResult.ticket && (
                                                <>
                                                    <p className="text-sm opacity-75 mt-2">Tipo</p>
                                                    <p className="font-semibold">{scanResult.ticket.type}</p>
                                                    <p className="text-sm opacity-75 mt-2">Válido até</p>
                                                    <p className="text-sm">
                                                        {new Date(scanResult.ticket.validUntil).toLocaleString()}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {scanResult?.status === 'valid' && (
                                        <Button
                                            size="lg"
                                            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold h-16 text-xl animate-pulse"
                                            onClick={async () => {
                                                if (scanResult.ticket?.id) {
                                                    try {
                                                        await checkInMutation.mutateAsync({ ticketId: scanResult.ticket.id });
                                                        setScanResult({
                                                            status: 'used',
                                                            message: 'Check-in realizado com sucesso!',
                                                            customer: scanResult.customer,
                                                            ticket: scanResult.ticket,
                                                            usedAt: new Date() // Feedback imediato
                                                        } as any);
                                                    } catch (e) {
                                                        alert("Erro ao realizar check-in");
                                                    }
                                                }
                                            }}
                                        >
                                            CONFIRMAR ENTRADA
                                        </Button>
                                    )}

                                    <Button size="lg" variant="outline" onClick={handleReset} className="w-full mt-4">
                                        Ler Próximo
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

import { AlertCircle } from "lucide-react";
