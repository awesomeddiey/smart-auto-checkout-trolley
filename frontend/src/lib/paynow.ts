import { createHash } from "node:crypto";

const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";

function sha512upper(str: string): string {
  return createHash("sha512").update(str).digest("hex").toUpperCase();
}

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
    (params.get("reference")      || "") +
    (params.get("amount")         || "") +
    (params.get("paynowreference")|| "") +
    (params.get("pollurl")        || "") +
    (params.get("status")         || "") +
    key;
  return sha512upper(str) === received;
}

export interface PaynowInitResult {
  ok:         boolean;
  browserUrl?: string;
  pollUrl?:    string;
  error?:      string;
}

export async function initiatePaynow(opts: {
  integrationId:  string;
  integrationKey: string;
  reference:      string;
  amount:         number;
  returnUrl:      string;
  resultUrl:      string;
}): Promise<PaynowInitResult> {
  const amountStr = opts.amount.toFixed(2);
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

  const res  = await fetch(PAYNOW_INITIATE_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  const text = await res.text();
  const p    = new URLSearchParams(text);
  const status = (p.get("status") || "").toLowerCase();

  if (status !== "ok") {
    return { ok: false, error: p.get("error") || p.get("status") || "Paynow rejected the request" };
  }

  return {
    ok:         true,
    browserUrl: p.get("browserurl") || undefined,
    pollUrl:    p.get("pollurl")    || undefined,
  };
}

export function mapPaynowStatus(s: string): "completed" | "failed" | "cancelled" | "pending" {
  const v = s.toLowerCase();
  if (v === "paid" || v === "awaiting delivery") return "completed";
  if (v === "cancelled")                          return "cancelled";
  if (v === "failed" || v === "refunded")         return "failed";
  return "pending";
}
