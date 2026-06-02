"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, X, Navigation, MapPin, ShoppingCart } from "lucide-react";
import { useUiStore } from "@/store/uiStore";

// ── SVG canvas ────────────────────────────────────────────────────────────
const SVG_W = 430;
const SVG_H = 315;

// ── Aisle geometry ────────────────────────────────────────────────────────
const AISLE_W       = 80;
const GAP           = 24;           // walkway between aisles
const AISLE_Y_TOP   = 38;
const AISLE_H       = 198;
const AISLE_Y_BTM   = AISLE_Y_TOP + AISLE_H;   // 236

const ax = (n: number) => 8 + n * (AISLE_W + GAP); // aisle left-x for index n

// Corridor centre-x values (between aisles)
const CORR_AB = ax(0) + AISLE_W + GAP / 2;  // ~100
const CORR_BC = ax(1) + AISLE_W + GAP / 2;  // ~204
const CORR_CD = ax(2) + AISLE_W + GAP / 2;  // ~308

// Main walkway y and entrance point
const WALK_Y  = AISLE_Y_BTM + 12;   // 248
const ENT_X   = SVG_W / 2;          // 215
const ENT_Y   = 300;

const AISLES = [
  { id: "A", label: "Canned & Dry",   x: ax(0), color: "#f59e0b", border: "#d97706" },
  { id: "B", label: "Oils & Sauces",  x: ax(1), color: "#10b981", border: "#059669" },
  { id: "C", label: "Personal Care",  x: ax(2), color: "#818cf8", border: "#6366f1" },
  { id: "D", label: "Household",      x: ax(3), color: "#22d3ee", border: "#06b6d4" },
];

// Product centre-x = ax(n) + AISLE_W / 2
const cx = (n: number) => ax(n) + AISLE_W / 2;

type Pt = [number, number];

const PRODUCTS = [
  {
    id: 1, name: "Sun Soya Cooking Oil 2L",  short: "Cooking Oil", emoji: "🫙", aisle: 1,
    x: cx(1), y: 72,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_AB,WALK_Y],[CORR_AB,72],[cx(1),72]] as Pt[],
  },
  {
    id: 2, name: "2kg Rice",                  short: "Rice",       emoji: "🍚", aisle: 0,
    x: cx(0), y: 135,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_AB,WALK_Y],[CORR_AB,135],[cx(0),135]] as Pt[],
  },
  {
    id: 3, name: "Tomato Sauce",              short: "Tomato Sauce",emoji: "🍅", aisle: 0,
    x: cx(0), y: 166,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_AB,WALK_Y],[CORR_AB,166],[cx(0),166]] as Pt[],
  },
  {
    id: 4, name: "Toothpaste",                short: "Toothpaste", emoji: "🪥", aisle: 2,
    x: cx(2), y: 78,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_BC,WALK_Y],[CORR_BC,78],[cx(2),78]] as Pt[],
  },
  {
    id: 5, name: "Baked Beans",               short: "Baked Beans", emoji: "🥫", aisle: 0,
    x: cx(0), y: 198,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_AB,WALK_Y],[CORR_AB,198],[cx(0),198]] as Pt[],
  },
  {
    id: 6, name: "Macaroni",                  short: "Macaroni",    emoji: "🍝", aisle: 0,
    x: cx(0), y: 103,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_AB,WALK_Y],[CORR_AB,103],[cx(0),103]] as Pt[],
  },
  {
    id: 7, name: "Nivea Lotion",              short: "Lotion",      emoji: "🧴", aisle: 2,
    x: cx(2), y: 165,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_BC,WALK_Y],[CORR_BC,165],[cx(2),165]] as Pt[],
  },
  {
    id: 8, name: "Dishwashing Liquid",        short: "Dishwashing", emoji: "🧼", aisle: 3,
    x: cx(3), y: 170,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_CD,WALK_Y],[CORR_CD,170],[cx(3),170]] as Pt[],
  },
  {
    id: 9, name: "Cheese",                    short: "Cheese",      emoji: "🧀", aisle: 1,
    x: cx(1), y: 188,
    path: [[ENT_X,ENT_Y],[ENT_X,WALK_Y],[CORR_AB,WALK_Y],[CORR_AB,188],[cx(1),188]] as Pt[],
  },
] as const;

type ProductId = typeof PRODUCTS[number]["id"];

function pathD(pts: Pt[]) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
}

function aisleColor(idx: number) {
  return AISLES[idx]?.color ?? "#ffffff";
}

// ── Component ─────────────────────────────────────────────────────────────
export function StoreMapButton() {
  const { modal, openModal, closeModal, mapHighlight, setMapHighlight, previousModal, mapProductFilter, setMapProductFilter } = useUiStore();
  const [selected, setSelected] = useState<ProductId | null>(null);
  const isOpen = modal === "map";

  const selectedProduct = PRODUCTS.find((p) => p.id === selected) ?? null;

  // Sync external highlight (from assistant navigation)
  useEffect(() => {
    if (modal === "map" && mapHighlight !== null) {
      setSelected(mapHighlight as ProductId);
    }
    if (modal !== "map") setSelected(null);
  }, [modal, mapHighlight]);

  const handleSelect = (id: ProductId) => {
    setSelected((prev) => (prev === id ? null : id));
  };

  const handleClose = () => {
    setMapHighlight(null);
    if (previousModal && previousModal !== "none") {
      openModal(previousModal);
    } else {
      setMapProductFilter(null);
      closeModal();
    }
  };

  const sidebarProducts = mapProductFilter
    ? PRODUCTS.filter((p) => mapProductFilter.includes(p.id))
    : PRODUCTS;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => openModal("map")}
        className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
      >
        <Map size={16} className="text-indigo-400" />
        Store Map
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="map-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(10,14,26,0.94)" }}
            />

            {/* Panel */}
            <motion.div
              key="map-panel"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="fixed inset-4 z-50 flex flex-col rounded-3xl overflow-hidden"
              style={{
                background: "rgba(13,20,36,0.97)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Map size={17} className="text-indigo-400" />
                  <span className="font-bold text-white">Smart Mart — Store Map</span>
                  {selectedProduct && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs text-cyan-400 flex items-center gap-1"
                    >
                      <Navigation size={11} />
                      Navigating to {selectedProduct.short}
                    </motion.span>
                  )}
                </div>
                <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors p-1">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 min-h-0">
                {/* ── SVG Map ───────────────────────────────────────── */}
                <div className="flex-1 min-w-0 p-4 flex items-center justify-center">
                  <svg
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    className="w-full h-full"
                    style={{ maxHeight: "100%", overflow: "visible" }}
                  >
                    {/* ── Store floor background ─────────────────── */}
                    <rect
                      x={0} y={0} width={SVG_W} height={SVG_H}
                      rx={8}
                      fill="rgba(15,22,40,0.9)"
                    />

                    {/* Grid lines (subtle) */}
                    {[50, 100, 150, 200, 250, 300, 350, 400].map((x) => (
                      <line key={x} x1={x} y1={AISLE_Y_TOP} x2={x} y2={AISLE_Y_BTM}
                        stroke="rgba(255,255,255,0.025)" strokeWidth={0.5} />
                    ))}

                    {/* ── Checkout counter (top) ─────────────────── */}
                    <rect x={40} y={6} width={350} height={22} rx={4}
                      fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.7} />
                    {[90, 160, 230, 300, 370].map((cx) => (
                      <g key={cx}>
                        <rect x={cx-22} y={9} width={44} height={16} rx={3}
                          fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.35)" strokeWidth={0.7} />
                        <text x={cx} y={20} textAnchor="middle" fill="rgba(16,185,129,0.8)"
                          fontSize={7} fontFamily="monospace">CHECKOUT</text>
                      </g>
                    ))}

                    {/* ── Main bottom walkway ─────────────────────── */}
                    <rect x={0} y={WALK_Y - 4} width={SVG_W} height={20} rx={0}
                      fill="rgba(255,255,255,0.04)" />
                    <line x1={0} y1={WALK_Y - 4} x2={SVG_W} y2={WALK_Y - 4}
                      stroke="rgba(255,255,255,0.07)" strokeWidth={0.7} />

                    {/* ── Side walkway lines between aisles ─────── */}
                    {[CORR_AB, CORR_BC, CORR_CD].map((cx) => (
                      <line key={cx}
                        x1={cx} y1={AISLE_Y_TOP} x2={cx} y2={WALK_Y - 4}
                        stroke="rgba(255,255,255,0.04)" strokeWidth={GAP} />
                    ))}

                    {/* ── Aisles ───────────────────────────────────── */}
                    {AISLES.map((aisle) => (
                      <g key={aisle.id}>
                        {/* Aisle block */}
                        <rect
                          x={aisle.x} y={AISLE_Y_TOP}
                          width={AISLE_W} height={AISLE_H}
                          rx={4}
                          fill={`${aisle.color}18`}
                          stroke={`${aisle.color}50`}
                          strokeWidth={1}
                        />
                        {/* Shelf lines */}
                        {[0.25, 0.5, 0.75].map((f) => (
                          <line key={f}
                            x1={aisle.x + 4}
                            y1={AISLE_Y_TOP + AISLE_H * f}
                            x2={aisle.x + AISLE_W - 4}
                            y2={AISLE_Y_TOP + AISLE_H * f}
                            stroke={`${aisle.color}30`}
                            strokeWidth={0.8}
                            strokeDasharray="3 2"
                          />
                        ))}
                        {/* Aisle label */}
                        <text
                          x={aisle.x + AISLE_W / 2}
                          y={AISLE_Y_TOP + 10}
                          textAnchor="middle"
                          fill={aisle.color}
                          fillOpacity={0.9}
                          fontSize={6.5}
                          fontFamily="Inter, sans-serif"
                          fontWeight="600"
                          letterSpacing="0.5"
                        >
                          {`AISLE ${aisle.id}`}
                        </text>
                        <text
                          x={aisle.x + AISLE_W / 2}
                          y={AISLE_Y_TOP + 20}
                          textAnchor="middle"
                          fill={aisle.color}
                          fillOpacity={0.55}
                          fontSize={5.5}
                          fontFamily="Inter, sans-serif"
                        >
                          {aisle.label}
                        </text>
                      </g>
                    ))}

                    {/* ── Animated navigation path ─────────────────── */}
                    <AnimatePresence>
                      {selectedProduct && (
                        <motion.path
                          key={`path-${selectedProduct.id}`}
                          d={pathD(selectedProduct.path as Pt[])}
                          fill="none"
                          stroke="rgba(0,212,255,0.9)"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="6 4"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.4, ease: "easeInOut" }}
                          style={{ filter: "drop-shadow(0 0 4px rgba(0,212,255,0.6))" }}
                        />
                      )}
                    </AnimatePresence>

                    {/* ── Directional arrow at destination ──────── */}
                    <AnimatePresence>
                      {selectedProduct && (
                        <motion.g
                          key={`arrow-${selectedProduct.id}`}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ delay: 1.2, duration: 0.3 }}
                        >
                          <circle
                            cx={selectedProduct.x}
                            cy={selectedProduct.y}
                            r={11}
                            fill="rgba(0,212,255,0.25)"
                            stroke="rgba(0,212,255,0.9)"
                            strokeWidth={1.5}
                          />
                          <motion.circle
                            cx={selectedProduct.x}
                            cy={selectedProduct.y}
                            r={16}
                            fill="none"
                            stroke="rgba(0,212,255,0.4)"
                            strokeWidth={1}
                            animate={{ r: [14, 20], opacity: [0.5, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                          />
                        </motion.g>
                      )}
                    </AnimatePresence>

                    {/* ── Product pins ─────────────────────────────── */}
                    {PRODUCTS.map((p) => {
                      const isActive = selected === p.id;
                      const color    = aisleColor(p.aisle);
                      return (
                        <g
                          key={p.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSelect(p.id)}
                        >
                          {/* Glow when active */}
                          {isActive && (
                            <circle cx={p.x} cy={p.y} r={14}
                              fill={`${color}30`}
                              stroke={`${color}80`}
                              strokeWidth={1}
                            />
                          )}
                          {/* Pin background */}
                          <circle
                            cx={p.x} cy={p.y} r={9}
                            fill={isActive ? `${color}e0` : `${color}40`}
                            stroke={isActive ? `${color}ff` : `${color}90`}
                            strokeWidth={isActive ? 1.5 : 1}
                          />
                          {/* Emoji */}
                          <text
                            x={p.x} y={p.y + 4}
                            textAnchor="middle"
                            fontSize={9}
                          >
                            {p.emoji}
                          </text>
                          {/* Name label */}
                          <text
                            x={p.x}
                            y={p.y + 20}
                            textAnchor="middle"
                            fill={isActive ? "#ffffff" : "rgba(255,255,255,0.55)"}
                            fontSize={5.5}
                            fontFamily="Inter, sans-serif"
                            fontWeight={isActive ? "600" : "400"}
                          >
                            {p.short}
                          </text>
                        </g>
                      );
                    })}

                    {/* ── Entrance / You Are Here ────────────────── */}
                    <g>
                      {/* Pulsing ring */}
                      <motion.circle
                        cx={ENT_X} cy={ENT_Y - 6} r={10}
                        fill="none"
                        stroke="rgba(16,185,129,0.5)"
                        strokeWidth={1}
                        animate={{ r: [9, 16], opacity: [0.7, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <circle cx={ENT_X} cy={ENT_Y - 6} r={7}
                        fill="rgba(16,185,129,0.3)"
                        stroke="rgba(16,185,129,0.9)"
                        strokeWidth={1.5}
                      />
                      <text x={ENT_X} y={ENT_Y - 3} textAnchor="middle"
                        fontSize={7} fill="rgba(16,185,129,1)">📍</text>
                      <text x={ENT_X} y={ENT_Y + 8} textAnchor="middle"
                        fill="rgba(16,185,129,0.8)" fontSize={6} fontFamily="Inter, sans-serif" fontWeight="600">
                        YOU ARE HERE
                      </text>
                    </g>

                    {/* ── Aisle letter labels (corridor) ───────────── */}
                    {AISLES.map((aisle) => (
                      <text key={aisle.id}
                        x={aisle.x + AISLE_W / 2}
                        y={WALK_Y + 10}
                        textAnchor="middle"
                        fill={`${aisle.color}70`}
                        fontSize={7}
                        fontFamily="Inter, sans-serif"
                        fontWeight="700"
                        letterSpacing="1"
                      >
                        {aisle.id}
                      </text>
                    ))}

                    {/* Store name watermark */}
                    <text x={SVG_W / 2} y={WALK_Y + 21} textAnchor="middle"
                      fill="rgba(255,255,255,0.12)" fontSize={6.5}
                      fontFamily="Inter, sans-serif" fontWeight="700" letterSpacing="4">
                      SMART MART
                    </text>
                  </svg>
                </div>

                {/* ── Product list sidebar ───────────────────────── */}
                <div className="w-48 flex-shrink-0 border-l border-white/8 flex flex-col overflow-hidden">
                  <p className="px-4 pt-4 pb-2 text-xs font-semibold text-white/40 uppercase tracking-widest flex-shrink-0">
                    {mapProductFilter ? "Recipe Items" : "Products"}
                  </p>
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                    {sidebarProducts.map((p) => {
                      const isActive = selected === p.id;
                      const color    = aisleColor(p.aisle);
                      return (
                        <motion.button
                          key={p.id}
                          onClick={() => handleSelect(p.id)}
                          whileTap={{ scale: 0.97 }}
                          className="w-full text-left px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-2.5"
                          style={{
                            background:  isActive ? `${color}20` : "rgba(255,255,255,0.04)",
                            border:      `1px solid ${isActive ? `${color}60` : "rgba(255,255,255,0.07)"}`,
                            boxShadow:   isActive ? `0 0 10px ${color}30` : "none",
                          }}
                        >
                          <span className="text-base leading-none">{p.emoji}</span>
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold leading-tight truncate ${isActive ? "text-white" : "text-white/60"}`}>
                              {p.name}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: `${color}99` }}>
                              Aisle {AISLES[p.aisle].id}
                            </p>
                          </div>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto flex-shrink-0"
                            >
                              <Navigation size={11} className="text-cyan-400" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="px-4 py-3 border-t border-white/8 space-y-1.5 flex-shrink-0">
                    <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Legend</p>
                    {[
                      { color: "#10b981", label: "You are here" },
                      { color: "#00d4ff", label: "Navigation path" },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                          style={{ borderColor: color, backgroundColor: `${color}30` }} />
                        <span className="text-xs text-white/40">{label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 flex-shrink-0"
                        style={{ background: "#00d4ff", boxShadow: "0 0 4px #00d4ff" }} />
                      <span className="text-xs text-white/40">Route line</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
