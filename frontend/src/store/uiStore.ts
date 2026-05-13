"use client";
import { create } from "zustand";
import type { ReceiptData } from "@/types";

type Modal = "none" | "checkout" | "ecocash" | "receipt" | "assistant" | "map" | "admin";

interface UiStore {
  modal:          Modal;
  previousModal:  Modal | null;
  receipt:        ReceiptData | null;
  transactionRef: string | null;
  mismatchAlert:  { itemId: number; productName: string; reason: string } | null;
  idleTimeout:    number;
  isIdle:         boolean;
  customerName:   string | null;
  customerPhone:  string | null;
  mapHighlight:     number | null;
  mapProductFilter: number[] | null;
  theme:            "dark" | "light";

  openModal:        (modal: Modal, returnTo?: Modal) => void;
  closeModal:       () => void;
  showReceipt:      (data: ReceiptData, ref: string) => void;
  setMismatchAlert: (alert: UiStore["mismatchAlert"]) => void;
  clearMismatch:    () => void;
  setIdle:          (idle: boolean) => void;
  setCustomer:      (name: string, phone: string) => void;
  clearCustomer:    () => void;
  setMapHighlight:     (id: number | null) => void;
  setMapProductFilter: (ids: number[] | null) => void;
  toggleTheme:         () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  modal:          "none",
  previousModal:  null,
  receipt:        null,
  transactionRef: null,
  mismatchAlert:  null,
  idleTimeout:    60_000,
  isIdle:         false,
  customerName:   null,
  customerPhone:  null,
  mapHighlight:     null,
  mapProductFilter: null,
  theme:            "dark",

  openModal:        (modal, returnTo) => set({ modal, previousModal: returnTo ?? null }),
  closeModal:       () => set({ modal: "none", previousModal: null }),
  showReceipt:      (data, ref) => set({ receipt: data, transactionRef: ref, modal: "receipt", previousModal: null }),
  setMismatchAlert: (alert) => set({ mismatchAlert: alert }),
  clearMismatch:    () => set({ mismatchAlert: null }),
  setIdle:          (idle) => set({ isIdle: idle }),
  setCustomer:      (name, phone) => set({ customerName: name, customerPhone: phone }),
  clearCustomer:    () => set({ customerName: null, customerPhone: null }),
  setMapHighlight:     (id)  => set({ mapHighlight: id }),
  setMapProductFilter: (ids) => set({ mapProductFilter: ids }),
  toggleTheme: () => set((s) => {
    const next: "dark" | "light" = s.theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }
    return { theme: next };
  }),
}));

// Apply saved theme on load (before first render)
if (typeof window !== "undefined") {
  const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  useUiStore.setState({ theme: saved });
}
