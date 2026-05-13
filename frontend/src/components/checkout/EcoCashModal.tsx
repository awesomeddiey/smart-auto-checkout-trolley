"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { trolleyWs } from "@/lib/websocket";
import type { ReceiptData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";

export function EcoCashModal() {
  const { modal, closeModal, showReceipt } = useUiStore();
  const { session, demoMode, resetSession } = useCartStore();
  const [payStatus, setPayStatus] = useState<"pending" | "processing" | "completed" | "failed">("pending");
  const [dots, setDots]           = useState(".");
  const timersRef                 = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (modal !== "ecocash") return;
    setPayStatus("pending");

    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);

    const clear = () => {
      clearInterval(dotsInterval);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    if (demoMode) {
      // Simulate payment flow without backend
      const t1 = setTimeout(() => setPayStatus("processing"), 2000);
      const t2 = setTimeout(() => {
        setPayStatus("completed");
        const receipt: ReceiptData = {
          receipt_number:  `RCP-${Date.now().toString().slice(-6)}`,
          transaction_ref: `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          ecocash_ref:     `ECO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          customer_phone:  session?.customer_phone ?? undefined,
          amount:          session?.total_amount ?? 0,
          items:           session?.items
            .filter((i) => i.status !== "removed")
            .map((i) => ({
              name:       i.product.name,
              quantity:   i.quantity,
              unit_price: i.unit_price,
              line_total: i.unit_price * i.quantity,
            })) ?? [],
          paid_at:    new Date().toISOString(),
          trolley_id: session?.trolley_id,
        };
        const t3 = setTimeout(() => {
          showReceipt(receipt, receipt.transaction_ref);
          resetSession();
        }, 1500);
        timersRef.current.push(t3);
      }, 5000);
      timersRef.current = [t1, t2];
      return () => clear();
    }

    // Live mode — listen to WebSocket events
    const unsubscribe = trolleyWs.subscribe((msg) => {
      if (msg.type === "payment_update") {
        const d = msg.data as { status: string };
        if (d.status === "processing") setPayStatus("processing");
      }
      if (msg.type === "payment_completed") {
        const d = msg.data as { receipt: ReceiptData; ref: string };
        setPayStatus("completed");
        clearInterval(dotsInterval);
        setTimeout(() => showReceipt(d.receipt, d.ref ?? ""), 1500);
      }
      if (msg.type === "payment_failed") {
        setPayStatus("failed");
        clearInterval(dotsInterval);
      }
    });

    return () => {
      clear();
      unsubscribe();
    };
  }, [modal]);

  if (modal !== "ecocash" || !session) return null;

  const phone = session.customer_phone ?? "your phone";

  return (
    <AnimatePresence>
      <motion.div
        key="ecocash-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(10,14,26,0.9)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="w-full max-w-sm glass p-8 rounded-3xl text-center"
        >
          <AnimatePresence mode="wait">
            {payStatus === "failed" ? (
              <motion.div key="failed" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center">
                  <XCircle size={40} className="text-rose-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Payment Failed</h2>
                <p className="text-white/50 text-sm">The payment was not completed. Please try again.</p>
                <button onClick={closeModal} className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2">
                  <RefreshCw size={16} /> Try Again
                </button>
              </motion.div>
            ) : payStatus === "completed" ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <motion.div
                  className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center"
                  animate={{ boxShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 40px rgba(16,185,129,0.6)", "0 0 0px rgba(16,185,129,0)"] }}
                  transition={{ duration: 1.5 }}
                >
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-extrabold text-white">Payment Confirmed!</h2>
                <p className="text-white/50 text-sm">Generating your receipt…</p>
              </motion.div>
            ) : (
              <motion.div key="waiting" className="space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #00a859, #007a40)", boxShadow: "0 0 30px rgba(0,168,89,0.4)" }}>
                  <Smartphone size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Awaiting Payment</h2>
                  <p className="text-white/50 text-sm mt-1.5">
                    {payStatus === "processing" ? "Processing your payment…" : "A payment prompt was sent to"}
                  </p>
                  {payStatus === "pending" && (
                    <p className="text-cyan-400 font-mono font-bold text-lg mt-1">{phone}</p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Loader2 size={20} className="text-cyan-400 animate-spin" />
                  <span className="text-white/60 text-sm">
                    {payStatus === "processing" ? `Processing${dots}` : `Waiting for approval${dots}`}
                  </span>
                </div>
                <div className="space-y-2 text-left">
                  {[
                    { label: "Request sent to EcoCash",  done: true },
                    { label: "Waiting for PIN approval", done: payStatus === "processing" },
                    { label: "Payment processing",       done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-emerald-500" : "border border-white/20"}`}>
                        {step.done && <CheckCircle2 size={10} className="text-white" />}
                      </div>
                      <span className={step.done ? "text-white" : "text-white/40"}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
