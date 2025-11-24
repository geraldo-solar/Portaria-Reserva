import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

interface ReportData {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalRevenue: number;
  activeTickets: number;
  cancelledTickets: number;
  paymentMethods: {
    dinheiro: { count: number; total: number };
    pix: { count: number; total: number };
    cartao: { count: number; total: number };
  };
}

interface ThermalReportPrinterProps {
  open: boolean;
  onClose: () => void;
  reportData: ReportData;
}

export default function ThermalReportPrinter({ open, onClose, reportData }: ThermalReportPrinterProps) {
  const handlePrint = () => {
    window.print();
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
          <div id="thermal-report-content" className="font-mono text-xs space-y-2">
            {/* Cabeçalho */}
            <div className="text-center border-b pb-2">
              <img src={APP_LOGO} alt={APP_TITLE} className="h-12 mx-auto mb-2 bg-emerald-700 p-2 rounded" />
              <div className="font-bold">{APP_TITLE}</div>
              <div className="text-[10px]">RELATÓRIO DE VENDAS</div>
            </div>

            {/* Período */}
            <div className="border-b pb-2">
              <div className="flex justify-between">
                <span>Período:</span>
                <span>{formatDate(reportData.startDate)} a {formatDate(reportData.endDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Emissão:</span>
                <span>{new Date().toLocaleString("pt-BR")}</span>
              </div>
            </div>

            {/* Resumo Geral */}
            <div className="border-b pb-2">
              <div className="font-bold mb-1">RESUMO GERAL</div>
              <div className="flex justify-between">
                <span>Total de Vendas:</span>
                <span>{reportData.totalSales}</span>
              </div>
              <div className="flex justify-between">
                <span>Receita Total:</span>
                <span className="font-bold">{formatCurrency(reportData.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ingressos Ativos:</span>
                <span>{reportData.activeTickets}</span>
              </div>
              <div className="flex justify-between">
                <span>Cancelados:</span>
                <span>{reportData.cancelledTickets}</span>
              </div>
            </div>

            {/* Por Método de Pagamento */}
            <div className="border-b pb-2">
              <div className="font-bold mb-1">POR MÉTODO DE PAGAMENTO</div>
              
              <div className="mt-1">
                <div className="flex justify-between font-semibold">
                  <span>DINHEIRO</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Quantidade:</span>
                  <span>{reportData.paymentMethods.dinheiro.count}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Total:</span>
                  <span>{formatCurrency(reportData.paymentMethods.dinheiro.total)}</span>
                </div>
              </div>

              <div className="mt-1">
                <div className="flex justify-between font-semibold">
                  <span>PIX</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Quantidade:</span>
                  <span>{reportData.paymentMethods.pix.count}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Total:</span>
                  <span>{formatCurrency(reportData.paymentMethods.pix.total)}</span>
                </div>
              </div>

              <div className="mt-1">
                <div className="flex justify-between font-semibold">
                  <span>CARTÃO</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Quantidade:</span>
                  <span>{reportData.paymentMethods.cartao.count}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Total:</span>
                  <span>{formatCurrency(reportData.paymentMethods.cartao.total)}</span>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="text-center text-[10px] pt-2">
              <div>Sistema de Portaria de Eventos</div>
              <div>© 2024 Todos os direitos reservados</div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handlePrint} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            <Printer size={16} className="mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-report-content,
          #thermal-report-content * {
            visibility: visible;
          }
          #thermal-report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            font-size: 9px;
            padding: 2mm;
          }
        }
      `}</style>
    </Dialog>
  );
}
