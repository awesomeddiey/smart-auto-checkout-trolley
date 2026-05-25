import { NextResponse } from "next/server";
import { randomUUID }   from "node:crypto";
import { initiatePaynow } from "@/lib/paynow";
import { supabaseServer }  from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://autocheckouttrolley.vercel.app").replace(/\/$/, "");

export async function POST(req: Request) {
  const body = (await req.json()) as { session_id?: string | null; phone: string; amount: number };

  if (!body.phone || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "phone and amount are required" }, { status: 400 });
  }

  const merchantReference = `STC-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const supabase = supabaseServer();

  const { data: payment, error: insertErr } = await supabase
    .from("payments")
    .insert({
      session_id:         body.session_id ?? null,
      customer_phone:     body.phone,
      amount:             body.amount,
      currency:           "USD",
      status:             "pending",
      provider:           "paynow",
      merchant_reference: merchantReference,
    })
    .select()
    .single();

  if (insertErr || !payment) {
    return NextResponse.json({ error: insertErr?.message || "Could not create payment" }, { status: 500 });
  }

  const result = await initiatePaynow({
    integrationId:  process.env.PAYNOW_INTEGRATION_ID!,
    integrationKey: process.env.PAYNOW_INTEGRATION_KEY!,
    reference:      merchantReference,
    amount:         body.amount,
    returnUrl: `${APP_URL}/checkout/success?ref=${encodeURIComponent(merchantReference)}&pid=${payment.id}`,
    resultUrl: `${APP_URL}/api/paynow/webhook`,
  });

  if (!result.ok) {
    await supabase.from("payments")
      .update({ status: "failed", error_message: result.error, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return NextResponse.json({ error: result.error || "Paynow rejected" }, { status: 502 });
  }

  await supabase.from("payments")
    .update({ raw_response: { pollUrl: result.pollUrl }, updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  return NextResponse.json({
    payment_id:         payment.id,
    merchant_reference: merchantReference,
    redirect_url:       result.browserUrl,
  });
}
