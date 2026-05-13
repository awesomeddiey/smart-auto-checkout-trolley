"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShoppingBag, RefreshCw, Download } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ReceiptModal() {
  const { modal, receipt, closeModal }    = useUiStore();
  const { resetSession } = useCartStore();

  if (modal !== "receipt" || !receipt) return null;

  const handleNewSession = () => {
    closeModal();
    resetSession();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="receipt-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ background: "rgba(10,14,26,0.92)", backdropFilter: "blur(16px)" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="w-full max-w-md glass p-6 rounded-3xl my-4"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              className="w-20 h-20 mx-auto rounded-full mb-4 flex items-center justify-center"
              style={{ background: "radial-gradient(circle, rgba(16,185,129,0.3), rgba(16,185,129,0.1))", border: "2px solid rgba(16,185,129,0.4)" }}
              animate={{ boxShadow: ["0 0 20px rgba(16,185,129,0.3)", "0 0 50px rgba(16,185,129,0.6)", "0 0 20px rgba(16,185,129,0.3)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 size={40} className="text-emerald-400" />
            </motion.div>
            <h2 className="text-3xl font-extrabold text-white">Thank You!</h2>
            <p className="text-white/50 mt-1">Payment Successful</p>
          </div>

          {/* Receipt header */}
          <div className="glass p-4 rounded-2xl mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Receipt No.</span>
              <span className="text-white font-mono font-semibold">{receipt.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">EcoCash Ref</span>
              <span className="text-white font-mono text-xs">{receipt.ecocash_ref ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Date</span>
              <span className="text-white">{formatDate(receipt.paid_at)}</span>
            </div>
            {receipt.customer_phone && (
              <div className="flex justify-between">
                <span className="text-white/50">Phone</span>
                <span className="text-white">{receipt.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                <span className="text-white/70 flex-1 truncate">
                  {item.quantity > 1 && <span className="text-white/40 mr-1">×{item.quantity}</span>}
                  {item.name}
                </span>
                <span className="text-white font-mono ml-3">{formatCurrency(item.line_total)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-3 border-t border-white/20 mb-6">
            <span className="font-bold text-white text-lg">Total Paid</span>
            <span className="price-tag text-2xl font-extrabold text-emerald-400">{formatCurrency(receipt.amount)}</span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleNewSession}
              className="py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #00d4ff, #6366f1)", boxShadow: "0 0 20px rgba(0,212,255,0.3)" }}
            >
              <RefreshCw size={16} />
              New Cart
            </button>
            <button
              className="py-3.5 rounded-xl font-semibold text-white/60 bg-white/5 border border-white/10 flex items-center justify-center gap-2 transition-all hover:bg-white/10 active:scale-95"
            >
              <Download size={16} />
              Save
            </button>
          </div>

          <p className="text-center text-white/25 text-xs mt-4">
            Items have been verified ✓ — Have a great day!
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
