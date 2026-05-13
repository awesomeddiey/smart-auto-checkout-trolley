"use client";
import { motion } from "framer-motion";
import { Trash2, CheckCircle2, Clock, AlertTriangle, Eye, Scale } from "lucide-react";
import type { CartItem as CartItemType } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface CartItemProps {
  item:     CartItemType;
  onRemove: (id: number) => void;
}

export function CartItemRow({ item, onRemove }: CartItemProps) {
  const isActive  = item.status !== "removed";
  const isFlagged = item.status === "flagged";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: isActive ? 1 : 0.4, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative rounded-xl border transition-all duration-300 overflow-hidden ${
        isFlagged
          ? "border-rose-500/40 bg-rose-500/10"
          : item.status === "verified"
          ? "border-emerald-500/30 bg-white/5"
          : item.status === "removed"
          ? "border-gray-500/20 bg-gray-500/5 opacity-40"
          : "border-amber-500/30 bg-amber-500/5"
      }`}
    >
      {/* Flagged glow */}
      {isFlagged && (
        <motion.div
          className="absolute inset-0 border-2 border-rose-500/50 rounded-xl pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="flex items-center gap-3 p-3">
        {/* Product icon / image */}
        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-xl">
          {item.product.image_url ? (
            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <span>{item.product.category?.icon ?? "📦"}</span>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{item.product.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={item.status} size="sm" />
            {item.status === "pending" && (
              <span className="text-xs text-white/40 flex items-center gap-1">
                <Eye size={10} /> Vision
                <Scale size={10} className="ml-1" /> Weight
              </span>
            )}
            {item.vision_confidence && item.status === "verified" && (
              <span className="text-xs text-white/30">
                {(item.vision_confidence * 100).toFixed(0)}% conf
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <p className="price-tag text-white text-sm">{formatCurrency(item.unit_price)}</p>
          {item.quantity > 1 && (
            <p className="text-white/40 text-xs">×{item.quantity}</p>
          )}
        </div>

        {/* Remove */}
        {item.status !== "removed" && (
          <button
            onClick={() => onRemove(item.id)}
            className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Flagged reason */}
      {isFlagged && (
        <div className="px-3 pb-2 flex items-center gap-1.5 text-rose-400 text-xs">
          <AlertTriangle size={11} />
          Verification failed — please remove this item or seek staff assistance
        </div>
      )}
    </motion.div>
  );
}
