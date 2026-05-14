import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import QRCode from "react-qr-code";
import {
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle2,
  Copy,
  ChevronRight,
  Ticket,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import logo from "@/assets/logo-white.png";

// ─── Tipos ─────────────────────────────────────────────────────────────────

type PaymentMethod = "pix" | "credito" | "debito";

type Step = "choose_method" | "fill_form" | "pix_waiting" | "debit_redirect" | "success" | "error";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function detectBrand(cardNumber: string): string {
  const n = cardNumber.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n)) return "Master";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(?:636368|438935|504175|451416|636297)/.test(n)) return "Elo";
  if (/^(?:38|60)/.test(n)) return "Hipercard";
  return "Visa";
}

const BRAND_LOGOS: Record<string, string> = {
  Visa: "💳 Visa",
  Master: "💳 Mastercard",
  Amex: "💳 Amex",
  Elo: "💳 Elo",
  Hipercard: "💳 Hipercard",
};

// ─── Componente principal ──────────────────────────────────────────────────

export default function PublicSale() {
  const [match, params] = useRoute("/comprar/:ticketTypeId");
  const [, setLocation] = useLocation();

  const ticketTypeId = match ? parseInt(params?.ticketTypeId || "0") : 0;

  // Estado geral
  const [step, setStep] = useState<Step>("choose_method");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [error, setError] = useState("");

  // Dados do cliente
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Dados do cartão
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [brand, setBrand] = useState("Visa");

  // Resultado PIX
  const [cieloPaymentId, setCieloPaymentId] = useState("");
  const [pixQrCodeText, setPixQrCodeText] = useState("");
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [pixExpiresAt, setPixExpiresAt] = useState<Date | null>(null);
  const [ticketTypeName, setTicketTypeName] = useState("");
  const [priceInReais, setPriceInReais] = useState(0);
  const [isSandbox, setIsSandbox] = useState(false);
  const [successQrToken, setSuccessQrToken] = useState("");
  const [copied, setCopied] = useState(false);

  // Carregar tipo de ingresso
  const ticketTypesQuery = trpc.ticketTypes.list.useQuery();
  const ticketType = ticketTypesQuery.data?.find((t) => t.id === ticketTypeId);

  // Mutations
  const initiatePixMutation = trpc.payments.initiatePix.useMutation();
  const payCreditMutation = trpc.payments.payCredit.useMutation();
  const payDebitMutation = trpc.payments.payDebit.useMutation();

  // Polling de status (PIX e Débito)
  const statusQuery = trpc.payments.checkStatus.useQuery(
    { cieloPaymentId },
    {
      enabled: !!cieloPaymentId && (step === "pix_waiting" || step === "debit_redirect"),
      refetchInterval: step === "pix_waiting" || step === "debit_redirect" ? 3000 : false,
    }
  );

  // Reage à confirmação do pagamento
  useEffect(() => {
    if (statusQuery.data?.status === "approved" && statusQuery.data.qrToken) {
      setSuccessQrToken(statusQuery.data.qrToken as string);
      setStep("success");
    }
    if (statusQuery.data?.status === "rejected") {
      setError("Pagamento recusado. Tente novamente ou escolha outra forma de pagamento.");
      setStep("error");
    }
  }, [statusQuery.data]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmitPix = async () => {
    setError("");
    try {
      const result = await initiatePixMutation.mutateAsync({
        ticketTypeId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
      });
      setCieloPaymentId(result.cieloPaymentId);
      setPixQrCodeText(result.pixQrCodeText || "");
      setPixQrCodeBase64(result.pixQrCode || null);
      setPixExpiresAt(result.expiresAt ? new Date(result.expiresAt) : null);
      setTicketTypeName(result.ticketTypeName);
      setPriceInReais(result.priceInReais);
      setIsSandbox(result.isSandbox);
      setStep("pix_waiting");
    } catch (err: any) {
      setError(err.message || "Erro ao gerar PIX");
    }
  };

  const handleSubmitCredit = async () => {
    setError("");
    try {
      const result = await payCreditMutation.mutateAsync({
        ticketTypeId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        cardNumber: cardNumber.replace(/\s/g, ""),
        holderName,
        expirationDate: expiry,
        securityCode: cvv,
        brand,
        installments,
      });
      if (result.status === "approved") {
        setSuccessQrToken(result.qrToken);
        setStep("success");
      }
    } catch (err: any) {
      setError(err.message || "Pagamento recusado. Verifique os dados do cartão.");
      setStep("error");
    }
  };

  const handleSubmitDebit = async () => {
    setError("");
    try {
      const returnUrl = `${window.location.origin}/comprar/${ticketTypeId}/retorno`;
      const result = await payDebitMutation.mutateAsync({
        ticketTypeId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        cardNumber: cardNumber.replace(/\s/g, ""),
        holderName,
        expirationDate: expiry,
        securityCode: cvv,
        brand,
        returnUrl,
      });
      setCieloPaymentId(result.cieloPaymentId);
      if (result.authenticationUrl) {
        window.location.href = result.authenticationUrl;
      } else {
        // Sandbox: aprovação imediata
        setSuccessQrToken(result.qrToken);
        setStep("success");
      }
    } catch (err: any) {
      setError(err.message || "Erro no débito");
      setStep("error");
    }
  };

  const isLoading =
    initiatePixMutation.isPending || payCreditMutation.isPending || payDebitMutation.isPending;

  const canSubmitForm =
    customerName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(customerEmail) &&
    (method === "pix" || (cardNumber.replace(/\s/g, "").length >= 13 && holderName && expiry && cvv));

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!match) return <div className="p-8 text-center">Link inválido</div>;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)" }}>
      {/* Header */}
      <div className="pt-10 pb-6 px-4 text-center">
        <img src={logo} alt="Reserva Solar" className="h-14 mx-auto mb-3 object-contain brightness-0 invert opacity-90" />
        <p className="text-emerald-200 text-sm tracking-widest uppercase">Compra de Ingresso</p>
      </div>

      <div className="max-w-md mx-auto px-4 pb-12">

        {/* ── Etapa: Escolher método ── */}
        {step === "choose_method" && (
          <div className="space-y-4">
            {ticketType && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-white text-center mb-2">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Ticket size={18} className="text-amber-300" />
                  <span className="font-bold text-lg">{ticketType.name}</span>
                </div>
                <p className="text-3xl font-bold text-amber-300">
                  R$ {ticketType.price.toFixed(2).replace(".", ",")}
                </p>
              </div>
            )}

            <h2 className="text-white font-semibold text-center text-lg">Como deseja pagar?</h2>

            {/* PIX */}
            <button
              onClick={() => { setMethod("pix"); setStep("fill_form"); }}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-amber-400/60 rounded-2xl p-5 flex items-center gap-4 text-white transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/50 transition-colors">
                <Smartphone size={24} className="text-emerald-300" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-base">PIX</p>
                <p className="text-xs text-emerald-200">Aprovação automática em segundos</p>
              </div>
              <ChevronRight size={20} className="text-white/50 group-hover:text-white transition-colors" />
            </button>

            {/* Crédito */}
            <button
              onClick={() => { setMethod("credito"); setStep("fill_form"); }}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-amber-400/60 rounded-2xl p-5 flex items-center gap-4 text-white transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/50 transition-colors">
                <CreditCard size={24} className="text-blue-300" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-base">Cartão de Crédito</p>
                <p className="text-xs text-emerald-200">Visa, Master, Elo, Hipercard • Até 12x</p>
              </div>
              <ChevronRight size={20} className="text-white/50 group-hover:text-white transition-colors" />
            </button>

            {/* Débito */}
            <button
              onClick={() => { setMethod("debito"); setStep("fill_form"); }}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-amber-400/60 rounded-2xl p-5 flex items-center gap-4 text-white transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/50 transition-colors">
                <CreditCard size={24} className="text-purple-300" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-base">Cartão de Débito</p>
                <p className="text-xs text-emerald-200">Visa, Master, Elo • Autenticação 3DS</p>
              </div>
              <ChevronRight size={20} className="text-white/50 group-hover:text-white transition-colors" />
            </button>

            <div className="flex items-center justify-center gap-2 pt-2 text-emerald-300/70 text-xs">
              <ShieldCheck size={14} />
              <span>Pagamento 100% seguro via Cielo</span>
            </div>
          </div>
        )}

        {/* ── Etapa: Formulário ── */}
        {step === "fill_form" && (
          <div className="space-y-4">
            <button
              onClick={() => setStep("choose_method")}
              className="flex items-center gap-2 text-emerald-200 hover:text-white text-sm mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Voltar
            </button>

            <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
              <h2 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                {method === "pix" && <><Smartphone size={20} className="text-emerald-600" /> Pagar com PIX</>}
                {method === "credito" && <><CreditCard size={20} className="text-blue-600" /> Cartão de Crédito</>}
                {method === "debito" && <><CreditCard size={20} className="text-purple-600" /> Cartão de Débito</>}
              </h2>

              {/* Dados pessoais */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seus dados</p>

                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <input
                  type="email"
                  placeholder="E-mail *"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Dados do cartão (crédito ou débito) */}
              {(method === "credito" || method === "debito") && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do cartão</p>

                  {/* Número do cartão */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Número do cartão"
                      value={cardNumber}
                      onChange={(e) => {
                        const formatted = formatCardNumber(e.target.value);
                        setCardNumber(formatted);
                        setBrand(detectBrand(formatted));
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-20 font-mono tracking-wider transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                      {BRAND_LOGOS[brand] || brand}
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Nome no cartão"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono transition-all"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/AAAA"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition-all"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="CVV"
                      value={cvv}
                      maxLength={4}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition-all"
                    />
                  </div>

                  {method === "credito" && (
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}x {n === 1 ? "sem juros" : ""}
                          {ticketType ? ` — R$ ${(ticketType.price / n).toFixed(2).replace(".", ",")}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Botão de ação */}
              <button
                onClick={
                  method === "pix"
                    ? handleSubmitPix
                    : method === "credito"
                    ? handleSubmitCredit
                    : handleSubmitDebit
                }
                disabled={isLoading || !canSubmitForm}
                className="w-full py-4 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: canSubmitForm && !isLoading
                    ? "linear-gradient(135deg, #059669, #065f46)"
                    : undefined,
                  backgroundColor: (!canSubmitForm || isLoading) ? "#9ca3af" : undefined,
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" /> Processando...
                  </span>
                ) : method === "pix" ? (
                  "Gerar QR Code PIX"
                ) : method === "credito" ? (
                  `Pagar R$ ${ticketType?.price.toFixed(2).replace(".", ",") || "..."}`
                ) : (
                  "Autenticar e Pagar"
                )}
              </button>

              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <ShieldCheck size={12} /> Seus dados são criptografados via Cielo
              </p>
            </div>
          </div>
        )}

        {/* ── Etapa: Aguardando PIX ── */}
        {step === "pix_waiting" && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div>
              <p className="font-bold text-emerald-900 text-lg">{ticketTypeName}</p>
              <p className="text-3xl font-bold text-emerald-700">
                R$ {priceInReais.toFixed(2).replace(".", ",")}
              </p>
              {isSandbox && (
                <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  Modo Teste (Sandbox)
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600">
              Escaneie o QR Code ou copie o código PIX no seu aplicativo bancário:
            </p>

            {/* QR Code */}
            <div className="flex justify-center">
              {pixQrCodeBase64 ? (
                <img
                  src={`data:image/png;base64,${pixQrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 rounded-xl border border-gray-100"
                />
              ) : (
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-inner">
                  <QRCode value={pixQrCodeText || "PIX"} size={180} />
                </div>
              )}
            </div>

            {/* Copia e cola */}
            {pixQrCodeText && (
              <div>
                <p className="text-xs text-gray-500 mb-2">PIX Copia e Cola:</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-left overflow-hidden text-ellipsis whitespace-nowrap block">
                    {pixQrCodeText.slice(0, 40)}...
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pixQrCodeText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1"
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            )}

            {/* Status polling */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              <span>Aguardando confirmação do pagamento...</span>
            </div>

            {pixExpiresAt && (
              <p className="text-xs text-gray-400">
                Válido até: {pixExpiresAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}

            {isSandbox && (
              <p className="text-xs text-yellow-600 bg-yellow-50 rounded-xl p-3">
                ⚠️ Modo Sandbox: o pagamento será aprovado automaticamente em instantes.
              </p>
            )}
          </div>
        )}

        {/* ── Etapa: Sucesso ── */}
        {step === "success" && (
          <div className="text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">Pagamento Confirmado!</h2>
              <p className="text-emerald-200 mt-1">Seu ingresso está pronto</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
              <p className="text-sm text-gray-600">Apresente este QR Code na entrada:</p>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner flex justify-center">
                <QRCode
                  value={`${window.location.origin}/ticket/${successQrToken}`}
                  size={200}
                />
              </div>
              <button
                onClick={() => setLocation(`/ticket/${successQrToken}`)}
                className="w-full py-3 rounded-xl font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #059669, #065f46)" }}
              >
                Ver Ingresso Completo
              </button>
              <p className="text-xs text-gray-400 text-center">
                Salve ou tire um print — seu ingresso estará sempre disponível no link enviado por e-mail.
              </p>
            </div>
          </div>
        )}

        {/* ── Etapa: Erro ── */}
        {step === "error" && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h2 className="font-bold text-red-700 text-lg">Pagamento não aprovado</h2>
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={() => { setStep("choose_method"); setError(""); }}
              className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
