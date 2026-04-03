import { create } from "zustand";

interface CartItem { skuId: string; skuName: string; qty: number; rate: number; }

interface CartState {
  items: CartItem[];
  partyId: string | null;
  partyName: string | null;
  setParty: (id: string, name: string) => void;
  addItem: (item: CartItem) => void;
  updateQty: (skuId: string, qty: number) => void;
  removeItem: (skuId: string) => void;
  clear: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [], partyId: null, partyName: null,
  setParty: (id: string, name: string) => set({ partyId: id, partyName: name }),
  addItem: (item: CartItem) => {
    const existing = get().items.find((i: CartItem) => i.skuId === item.skuId);
    if (existing) { set({ items: get().items.map((i: CartItem) => i.skuId === item.skuId ? { ...i, qty: i.qty + item.qty } : i) }); }
    else { set({ items: [...get().items, item] }); }
  },
  updateQty: (skuId: string, qty: number) => {
    if (qty <= 0) { set({ items: get().items.filter((i: CartItem) => i.skuId !== skuId) }); }
    else { set({ items: get().items.map((i: CartItem) => i.skuId === skuId ? { ...i, qty } : i) }); }
  },
  removeItem: (skuId: string) => { set({ items: get().items.filter((i: CartItem) => i.skuId !== skuId) }); },
  clear: () => set({ items: [], partyId: null, partyName: null }),
  getTotal: () => get().items.reduce((s: number, i: CartItem) => s + i.qty * i.rate, 0),
}));
