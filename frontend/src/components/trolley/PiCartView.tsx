"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart, PackageCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { usePiCartStore, piItemStatus } from "@/store/piCartStore";
import { formatCurrency } from "@/lib/utils";

export function PiCartView() {
  const { items, unscannedCount } = usePiCartStore();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-cyan-400" />
          <h2 className="font-bold text-white text-base">Your Cart</h2>
          {items.length > 0 && (
            <span className="bg-cyan-400/20 text-cyan-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {unscannedCount > 0 && (
          <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold animate-pulse">
            <AlertTriangle size={13} />
            {unscannedCount} unscanned
          </div>
        )}
      </div>

      {/* Unscanned warning */}
      <AnimatePresence>
        {unscannedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex-shrink-0 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2"
          >
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              {unscannedCount} item{unscannedCount > 1 ? "s were" : " was"} placed in the trolley
              without scanning. Please scan or remove before checkout.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32 text-white/25 gap-3"
            >
              <PackageCheck size={40} strokeWidth={1} />
              <p className="text-sm">No items in cart yet</p>
            </motion.div>
          ) : (
            items.map((item) => {
              const status = piItemStatus(item.verification_status);
              const isFlagged = status === "flagged";
              const isVerified = status === "verified";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`relative rounded-xl border overflow-hidden ${
                    isFlagged
                      ? "border-rose-500/40 bg-rose-500/10"
                      : isVerified
                      ? "border-emerald-500/30 bg-white/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  {isFlagged && (
                    <motion.div
                      className="absolute inset-0 border-2 border-rose-500/50 rounded-xl pointer-events-none"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  <div className="flex items-center gap-3 p-3">
                    {/* Status icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isVerified ? "bg-emerald-500/20" : isFlagged ? "bg-rose-500/20" : "bg-amber-500/15"
                      }`}
                    >
                      {isVerified ? (
                        <CheckCircle2 size={20} className="text-emerald-400" />
                      ) : isFlagged ? (
                        <AlertTriangle size={20} className="text-rose-400" />
                      ) : (
                        <Clock size={20} className="text-amber-400" />
                      )}
                    </div>

                    {/* Name + barcode */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                      <p className="text-white/35 text-xs mt-0.5 font-mono">{item.barcode}</p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        isVerified
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isFlagged
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {isVerified ? "Verified" : isFlagged ? "Flagged" : "Pending"}
                    </span>

                    {/* Price */}
                    <p className="price-tag text-white text-sm flex-shrink-0 ml-1">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {isFlagged && (
                    <div className="px-3 pb-2 flex items-center gap-1.5 text-rose-400 text-xs">
                      <AlertTriangle size={11} />
                      Verification failed — please seek staff assistance
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
