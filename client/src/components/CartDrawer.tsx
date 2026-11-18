// SB2.0 — cart drawer: bottom sheet on mobile, right panel on desktop.
// Opens automatically when something is added; shoppers stay on the page.
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { X, Trash2, Plus, Minus, Check } from "lucide-react";

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;
const FREE_SHIP = 300000; // centavos

export default function CartDrawer() {
  const { items, total, count, removeItem, updateQty, drawerOpen, closeDrawer } = useCart();
  const [, setLocation] = useLocation();
  if (!drawerOpen) return null;

  const freeShip = total >= FREE_SHIP;
  const go = (path: string) => { closeDrawer(); setLocation(path); };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={closeDrawer} />

      {/* panel: bottom sheet (mobile) / right panel (md+) */}
      <div className="absolute inset-x-0 bottom-0 md:inset-x-auto md:right-0 md:top-0 md:h-full md:w-[420px]
        bg-white rounded-t-3xl md:rounded-none shadow-[0_-18px_60px_rgba(0,0,0,.3)] md:shadow-[-18px_0_60px_rgba(0,0,0,.2)]
        flex flex-col max-h-[85vh] md:max-h-full"
        style={{ animation: "sbDrawerIn .28s cubic-bezier(.2,.9,.3,1) both" }}>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 md:pt-6">
          <div>
            <div className="text-[15px] font-black text-[#0a0a0a] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#e8f5ee] text-[#1a7f4e] flex items-center justify-center"><Check className="h-3 w-3" /></span>
              Added to cart
            </div>
            <div className="text-[10.5px] text-[#9b9b98] font-semibold mt-0.5">{count} item{count !== 1 ? "s" : ""} · pairs reserved while you check out</div>
          </div>
          <button onClick={closeDrawer} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-[#f6f6f5] flex items-center justify-center text-[#0a0a0a]">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* items */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2.5 pb-2">
          {items.length === 0 && (
            <p className="text-sm text-[#9b9b98] font-semibold py-8 text-center">Your cart is empty.</p>
          )}
          {items.map(item => (
            <div key={`${item.id}-${item.size}`} className="flex gap-3 border border-[#f0f0ef] rounded-2xl p-3">
              <div className="w-[72px] h-[72px] rounded-xl bg-[#f6f6f5] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  : <span className="text-2xl opacity-30">👟</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#0a0a0a] leading-tight truncate">{item.name}</p>
                <p className="text-[10.5px] text-[#9b9b98] font-semibold mt-0.5">Size {item.size} · {item.sku}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[14px] font-black text-[#0a0a0a]">{fmt(item.price * item.qty)}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border-[1.5px] border-[#e6e6e4] rounded-full overflow-hidden">
                      <button onClick={() => updateQty(item.id, item.size, item.qty - 1)} aria-label="Less" className="w-7 h-7 flex items-center justify-center hover:bg-[#f6f6f5]"><Minus className="h-3 w-3" /></button>
                      <span className="w-6 text-center text-xs font-black">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.size, item.qty + 1)} aria-label="More" className="w-7 h-7 flex items-center justify-center hover:bg-[#f6f6f5]"><Plus className="h-3 w-3" /></button>
                    </div>
                    <button onClick={() => removeItem(item.id, item.size)} aria-label="Remove" className="text-[#c9c9c6] hover:text-[#FF5A1F]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* summary + CTAs */}
        <div className="px-5 pt-3 pb-6 md:pb-6 border-t border-[#f0f0ef]">
          <div className="flex justify-between text-[13px] font-semibold text-[#555] mb-1">
            <span>Subtotal ({count} item{count !== 1 ? "s" : ""})</span>
            <span className="font-black text-[#0a0a0a]">{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-[12px] font-semibold mb-3">
            <span className="text-[#555]">Shipping</span>
            {freeShip
              ? <span className="text-[#1a7f4e] font-black">FREE — over ₱3,000 ✓</span>
              : <span className="text-[#9b9b98]">+{fmt(15000)} · free over ₱3,000</span>}
          </div>
          {items.length > 0 && (
            <button onClick={() => go("/checkout")}
              className="w-full bg-[#FF5A1F] text-white py-4 text-xs font-black tracking-[.12em] uppercase rounded-full hover:opacity-90 transition-opacity">
              Checkout — {fmt(total + (freeShip ? 0 : 15000))}
            </button>
          )}
          <button onClick={closeDrawer}
            className="w-full mt-2.5 border-[1.5px] border-[#0a0a0a] text-[#0a0a0a] py-3.5 text-xs font-black tracking-[.1em] uppercase rounded-full hover:bg-[#f6f6f5] transition-colors">
            Continue Shopping
          </button>
        </div>
      </div>
      <style>{`@keyframes sbDrawerIn{0%{transform:translateY(40px);opacity:0}100%{transform:translateY(0);opacity:1}}
      @media (min-width:768px){@keyframes sbDrawerIn{0%{transform:translateX(60px);opacity:0}100%{transform:translateX(0);opacity:1}}}`}</style>
    </div>
  );
}
