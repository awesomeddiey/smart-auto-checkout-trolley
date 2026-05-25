// Server-only EcoCash Pay API client (EcoCash Zimbabwe developer portal)
// Env vars — add in Vercel without the VITE_ prefix (server-side only):
//   ECOCASH_API_BASE   https://developers.ecocash.co.zw/api/ecocash_pay
//   ECOCASH_API_KEY    API key from developers.ecocash.co.zw
//   ECOCASH_NOTIFY_URL https://<vercel-app>/api/ecocash/webhook
//
// Without ECOCASH_API_KEY the route falls back to simulated mode so the
// demo works without real credentials.

export interface EcocashInitiateResult {
  ok: boolean;
  status: string;
  ecocashReference?: string;
  raw?: unknown;
  errorMessage?: string;
}

const apiBase = () =>
  (process.env.ECOCASH_API_BASE || "https://developers.ecocash.co.zw/api/ecocash_pay").replace(/\/$/, "");

export const isEcocashConfigured = () => Boolean(process.env.ECOCASH_API_KEY);

// Normalises 077 / +263 77 / 26377 → 263771234567
export function normalizeMsisdn(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("263")) return digits;
  if (digits.startsWith("0"))   return "263" + digits.slice(1);
  if (digits.length === 9)      return "263" + digits;
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
  const url    = apiBase();

  const body = {
    msisdn,
    amount:          opts.amount,
    currency:        opts.currency || "USD",
    clientCorrelator: opts.merchantReference,
    remarks:         opts.description || "Smart Trolley Checkout",
    notifyUrl:       process.env.ECOCASH_NOTIFY_URL || "",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key":      process.env.ECOCASH_API_KEY!,
      Accept:         "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      status: "failed",
      errorMessage:
        (raw as { message?: string; error?: string })?.message ||
        (raw as { error?: string })?.error ||
        `HTTP ${res.status}`,
      raw,
    };
  }

  return {
    ok: true,
    status: "sent_to_phone",
    ecocashReference:
      (raw as { ecocashReference?: string })?.ecocashReference ||
      (raw as { reference?: string })?.reference,
    raw,
  };
}
