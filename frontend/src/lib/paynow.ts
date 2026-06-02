import { createHash } from "node:crypto";

const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
const PAYNOW_REMOTE_URL   = "https://www.paynow.co.zw/interface/remotetransaction";

function sha512upper(str: string): string {
  return createHash("sha512").update(str).digest("hex").toUpperCase();
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("263")) return "0" + digits.slice(3);
  if (!digits.startsWith("0"))  return "0" + digits;
  return digits;
}

export function verifyWebhookHash(params: URLSearchParams, key: string): boolean {
  const received = (params.get("hash") || "").toUpperCase();
  const responseOrder =
    [...params.entries()]
      .filter(([name]) => name.toLowerCase() !== "hash")
      .map(([, value]) => value)
      .join("") +
    key;
  const canonical =
    (params.get("reference")       || "") +
    (params.get("amount")          || "") +
    (params.get("paynowreference") || "") +
    (params.get("pollurl")         || "") +
    (params.get("status")          || "") +
    key;
  return sha512upper(responseOrder) === received || sha512upper(canonical) === received;
}

export interface PaynowInitResult {
  ok:           boolean;
  browserUrl?:  string;
  pollUrl?:     string;
  express:      boolean;
  instructions?: string;
  error?:       string;
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
  authEmail?:     string;
}): Promise<PaynowInitResult> {
  const amountStr = opts.amount.toFixed(2);
  const phone     = opts.phone  ? normalisePhone(opts.phone) : undefined;
  const method    = phone       ? (opts.method || "ecocash") : undefined;
  const isExpress = Boolean(phone && method);

  if (isExpress) {
    // ── Remote transaction (sends USSD push directly to the phone) ──
    const authEmail = opts.authEmail || `${phone}@autocheckouttrolley.vercel.app`;
    const fields: [string, string][] = [
      ["id",         opts.integrationId],
      ["reference",  opts.reference],
      ["amount",     amountStr],
      ["returnurl",  opts.returnUrl],
      ["resulturl",  opts.resultUrl],
      ["authemail",  authEmail],
      ["phone",      phone!],
      ["method",     method!],
      ["status",     "Message"],
    ];
    const hash = sha512upper(fields.map(([, v]) => v).join("") + opts.integrationKey);
    const body = new URLSearchParams([...fields, ["hash", hash]]);

    const res    = await fetch(PAYNOW_REMOTE_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });
    const text   = await res.text();
    const p      = new URLSearchParams(text);
    const status = (p.get("status") || "").toLowerCase();

    if (status !== "ok") {
      return { ok: false, express: true, error: p.get("error") || p.get("status") || "Paynow rejected" };
    }
    return {
      ok:           true,
      express:      true,
      pollUrl:      p.get("pollurl") || undefined,
      instructions: p.get("instructions") || undefined,
    };
  }

  // ── Web checkout (returns a browserurl to redirect to) ──
  const fields: [string, string][] = [
    ["id",         opts.integrationId],
    ["reference",  opts.reference],
    ["amount",     amountStr],
    ["returnurl",  opts.returnUrl],
    ["resulturl",  opts.resultUrl],
    ["status",     "Message"],
  ];
  const hash = sha512upper(fields.map(([, v]) => v).join("") + opts.integrationKey);
  const body = new URLSearchParams([...fields, ["hash", hash]]);

  const res    = await fetch(PAYNOW_INITIATE_URL, {
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
  return {
    ok:         true,
    express:    false,
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
