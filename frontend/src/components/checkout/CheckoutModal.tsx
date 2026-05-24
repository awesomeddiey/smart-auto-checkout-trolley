"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, CreditCard, Shield, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { usePiCartStore, piItemStatus } from "@/store/piCartStore";
import { useUiStore } from "@/store/uiStore";
import { formatCurrency } from "@/lib/utils";

export function CheckoutModal() {
  const { modal, closeModal, openModal, customerPhone, setCustomer, customerName } = useUiStore();
  const { session, setSession } = useCartStore();
  const { session: piSession, items: piItems } = usePiCartStore();

  const [phone,     setPhone]     = useState(customerPhone ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState("");

  if (modal !== "checkout") return null;

  // ── Pick the right cart depending on mode ──
  const items = piSession
    ? piItems.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: 1,
        unit_price: i.price,
        line_total: i.price,
        verified: piItemStatus(i.verification_status) === "verified",
      }))
    : (session?.items.filter((i) => i.status !== "removed").map((i) => ({
        id: String(i.id),
        name: i.product.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.unit_price * i.quantity,
        verified: i.status === "verified",
      })) ?? []);

  const total = piSession
    ? piItems.reduce((s, i) => s + (i.price || 0), 0)
    : (session?.total_amount ?? 0);

  if (items.length === 0) {
    return (
      <AnimatePresence>
        <motion.div
          key="empty-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,14,26,0.92)" }}
          onClick={closeModal}
        >
          <div className="glass p-6 rounded-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white/70">Your cart is empty.</p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const handlePay = () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.replace(/\D/g, "").length < 9) {
      setError("Enter a valid phone number");
      return;
    }
    setIsLoading(true);
    setError("");
    // Save the phone for EcoCashModal to read.
    setCustomer(customerName ?? "Customer", trimmed);
    if (session) setSession({ ...session, customer_phone: trimmed });
    openModal("ecocash");
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="checkout-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(10, 14, 26, 0.92)" }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-md glass p-6 rounded-3xl relative"
        >
          <button onClick={closeModal} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(99,102,241,0.2))", border: "1px solid rgba(0,212,255,0.3)" }}>
              <CreditCard size={28} className="text-cyan-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Checkout</h2>
            <p className="text-white/50 text-sm mt-1">Pay via EcoCash</p>
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

          {/* Phone */}
          <div className="space-y-2 mb-4">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest flex items-center gap-1.5">
              <Phone size={11} /> EcoCash Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-mono">+263</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(""); }}
                placeholder="77 123 4567"
                className="w-full pl-14 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-400/50 outline-none text-white font-mono text-sm"
              />
            </div>
            {error && <p className="text-rose-400 text-xs">{error}</p>}
          </div>

          <div className="flex items-center gap-2 text-white/30 text-xs mb-4">
            <Shield size={11} />
            Secured by EcoCash. PIN entered on your handset.
          </div>

          <button
            onClick={handlePay}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #00d4ff, #6366f1)", boxShadow: "0 0 25px rgba(0,212,255,0.35)" }}
          >
            {isLoading ? "Processing…" : (
              <><span>Pay {formatCurrency(total)}</span><ChevronRight size={20} /></>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
