"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Activity, RefreshCw } from "lucide-react";
import { listAdminSessions } from "@/lib/api";
import { formatCurrency, formatTime } from "@/lib/utils";

interface SessionRow {
  id: number; token: string; trolley_id: string; status: string;
  total_amount: number; item_count: number; started_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:    "text-cyan-400  bg-cyan-400/15  border-cyan-400/30",
  checkout:  "text-amber-400 bg-amber-400/15 border-amber-400/30",
  completed: "text-emerald-400 bg-emerald-400/15 border-emerald-400/30",
  abandoned: "text-gray-400 bg-gray-400/15 border-gray-400/30",
};

export default function TrolleysPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const s = await listAdminSessions(filter === "all" ? undefined : filter);
      setSessions(s as unknown as SessionRow[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Activity size={22} className="text-cyan-400" />
          Trolley Sessions
        </h1>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-white/60 hover:text-white text-sm transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {["all", "active", "checkout", "completed", "abandoned"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === f ? "bg-white/15 text-white border border-white/20" : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
              <th className="text-left p-4 font-semibold">Trolley</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-right p-4 font-semibold">Items</th>
              <th className="text-right p-4 font-semibold">Total</th>
              <th className="text-right p-4 font-semibold">Started</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-white/30">Loading…</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-white/30">No sessions found</td></tr>
            ) : sessions.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={16} className="text-white/40" />
                    <div>
                      <p className="font-semibold text-white">{s.trolley_id}</p>
                      <p className="font-mono text-white/30 text-xs">{s.token.slice(0, 12)}…</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[s.status] ?? ""}`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-4 text-right text-white/70">{s.item_count}</td>
                <td className="p-4 text-right font-mono font-bold text-white">{formatCurrency(s.total_amount)}</td>
                <td className="p-4 text-right text-white/40 text-xs">{s.started_at ? formatTime(s.started_at) : "—"}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
