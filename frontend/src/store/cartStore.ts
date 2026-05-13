"use client";
import { create } from "zustand";
import type { TrolleySession, CartItem, ItemStatus } from "@/types";
import * as api from "@/lib/api";
import { saveToken, clearToken, getSavedToken } from "@/lib/utils";
import { trolleyWs } from "@/lib/websocket";

// ── Demo product catalogue (used when backend is offline) ──────────────────
const DEMO_PRODUCTS: Record<string, { id: number; sku: string; name: string; price: number; weight_grams: number; category: { id: 1; name: string; slug: string; icon: string } }> = {
  "6001007012345": { id: 1,  sku: "PRD-001", name: "Red Apple (each)",      price: 1.50,  weight_grams: 182,  category: { id: 1, name: "Fresh Produce", slug: "fresh-produce", icon: "🥦" } },
  "6001007012346": { id: 2,  sku: "PRD-002", name: "Banana Bunch",          price: 2.20,  weight_grams: 600,  category: { id: 1, name: "Fresh Produce", slug: "fresh-produce", icon: "🥦" } },
  "6001007022345": { id: 3,  sku: "PRD-010", name: "Full Cream Milk 2L",    price: 5.50,  weight_grams: 2060, category: { id: 1, name: "Dairy & Eggs",  slug: "dairy-eggs",   icon: "🥛" } },
  "6001007022346": { id: 4,  sku: "PRD-011", name: "Free Range Eggs (12)",  price: 6.00,  weight_grams: 720,  category: { id: 1, name: "Dairy & Eggs",  slug: "dairy-eggs",   icon: "🥛" } },
  "6001007032345": { id: 5,  sku: "PRD-020", name: "White Bread 700g",      price: 2.50,  weight_grams: 720,  category: { id: 1, name: "Bakery",        slug: "bakery",       icon: "🍞" } },
  "6001007042346": { id: 6,  sku: "PRD-031", name: "Coca-Cola 2L",          price: 3.50,  weight_grams: 2100, category: { id: 1, name: "Beverages",     slug: "beverages",    icon: "🧃" } },
  "6001007042347": { id: 7,  sku: "PRD-032", name: "Still Water 1.5L",      price: 1.80,  weight_grams: 1530, category: { id: 1, name: "Beverages",     slug: "beverages",    icon: "🧃" } },
  "6001007052345": { id: 8,  sku: "PRD-040", name: "Potato Chips 150g",     price: 3.00,  weight_grams: 155,  category: { id: 1, name: "Snacks",        slug: "snacks",       icon: "🍫" } },
  "6001007052346": { id: 9,  sku: "PRD-041", name: "Chocolate Bar 100g",    price: 2.50,  weight_grams: 105,  category: { id: 1, name: "Snacks",        slug: "snacks",       icon: "🍫" } },
  "6001007062345": { id: 10, sku: "PRD-050", name: "Chicken Breast 500g",   price: 9.50,  weight_grams: 520,  category: { id: 1, name: "Meat",          slug: "meat-seafood", icon: "🥩" } },
  "6001007082345": { id: 11, sku: "PRD-070", name: "Pasta Spaghetti 500g",  price: 2.50,  weight_grams: 510,  category: { id: 1, name: "Canned & Dry",  slug: "canned-dry",   icon: "🥫" } },
  "6001007082349": { id: 12, sku: "PRD-074", name: "Sugar 2kg",             price: 4.50,  weight_grams: 2020, category: { id: 1, name: "Canned & Dry",  slug: "canned-dry",   icon: "🥫" } },
};

function makeDemoSession(trolleyId?: string): TrolleySession {
  return {
    id:           0,
    session_token: crypto.randomUUID(),
    trolley_id:   trolleyId ?? `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    status:       "active",
    total_amount: 0,
    item_count:   0,
    started_at:   new Date().toISOString(),
    items:        [],
  };
}

let _demoItemId = 1;

function makeDemoItem(barcode: string, sessionId: number): CartItem | null {
  const p = DEMO_PRODUCTS[barcode];
  if (!p) return null;
  const id = _demoItemId++;
  return {
    id,
    session_id:      sessionId,
    product:         { ...p, barcode },
    quantity:        1,
    unit_price:      p.price,
    vision_verified: false,
    weight_verified: false,
    status:          "pending",
    added_at:        new Date().toISOString(),
  };
}

// ── Store ─────────────────────────────────────────────────────────────────
interface CartStore {
  session:    TrolleySession | null;
  isLoading:  boolean;
  scanLoading: boolean;
  error:      string | null;
  demoMode:   boolean;

  initSession:     (trolleyId?: string) => Promise<void>;
  resumeSession:   (token: string) => Promise<void>;
  scanItem:        (barcode: string) => Promise<void>;
  removeItem:      (itemId: number) => Promise<void>;
  patchItemStatus: (itemId: number, patch: Partial<CartItem>) => void;
  setSession:      (session: TrolleySession) => void;
  resetSession:    () => void;
  clearError:      () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  session:     null,
  isLoading:   false,
  scanLoading: false,
  error:       null,
  demoMode:    false,

  initSession: async (trolleyId) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.createSession(trolleyId);
      saveToken(session.session_token);
      set({ session, isLoading: false, demoMode: false });
      trolleyWs.connect(session.session_token);
      _subscribeWs();
    } catch {
      // Backend offline — start local demo session
      const session = makeDemoSession(trolleyId);
      set({ session, isLoading: false, demoMode: true, error: null });
    }
  },

  resumeSession: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.getSession(token);
      set({ session, isLoading: false, demoMode: false });
      trolleyWs.connect(token);
      _subscribeWs();
    } catch {
      clearToken();
      set({ session: null, isLoading: false });
    }
  },

  scanItem: async (barcode) => {
    const { session, demoMode } = get();
    if (!session) return;
    set({ scanLoading: true, error: null });

    if (demoMode) {
      // Demo mode: resolve locally
      const item = makeDemoItem(barcode, session.id);
      if (!item) {
        set({ error: `Barcode "${barcode}" not in demo catalogue`, scanLoading: false });
        return;
      }
      // Simulate verification delay
      set((s) => ({
        scanLoading: false,
        session: s.session ? {
          ...s.session,
          items: [...s.session.items, item],
          item_count: s.session.items.filter(i => i.status !== "removed").length + 1,
          total_amount: +(s.session.total_amount + item.unit_price).toFixed(2),
        } : null,
      }));
      // Simulate async verification after 1.5s
      setTimeout(() => {
        const verified = Math.random() > 0.1; // 90% pass rate in demo
        useCartStore.getState().patchItemStatus(item.id, {
          status:          verified ? "verified" : "flagged",
          vision_verified: verified,
          weight_verified: verified,
          vision_confidence: verified ? +(Math.random() * 0.15 + 0.84).toFixed(4) : +(Math.random() * 0.3 + 0.3).toFixed(4),
        });
      }, 1500);
      return;
    }

    try {
      const item = await api.scanBarcode(session.session_token, barcode);
      set((s) => ({
        scanLoading: false,
        session: s.session ? {
          ...s.session,
          items: [...s.session.items.filter((i) => i.id !== item.id), item],
          item_count: s.session.items.filter((i) => i.status !== "removed").length + 1,
        } : null,
      }));
    } catch (e) {
      set({ error: (e as Error).message, scanLoading: false });
    }
  },

  removeItem: async (itemId) => {
    const { session, demoMode } = get();
    if (!session) return;

    if (demoMode) {
      set((s) => {
        const items = s.session!.items.map((i) =>
          i.id === itemId ? { ...i, status: "removed" as ItemStatus } : i,
        );
        const active = items.filter(i => i.status !== "removed");
        return {
          session: { ...s.session!, items, item_count: active.length, total_amount: +active.reduce((sum, i) => sum + i.unit_price * i.quantity, 0).toFixed(2) },
        };
      });
      return;
    }

    try {
      await api.removeItem(session.session_token, itemId);
      set((s) => ({
        session: s.session ? {
          ...s.session,
          items: s.session.items.map((i) =>
            i.id === itemId ? { ...i, status: "removed" as ItemStatus } : i,
          ),
        } : null,
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  patchItemStatus: (itemId, patch) => {
    set((s) => {
      if (!s.session) return {};
      const items = s.session.items.map((i) => i.id === itemId ? { ...i, ...patch } : i);
      const active = items.filter(i => i.status !== "removed");
      return {
        session: {
          ...s.session,
          items,
          total_amount: +active.reduce((sum, i) => sum + i.unit_price * i.quantity, 0).toFixed(2),
        },
      };
    });
  },

  setSession: (session) => set({ session }),

  resetSession: () => {
    clearToken();
    trolleyWs.disconnect();
    _demoItemId = 1;
    set({ session: null, error: null, demoMode: false });
  },

  clearError: () => set({ error: null }),
}));

let _wsUnsubscribe: (() => void) | null = null;

function _subscribeWs() {
  if (_wsUnsubscribe) _wsUnsubscribe();
  _wsUnsubscribe = trolleyWs.subscribe((msg) => {
    const store = useCartStore.getState();
    switch (msg.type) {
      case "item_updated": {
        const d = msg.data as { item_id: number; status: ItemStatus; vision_verified: boolean; weight_verified: boolean };
        store.patchItemStatus(d.item_id, { status: d.status, vision_verified: d.vision_verified, weight_verified: d.weight_verified });
        break;
      }
      case "payment_completed":
      case "payment_failed":
      case "session_reset": {
        const token = getSavedToken();
        if (token) store.resumeSession(token);
        break;
      }
    }
  });
}
