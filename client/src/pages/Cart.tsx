// SB2.0 — cart page: white, rounded cards, orange checkout. Logic unchanged.
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;

export default function Cart() {
  const { items, total, removeItem, updateQty, count } = useCart();
  const [, setLocation] = useLocation();
  const shipping = total >= 300000 ? 0 : 15000; // free shipping over ₱3000

  if (items.length === 0) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center">
        <ShoppingBag className="h-16 w-16 text-[#e6e6e4] mx-auto mb-4" />
        <h2 className="text-2xl font-black text-[#0a0a0a] mb-2">Your cart is empty</h2>
        <p className="text-[#9b9b98] text-sm mb-6 font-semibold">Add some pairs to get started</p>
        <button onClick={() => setLocation("/products")}
          className="bg-[#0a0a0a] text-white px-8 py-3.5 text-xs font-black tracking-[.12em] uppercase rounded-full hover:bg-[#262626] transition-colors">
          Browse Products
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-10 py-8 md:py-10">
        <div className="mb-7">
          <p className="text-[10px] font-black tracking-[.2em] uppercase text-[#FF5A1F] mb-1">Your Cart</p>
          <h1 className="text-[30px] md:text-4xl font-black text-[#0a0a0a] tracking-[-.01em] leading-none">{count} Item{count !== 1 ? "s" : ""}</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {/* Items */}
          <div className="md:col-span-2 space-y-3">
            {items.map(item => (
              <div key={`${item.id}-${item.size}`} className="bg-white border border-[#f0f0ef] rounded-2xl p-4 flex gap-4">
                <div className="w-[84px] h-[84px] bg-[#f6f6f5] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl opacity-30">👟</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8.5px] font-black tracking-[.14em] uppercase text-[#9b9b98] mb-0.5">{item.brand}</p>
                  <p className="text-[14px] font-bold text-[#0a0a0a] leading-tight mb-0.5 truncate">{item.name}</p>
                  <p className="text-[11px] text-[#9b9b98] font-semibold mb-3">Size {item.size} · {item.sku}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border-[1.5px] border-[#e6e6e4] rounded-full overflow-hidden">
                      <button onClick={() => updateQty(item.id, item.size, item.qty - 1)} aria-label="Less"
                        className="w-8 h-8 flex items-center justify-center hover:bg-[#f6f6f5] transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-black">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.size, item.qty + 1)} aria-label="More"
                        className="w-8 h-8 flex items-center justify-center hover:bg-[#f6f6f5] transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-black text-[#0a0a0a]">{fmt(item.price * item.qty)}</span>
                      <button onClick={() => removeItem(item.id, item.size)} aria-label="Remove"
                        className="text-[#c9c9c6] hover:text-[#FF5A1F] transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white border border-[#f0f0ef] rounded-2xl p-6 sticky top-24">
              <h2 className="text-[12px] font-black uppercase tracking-[.12em] text-[#0a0a0a] mb-5">Order Summary</h2>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-[13px] text-[#555] font-semibold">
                  <span>Subtotal</span><span className="font-black text-[#0a0a0a]">{fmt(total)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-[#555] font-semibold">
                  <span>Shipping</span>
                  <span className="font-black">{shipping === 0 ? <span className="text-[#1a7f4e]">FREE</span> : fmt(shipping)}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-[10px] text-[#9b9b98] font-semibold">Add {fmt(300000 - total)} more for free shipping</p>
                )}
                <div className="border-t-2 border-[#0a0a0a] pt-3 flex justify-between items-baseline">
                  <span className="font-black text-[#0a0a0a]">Total</span>
                  <span className="text-[22px] font-black text-[#0a0a0a]">{fmt(total + shipping)}</span>
                </div>
              </div>
              <button onClick={() => setLocation("/checkout")}
                className="w-full bg-[#FF5A1F] text-white py-4 text-xs font-black tracking-[.12em] uppercase rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mb-2.5">
                Checkout <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setLocation("/products")}
                className="w-full border-[1.5px] border-[#0a0a0a] text-[#0a0a0a] py-3.5 text-xs font-black tracking-[.1em] uppercase rounded-full hover:bg-[#f6f6f5] transition-colors">
                Continue Shopping
              </button>
              <div className="mt-5 pt-5 border-t border-[#f0f0ef]">
                <p className="text-[9.5px] text-[#9b9b98] text-center mb-3 font-black uppercase tracking-[.14em]">We Accept</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["GCash", "Maya", "COD", "BDO", "BPI"].map(m => (
                    <span key={m} className="bg-[#f6f6f5] text-[#0a0a0a] text-[9.5px] font-bold px-2.5 py-1 rounded-full">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
