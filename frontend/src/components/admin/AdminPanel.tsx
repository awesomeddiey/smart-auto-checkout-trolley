"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Package, AlertTriangle, RotateCcw, CheckCircle2, Clock, WifiOff, Wifi, User } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";

const PIN = "0000";

export function AdminPanel() {
  const { modal, closeModal, customerName, customerPhone, clearCustomer } = useUiStore();
  const { session, demoMode, resetSession } = useCartStore();
  const [pin,      setPin]      = useState("");
  const [pinError, setPinError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const isOpen = modal === "admin";

  if (!isOpen) return null;

  const handleDigit = (d: string) => {
    const next = pin + d;
    if (next.length > 4) return;
    setPin(next);
    setPinError(false);
    if (next.length === 4) {
      if (next === PIN) {
        setUnlocked(true);
      } else {
        setPinError(true);
        setTimeout(() => { setPin(""); setPinError(false); }, 700);
      }
    }
  };

  const handleClose = () => {
    setPin("");
    setPinError(false);
    setUnlocked(false);
    closeModal();
  };

  const handleReset = () => {
    resetSession();
    clearCustomer();
    handleClose();
  };

  const items    = session?.items.filter((i) => i.status !== "removed") ?? [];
  const verified = items.filter((i) => i.status === "verified").length;
  const pending  = items.filter((i) => i.status === "pending").length;
  const flagged  = items.filter((i) => i.status === "flagged").length;

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="admin-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(10,14,26,0.88)", backdropFilter: "blur(10px)" }}
            onClick={handleClose}
          />

          <motion.div
            key="admin-modal"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="fixed inset-4 z-50 rounded-3xl flex flex-col overflow-hidden"
            style={{
              background: "rgba(13,20,36,0.98)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-indigo-400" />
                <span className="font-bold text-white text-sm">Admin Panel</span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={demoMode
                    ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }
                    : { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }
                  }
                >
                  {demoMode ? <WifiOff size={9} /> : <Wifi size={9} />}
                  {demoMode ? "Demo" : "Live"}
                </span>
              </div>
              <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {!unlocked ? (
              /* ── PIN Entry ── */
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-xs">
                  <div className="text-center mb-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
                    >
                      <Shield size={24} className="text-indigo-400" />
                    </div>
                    <p className="text-white font-bold">Enter Admin PIN</p>
                    <p className="text-white/40 text-sm mt-0.5">4-digit access PIN</p>
                  </div>

                  {/* Dots */}
                  <div className="flex justify-center gap-4 mb-7">
                    {[0,1,2,3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: pin.length > i ? 1.25 : 1 }}
                        className={`w-4 h-4 rounded-full border-2 transition-colors ${
                          pinError
                            ? "border-rose-500 bg-rose-500/50"
                            : pin.length > i
                            ? "border-cyan-400 bg-cyan-400"
                            : "border-white/20"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-3">
                    {KEYS.map((k, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (k === "⌫") setPin((p) => p.slice(0, -1));
                          else if (k)    handleDigit(k);
                        }}
                        disabled={!k}
                        className="h-14 rounded-2xl font-bold text-xl transition-all active:scale-90 disabled:opacity-0 disabled:pointer-events-none text-white"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {pinError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-rose-400 text-sm text-center mt-4"
                      >
                        Incorrect PIN
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              /* ── Dashboard ── */
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Customer */}
                {customerName && (
                  <div className="rounded-xl p-3.5 flex items-center gap-3"
                    style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <User size={16} className="text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-semibold">{customerName}</p>
                      {customerPhone && <p className="text-white/40 text-xs font-mono">+263 {customerPhone}</p>}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { label: "Items",    value: items.length, color: "#00d4ff", icon: <Package size={13} /> },
                    { label: "Verified", value: verified,     color: "#10b981", icon: <CheckCircle2 size={13} /> },
                    { label: "Pending",  value: pending,      color: "#f59e0b", icon: <Clock size={13} /> },
                    { label: "Flagged",  value: flagged,      color: "#f43f5e", icon: <AlertTriangle size={13} /> },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3 text-center"
                      style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                      <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                      <div className="text-lg font-extrabold text-white">{s.value}</div>
                      <div className="text-xs font-medium" style={{ color: `${s.color}99` }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Session */}
                {session && (
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="px-4 py-2.5 border-b border-white/8"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Session</p>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <Row label="Token"   value={session.session_token.slice(0, 12) + "…"} mono />
                      <Row label="Status"  value={session.status} color="text-emerald-400" />
                      <Row label="Trolley" value={session.trolley_id ?? "—"} mono />
                      <Row label="Total"   value={formatCurrency(session.total_amount)} color="text-cyan-400" />
                    </div>
                  </div>
                )}

                {/* Items */}
                {items.length > 0 && (
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="px-4 py-2.5 border-b border-white/8"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Cart Items</p>
                    </div>
                    <div className="divide-y divide-white/5 max-h-52 overflow-y-auto">
                      {items.map((item) => (
                        <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-white/35 text-xs">{item.product.sku}</p>
                          </div>
                          <span className="text-white/50 font-mono text-xs">{formatCurrency(item.unit_price)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${
                            item.status === "verified" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                            item.status === "flagged"  ? "bg-rose-500/15 text-rose-400 border-rose-500/25" :
                            "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          }`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reset */}
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 text-rose-400 border border-rose-500/25 hover:bg-rose-500/10"
                >
                  <RotateCcw size={14} /> Reset Session & Sign Out
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/45">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${color ?? "text-white/70"} text-xs`}>{value}</span>
    </div>
  );
}
