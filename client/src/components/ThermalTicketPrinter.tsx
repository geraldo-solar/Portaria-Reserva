import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { useState, useEffect } from "react";

interface ThermalTicketPrinterProps {
  open: boolean;
  onClose: () => void;
  ticket: {
    id: number;
    customerName?: string;
    ticketType?: string;
    price: number;
    createdAt: Date;
    qrToken?: string;
  };
}

export function ThermalTicketPrinter({ open, onClose, ticket }: ThermalTicketPrinterProps) {
  const [printed, setPrinted] = useState(false);

  // Resetar estado quando modal abre
  useEffect(() => {
    if (open) {
      setPrinted(false);
    }
  }, [open, ticket.id]);

  const handlePrint = async () => {
    // Gerar QR Code se o token existir
    let qrImage = "";
    if (ticket.qrToken) {
      try {
        const QRCode = (await import("qrcode")).default;
        qrImage = await QRCode.toDataURL(ticket.qrToken, { width: 150, margin: 1 });
      } catch (e) {
        console.error("Erro ao gerar QR Code", e);
      }
    }

    const printWindow = window.open("", "", "width=400,height=600");
    if (!printWindow) return;

    // HTML para papel térmico 58mm
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Ingresso</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              width: 58mm;
              padding: 0;
              margin: 0;
              background: white;
            }
            
            .ticket {
              text-align: center;
              border: 2px solid #000;
              padding: 3mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            
            .logo {
              text-align: center;
              margin-bottom: 2mm;
            }
            
            .logo img {
              max-width: 35mm;
              height: auto;
            }
            
            .qrcode {
              text-align: center;
              margin: 2mm 0;
            }
            
            .qrcode img {
              width: 30mm;
              height: 30mm;
            }
            
            .header {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 2mm;
              text-transform: uppercase;
            }
            
            .title {
              font-size: 12px;
              font-weight: bold;
              margin: 1mm 0;
              text-transform: uppercase;
            }
            
            .info {
              font-size: 9px;
              margin: 1mm 0;
              text-align: center;
              word-wrap: break-word;
            }
            
            .info-label {
              font-weight: bold;
            }
            
            .footer {
              font-size: 7px;
              margin-top: 2mm;
              border-top: 1px dashed #000;
              padding-top: 2mm;
            }
            
            .ticket-id {
              font-size: 9px;
              font-weight: bold;
              margin: 1mm 0;
              word-break: break-all;
            }
            
            @media print {
              @page {
                size: 58mm auto;
                margin: 0;
              }
              
              body {
                margin: 0;
                padding: 0;
              }
              
              .ticket {
                border: none;
                padding: 2mm;
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div>
              <div class="logo">
                <img src="/logo-reserva-solar.png" alt="Reserva Solar" />
              </div>
              <div class="header">🎫 INGRESSO</div>
              <div class="title">RESERVA SOLAR</div>
              
              <div class="info">
                <span class="info-label">ID:</span> #${ticket.id}
              </div>
              
              <div class="info">
                <span class="info-label">Cliente:</span><br/>
                ${ticket.customerName || "N/A"}
              </div>
              
              <div class="info">
                <span class="info-label">Tipo:</span> ${ticket.ticketType || "Padrão"}
              </div>
              
              <div class="info">
                <span class="info-label">Preço:</span> R$ ${ticket.price.toFixed(2)}
              </div>
              
              <div class="info">
                <span class="info-label">Data:</span> ${new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
              </div>

              ${qrImage ? `
                <div class="qrcode">
                   <img src="${qrImage}" alt="QR Code" />
                </div>
                <div class="info" style="font-size: 7px;">
                   Válido até: ${new Date(new Date(ticket.createdAt).getTime() + 12 * 60 * 60 * 1000).toLocaleString("pt-BR")}
                </div>
              ` : ''}

            </div>
            
            <div class="footer">
              <div style="font-size: 7px; margin-bottom: 2mm;">
                Válido por 12h para entrada e pedidos
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

    // Aguardar carregamento e imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      setPrinted(true);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pré-visualização de Impressão</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Pré-visualização */}
        <div className="border rounded-lg p-4 bg-white max-h-[500px] overflow-y-auto">
          <div className="font-mono text-xs space-y-2 text-center">
            {/* Logo */}
            <div className="mb-3">
              <img src="/logo-reserva-solar.png" alt="Reserva Solar" className="h-16 mx-auto bg-emerald-700 p-2 rounded" />
            </div>

            {/* Cabeçalho */}
            <div className="text-center border-b pb-2">
              <div className="font-bold text-sm">🎫 INGRESSO</div>
              <div className="font-bold">RESERVA SOLAR</div>
            </div>

            {/* Informações */}
            <div className="space-y-1 border-b pb-2">
              <div><span className="font-bold">ID:</span> #{ticket.id}</div>
              <div><span className="font-bold">Cliente:</span> {ticket.customerName || "N/A"}</div>
              <div><span className="font-bold">Tipo:</span> {ticket.ticketType || "Padrão"}</div>
              <div><span className="font-bold">Preço:</span> R$ {ticket.price.toFixed(2)}</div>
              <div><span className="font-bold">Data:</span> {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</div>
            </div>



            {/* Rodapé */}
            <div className="text-[10px] pt-2">
              <div>Válido por 1 dia a partir da emissão</div>
              <div>Apresente este ingresso na entrada</div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          {!printed ? (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handlePrint} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <Printer size={16} className="mr-2" />
                Imprimir
              </Button>
            </>
          ) : (
            <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Concluir
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
