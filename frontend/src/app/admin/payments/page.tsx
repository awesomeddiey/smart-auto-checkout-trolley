"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import type { Transaction } from "@/types";
import { getPaymentLogs } from "@/lib/api";
import { formatCurrency, formatDate, maskPhone } from "@/lib/utils";

const STATUS_CFG: Record<string, { icon: React.ReactNode; cls: string }> = {
  completed:  { icon: <CheckCircle2 size={13} />, cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  pending:    { icon: <Clock size={13} />,         cls: "text-amber-400  bg-amber-400/10  border-amber-400/30"  },
  processing: { icon: <Clock size={13} />,         cls: "text-cyan-400   bg-cyan-400/10   border-cyan-400/30"   },
  failed:     { icon: <XCircle size={13} />,       cls: "text-rose-400   bg-rose-400/10   border-rose-400/30"   },
};

export default function PaymentsPage() {
  const [txns,    setTxns]    = useState<Transaction[]>([]);
  const [filter,  setFilter]  = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPaymentLogs(filter === "all" ? undefined : filter);
      setTxns(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const totalRevenue = txns
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <CreditCard size={22} className="text-indigo-400" />
            Payments
          </h1>
          <p className="text-white/40 text-sm">
            {txns.filter((t) => t.status === "completed").length} completed ·{" "}
            <span className="text-emerald-400 font-semibold">{formatCurrency(totalRevenue)}</span> total
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-white/60 hover:text-white text-sm transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "completed", "processing", "pending", "failed"].map((f) => (
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
              <th className="text-left p-4 font-semibold">Reference</th>
              <th className="text-left p-4 font-semibold">Phone</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-right p-4 font-semibold">Amount</th>
              <th className="text-right p-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-white/30">Loading…</td></tr>
            ) : txns.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-white/30">No payments found</td></tr>
            ) : txns.map((t, i) => {
              const { icon, cls } = STATUS_CFG[t.status] ?? STATUS_CFG.pending;
              return (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.025 }}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                >
                  <td className="p-4">
                    <p className="font-mono text-white text-xs">{t.transaction_ref.slice(0, 16)}…</p>
                    {t.ecocash_ref && <p className="font-mono text-white/30 text-xs">{t.ecocash_ref}</p>}
                  </td>
                  <td className="p-4 text-white/60 font-mono text-xs">
                    {t.customer_phone ? maskPhone(t.customer_phone) : "—"}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
                      {icon}
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-white">{formatCurrency(t.amount)}</td>
                  <td className="p-4 text-right text-white/40 text-xs">{formatDate(t.initiated_at)}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
