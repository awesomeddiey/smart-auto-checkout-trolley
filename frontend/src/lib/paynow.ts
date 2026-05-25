import { createHash } from "node:crypto";

const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

function sha512upper(str: string): string {
  return createHash("sha512").update(str).digest("hex").toUpperCase();
}

/** Paynow hash for express/mobile checkout includes the phone number. */
function initiateHash(
  id: string, reference: string, amount: string,
  returnurl: string, resulturl: string,
  phone: string | undefined,
  key: string,
): string {
  // phone is appended before the key when present (Paynow mobile spec)
  const str = id + reference + amount + returnurl + resulturl + "Message" + (phone || "") + key;
  return sha512upper(str);
}

export function verifyWebhookHash(params: URLSearchParams, key: string): boolean {
  const received = (params.get("hash") || "").toUpperCase();
  const str =
    (params.get("reference")      || "") +
    (params.get("amount")         || "") +
    (params.get("paynowreference")|| "") +
    (params.get("pollurl")        || "") +
    (params.get("status")         || "") +
    key;
  return sha512upper(str) === received;
}

export interface PaynowInitResult {
  ok:          boolean;
  browserUrl?: string;
  pollUrl?:    string;
  express:     boolean;   // true when USSD was sent directly (no redirect needed)
  error?:      string;
}

export async function initiatePaynow(opts: {
  integrationId:  string;
  integrationKey: string;
  reference:      string;
  amount:         number;
  returnUrl:      string;
  resultUrl:      string;
  phone?:         string;   // local format e.g. 0771234567 — triggers express checkout
  method?:        string;   // "ecocash" | "onemoney" (default "ecocash")
}): Promise<PaynowInitResult> {
  const amountStr = opts.amount.toFixed(2);
  const phone     = opts.phone?.replace(/\D/g, "").replace(/^263/, "0") || undefined;

  const hash = initiateHash(
    opts.integrationId, opts.reference, amountStr,
    opts.returnUrl, opts.resultUrl, phone, opts.integrationKey,
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
  if (phone) {
    body.set("phone",  phone);
    body.set("method", opts.method || "ecocash");
  }

  const res  = await fetch(PAYNOW_INITIATE_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  const text = await res.text();
  const p    = new URLSearchParams(text);
  const status = (p.get("status") || "").toLowerCase();

  if (status !== "ok") {
    return { ok: false, express: false, error: p.get("error") || p.get("status") || "Paynow rejected" };
  }

  const browserUrl = p.get("browserurl") || undefined;
  return {
    ok:         true,
    express:    !browserUrl,   // no browserurl = USSD was sent directly
    browserUrl,
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
