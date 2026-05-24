import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { initiateC2bCharge, isEcocashConfigured, normalizeMsisdn } from "@/lib/ecocash";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InitiateBody {
  session_id?: string | null;
  phone:       string;
  amount:      number;
  currency?:   string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as InitiateBody;

  if (!body.phone || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "phone and amount are required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const merchantReference = `STC-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const phone = normalizeMsisdn(body.phone);

  // 1. Insert the payment row up-front so the client can subscribe to it
  const { data: payment, error: insertErr } = await supabase
    .from("payments")
    .insert({
      session_id:         body.session_id ?? null,
      customer_phone:     phone,
      amount:             body.amount,
      currency:           body.currency || "USD",
      status:             "pending",
      merchant_reference: merchantReference,
    })
    .select()
    .single();

  if (insertErr || !payment) {
    return NextResponse.json({ error: insertErr?.message || "Could not create payment" }, { status: 500 });
  }

  // 2. Either call EcoCash for real, or simulate the PIN prompt
  if (!isEcocashConfigured()) {
    await supabase
      .from("payments")
      .update({
        status:        "sent_to_phone",
        raw_response:  { simulated: true, note: "ECOCASH_CONSUMER_KEY not set — simulated PIN prompt" },
        updated_at:    new Date().toISOString(),
      })
      .eq("id", payment.id);

    return NextResponse.json({
      payment_id:         payment.id,
      merchant_reference: merchantReference,
      simulated:          true,
      message:            "Simulated: pretend the phone rang and asked for PIN.",
    });
  }

  try {
    const result = await initiateC2bCharge({
      msisdn:            phone,
      amount:            body.amount,
      currency:          body.currency || "USD",
      merchantReference,
      description:       "Smart Trolley Checkout",
    });

    await supabase
      .from("payments")
      .update({
        status:            result.ok ? "sent_to_phone" : "failed",
        ecocash_reference: result.ecocashReference,
        error_message:     result.errorMessage,
        raw_response:      result.raw as object,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (!result.ok) {
      return NextResponse.json(
        { payment_id: payment.id, error: result.errorMessage || "EcoCash rejected the charge" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      payment_id:         payment.id,
      merchant_reference: merchantReference,
      ecocash_reference:  result.ecocashReference,
      simulated:          false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("payments")
      .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return NextResponse.json({ payment_id: payment.id, error: msg }, { status: 502 });
  }
}
