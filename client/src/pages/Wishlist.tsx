import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useLocation } from "wouter";
import { Heart, ShoppingCart, Trash2, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

// ── WishlistContext ─────────────────────────────────────────────────────────
interface WishlistItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  price: number;
  imageUrl?: string;
  itemCode: string;
  addedAt: string;
}
interface WishlistCtx {
  items: WishlistItem[];
  count: number;
  addItem: (item: Omit<WishlistItem, "addedAt">) => void;
  removeItem: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  toggle: (item: Omit<WishlistItem, "addedAt">) => void;
}
const WishlistContext = createContext<WishlistCtx | null>(null);
const KEY = "sb_wishlist_v1";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const addItem = (item: Omit<WishlistItem, "addedAt">) => {
    if (items.some(i => i.id === item.id)) return;
    setItems(prev => [{ ...item, addedAt: new Date().toISOString() }, ...prev]);
  };
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const isWishlisted = (id: string) => items.some(i => i.id === id);
  const toggle = (item: Omit<WishlistItem, "addedAt">) => {
    if (isWishlisted(item.id)) { removeItem(item.id); toast.success("Removed from wishlist"); }
    else { addItem(item); toast.success("Added to wishlist ♥"); }
  };

  return (
    <WishlistContext.Provider value={{ items, count: items.length, addItem, removeItem, isWishlisted, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be inside WishlistProvider");
  return ctx;
}

// ── Wishlist Page ───────────────────────────────────────────────────────────
const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

export default function Wishlist() {
  const [, setLocation] = useLocation();
  const { items, removeItem } = useWishlist();
  const { addItem: addToCart } = useCart();

  const handleAddToCart = (item: WishlistItem) => {
    setLocation(`/inventory/${item.itemCode}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="bg-[#050f12] px-6 py-14 text-center">
        <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-3">SoleBlessing</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">My Wishlist</h1>
        <p className="text-white/40 text-sm">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-black text-[#0d2430] mb-2">Your wishlist is empty</h2>
            <p className="text-gray-400 text-sm mb-6">Save items you love by clicking the heart icon on any product.</p>
            <button onClick={() => setLocation("/products")}
              className="bg-[#0d2430] text-white px-8 py-3 text-sm font-bold hover:bg-[#122d3a] transition-colors rounded-xl">
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
                <div className="relative aspect-square bg-[#EDE9E3] overflow-hidden cursor-pointer"
                  onClick={() => setLocation(`/inventory/${item.itemCode}`)}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">👟</div>}
                  <button onClick={e => { e.stopPropagation(); removeItem(item.id); toast.success("Removed from wishlist"); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50 shadow transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-[9px] font-bold tracking-[.1em] uppercase text-[#C9A84C] mb-0.5">{item.brand}</p>
                  <p className="text-sm font-semibold text-[#0d2430] leading-tight mb-2 line-clamp-2">{item.name}</p>
                  <p className="text-base font-black text-[#0d2430] mb-3">{fmt(item.price)}</p>
                  <button onClick={() => handleAddToCart(item)}
                    className="w-full bg-[#0d2430] text-white py-2.5 text-xs font-bold tracking-wider uppercase rounded-xl hover:bg-[#122d3a] transition-colors flex items-center justify-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5" /> Select Size & Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
