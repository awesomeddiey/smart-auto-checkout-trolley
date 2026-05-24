"use client";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PiItem {
  id: string;
  name: string;
  barcode: string;
  price: number;
  verification_status: string | null;
  added_at: string;
}

export interface PiSession {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  trolley_id: string | null;
  status: string;
  started_at: string;
}

// Pi verification_status → web app display status
export function piItemStatus(vs: string | null): "verified" | "flagged" | "pending" {
  if (vs === "VERIFIED") return "verified";
  if (vs === "SUSPICIOUS") return "flagged";
  return "pending";
}

interface PiCartStore {
  session: PiSession | null;
  items: PiItem[];
  unscannedCount: number;
  isLoading: boolean;
  notFound: boolean;

  connectByPhone: (phone: string) => Promise<void>;
  disconnect: () => void;
}

let _channel: RealtimeChannel | null = null;

async function _fetchItems(sessionId: string): Promise<PiItem[]> {
  const { data } = await supabase
    .from("cart_items")
    .select("id, name, barcode, price, verification_status, added_at")
    .eq("session_id", sessionId)
    .eq("is_removed", false)
    .order("added_at");
  return (data as PiItem[]) ?? [];
}

async function _fetchUnscannedCount(sessionId: string): Promise<number> {
  const { count } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("alert_type", "UNSCANNED_ITEM_PLACED")
    .eq("resolved", false);
  return count ?? 0;
}

export const usePiCartStore = create<PiCartStore>((set, get) => ({
  session: null,
  items: [],
  unscannedCount: 0,
  isLoading: false,
  notFound: false,

  connectByPhone: async (phone) => {
    set({ isLoading: true, notFound: false });

    const { data: sessions } = await supabase
      .from("cart_sessions")
      .select("*")
      .eq("customer_phone", phone)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      set({ isLoading: false, notFound: true, session: null });
      return;
    }

    const session = sessions[0] as PiSession;
    const [items, unscannedCount] = await Promise.all([
      _fetchItems(session.id),
      _fetchUnscannedCount(session.id),
    ]);

    set({ session, items, unscannedCount, isLoading: false });

    // Tear down any existing subscription before opening a new one
    if (_channel) supabase.removeChannel(_channel);

    _channel = supabase
      .channel(`pi-cart-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `session_id=eq.${session.id}` },
        async () => {
          const items = await _fetchItems(session.id);
          set({ items });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `session_id=eq.${session.id}` },
        async () => {
          const unscannedCount = await _fetchUnscannedCount(session.id);
          set({ unscannedCount });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cart_sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          set({ session: { ...get().session!, ...(payload.new as PiSession) } });
        },
      )
      .subscribe();
  },

  disconnect: () => {
    if (_channel) {
      supabase.removeChannel(_channel);
      _channel = null;
    }
    set({ session: null, items: [], unscannedCount: 0, notFound: false });
  },
}));
