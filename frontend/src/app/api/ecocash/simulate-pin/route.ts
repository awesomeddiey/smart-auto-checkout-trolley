import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo-only: lets the EcoCashModal "approve" a payment from the web when
// real EcoCash credentials aren't configured. Body: { payment_id, pin, action? }
// action = "approve" | "cancel" | "reject"
export async function POST(req: Request) {
  const { payment_id, pin, action } = (await req.json()) as {
    payment_id?: string;
    pin?: string;
    action?: "approve" | "cancel" | "reject";
  };

  if (!payment_id) {
    return NextResponse.json({ error: "payment_id required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const a = action || "approve";

  // For the demo we accept any 4-digit PIN. Reject if shorter than 4.
  if (a === "approve" && (!pin || pin.length < 4)) {
    return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
  }

  const update =
    a === "approve"
      ? {
          status:           "completed",
          receipt_number:   `RCP-${Date.now().toString().slice(-6)}`,
          ecocash_reference: `ECO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          updated_at:       new Date().toISOString(),
        }
      : {
          status:        a === "cancel" ? "cancelled" : "failed",
          error_message: a === "cancel" ? "User cancelled" : "Wrong PIN entered",
          updated_at:    new Date().toISOString(),
        };

  const { error } = await supabase.from("payments").update(update).eq("id", payment_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
