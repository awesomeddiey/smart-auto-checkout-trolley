"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ShoppingCart, CheckCircle2, AlertTriangle, DollarSign, RefreshCw } from "lucide-react";
import type { AdminStats } from "@/types";
import { getAdminStats } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface StatCardProps {
  title:   string;
  value:   string | number;
  icon:    React.ReactNode;
  color:   string;
  delay?:  number;
  sub?:    string;
}

function StatCard({ title, value, icon, color, delay = 0, sub }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass p-5 rounded-2xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
          {icon}
        </div>
      </div>
      <p className="text-white/50 text-sm font-medium">{title}</p>
      <p className="text-white font-extrabold text-3xl mt-1">{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const s = await getAdminStats();
      setStats(s);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">Live store overview · {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-white/60 hover:text-white text-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Active Trolleys"
              value={stats.active_sessions}
              icon={<ShoppingCart size={20} className="text-cyan-400" />}
              color="#00d4ff"
              delay={0}
              sub="Currently shopping"
            />
            <StatCard
              title="Completed Today"
              value={stats.completed_today}
              icon={<CheckCircle2 size={20} className="text-emerald-400" />}
              color="#10b981"
              delay={0.08}
              sub="Checkouts today"
            />
            <StatCard
              title="Revenue Today"
              value={formatCurrency(stats.revenue_today)}
              icon={<DollarSign size={20} className="text-indigo-400" />}
              color="#6366f1"
              delay={0.16}
              sub="EcoCash payments"
            />
            <StatCard
              title="Open Mismatches"
              value={stats.unresolved_mismatches}
              icon={<AlertTriangle size={20} className="text-amber-400" />}
              color="#f59e0b"
              delay={0.24}
              sub="Needs review"
            />
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-5 rounded-2xl">
              <h3 className="font-bold text-white mb-1">System Status</h3>
              <div className="space-y-2 mt-3">
                {[
                  { name: "API Server",       ok: true  },
                  { name: "Vision Service",   ok: true  },
                  { name: "Hardware Service", ok: true  },
                  { name: "EcoCash Gateway",  ok: true  },
                  { name: "WebSocket",        ok: true  },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{s.name}</span>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${s.ok ? "text-emerald-400" : "text-rose-400"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                      {s.ok ? "Online" : "Offline"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-5 rounded-2xl">
              <h3 className="font-bold text-white mb-3">Total Sessions</h3>
              <p className="text-white/40 text-sm">All time: <span className="text-white font-bold text-2xl">{stats.total_sessions}</span></p>
              <div className="mt-4 space-y-1.5 text-xs text-white/40">
                <p>→ <a href="/admin/trolleys" className="text-cyan-400 hover:underline">View all sessions</a></p>
                <p>→ <a href="/admin/logs"     className="text-amber-400 hover:underline">Review mismatches</a></p>
                <p>→ <a href="/admin/payments" className="text-emerald-400 hover:underline">Payment logs</a></p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass p-10 rounded-2xl text-center text-white/30">
          {loading ? "Loading dashboard…" : "Failed to load stats. Is the backend running?"}
        </div>
      )}
    </div>
  );
}
