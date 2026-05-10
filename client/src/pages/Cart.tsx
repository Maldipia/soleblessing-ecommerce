import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

export default function Cart() {
  const { items, total, removeItem, updateQty, count } = useCart();
  const [, setLocation] = useLocation();
  const shipping = total >= 300000 ? 0 : 15000; // free shipping over ₱3000

  if (items.length === 0) return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-6">
      <div className="text-center">
        <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-[#0d2430] mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Add some items to get started</p>
        <button onClick={() => setLocation("/products")}
          className="bg-[#0d2430] text-white px-8 py-3 text-sm font-semibold hover:bg-[#122d3a] transition-colors">
          Browse Products
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-1">Your Cart</p>
          <h1 className="text-4xl font-black text-[#0d2430] tracking-tight">{count} Item{count !== 1 ? "s" : ""}</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Items */}
          <div className="md:col-span-2 space-y-3">
            {items.map(item => (
              <div key={`${item.id}-${item.size}`} className="bg-white border border-gray-100 p-5 flex gap-4">
                <div className="w-20 h-20 bg-[#EDE9E3] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl opacity-30">👟</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold tracking-[.1em] uppercase text-[#C9A84C] mb-0.5">{item.brand}</p>
                  <p className="text-sm font-semibold text-[#0d2430] leading-tight mb-1 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mb-3">Size: <strong>{item.size}</strong></p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-gray-200">
                      <button onClick={() => updateQty(item.id, item.size, item.qty - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.size, item.qty + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-[#0d2430]">{fmt(item.price * item.qty)}</span>
                      <button onClick={() => removeItem(item.id, item.size)}
                        className="text-gray-300 hover:text-red-400 transition-colors">
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
            <div className="bg-white border border-gray-100 p-6 sticky top-24">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0d2430] mb-5">Order Summary</h2>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span className="font-semibold">{fmt(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="font-semibold">{shipping === 0 ? <span className="text-green-600">FREE</span> : fmt(shipping)}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-[10px] text-gray-400">Free shipping on orders over ₱3,000</p>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-bold text-[#0d2430]">Total</span>
                  <span className="text-xl font-black text-[#0d2430]">{fmt(total + shipping)}</span>
                </div>
              </div>
              <button onClick={() => setLocation("/checkout")}
                className="w-full bg-[#0d2430] text-white py-4 text-sm font-bold tracking-[.1em] uppercase hover:bg-[#122d3a] transition-colors flex items-center justify-center gap-2 mb-3">
                Checkout <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setLocation("/products")}
                className="w-full border border-gray-200 text-[#0d2430] py-3 text-xs font-semibold tracking-wide uppercase hover:bg-gray-50 transition-colors">
                Continue Shopping
              </button>
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 text-center mb-3 font-semibold uppercase tracking-wider">We Accept</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["GCash","Maya","COD","BDO","BPI"].map(m => (
                    <span key={m} className="bg-[#050f12]/5 text-[#0d2430] text-[9px] font-bold px-2 py-1">{m}</span>
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
