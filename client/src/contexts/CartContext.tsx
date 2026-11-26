import { track } from "@/lib/track";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  id: string;          // itemCode or product id
  sku: string;
  name: string;
  brand: string;
  size: string;
  price: number;       // in centavos
  imageUrl?: string;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "qty">, opts?: { drawer?: boolean }) => void;
  removeItem: (id: string, size: string) => void;
  updateQty: (id: string, size: string, qty: number) => void;
  clearCart: () => void;
  // SB2.0 drawer: opens automatically on addItem so shoppers stay on the page
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | null>(null);
const KEY = "sb_cart_v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  // opts.drawer=false: Buy-Now paths add silently and go straight to /checkout —
  // otherwise the drawer pops over the checkout page and eats the first click
  const addItem = (item: Omit<CartItem, "qty">, opts?: { drawer?: boolean }) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.size === item.size);
      if (existing) return prev.map(i => i.id === item.id && i.size === item.size ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
    if (opts?.drawer !== false) setDrawerOpen(true);
    track("add_to_cart", { ic: item.id, sku: item.sku, d: { size: item.size, price: item.price } });
  };

  const removeItem = (id: string, size: string) => {
    setItems(prev => prev.filter(i => !(i.id === id && i.size === size)));
    track("remove_from_cart", { ic: id, d: { size } });
  };

  const updateQty = (id: string, size: string, qty: number) => {
    if (qty < 1) { removeItem(id, size); return; }
    setItems(prev => prev.map(i => i.id === id && i.size === size ? { ...i, qty } : i));
  };

  const clearCart = () => setItems([]);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, total, addItem, removeItem, updateQty, clearCart,
      drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false) }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
