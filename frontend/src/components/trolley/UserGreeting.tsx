"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, User, Phone, ArrowRight, Zap } from "lucide-react";

interface UserGreetingProps {
  onConfirm: (name: string, phone: string) => void;
  defaultName?: string | null;
  defaultPhone?: string | null;
}

export function UserGreeting({ onConfirm, defaultName, defaultPhone }: UserGreetingProps) {
  const [name,   setName]   = useState(defaultName  ?? "");
  const [phone,  setPhone]  = useState(defaultPhone ?? "");
  const [errors, setErrors] = useState({ name: "", phone: "" });

  const submit = () => {
    const e = {
      name:  name.trim().length < 2  ? "Please enter your name"         : "",
      phone: phone.trim().length < 9 ? "Enter a valid phone number"     : "",
    };
    setErrors(e);
    if (e.name || e.phone) return;
    onConfirm(name.trim(), phone.trim());
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") submit(); };

  return (
    <motion.div
      key="greeting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--page-bg)" }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24, delay: 0.1 }}
        className="w-full max-w-sm px-6"
      >
        {/* Logo */}
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(99,102,241,0.2))",
              border: "1px solid rgba(0,212,255,0.35)",
              boxShadow: "0 0 30px rgba(0,212,255,0.2)",
            }}
          >
            <ShoppingCart size={28} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome!</h1>
          <p className="text-white/45 text-sm mt-1">Tell us who you are to get started</p>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
              <User size={11} /> Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              onKeyDown={onKey}
              placeholder="e.g. Tatenda Moyo"
              className={`w-full px-4 py-3.5 rounded-xl bg-white/5 border text-white text-sm placeholder-white/25 outline-none transition-all ${
                errors.name ? "border-rose-500/60 bg-rose-500/5" : "border-white/10 focus:border-cyan-400/50 focus:bg-white/8"
              }`}
              autoFocus
              autoComplete="off"
            />
            {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
              <Phone size={11} /> EcoCash Phone
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-mono pointer-events-none">+263</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }}
                onKeyDown={onKey}
                placeholder="77 123 4567"
                className={`w-full pl-14 pr-4 py-3.5 rounded-xl bg-white/5 border text-white font-mono text-sm placeholder-white/25 outline-none transition-all ${
                  errors.phone ? "border-rose-500/60 bg-rose-500/5" : "border-white/10 focus:border-cyan-400/50 focus:bg-white/8"
                }`}
                autoComplete="tel"
              />
            </div>
            {errors.phone
              ? <p className="text-rose-400 text-xs mt-1">{errors.phone}</p>
              : <p className="text-white/25 text-xs mt-1">Used for EcoCash payment at checkout</p>
            }
          </div>

          {/* Submit */}
          <motion.button
            onClick={submit}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 mt-1"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #6366f1)",
              boxShadow: "0 0 25px rgba(0,212,255,0.3)",
            }}
          >
            <Zap size={17} />
            Start Shopping
            <ArrowRight size={17} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
