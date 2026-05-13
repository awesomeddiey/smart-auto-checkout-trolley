"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, ChefHat, MapPin, Navigation, ChevronRight, Sparkles } from "lucide-react";
import { useUiStore } from "@/store/uiStore";

type Ingredient = {
  name: string;
  emoji: string;
  productId: number;
  aisle: string;
  aisleLabel: string;
};

type LocalRecipe = {
  id: number;
  name: string;
  emoji: string;
  ingredients: Ingredient[];
};

const RECIPES: LocalRecipe[] = [
  {
    id: 1, name: "Simple Spaghetti", emoji: "🍝",
    ingredients: [
      { name: "Spaghetti",    emoji: "🍝", productId: 1, aisle: "A", aisleLabel: "Canned & Dry" },
      { name: "Tomato Sauce", emoji: "🍅", productId: 3, aisle: "A", aisleLabel: "Canned & Dry" },
      { name: "Cooking Oil",  emoji: "🫙", productId: 4, aisle: "B", aisleLabel: "Oils & Sauces" },
    ],
  },
  {
    id: 2, name: "Tomato Rice", emoji: "🍚",
    ingredients: [
      { name: "Rice",         emoji: "🍚", productId: 2, aisle: "A", aisleLabel: "Canned & Dry" },
      { name: "Tomato Sauce", emoji: "🍅", productId: 3, aisle: "A", aisleLabel: "Canned & Dry" },
      { name: "Cooking Oil",  emoji: "🫙", productId: 4, aisle: "B", aisleLabel: "Oils & Sauces" },
    ],
  },
  {
    id: 3, name: "Plain Rice", emoji: "🌾",
    ingredients: [
      { name: "Rice",        emoji: "🍚", productId: 2, aisle: "A", aisleLabel: "Canned & Dry" },
      { name: "Cooking Oil", emoji: "🫙", productId: 4, aisle: "B", aisleLabel: "Oils & Sauces" },
    ],
  },
];

export function ShoppingAssistant() {
  const { modal, openModal, closeModal, customerName, setMapHighlight, setMapProductFilter } = useUiStore();
  const [query,    setQuery]    = useState("");
  const [selected, setSelected] = useState<LocalRecipe | null>(null);
  const isOpen = modal === "assistant";

  const filtered = query.trim()
    ? RECIPES.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : RECIPES;

  const navigateTo = (productId: number, recipeIds: number[]) => {
    setMapHighlight(productId);
    setMapProductFilter(recipeIds);
    openModal("map", "assistant");
  };

  const handleOpen = () => {
    setQuery("");
    setSelected(null);
    openModal("assistant");
  };

  const handleClose = () => {
    setMapProductFilter(null);
    closeModal();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
      >
        <Bot size={16} className="text-cyan-400" />
        AI Assistant
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(10,14,26,0.6)", backdropFilter: "blur(4px)" }}
              onClick={handleClose}
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col"
              style={{
                background: "rgba(13,20,36,0.98)",
                borderLeft: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(99,102,241,0.2))",
                      border: "1px solid rgba(0,212,255,0.3)",
                    }}
                  >
                    <Bot size={16} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm leading-tight">Shopping Assistant</p>
                    {customerName && (
                      <p className="text-white/40 text-xs leading-tight">Hi, {customerName}!</p>
                    )}
                  </div>
                </div>
                <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
                {!selected ? (
                  <>
                    {/* Search */}
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search recipes…"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-cyan-400/50 transition-all flex-shrink-0"
                      autoComplete="off"
                    />

                    {/* Tip */}
                    {!query && (
                      <div
                        className="flex-shrink-0 px-3 py-2.5 rounded-xl flex items-start gap-2"
                        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)" }}
                      >
                        <Sparkles size={13} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                        <p className="text-white/50 text-xs leading-relaxed">
                          Pick a recipe and I'll guide you to each ingredient in the store.
                        </p>
                      </div>
                    )}

                    {/* Recipe list */}
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                      {filtered.length === 0 && (
                        <p className="text-white/30 text-sm text-center py-6">No match for "{query}"</p>
                      )}
                      {filtered.map((recipe, i) => (
                        <motion.button
                          key={recipe.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setSelected(recipe)}
                          className="w-full p-3 rounded-xl text-left transition-all active:scale-98"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{recipe.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm">{recipe.name}</p>
                              <p className="text-white/40 text-xs mt-0.5 truncate">
                                {recipe.ingredients.map((i) => i.name).join(" · ")}
                              </p>
                            </div>
                            <ChevronRight size={14} className="text-white/30 flex-shrink-0" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </>
                ) : (
                  <RecipeGuide
                    recipe={selected}
                    onBack={() => { setSelected(null); setMapProductFilter(null); }}
                    onNavigate={navigateTo}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function RecipeGuide({
  recipe,
  onBack,
  onNavigate,
}: {
  recipe: LocalRecipe;
  onBack: () => void;
  onNavigate: (productId: number, recipeIds: number[]) => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/50 text-xs hover:text-white transition-colors flex-shrink-0"
      >
        ← All recipes
      </button>

      <div
        className="flex-shrink-0 p-3 rounded-xl flex items-center gap-3"
        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}
      >
        <span className="text-3xl">{recipe.emoji}</span>
        <div>
          <p className="font-bold text-white text-sm">{recipe.name}</p>
          <p className="text-white/40 text-xs">{recipe.ingredients.length} ingredients to find</p>
        </div>
      </div>

      <p className="text-xs font-semibold text-white/35 uppercase tracking-widest flex-shrink-0 flex items-center gap-1">
        <MapPin size={9} /> Tap "Go" to navigate on the map
      </p>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {recipe.ingredients.map((ing, i) => (
          <motion.div
            key={ing.productId}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-xl flex-shrink-0">{ing.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{ing.name}</p>
              <p className="text-white/40 text-xs">
                Aisle {ing.aisle} · {ing.aisleLabel}
              </p>
            </div>
            <button
              onClick={() => onNavigate(ing.productId, recipe.ingredients.map((i) => i.productId))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(99,102,241,0.2))",
                border: "1px solid rgba(0,212,255,0.35)",
                color: "#00d4ff",
              }}
            >
              <Navigation size={11} /> Go
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
