import { NextResponse }                    from "next/server";
import { verifyWebhookHash, mapPaynowStatus } from "@/lib/paynow";
import { supabaseServer }                   from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const text   = await req.text();
  const params = new URLSearchParams(text);

  if (!verifyWebhookHash(params, process.env.PAYNOW_INTEGRATION_KEY!)) {
    return NextResponse.json({ error: "invalid hash" }, { status: 400 });
  }

  const reference = params.get("reference");
  const paynowRef = params.get("paynowreference") || null;
  const statusStr = params.get("status") || "";
  const status    = mapPaynowStatus(statusStr);

  if (!reference) {
    return NextResponse.json({ error: "missing reference" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, session_id, raw_response")
    .eq("merchant_reference", reference)
    .single();

  const { error } = await supabase
    .from("payments")
    .update({
      status,
      ecocash_reference: paynowRef,
      error_message:     status === "completed" ? null : statusStr,
      raw_response:      {
        ...(payment?.raw_response || {}),
        ...Object.fromEntries(params.entries()),
        pollUrl: params.get("pollurl") || payment?.raw_response?.pollUrl,
      },
      receipt_number:    status === "completed" ? `RCP-${Date.now().toString().slice(-6)}` : null,
      updated_at:        new Date().toISOString(),
    })
    .eq("merchant_reference", reference);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === "completed" && payment?.session_id) {
    await supabase.from("cart_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", payment.session_id)
      .eq("status", "active");
  }

  return NextResponse.json({ ok: true });
}
