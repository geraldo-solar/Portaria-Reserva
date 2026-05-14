import axios from "axios";

/**
 * Serviço de integração com a Cielo API 3.0
 * Suporta: PIX | Cartão de Crédito | Cartão de Débito
 * Documentação: https://developercielo.github.io/manual/cielo-ecommerce
 *
 * Credenciais no .env:
 *   CIELO_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   CIELO_MERCHANT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   CIELO_ENV=sandbox | production
 */

const MERCHANT_ID = process.env.CIELO_MERCHANT_ID || "";
const MERCHANT_KEY = process.env.CIELO_MERCHANT_KEY || "";
const IS_SANDBOX = (process.env.CIELO_ENV || "sandbox") !== "production";

const API_BASE = IS_SANDBOX
  ? "https://apisandbox.cieloecommerce.cielo.com.br"
  : "https://api.cieloecommerce.cielo.com.br";

const QUERY_BASE = IS_SANDBOX
  ? "https://apiquerysandbox.cieloecommerce.cielo.com.br"
  : "https://apiquery.cieloecommerce.cielo.com.br";

function getHeaders() {
  return {
    MerchantId: MERCHANT_ID,
    MerchantKey: MERCHANT_KEY,
    "Content-Type": "application/json",
  };
}

export function isCieloConfigured() {
  return Boolean(MERCHANT_ID && MERCHANT_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// PIX
// ─────────────────────────────────────────────────────────────────────────────

export async function createCieloPixPayment(params: {
  amount: number;       // Valor em reais (ex: 50.00)
  customerName: string;
  orderId: string;      // qrToken — ID único do pedido
}) {
  if (!isCieloConfigured()) throw new Error("Credenciais Cielo não configuradas.");

  const body = {
    MerchantOrderId: params.orderId,
    Customer: { Name: params.customerName },
    Payment: {
      Type: "Pix",
      Provider: "Cielo2",
      Amount: Math.round(params.amount * 100), // centavos
      QrCodeExpiration: 1800, // 30 minutos
    },
  };

  const response = await axios.post(`${API_BASE}/1/sales/`, body, {
    headers: getHeaders(),
  });

  const payment = response.data?.Payment;
  if (!payment) throw new Error("Resposta inválida da Cielo (PIX)");

  return {
    cieloPaymentId: payment.PaymentId as string,
    pixQrCodeBase64: (payment.QrCodeBase64 || null) as string | null,
    pixQrCodeText: (payment.QrCodeString || null) as string | null,
    status: mapCieloStatus(payment.Status),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTÃO DE CRÉDITO
// ─────────────────────────────────────────────────────────────────────────────

export type CardData = {
  cardNumber: string;    // "4111111111111111"
  holderName: string;    // "JOAO SILVA"
  expirationDate: string; // "12/2028"
  securityCode: string;  // "123"
  brand: string;         // "Visa" | "Master" | "Elo" | "Hipercard" | "Amex"
  installments?: number; // 1 a 12 (default 1)
};

export async function createCieloCreditPayment(params: {
  amount: number;
  customerName: string;
  customerEmail: string;
  orderId: string;
  card: CardData;
}) {
  if (!isCieloConfigured()) throw new Error("Credenciais Cielo não configuradas.");

  const body = {
    MerchantOrderId: params.orderId,
    Customer: {
      Name: params.customerName,
      Email: params.customerEmail,
    },
    Payment: {
      Type: "CreditCard",
      Amount: Math.round(params.amount * 100),
      Installments: params.card.installments || 1,
      SoftDescriptor: "ReservaSolar",
      Capture: true, // captura automática
      CreditCard: {
        CardNumber: params.card.cardNumber.replace(/\s/g, ""),
        Holder: params.card.holderName.toUpperCase(),
        ExpirationDate: params.card.expirationDate,
        SecurityCode: params.card.securityCode,
        Brand: params.card.brand,
      },
    },
  };

  const response = await axios.post(`${API_BASE}/1/sales/`, body, {
    headers: getHeaders(),
  });

  const payment = response.data?.Payment;
  if (!payment) throw new Error("Resposta inválida da Cielo (Crédito)");

  const status = mapCieloStatus(payment.Status);

  return {
    cieloPaymentId: payment.PaymentId as string,
    status,
    returnCode: payment.ReturnCode as string,
    returnMessage: payment.ReturnMessage as string,
    authorizationCode: payment.AuthorizationCode as string | undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTÃO DE DÉBITO
// ─────────────────────────────────────────────────────────────────────────────

export async function createCieloDebitPayment(params: {
  amount: number;
  customerName: string;
  customerEmail: string;
  orderId: string;
  card: CardData;
  returnUrl: string; // URL de retorno após autenticação 3DS
}) {
  if (!isCieloConfigured()) throw new Error("Credenciais Cielo não configuradas.");

  const body = {
    MerchantOrderId: params.orderId,
    Customer: {
      Name: params.customerName,
      Email: params.customerEmail,
    },
    Payment: {
      Type: "DebitCard",
      Amount: Math.round(params.amount * 100),
      ReturnUrl: params.returnUrl,
      Authenticate: true, // Débito exige autenticação 3DS
      DebitCard: {
        CardNumber: params.card.cardNumber.replace(/\s/g, ""),
        Holder: params.card.holderName.toUpperCase(),
        ExpirationDate: params.card.expirationDate,
        SecurityCode: params.card.securityCode,
        Brand: params.card.brand,
      },
    },
  };

  const response = await axios.post(`${API_BASE}/1/sales/`, body, {
    headers: getHeaders(),
  });

  const payment = response.data?.Payment;
  if (!payment) throw new Error("Resposta inválida da Cielo (Débito)");

  return {
    cieloPaymentId: payment.PaymentId as string,
    status: mapCieloStatus(payment.Status),
    authenticationUrl: (payment.AuthenticationUrl || null) as string | null, // URL de redirect 3DS
    returnCode: payment.ReturnCode as string,
    returnMessage: payment.ReturnMessage as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA DE STATUS (para PIX polling e pós-retorno débito)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCieloPaymentStatus(cieloPaymentId: string) {
  if (!isCieloConfigured()) throw new Error("Credenciais Cielo não configuradas.");

  const response = await axios.get(
    `${QUERY_BASE}/1/sales/${cieloPaymentId}`,
    { headers: getHeaders() }
  );

  const payment = response.data?.Payment;
  if (!payment) throw new Error("Pagamento não encontrado na Cielo");

  return {
    status: mapCieloStatus(payment.Status),
    statusCode: payment.Status as number,
    returnCode: payment.ReturnCode as string,
    returnMessage: payment.ReturnMessage as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapeia os códigos de status da Cielo para o modelo interno
 * Ref: https://developercielo.github.io/manual/cielo-ecommerce#status-transacional
 * 1  = Autorizado | 2 = Pago | 3 = Negado | 10 = Cancelado | 11 = Estornado | 12 = Pendente PIX
 */
export function mapCieloStatus(cieloStatus: number): "pending" | "approved" | "rejected" | "cancelled" {
  switch (cieloStatus) {
    case 1:  return "approved";  // Autorizado (para crédito antes da captura)
    case 2:  return "approved";  // Pago / Capturado
    case 12: return "pending";   // Aguardando PIX
    case 13: return "pending";   // Pendente
    case 3:  return "rejected";  // Negado
    case 10: return "cancelled"; // Cancelado
    case 11: return "cancelled"; // Estornado
    default: return "pending";
  }
}

/**
 * Detecta a bandeira do cartão pelo número (para autocompletar o campo Brand)
 */
export function detectCardBrand(cardNumber: string): string {
  const n = cardNumber.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n)) return "Master";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  if (/^(?:636368|438935|504175|451416|636297)/.test(n)) return "Elo";
  if (/^(?:38|60)/.test(n)) return "Hipercard";
  return "Visa"; // default
}
