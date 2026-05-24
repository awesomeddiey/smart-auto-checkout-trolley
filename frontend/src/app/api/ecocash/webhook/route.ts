import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EcoCash webhook payload (shape varies by API version; we accept either).
interface EcocashCallback {
  clientCorrelator?: string;
  referenceCode?:    string;
  transactionStatus?:  string;   // SUCCESS | FAILED | CANCELLED | TIMEOUT
  transactionOperationStatus?: string;
  ecocashReference?: string;
  transactionTime?:  string;
  resultDescription?: string;
}

function mapStatus(s: string | undefined): "completed" | "failed" | "cancelled" {
  const v = (s || "").toUpperCase();
  if (v === "SUCCESS" || v === "COMPLETED" || v === "CHARGED") return "completed";
  if (v === "CANCELLED" || v === "CANCELED")                    return "cancelled";
  return "failed";
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({})) as EcocashCallback;
  const merchantRef = raw.clientCorrelator || raw.referenceCode;

  if (!merchantRef) {
    return NextResponse.json({ error: "missing clientCorrelator/referenceCode" }, { status: 400 });
  }

  const status = mapStatus(raw.transactionStatus || raw.transactionOperationStatus);
  const supabase = supabaseServer();

  const { error } = await supabase
    .from("payments")
    .update({
      status,
      ecocash_reference: raw.ecocashReference,
      error_message:     status === "completed" ? null : (raw.resultDescription || raw.transactionStatus),
      raw_response:      raw as object,
      receipt_number:    status === "completed" ? `RCP-${Date.now().toString().slice(-6)}` : null,
      updated_at:        new Date().toISOString(),
    })
    .eq("merchant_reference", merchantRef);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
