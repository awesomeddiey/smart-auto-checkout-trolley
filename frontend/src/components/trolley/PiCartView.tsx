"use client";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingCart, PackageCheck, AlertTriangle,
  CheckCircle2, Clock, ScanLine,
} from "lucide-react";
import { usePiCartStore, piItemStatus } from "@/store/piCartStore";
import { formatCurrency } from "@/lib/utils";

export function PiCartView() {
  const { items, unscannedCount } = usePiCartStore();

  const verifiedItems = items.filter((i) => piItemStatus(i.verification_status) === "verified");
  const pendingItems  = items.filter((i) => piItemStatus(i.verification_status) !== "verified");
  const showUnscanned = items.length > 0 && unscannedCount > 0;
  const needsAttention = pendingItems.length > 0 || showUnscanned;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <ShoppingCart size={18} className="text-cyan-400" />
        <h2 className="font-bold text-white text-base">Your Cart</h2>
        {items.length > 0 && (
          <span className="bg-cyan-400/20 text-cyan-400 text-xs font-bold px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-white/25 gap-3">
          <PackageCheck size={40} strokeWidth={1} />
          <p className="text-sm">No items in cart yet</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 gap-4 min-h-0 overflow-y-auto pr-1">

          {/* ── Verified section ─────────────────────────────────────── */}
          {verifiedItems.length > 0 && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Verified &nbsp;·&nbsp; {verifiedItems.length}
                </span>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {verifiedItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                        <p className="text-white/30 text-xs font-mono mt-0.5">{item.barcode}</p>
                      </div>
                      <p className="price-tag text-white font-bold text-sm flex-shrink-0">
                        {formatCurrency(item.price)}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── Needs attention section ───────────────────────────────── */}
          {needsAttention && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={12} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Needs Attention &nbsp;·&nbsp; {pendingItems.length + (showUnscanned ? unscannedCount : 0)}
                </span>
              </div>

              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {pendingItems.map((item) => {
                    const isFlagged = piItemStatus(item.verification_status) === "flagged";
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -14, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, x: 14, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                          isFlagged
                            ? "border-rose-500/40 bg-rose-500/10"
                            : "border-amber-500/30 bg-amber-500/10"
                        }`}
                      >
                        {isFlagged && (
                          <motion.div
                            className="absolute inset-0 rounded-xl border-2 border-rose-500/40 pointer-events-none"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isFlagged ? "bg-rose-500/20" : "bg-amber-500/15"
                        }`}>
                          {isFlagged
                            ? <AlertTriangle size={13} className="text-rose-400" />
                            : <Clock size={13} className="text-amber-400" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-xs truncate">{item.name}</p>
                          {isFlagged && (
                            <p className="text-rose-400/80 text-xs">Verification failed</p>
                          )}
                        </div>

                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          isFlagged
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {isFlagged ? "Flagged" : "Pending"}
                        </span>

                        <p className="text-white/40 text-xs flex-shrink-0 ml-0.5">
                          {formatCurrency(item.price)}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Unscanned row */}
                <AnimatePresence>
                  {showUnscanned && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <ScanLine size={13} className="text-amber-400" />
                      </div>
                      <p className="flex-1 text-xs text-amber-300">
                        {unscannedCount} unscanned item{unscannedCount > 1 ? "s" : ""} — scan before checkout
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
