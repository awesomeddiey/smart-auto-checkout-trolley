import { NextResponse } from "next/server";
import { mapPaynowStatus, verifyWebhookHash } from "@/lib/paynow";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export async function GET(req: Request) {
  const paymentId = new URL(req.url).searchParams.get("payment_id");
  if (!paymentId) {
    return NextResponse.json({ error: "payment_id required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: payment, error: selectError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (selectError || !payment) {
    return NextResponse.json({ error: selectError?.message || "Payment not found" }, { status: 404 });
  }

  if (TERMINAL_STATUSES.has(payment.status)) {
    return NextResponse.json({ payment });
  }

  const pollUrl = payment.raw_response?.pollUrl || payment.raw_response?.pollurl;
  if (!pollUrl || typeof pollUrl !== "string") {
    return NextResponse.json({ error: "Paynow poll URL is missing", payment }, { status: 502 });
  }

  const response = await fetch(pollUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  const params = new URLSearchParams(text);

  if (!response.ok) {
    return NextResponse.json({ error: `Paynow status check failed: HTTP ${response.status}` }, { status: 502 });
  }

  if (!verifyWebhookHash(params, process.env.PAYNOW_INTEGRATION_KEY!)) {
    return NextResponse.json({
      error: "invalid Paynow status hash",
      fields: [...params.keys()],
    }, { status: 502 });
  }

  const statusText = params.get("status") || "";
  const status = mapPaynowStatus(statusText);
  const update = {
    status,
    ecocash_reference: params.get("paynowreference") || payment.ecocash_reference,
    error_message:     status === "completed" || status === "pending" ? null : statusText,
    receipt_number:    status === "completed"
      ? (payment.receipt_number || `RCP-${Date.now().toString().slice(-6)}`)
      : payment.receipt_number,
    raw_response: {
      ...(payment.raw_response || {}),
      ...Object.fromEntries(params.entries()),
      pollUrl,
    },
    updated_at:        new Date().toISOString(),
  };

  const { data: updatedPayment, error: updateError } = await supabase
    .from("payments")
    .update(update)
    .eq("id", payment.id)
    .select()
    .single();

  if (updateError || !updatedPayment) {
    return NextResponse.json({ error: updateError?.message || "Could not update payment" }, { status: 500 });
  }

  if (status === "completed" && payment.session_id) {
    await supabase
      .from("cart_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", payment.session_id)
      .eq("status", "active");
  }

  return NextResponse.json({ payment: updatedPayment });
}
