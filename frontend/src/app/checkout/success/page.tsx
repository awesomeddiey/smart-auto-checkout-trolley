"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter }    from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Payment {
  id:                 string;
  status:             string;
  amount:             number;
  customer_phone:     string;
  merchant_reference: string;
  ecocash_reference:  string | null;
  receipt_number:     string | null;
  error_message:      string | null;
}

function fmt(n: number) { return `$${Number(n || 0).toFixed(2)}`; }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}

function Inner() {
  const params  = useSearchParams();
  const router  = useRouter();
  const ref     = params.get("ref");
  const pid     = params.get("pid");

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [dots,    setDots]    = useState(".");

  useEffect(() => {
    if (!ref && !pid) { setLoading(false); return; }
    const q = pid
      ? supabase.from("payments").select("*").eq("id", pid)
      : supabase.from("payments").select("*").eq("merchant_reference", ref!);
    q.single().then(({ data }) => { setPayment(data as Payment); setLoading(false); });
  }, [ref, pid]);

  useEffect(() => {
    if (!payment?.id || payment.status !== "pending") return;
    const ch = supabase
      .channel(`pay-success-${payment.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${payment.id}` },
        (msg) => setPayment(msg.new as Payment))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [payment?.id, payment?.status]);

  useEffect(() => {
    if (!loading && payment?.status !== "pending") return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, [loading, payment?.status]);

  const base = "min-h-screen flex items-center justify-center p-4";

  if (loading) return (
    <div className={`${base} bg-gray-950`}>
      <Loader2 className="text-cyan-400 animate-spin" size={40} />
    </div>
  );

  if (!payment) return (
    <div className={`${base} bg-gray-950 flex-col gap-4 text-center`}>
      <XCircle size={48} className="text-rose-400" />
      <p className="text-white/60">Payment not found.</p>
      <button onClick={() => router.push("/")}
        className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-colors">
        Back to Cart
      </button>
    </div>
  );

  const isPending  = payment.status === "pending";
  const isComplete = payment.status === "completed";
  const isFailed   = payment.status === "failed" || payment.status === "cancelled";

  return (
    <div className={`${base} bg-gray-950`}>
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center space-y-5">

        {isPending && (
          <>
            <Loader2 size={48} className="text-cyan-400 animate-spin mx-auto" />
            <h1 className="text-2xl font-extrabold text-white">Confirming{dots}</h1>
            <p className="text-white/50 text-sm">Waiting for Paynow to confirm your EcoCash payment.</p>
          </>
        )}

        {isComplete && (
          <>
            <CheckCircle2 size={56} className="text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-extrabold text-white">Payment Confirmed!</h1>
            <div className="text-left space-y-2 rounded-xl bg-white/5 p-4 border border-white/10">
              <Row label="Amount"  value={fmt(payment.amount)} />
              <Row label="Phone"   value={payment.customer_phone} />
              {payment.receipt_number    && <Row label="Receipt"     value={payment.receipt_number} />}
              {payment.ecocash_reference && <Row label="EcoCash Ref" value={payment.ecocash_reference} />}
              <Row label="Ref" value={payment.merchant_reference} />
            </div>
            <p className="text-white/40 text-xs">Thank you for shopping with us.</p>
          </>
        )}

        {isFailed && (
          <>
            <XCircle size={56} className="text-rose-400 mx-auto" />
            <h1 className="text-2xl font-extrabold text-white">
              {payment.status === "cancelled" ? "Payment Cancelled" : "Payment Failed"}
            </h1>
            <p className="text-white/50 text-sm">{payment.error_message || "The payment was not completed."}</p>
          </>
        )}

        <button onClick={() => router.push("/")}
          className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition-colors">
          <ShoppingCart size={16} /> Return to Cart
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return <Suspense><Inner /></Suspense>;
}
