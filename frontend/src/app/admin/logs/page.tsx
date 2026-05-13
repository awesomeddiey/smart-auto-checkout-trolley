"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Eye, Scale } from "lucide-react";
import type { MismatchLog } from "@/types";
import { getMismatchLogs, resolveMismatch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function MismatchLogsPage() {
  const [logs,    setLogs]    = useState<MismatchLog[]>([]);
  const [filter,  setFilter]  = useState<"all" | "open" | "resolved">("open");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const resolved = filter === "all" ? undefined : filter === "resolved";
      const data = await getMismatchLogs(resolved);
      setLogs(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleResolve = async (id: number) => {
    await resolveMismatch(id);
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, resolved: true } : l));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <AlertTriangle size={22} className="text-amber-400" />
          Mismatch Logs
        </h1>
      </div>

      <div className="flex gap-2 mb-4">
        {(["open", "resolved", "all"] as const).map((f) => (
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

      <div className="space-y-3">
        {loading ? (
          <div className="glass p-8 rounded-2xl text-center text-white/30">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="glass p-8 rounded-2xl text-center text-white/30">
            {filter === "open" ? "No open mismatches 🎉" : "No logs found"}
          </div>
        ) : logs.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`glass p-4 rounded-2xl flex items-start justify-between gap-4 ${
              log.resolved ? "opacity-50" : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                log.mismatch_type === "vision" ? "bg-indigo-500/20"
                : log.mismatch_type === "weight" ? "bg-blue-500/20"
                : "bg-rose-500/20"
              }`}>
                {log.mismatch_type === "vision" ? <Eye size={16} className="text-indigo-400" />
                  : log.mismatch_type === "weight" ? <Scale size={16} className="text-blue-400" />
                  : <AlertTriangle size={16} className="text-rose-400" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">Session #{log.session_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                    log.mismatch_type === "vision" ? "text-indigo-400 bg-indigo-400/10 border-indigo-400/30"
                    : log.mismatch_type === "weight" ? "text-blue-400 bg-blue-400/10 border-blue-400/30"
                    : "text-rose-400 bg-rose-400/10 border-rose-400/30"
                  }`}>
                    {log.mismatch_type} mismatch
                  </span>
                </div>
                <p className="text-white/50 text-xs">
                  Scanned: <span className="text-white/70">{log.scanned_sku}</span>
                  {log.detected_class && <> · Detected: <span className="text-white/70">{log.detected_class}</span></>}
                  {log.confidence && <> · {(log.confidence * 100).toFixed(0)}% conf</>}
                </p>
                {log.weight_delta !== undefined && (
                  <p className="text-white/40 text-xs mt-0.5">Weight delta: {log.weight_delta}g</p>
                )}
                <p className="text-white/30 text-xs mt-1">{formatDate(log.created_at)}</p>
              </div>
            </div>

            {!log.resolved ? (
              <button
                onClick={() => handleResolve(log.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 transition-all whitespace-nowrap"
              >
                Resolve
              </button>
            ) : (
              <div className="flex-shrink-0 flex items-center gap-1 text-xs text-white/30">
                <CheckCircle2 size={12} className="text-emerald-400" />
                Resolved
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
