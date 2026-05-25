import { createHash } from "node:crypto";

const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

function sha512upper(str: string): string {
  return createHash("sha512").update(str).digest("hex").toUpperCase();
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("263")) return "0" + digits.slice(3);
  if (!digits.startsWith("0"))  return "0" + digits;
  return digits;
}

/**
 * Paynow hash:
 *   Web checkout:    id + reference + amount + returnurl + resulturl + "Message" + key
 *   Express/mobile:  id + reference + amount + returnurl + resulturl + "Message" + phone + method + key
 */
function initiateHash(
  id: string, reference: string, amount: string,
  returnurl: string, resulturl: string,
  phone: string | undefined, method: string | undefined,
  key: string,
): string {
  const extras = (phone && method) ? phone + method : "";
  return sha512upper(id + reference + amount + returnurl + resulturl + "Message" + extras + key);
}

export function verifyWebhookHash(params: URLSearchParams, key: string): boolean {
  const received = (params.get("hash") || "").toUpperCase();
  const str =
    (params.get("reference")       || "") +
    (params.get("amount")          || "") +
    (params.get("paynowreference") || "") +
    (params.get("pollurl")         || "") +
    (params.get("status")          || "") +
    key;
  return sha512upper(str) === received;
}

export interface PaynowInitResult {
  ok:          boolean;
  browserUrl?: string;
  pollUrl?:    string;
  express:     boolean;
  error?:      string;
}

export async function initiatePaynow(opts: {
  integrationId:  string;
  integrationKey: string;
  reference:      string;
  amount:         number;
  returnUrl:      string;
  resultUrl:      string;
  phone?:         string;
  method?:        string;
}): Promise<PaynowInitResult> {
  const amountStr = opts.amount.toFixed(2);
  const phone     = opts.phone  ? normalisePhone(opts.phone) : undefined;
  const method    = phone       ? (opts.method || "ecocash") : undefined;
  const isExpress = Boolean(phone && method);

  const hash = initiateHash(
    opts.integrationId, opts.reference, amountStr,
    opts.returnUrl, opts.resultUrl, phone, method, opts.integrationKey,
  );

  const body = new URLSearchParams({
    id:        opts.integrationId,
    reference: opts.reference,
    amount:    amountStr,
    returnurl: opts.returnUrl,
    resulturl: opts.resultUrl,
    status:    "Message",
    hash,
  });
  if (isExpress) {
    body.set("phone",  phone!);
    body.set("method", method!);
  }

  const res    = await fetch(PAYNOW_INITIATE_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  const text   = await res.text();
  const p      = new URLSearchParams(text);
  const status = (p.get("status") || "").toLowerCase();

  if (status !== "ok") {
    return { ok: false, express: isExpress, error: p.get("error") || p.get("status") || "Paynow rejected" };
  }

  // Express checkout = USSD push was sent. Paynow always returns a browserurl
  // as a fallback, but we ignore it for express flow.
  return {
    ok:         true,
    express:    isExpress,
    browserUrl: isExpress ? undefined : (p.get("browserurl") || undefined),
    pollUrl:    p.get("pollurl") || undefined,
  };
}

export function mapPaynowStatus(s: string): "completed" | "failed" | "cancelled" | "pending" {
  const v = s.toLowerCase();
  if (v === "paid" || v === "awaiting delivery") return "completed";
  if (v === "cancelled")                          return "cancelled";
  if (v === "failed" || v === "refunded")         return "failed";
  return "pending";
}
