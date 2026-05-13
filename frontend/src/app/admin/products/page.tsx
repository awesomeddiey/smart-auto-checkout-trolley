"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, Plus, Edit2, Tag, Weight } from "lucide-react";
import type { Product } from "@/types";
import { listProducts } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    listProducts().then((p) => { setProducts(p); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode ?? "").includes(search),
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Package size={22} className="text-cyan-400" />
            Products
          </h1>
          <p className="text-white/40 text-sm">{products.length} products in catalogue</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #00d4ff, #6366f1)" }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU or barcode…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 outline-none focus:border-cyan-400/50"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
              <th className="text-left p-4 font-semibold">Product</th>
              <th className="text-left p-4 font-semibold">SKU / Barcode</th>
              <th className="text-left p-4 font-semibold">Category</th>
              <th className="text-right p-4 font-semibold">Price</th>
              <th className="text-right p-4 font-semibold">Weight</th>
              <th className="text-right p-4 font-semibold">Stock</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-white/30">Loading products…</td></tr>
            ) : filtered.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                      {p.category?.icon ?? "📦"}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{p.name}</p>
                      <p className="text-white/30 text-xs">{p.aisle?.aisle_name} · {p.shelf_position}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-mono text-white/70 text-xs">{p.sku}</p>
                  <p className="font-mono text-white/30 text-xs">{p.barcode}</p>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/60">
                    {p.category?.name ?? "—"}
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-bold text-white">{formatCurrency(p.price)}</td>
                <td className="p-4 text-right text-white/50 text-xs">{p.weight_grams ? `${p.weight_grams}g` : "—"}</td>
                <td className="p-4 text-right">
                  <span className={`text-xs font-bold ${(p.stock_quantity ?? 0) < 10 ? "text-rose-400" : "text-emerald-400"}`}>
                    {p.stock_quantity}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
                    <Edit2 size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
