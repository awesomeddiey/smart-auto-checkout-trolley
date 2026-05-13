import type { TrolleySession, CartItem, Transaction, Recipe, AdminStats, MismatchLog } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API  = `${BASE}/api/v1`;

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API error");
  }
  return res.json() as Promise<T>;
}

// ── Sessions ────────────────────────────────────────────────────────────────

export const createSession = (trolleyId?: string) =>
  req<TrolleySession>("/sessions/", {
    method: "POST",
    body:   JSON.stringify({ trolley_id: trolleyId }),
  });

export const getSession = (token: string) =>
  req<TrolleySession>(`/sessions/${token}`);

export const scanBarcode = (token: string, barcode: string) =>
  req<CartItem>(`/sessions/${token}/scan`, {
    method: "POST",
    body:   JSON.stringify({ barcode }),
  });

export const removeItem = (token: string, itemId: number) =>
  req<CartItem>(`/sessions/${token}/items/${itemId}`, { method: "DELETE" });

export const abandonSession = (token: string) =>
  req<void>(`/sessions/${token}/abandon`, { method: "POST" });

// ── Checkout ─────────────────────────────────────────────────────────────────

export const initiateCheckout = (token: string, customerPhone: string) =>
  req<{ transaction_ref: string; status: string; message: string; poll_url: string }>(
    `/checkout/${token}/initiate`,
    { method: "POST", body: JSON.stringify({ customer_phone: customerPhone }) },
  );

export const getCheckoutStatus = (token: string) =>
  req<{
    session_status: string;
    total_items:    number;
    flagged_items:  number;
    pending_items:  number;
    can_checkout:   boolean;
    total_amount:   number;
  }>(`/checkout/${token}/status`);

// ── Payments ──────────────────────────────────────────────────────────────────

export const getPaymentStatus = (ref: string) =>
  req<Transaction>(`/payments/${ref}`);

export const getReceipt = (ref: string) =>
  req<{
    transaction_ref: string;
    session_id:      number;
    customer_phone?: string;
    amount:          number;
    items:           Array<{ name: string; quantity: number; unit_price: number; line_total: number }>;
    paid_at:         string;
    receipt_number:  string;
  }>(`/payments/${ref}/receipt`);

// ── Products ──────────────────────────────────────────────────────────────────

export const lookupBarcode = (barcode: string) =>
  req<import("@/types").Product>(`/products/lookup/${barcode}`);

export const listProducts = (params?: { search?: string; category_id?: number }) => {
  const qs = new URLSearchParams();
  if (params?.search)      qs.set("search",      params.search);
  if (params?.category_id) qs.set("category_id", String(params.category_id));
  return req<import("@/types").Product[]>(`/products/?${qs}`);
};

// ── Recipes ───────────────────────────────────────────────────────────────────

export const searchRecipes = (q: string) =>
  req<Recipe[]>(`/recipes/search?q=${encodeURIComponent(q)}`);

export const getStoreMap = () =>
  req<import("@/types").AisleMap[]>("/recipes/store/map");

// ── Admin ────────────────────────────────────────────────────────────────────

export const getAdminStats = () =>
  req<AdminStats>("/admin/stats");

export const listAdminSessions = (status?: string) =>
  req<TrolleySession[]>(`/admin/sessions${status ? `?status=${status}` : ""}`);

export const getMismatchLogs = (resolved?: boolean) =>
  req<MismatchLog[]>(`/admin/mismatches${resolved !== undefined ? `?resolved=${resolved}` : ""}`);

export const resolveMismatch = (id: number) =>
  req<void>(`/admin/mismatches/${id}/resolve`, { method: "PATCH" });

export const getPaymentLogs = (status?: string) =>
  req<Transaction[]>(`/admin/payments${status ? `?status=${status}` : ""}`);
