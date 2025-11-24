import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface ThermalTicketPrinterProps {
  ticket: {
    id: number;
    qrCode: string;
    customerName?: string;
    ticketType?: string;
    price: number;
    createdAt: Date;
  };
}

export function ThermalTicketPrinter({ ticket }: ThermalTicketPrinterProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Aguardar o QR code ser renderizado
    const timer = setTimeout(() => {
      printTicket();
    }, 500);

    return () => clearTimeout(timer);
  }, [ticket]);

  const printTicket = () => {
    const printWindow = window.open("", "", "width=400,height=600");
    if (!printWindow) return;

    // Obter o QR code como imagem
    const qrCanvas = document.querySelector("canvas");
    const qrImage = qrCanvas?.toDataURL("image/png") || "";

    // HTML para papel térmico 80mm
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
            
            .info-label {
              font-weight: bold;
            }
            
            .qr-container {
              margin: 4mm 0;
              text-align: center;
            }
            
            .qr-code {
              max-width: 50mm;
              height: auto;
              display: inline-block;
              border: 1px solid #000;
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
              <div class="title">EVENTO</div>
              
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
              
              ${qrImage ? `<div class="qr-container"><img src="${qrImage}" class="qr-code" /></div>` : ""}
              
              <div class="ticket-id">
                ${ticket.qrCode}
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

    // Aguardar carregamento e imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div ref={qrRef} style={{ display: "none" }}>
      <QRCodeSVG value={ticket.qrCode} size={256} level="H" includeMargin={true} />
    </div>
  );
}
