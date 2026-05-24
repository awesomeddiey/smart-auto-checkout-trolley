"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart, Wifi, WifiOff, Sun, Moon, Shield } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUiStore } from "@/store/uiStore";
import { usePiCartStore } from "@/store/piCartStore";
import { useIdleTimer } from "@/hooks/useIdleTimer";

import { IdleScreen }  from "@/components/trolley/IdleScreen";
import { PiCartView }  from "@/components/trolley/PiCartView";
import { CartView }    from "@/components/trolley/CartView";
import { BillSummary } from "@/components/trolley/BillSummary";

const CheckoutModal     = dynamic(() => import("@/components/checkout/CheckoutModal").then(m => ({ default: m.CheckoutModal })));
const EcoCashModal      = dynamic(() => import("@/components/checkout/EcoCashModal").then(m => ({ default: m.EcoCashModal })));
const ReceiptModal      = dynamic(() => import("@/components/checkout/ReceiptModal").then(m => ({ default: m.ReceiptModal })));
const ShoppingAssistant = dynamic(() => import("@/components/assistant/ShoppingAssistant").then(m => ({ default: m.ShoppingAssistant })));
const StoreMapButton    = dynamic(() => import("@/components/map/StoreMap").then(m => ({ default: m.StoreMapButton })));
const AdminPanel        = dynamic(() => import("@/components/admin/AdminPanel").then(m => ({ default: m.AdminPanel })));

function LiveClock() {
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setTime(fmt());
    const t = setInterval(() => setTime(fmt()), 30_000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-sm text-white/50">{time}</span>;
}

export default function TrolleyPage() {
  const { session, demoMode, initSession } = useCartStore();
  const { isIdle, setIdle, openModal, theme, toggleTheme } = useUiStore();
  const { session: piSession, isLoading: piLoading, notFound, connect, disconnect: piDisconnect } = usePiCartStore();

  useIdleTimer(
    () => {
      const activeItems = session?.items.filter((i) => i.status !== "removed") ?? [];
      if (activeItems.length === 0 && !piSession) setIdle(true);
    },
    () => setIdle(false),
    90_000,
  );

  useEffect(() => {
    if (isIdle) piDisconnect();
  }, [isIdle]);

  const handleStartShopping = async () => {
    setIdle(false);
    await connect();
    if (!session) initSession();
  };

  const trolleyId = piSession?.trolley_id ?? session?.trolley_id ?? "—";
  const showIdle  = isIdle || (!piSession && !piLoading && !session);
  const showShop  = !showIdle;

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {showIdle ? (
          <IdleScreen key="idle" onStart={handleStartShopping} />
        ) : showShop ? (
          <motion.div
            key="trolley"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen flex flex-col overflow-hidden"
            style={{ background: "var(--page-bg)" }}
          >
            {/* Demo / offline banner */}
            <AnimatePresence>
              {demoMode && !piSession && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/30 py-1.5 text-amber-400 text-xs font-medium overflow-hidden flex-shrink-0"
                >
                  <WifiOff size={12} />
                  Demo Mode — trolley offline.
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Top Bar ── */}
            <header className="flex items-center justify-between px-5 py-2.5 flex-shrink-0 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #00d4ff20, #6366f120)",
                    border: "1px solid rgba(0,212,255,0.3)",
                  }}
                >
                  <ShoppingCart size={16} className="text-cyan-400" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-sm leading-tight">Smart Trolley</p>
                  <p className="text-white/30 text-xs leading-tight font-mono">{trolleyId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ShoppingAssistant />
                <StoreMapButton />

                <button
                  onClick={() => openModal("admin")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/60 hover:text-white transition-all text-sm font-medium"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
                >
                  <Shield size={14} className="text-indigo-400" />
                  Admin
                </button>

                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-white/60 hover:text-white transition-all"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
                >
                  {theme === "dark"
                    ? <Sun size={15} className="text-amber-400" />
                    : <Moon size={15} className="text-indigo-400" />
                  }
                </button>

                <div className="flex items-center gap-1.5 text-white/25 pl-1">
                  {demoMode && !piSession ? <WifiOff size={12} className="text-amber-400/60" /> : <Wifi size={12} />}
                  <LiveClock />
                </div>
              </div>
            </header>

            {/* ── Main Content ── */}
            <main className="flex-1 flex gap-3 p-3 overflow-hidden min-h-0">
              <div className="flex-1 glass rounded-2xl p-3 flex flex-col min-w-0 overflow-hidden">
                {piLoading ? (
                  <div className="flex items-center justify-center h-full text-white/30 text-sm gap-3">
                    <motion.div
                      className="w-5 h-5 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Connecting to trolley…
                  </div>
                ) : piSession ? (
                  <PiCartView />
                ) : notFound ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/30 gap-3">
                    <ShoppingCart size={44} strokeWidth={1} />
                    <p className="text-sm text-center">
                      Trolley not found.<br />Make sure the trolley is running.
                    </p>
                  </div>
                ) : (
                  <CartView />
                )}
              </div>

              <div className="w-72 flex flex-col gap-3 flex-shrink-0 overflow-y-auto min-h-0">
                <div className="glass rounded-2xl p-3">
                  <BillSummary />
                </div>

                {piSession && (
                  <div className="glass rounded-xl p-3 text-xs text-white/30 space-y-1">
                    <div className="flex justify-between">
                      <span>Session</span>
                      <span className="font-mono">{piSession.id.slice(0, 8)}…</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trolley</span>
                      <span className="font-mono text-cyan-400/60">{piSession.trolley_id ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status</span>
                      <span className="capitalize text-emerald-400/70">{piSession.status}</span>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CheckoutModal />
      <EcoCashModal />
      <ReceiptModal />
      <AdminPanel />
    </>
  );
}
