"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUiStore } from "@/store/uiStore";
import { formatCurrency } from "@/lib/utils";

export function BillSummary() {
  const { session } = useCartStore();
  const { openModal } = useUiStore();

  const items    = session?.items.filter((i) => i.status !== "removed") ?? [];
  const total    = session?.total_amount ?? 0;
  const flagged  = items.filter((i) => i.status === "flagged").length;
  const pending  = items.filter((i) => i.status === "pending").length;
  const verified = items.filter((i) => i.status === "verified").length;
  const canCheckout = items.length > 0 && flagged === 0 && pending === 0;

  return (
    <div className="space-y-4">
      {/* Bill breakdown */}
      <div className="glass p-4 rounded-2xl space-y-2.5">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={16} className="text-cyan-400" />
          <h3 className="font-bold text-white text-sm">Bill Summary</h3>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-white/60">
            <span>Items</span>
            <span>{items.length}</span>
          </div>
          {verified > 0 && (
            <div className="flex justify-between text-emerald-400 text-xs">
              <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Verified</span>
              <span>{verified}</span>
            </div>
          )}
          {pending > 0 && (
            <div className="flex justify-between text-amber-400 text-xs">
              <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Checking</span>
              <span>{pending}</span>
            </div>
          )}
          {flagged > 0 && (
            <div className="flex justify-between text-rose-400 text-xs">
              <span className="flex items-center gap-1"><AlertTriangle size={11} /> Flagged</span>
              <span>{flagged}</span>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-2.5 mt-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-white">Total</span>
            <motion.span
              key={total}
              initial={{ scale: 1.2, color: "#00d4ff" }}
              animate={{ scale: 1, color: "#ffffff" }}
              className="price-tag text-xl font-extrabold text-white"
            >
              {formatCurrency(total)}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Checkout button */}
      <AnimatePresence mode="wait">
        {flagged > 0 ? (
          <motion.div
            key="flagged"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs text-center flex items-center justify-center gap-2"
          >
            <AlertTriangle size={13} />
            Remove {flagged} flagged item{flagged > 1 ? "s" : ""} to checkout
          </motion.div>
        ) : pending > 0 ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs text-center flex items-center justify-center gap-2"
          >
            <Loader2 size={13} className="animate-spin" />
            Verifying {pending} item{pending > 1 ? "s" : ""}…
          </motion.div>
        ) : (
          <motion.button
            key="checkout"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            disabled={!canCheckout}
            onClick={() => canCheckout && openModal("checkout")}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-200 relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: canCheckout
                ? "linear-gradient(135deg, #00d4ff 0%, #6366f1 100%)"
                : "rgba(255,255,255,0.1)",
              boxShadow: canCheckout ? "0 0 30px rgba(0,212,255,0.4)" : "none",
            }}
          >
            {canCheckout && (
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", backgroundSize: "200%" }}
                animate={{ backgroundPosition: ["-200%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative z-10">
              {items.length === 0 ? "Cart Empty" : "Checkout →"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
