"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, CheckCircle2, XCircle, Loader2, RefreshCw, KeyRound } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { usePiCartStore } from "@/store/piCartStore";
import { supabase } from "@/lib/supabase";
import type { ReceiptData } from "@/types";
import { formatCurrency } from "@/lib/utils";

type PayStatus = "initiating" | "sent_to_phone" | "processing" | "completed" | "failed" | "cancelled";

interface PaymentRow {
  id: string;
  status: string;
  amount: number;
  customer_phone: string;
  merchant_reference: string;
  ecocash_reference: string | null;
  receipt_number: string | null;
  error_message: string | null;
}

export function EcoCashModal() {
  const { modal, closeModal, showReceipt, customerPhone } = useUiStore();
  const { session, resetSession } = useCartStore();
  const { session: piSession, items: piItems } = usePiCartStore();

  const [payStatus, setPayStatus] = useState<PayStatus>("initiating");
  const [payment,   setPayment]   = useState<PaymentRow | null>(null);
  const [pin,       setPin]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [simulated, setSimulated] = useState(false);
  const [dots,      setDots]      = useState(".");
  const initRef = useRef(false);

  // ── Initiate payment as soon as modal opens ──
  useEffect(() => {
    if (modal !== "ecocash") {
      initRef.current = false;
      setPayStatus("initiating");
      setPayment(null);
      setPin("");
      setErrorMsg("");
      setSimulated(false);
      return;
    }
    if (initRef.current) return;
    initRef.current = true;

    const phone = customerPhone || session?.customer_phone || "";
    const amount = piSession
      ? piItems.reduce((s, i) => s + (i.price || 0), 0)
      : (session?.total_amount ?? 0);
    const sessionId = piSession?.id || session?.trolley_id || null;

    (async () => {
      try {
        const res = await fetch("/api/ecocash/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, phone, amount }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start payment");
        setSimulated(Boolean(data.simulated));

        // Fetch the row so we can subscribe
        const { data: row } = await supabase
          .from("payments")
          .select("*")
          .eq("id", data.payment_id)
          .single();
        if (row) {
          setPayment(row as PaymentRow);
          setPayStatus((row.status as PayStatus) || "sent_to_phone");
        }
      } catch (e) {
        setPayStatus("failed");
        setErrorMsg((e as Error).message);
      }
    })();
  }, [modal, customerPhone, session, piSession, piItems]);

  // ── Subscribe to payment row updates ──
  useEffect(() => {
    if (!payment?.id) return;
    const channel = supabase
      .channel(`payment-${payment.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${payment.id}` },
        (msg) => {
          const next = msg.new as PaymentRow;
          setPayment(next);
          setPayStatus(next.status as PayStatus);
          if (next.status === "completed") {
            const receipt: ReceiptData = {
              receipt_number:  next.receipt_number || `RCP-${Date.now().toString().slice(-6)}`,
              transaction_ref: next.merchant_reference,
              ecocash_ref:     next.ecocash_reference || "",
              customer_phone:  next.customer_phone,
              amount:          Number(next.amount),
              items:           piItems.length
                ? piItems.map((i) => ({ name: i.name, quantity: 1, unit_price: i.price, line_total: i.price }))
                : (session?.items.filter((i) => i.status !== "removed").map((i) => ({
                    name: i.product.name, quantity: i.quantity,
                    unit_price: i.unit_price, line_total: i.unit_price * i.quantity,
                  })) ?? []),
              paid_at:    new Date().toISOString(),
              trolley_id: piSession?.trolley_id ?? session?.trolley_id,
            };
            setTimeout(() => {
              showReceipt(receipt, next.merchant_reference);
              if (session) resetSession();
            }, 1200);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [payment?.id, session, piItems, piSession, showReceipt, resetSession]);

  // animated dots
  useEffect(() => {
    if (modal !== "ecocash") return;
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(t);
  }, [modal]);

  // ── PIN submission (demo / simulated mode only) ──
  const submitPin = async (action: "approve" | "cancel" = "approve") => {
    if (!payment) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/ecocash/simulate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: payment.id, pin, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PIN rejected");
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (modal !== "ecocash") return null;

  const phone   = payment?.customer_phone || customerPhone || session?.customer_phone || "your phone";
  const amount  = payment?.amount ?? (piSession
    ? piItems.reduce((s, i) => s + (i.price || 0), 0)
    : session?.total_amount ?? 0);
  const isDone  = payStatus === "completed";
  const isFail  = payStatus === "failed" || payStatus === "cancelled";

  return (
    <AnimatePresence>
      <motion.div
        key="ecocash-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(10,14,26,0.92)" }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="w-full max-w-sm glass p-7 rounded-3xl text-center"
        >
          <AnimatePresence mode="wait">
            {isFail ? (
              <motion.div key="failed" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center">
                  <XCircle size={40} className="text-rose-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">
                  {payStatus === "cancelled" ? "Payment Cancelled" : "Payment Failed"}
                </h2>
                <p className="text-white/50 text-sm">{errorMsg || payment?.error_message || "The payment was not completed."}</p>
                <button onClick={closeModal} className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2">
                  <RefreshCw size={16} /> Try Again
                </button>
              </motion.div>
            ) : isDone ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <motion.div
                  className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center"
                  animate={{ boxShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 40px rgba(16,185,129,0.6)", "0 0 0px rgba(16,185,129,0)"] }}
                  transition={{ duration: 1.5 }}
                >
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-extrabold text-white">Payment Confirmed</h2>
                <p className="text-white/50 text-sm">Generating your receipt…</p>
              </motion.div>
            ) : (
              <motion.div key="waiting" className="space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #00a859, #007a40)", boxShadow: "0 0 30px rgba(0,168,89,0.4)" }}>
                  <Smartphone size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">EcoCash Prompt</h2>
                  <p className="text-white/50 text-sm mt-1.5">
                    {payStatus === "initiating" ? "Sending prompt…" : `Sent to ${phone}`}
                  </p>
                  <p className="price-tag text-3xl font-extrabold text-white mt-2">{formatCurrency(amount)}</p>
                </div>

                {/* If real EcoCash, just show the waiting state — user enters PIN on phone */}
                {!simulated ? (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 size={20} className="text-cyan-400 animate-spin" />
                      <span className="text-white/60 text-sm">
                        Waiting for PIN on your phone{dots}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs">
                      A USSD prompt was sent to your handset. Enter your EcoCash PIN to complete.
                    </p>
                  </>
                ) : (
                  /* Simulated mode: web-based PIN entry */
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-1.5 text-amber-400/80 text-xs">
                      <KeyRound size={12} /> Demo mode — enter any 4-digit PIN
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      className="w-32 mx-auto text-center text-2xl font-mono tracking-[0.6em] py-3 rounded-xl bg-white/10 border border-white/15 focus:border-cyan-400/50 outline-none text-white"
                    />
                    {errorMsg && <p className="text-rose-400 text-xs">{errorMsg}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitPin("cancel")}
                        disabled={submitting}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitPin("approve")}
                        disabled={submitting || pin.length < 4}
                        className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #00a859, #007a40)" }}
                      >
                        {submitting ? "…" : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
