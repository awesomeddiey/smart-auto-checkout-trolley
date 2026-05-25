import { createHash } from "node:crypto";

const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

function sha512upper(str: string): string {
  return createHash("sha512").update(str).digest("hex").toUpperCase();
}

/**
 * Paynow hash — same formula for both web and mobile/express checkout.
 * Phone is sent in the POST body but is NOT part of the hash.
 */
function initiateHash(
  id: string, reference: string, amount: string,
  returnurl: string, resulturl: string, key: string,
): string {
  return sha512upper(id + reference + amount + returnurl + resulturl + "Message" + key);
}

/** Verify the SHA-512 hash on a Paynow webhook callback. */
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

/** Normalise any local/international phone format to 07XXXXXXXX for Paynow. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("263")) return "0" + digits.slice(3);
  if (!digits.startsWith("0"))  return "0" + digits;
  return digits;
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

  // Hash does NOT include phone — Paynow confirmed this
  const hash = initiateHash(
    opts.integrationId, opts.reference, amountStr,
    opts.returnUrl, opts.resultUrl, opts.integrationKey,
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

  if (opts.phone) {
    body.set("phone",  normalisePhone(opts.phone));
    body.set("method", opts.method || "ecocash");
  }

  const res  = await fetch(PAYNOW_INITIATE_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  const text   = await res.text();
  const p      = new URLSearchParams(text);
  const status = (p.get("status") || "").toLowerCase();

  if (status !== "ok") {
    return { ok: false, express: false, error: p.get("error") || p.get("status") || "Paynow rejected" };
  }

  const browserUrl = p.get("browserurl") || undefined;
  return {
    ok:         true,
    express:    !browserUrl,
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
