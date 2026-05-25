"use client";
import { useEffect, useState, useRef }         from "react";
import { motion, AnimatePresence }              from "framer-motion";
import { Smartphone, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useUiStore }    from "@/store/uiStore";
import { useCartStore }  from "@/store/cartStore";
import { usePiCartStore } from "@/store/piCartStore";
import { supabase }      from "@/lib/supabase";
import type { ReceiptData } from "@/types";
import { formatCurrency } from "@/lib/utils";

type PayStatus = "initiating" | "pending" | "completed" | "failed" | "cancelled";

interface PaymentRow {
  id:                 string;
  status:             string;
  amount:             number;
  customer_phone:     string;
  merchant_reference: string;
  ecocash_reference:  string | null;
  receipt_number:     string | null;
  error_message:      string | null;
}

export function EcoCashModal() {
  const { modal, closeModal, showReceipt, customerPhone } = useUiStore();
  const { session, resetSession }  = useCartStore();
  const { session: piSession, items: piItems } = usePiCartStore();

  const [payStatus,    setPayStatus]    = useState<PayStatus>("initiating");
  const [payment,      setPayment]      = useState<PaymentRow | null>(null);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [instructions, setInstructions] = useState<string | null>(null);
  const [dots,         setDots]         = useState(".");
  const initRef = useRef(false);

  useEffect(() => {
    if (modal !== "ecocash") {
      initRef.current = false;
      setPayStatus("initiating");
      setPayment(null);
      setErrorMsg("");
      setInstructions(null);
      return;
    }
    if (initRef.current) return;
    initRef.current = true;

    const phone     = customerPhone || session?.customer_phone || "";
    const amount    = piSession
      ? piItems.reduce((s, i) => s + (i.price || 0), 0)
      : (session?.total_amount ?? 0);
    const sessionId = piSession?.id || session?.trolley_id || null;

    (async () => {
      try {
        const res = await fetch("/api/paynow/initiate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ session_id: sessionId, phone, amount, method: "ecocash" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start payment");

        if (!data.express && data.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }

        if (data.instructions) setInstructions(data.instructions);

        const { data: row } = await supabase
          .from("payments").select("*").eq("id", data.payment_id).single();
        if (row) {
          setPayment(row as PaymentRow);
          setPayStatus("pending");
        }
      } catch (e) {
        setPayStatus("failed");
        setErrorMsg((e as Error).message);
      }
    })();
  }, [modal, customerPhone, session, piSession, piItems]);

  useEffect(() => {
    if (!payment?.id) return;
    const ch = supabase
      .channel(`pay-${payment.id}`)
      .on("postgres_changes",
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
              items: piItems.length
                ? piItems.map((i) => ({ name: i.name, quantity: 1, unit_price: i.price, line_total: i.price }))
                : (session?.items.filter((i) => i.status !== "removed").map((i) => ({
                    name: i.product.name, quantity: i.quantity,
                    unit_price: i.unit_price, line_total: i.unit_price * i.quantity,
                  })) ?? []),
              paid_at:    new Date().toISOString(),
              trolley_id: piSession?.trolley_id ?? session?.trolley_id,
            };
            if (piSession) {
              supabase.from("cart_items")
                .update({ is_removed: true, removed_at: new Date().toISOString() })
                .eq("session_id", piSession.id).eq("is_removed", false)
                .then(() => supabase.from("cart_sessions")
                  .update({ status: "completed", ended_at: new Date().toISOString() })
                  .eq("id", piSession.id));
            }
            setTimeout(() => { showReceipt(receipt, next.merchant_reference); if (session) resetSession(); }, 1200);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [payment?.id, session, piItems, piSession, showReceipt, resetSession]);

  useEffect(() => {
    if (modal !== "ecocash") return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, [modal]);

  if (modal !== "ecocash") return null;

  const phone  = payment?.customer_phone || customerPhone || session?.customer_phone || "your phone";
  const amount = payment?.amount ?? (piSession
    ? piItems.reduce((s, i) => s + (i.price || 0), 0)
    : (session?.total_amount ?? 0));

  const isDone = payStatus === "completed";
  const isFail = payStatus === "failed" || payStatus === "cancelled";

  // Extract a USSD code from the instructions if present
  const ussdMatch = instructions?.match(/\*\d+(?:\*\d+)*#/);
  const ussdCode  = ussdMatch?.[0];

  return (
    <AnimatePresence>
      <motion.div key="ecocash-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(10,14,26,0.92)" }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="w-full max-w-sm glass p-7 rounded-3xl text-center">

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
                <button onClick={closeModal}
                  className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2">
                  <RefreshCw size={16} /> Try Again
                </button>
              </motion.div>
            ) : isDone ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <motion.div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center"
                  animate={{ boxShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 40px rgba(16,185,129,0.6)", "0 0 0px rgba(16,185,129,0)"] }}
                  transition={{ duration: 1.5 }}>
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
                  <h2 className="text-2xl font-extrabold text-white">
                    {payStatus === "initiating" ? "Sending USSD…" : "Approve on Your Phone"}
                  </h2>
                  <p className="text-white/50 text-sm mt-1.5">
                    {payStatus === "initiating"
                      ? "Contacting Paynow…"
                      : `EcoCash PIN prompt sent to ${phone}`}
                  </p>
                  <p className="price-tag text-3xl font-extrabold text-white mt-2">{formatCurrency(amount)}</p>
                </div>

                {ussdCode && (
                  <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 space-y-1.5">
                    <p className="text-white/70 text-xs uppercase tracking-widest">If no prompt appeared</p>
                    <p className="text-white text-sm">Dial this on your handset:</p>
                    <p className="text-cyan-300 text-2xl font-mono font-bold">{ussdCode}</p>
                    <p className="text-white/40 text-xs">then enter your EcoCash PIN.</p>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <Loader2 size={20} className="text-cyan-400 animate-spin" />
                  <span className="text-white/60 text-sm">Waiting for PIN confirmation{dots}</span>
                </div>
                <button onClick={closeModal} className="text-white/30 text-xs hover:text-white/60 transition-colors">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
