"use client";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUiStore } from "@/store/uiStore";

export function ScanInput() {
  const [value,    setValue]   = useState("");
  const [feedback, setFeedback] = useState<"ok" | "err" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { scanItem, scanLoading, error, clearError } = useCartStore();

  // Auto-focus for barcode scanner — but never steal focus from an open modal
  useEffect(() => {
    const refocus = (e: MouseEvent) => {
      if (useUiStore.getState().modal !== "none") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      inputRef.current?.focus();
    };
    inputRef.current?.focus();
    document.addEventListener("click", refocus);
    return () => document.removeEventListener("click", refocus);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    clearError();
    const barcode = value.trim();
    setValue("");
    await scanItem(barcode);
    const hasError = useCartStore.getState().error;
    setFeedback(hasError ? "err" : "ok");
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-widest flex items-center gap-2">
        <Scan size={12} className="text-cyan-400" />
        Barcode Scanner
      </label>

      <form onSubmit={handleSubmit} className="relative">
        {scanLoading && (
          <motion.div
            className="absolute inset-0 z-10 rounded-xl overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-full h-1 scan-beam"
              animate={{ y: ["0%", "3000%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        )}

        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Scan or type barcode…"
            disabled={scanLoading}
            className={`w-full px-4 py-3.5 pr-12 rounded-xl font-mono text-sm bg-white/5 border transition-all duration-200 outline-none
              text-white placeholder-white/25
              ${scanLoading ? "border-cyan-400/50 bg-cyan-400/5" : "border-white/10 focus:border-cyan-400/50 focus:bg-white/8"}`}
            autoComplete="off"
          />
          <div className="absolute right-3">
            {scanLoading ? (
              <Loader2 size={18} className="text-cyan-400 animate-spin" />
            ) : feedback === "ok" ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <CheckCircle2 size={18} className="text-emerald-400" />
              </motion.div>
            ) : feedback === "err" ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <XCircle size={18} className="text-rose-400" />
              </motion.div>
            ) : (
              <Scan size={18} className="text-white/20" />
            )}
          </div>
        </div>
      </form>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-rose-400 text-xs flex items-center gap-1"
          >
            <XCircle size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-white/25 text-xs">Physical scanner auto-submits. Manual entry: press Enter.</p>
    </div>
  );
}
