// Server-only EcoCash Open API client (Cassava Fintech).
// Env vars (set in Vercel):
//   ECOCASH_API_URL          e.g. https://developers.cassavafintech.com
//   ECOCASH_CONSUMER_KEY     X-API-Key for the sandbox
//   ECOCASH_CONSUMER_SECRET  client_secret (if using OAuth)
//   ECOCASH_MERCHANT_CODE
//   ECOCASH_MERCHANT_NUMBER
//   ECOCASH_MERCHANT_PIN
//   ECOCASH_MERCHANT_NAME    "Smart Trolley"
//   ECOCASH_ENVIRONMENT      "sandbox" | "live"   (default: sandbox)
//   ECOCASH_NOTIFY_URL       https://<vercel-app>/api/ecocash/webhook
//
// If ECOCASH_CONSUMER_KEY is missing, the route falls back to simulated mode
// (auto-confirms after a short delay) so the demo works without credentials.

export interface EcocashInitiateResult {
  ok: boolean;
  status: string;
  ecocashReference?: string;
  raw?: unknown;
  errorMessage?: string;
}

const apiUrl   = () => (process.env.ECOCASH_API_URL || "https://developers.cassavafintech.com").replace(/\/$/, "");
const env      = () => (process.env.ECOCASH_ENVIRONMENT || "sandbox").toLowerCase();

export const isEcocashConfigured = () =>
  Boolean(process.env.ECOCASH_CONSUMER_KEY && process.env.ECOCASH_MERCHANT_CODE);

// Normalises 077 / +263 77 / 26377 → 263771234567
export function normalizeMsisdn(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("263"))      return digits;
  if (digits.startsWith("0"))        return "263" + digits.slice(1);
  if (digits.length === 9)           return "263" + digits;
  return digits;
}

export async function initiateC2bCharge(opts: {
  msisdn: string;
  amount: number;
  currency?: string;
  merchantReference: string;
  description?: string;
}): Promise<EcocashInitiateResult> {
  const msisdn = normalizeMsisdn(opts.msisdn);
  const url    = `${apiUrl()}/payments-services/${env()}/c2b/external/v2/transactions`;

  const body = {
    clientCorrelator: opts.merchantReference,
    notifyUrl:        process.env.ECOCASH_NOTIFY_URL || "",
    referenceCode:    opts.merchantReference,
    tranType:         "MER",
    endUserId:        msisdn,
    remarks:          opts.description || "Smart Trolley Checkout",
    transactionOperationStatus: "Charged",
    paymentAmount: {
      charging_information: {
        amount:      opts.amount.toFixed(2),
        currency:    opts.currency || "USD",
        description: opts.description || "Smart Trolley Checkout",
      },
      chargingMetadata: {
        channel:              "WEB",
        purchaseCategoryCode: "Online Payment",
        onBeHalfOf:           process.env.ECOCASH_MERCHANT_NAME || "Smart Trolley",
      },
    },
    merchantCode:    process.env.ECOCASH_MERCHANT_CODE   || "",
    merchantPin:     process.env.ECOCASH_MERCHANT_PIN    || "",
    merchantNumber:  process.env.ECOCASH_MERCHANT_NUMBER || "",
    currencyCode:    opts.currency || "USD",
    countryCode:     "ZW",
    terminalID:      "TROLLEY01",
    location:        "Harare",
    serviceId:       "1",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key":    process.env.ECOCASH_CONSUMER_KEY!,
      Accept:         "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      status: "failed",
      errorMessage: (raw as { message?: string })?.message || `HTTP ${res.status}`,
      raw,
    };
  }

  return {
    ok: true,
    // EcoCash returns "INITIATED" / "PENDING SUBSCRIBER VALIDATION" while
    // the customer enters their PIN on the handset.
    status: "sent_to_phone",
    ecocashReference: (raw as { ecocashReference?: string })?.ecocashReference,
    raw,
  };
}
