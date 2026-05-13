"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart, PackageCheck, AlertTriangle } from "lucide-react";
import type { CartItem } from "@/types";
import { CartItemRow } from "./CartItem";
import { useCartStore } from "@/store/cartStore";

export function CartView() {
  const { session, removeItem } = useCartStore();
  const items = session?.items.filter((i) => i.status !== "removed") ?? [];
  const flagged = items.filter((i) => i.status === "flagged");

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
        {flagged.length > 0 && (
          <motion.div
            className="flex items-center gap-1 text-rose-400 text-xs font-semibold"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <AlertTriangle size={13} />
            {flagged.length} flagged
          </motion.div>
        )}
      </div>

      {/* Items list */}
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
              <p className="text-sm">Scan an item to add it</p>
            </motion.div>
          ) : (
            items.map((item) => (
              <CartItemRow key={item.id} item={item} onRemove={removeItem} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Removed items count */}
      {session && session.items.filter((i) => i.status === "removed").length > 0 && (
        <p className="text-center text-xs text-white/25 mt-2 flex-shrink-0">
          {session.items.filter((i) => i.status === "removed").length} item(s) removed
        </p>
      )}
    </div>
  );
}
