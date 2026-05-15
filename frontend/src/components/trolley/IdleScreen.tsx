"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Scan, Zap } from "lucide-react";

interface IdleScreenProps {
  onStart: () => void;
}

// Stable seed-based pseudo-random to avoid SSR/client mismatch
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const particles = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x:  seededRand(i * 5)    * 100,
  y:  seededRand(i * 5 + 1) * 100,
  size: seededRand(i * 5 + 2) * 3 + 1,
  delay: seededRand(i * 5 + 3) * 4,
  duration: seededRand(i * 5 + 4) * 3 + 5,
}));

export function IdleScreen({ onStart }: IdleScreenProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <motion.div
      key="idle"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Ambient particles — client-only to avoid SSR/Framer-Motion hydration mismatch */}
      {mounted && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-400/30"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-20, -80], opacity: [0.6, 0], scale: [1, 0.5] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Glow ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute rounded-full border border-cyan-400/10" style={{ width: 400, height: 400 }} />
      </div>

      {/* Main logo */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Icon cluster */}
        <div className="relative">
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(99,102,241,0.2))",
              border: "1px solid rgba(0,212,255,0.3)",
              boxShadow: "0 0 40px rgba(0,212,255,0.3)",
            }}
          >
            <ShoppingCart size={52} className="text-cyan-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
        </div>

        {/* Title */}

        <div className="text-center">
          <motion.h1
            className="text-5xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #00d4ff 50%, #6366f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Smart Trolley
          </motion.h1>
          <p className="text-white/50 text-lg mt-2 font-light tracking-wide">
            AI-Powered Auto-Checkout
          </p>
        </div>

        {/* CTA */}
        <motion.button
          onClick={onStart}
          className="relative group mt-4"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <div
            className="px-10 py-4 rounded-2xl font-bold text-xl text-white flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #6366f1)",
              boxShadow: "0 0 30px rgba(0,212,255,0.4)",
            }}
          >
            <Scan size={22} />
            Tap to Start Shopping
          </div>
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", backgroundSize: "200%" }}
            animate={{ backgroundPosition: ["-200% center", "200% center"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.button>

        {/* Features */}
        <div className="flex gap-8 mt-4">
          {["Scan & Verify", "AI Vision", "EcoCash Pay"].map((feat, i) => (
            <motion.div
              key={feat}
              className="flex flex-col items-center gap-1 text-white/40 text-xs font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
              {feat}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
