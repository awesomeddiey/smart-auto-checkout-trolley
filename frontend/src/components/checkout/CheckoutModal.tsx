"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Shield, ChevronRight } from "lucide-react";
import { useCartStore }    from "@/store/cartStore";
import { usePiCartStore }  from "@/store/piCartStore";
import { useUiStore }      from "@/store/uiStore";
import { formatCurrency }  from "@/lib/utils";

export function CheckoutModal() {
  const { modal, closeModal, customerPhone, customerName } = useUiStore();
  const { session }                = useCartStore();
  const { session: piSession, items: piItems } = usePiCartStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState("");

  if (modal !== "checkout") return null;

  const items = piSession
    ? piItems.map((i) => ({
        id:         i.id,
        name:       i.name,
        quantity:   1,
        unit_price: i.price,
        line_total: i.price,
      }))
    : (session?.items.filter((i) => i.status !== "removed").map((i) => ({
        id:         String(i.id),
        name:       i.product.name,
        quantity:   i.quantity,
        unit_price: i.unit_price,
        line_total: i.unit_price * i.quantity,
      })) ?? []);

  const total = piSession
    ? piItems.reduce((s, i) => s + (i.price || 0), 0)
    : (session?.total_amount ?? 0);

  if (items.length === 0) {
    return (
      <AnimatePresence>
        <motion.div key="empty-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,14,26,0.92)" }} onClick={closeModal}>
          <div className="glass p-6 rounded-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white/70">Your cart is empty.</p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const handlePay = async () => {
    setIsLoading(true);
    setError("");

    const phone     = (customerPhone || "").trim() || "0770000000";
    const sessionId = piSession?.id || session?.trolley_id || null;

    try {
      const res = await fetch("/api/paynow/initiate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionId, phone, amount: total }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirect_url) throw new Error(data.error || "Could not start payment");
      window.location.href = data.redirect_url;
    } catch (e) {
      setError((e as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div key="checkout-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(10, 14, 26, 0.92)" }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-md glass p-6 rounded-3xl relative">

          <button onClick={closeModal} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(99,102,241,0.2))", border: "1px solid rgba(0,212,255,0.3)" }}>
              <CreditCard size={28} className="text-cyan-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Checkout</h2>
            <p className="text-white/50 text-sm mt-1">Pay via EcoCash · Powered by Paynow</p>
          </div>

          {/* Order summary */}
          <div className="glass p-3 rounded-xl mb-4 space-y-1.5 max-h-40 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/70 truncate max-w-[200px]">
                  {item.quantity > 1 && <span className="text-white/40 mr-1">×{item.quantity}</span>}
                  {item.name}
                </span>
                <span className="text-white font-mono ml-2">{formatCurrency(item.line_total)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center py-3 border-t border-white/10 mb-4">
            <span className="font-bold text-white">Total</span>
            <span className="price-tag text-2xl font-extrabold text-white">{formatCurrency(total)}</span>
          </div>

          {error && <p className="text-rose-400 text-xs mb-3 text-center">{error}</p>}

          <div className="flex items-center gap-2 text-white/30 text-xs mb-4">
            <Shield size={11} />
            You will enter your EcoCash PIN on Paynow's secure page.
          </div>

          <button onClick={handlePay} disabled={isLoading}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #00d4ff, #6366f1)", boxShadow: "0 0 25px rgba(0,212,255,0.35)" }}>
            {isLoading
              ? "Redirecting to Paynow…"
              : <><span>Pay {formatCurrency(total)}</span><ChevronRight size={20} /></>}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
