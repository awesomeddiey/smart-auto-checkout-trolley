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

  checkIn: (name: string, phone: string) => Promise<void>;
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

  checkIn: async (name, phone) => {
    set({ isLoading: true, notFound: false });

    // Find the latest active session on the trolley (single-trolley demo)
    const { data: sessions } = await supabase
      .from("cart_sessions")
      .select("*")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      set({ isLoading: false, notFound: true, session: null });
      return;
    }

    const raw = sessions[0] as PiSession;

    // Stamp the session with the customer's name and phone
    await supabase
      .from("cart_sessions")
      .update({ customer_name: name, customer_phone: phone })
      .eq("id", raw.id);

    const session: PiSession = { ...raw, customer_name: name, customer_phone: phone };

    const [items, unscannedCount] = await Promise.all([
      _fetchItems(session.id),
      _fetchUnscannedCount(session.id),
    ]);

    set({ session, items, unscannedCount, isLoading: false });

    if (_channel) supabase.removeChannel(_channel);

    _channel = supabase
      .channel(`pi-cart-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `session_id=eq.${session.id}` },
        async () => { set({ items: await _fetchItems(session.id) }); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `session_id=eq.${session.id}` },
        async () => { set({ unscannedCount: await _fetchUnscannedCount(session.id) }); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cart_sessions", filter: `id=eq.${session.id}` },
        (payload) => { set({ session: { ...get().session!, ...(payload.new as PiSession) } }); },
      )
      .subscribe();
  },

  disconnect: () => {
    if (_channel) { supabase.removeChannel(_channel); _channel = null; }
    set({ session: null, items: [], unscannedCount: 0, notFound: false });
  },
}));
