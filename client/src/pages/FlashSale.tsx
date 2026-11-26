// ⚡ /flash-sale — dedicated landing page for social traffic (FB/IG/TikTok/groups).
// Reads the SAME campaign data as the rest of the site: /api/inventory?flash=1
// (campaign meta) + useInventory (flash-priced pairs). Never a dead page: with
// no active campaign it shows a friendly empty state. Prices are enforced
// server-side at checkout regardless of what this page shows.
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useInventory } from "@/hooks/useInventory";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

type FlashMeta = {
  name: string; endsAt: string; price: number | null; percent: number | null;
  origPrice: number; imageUrl: string; productName: string; sku: string; search: string;
  sold: number; stockLimit: number | null; totalPairs: number;
};

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;
const two = (n: number) => String(n).padStart(2, "0");

function useTick(endsAt?: string) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const f = () => setLeft(Math.max(new Date(endsAt).getTime() - Date.now(), 0));
    f(); const t = setInterval(f, 1000); return () => clearInterval(t);
  }, [endsAt]);
  return left;
}

export default function FlashSale() {
  const [, setLocation] = useLocation();
  const { data: items, isLoading } = useInventory();
  const { addItem } = useCart();
  const [meta, setMeta] = useState<FlashMeta | null | undefined>(undefined); // undefined = loading
  const [selected, setSelected] = useState<any | null>(null); // selected pair (itemCode-level)
  const [added, setAdded] = useState(false);
  useEffect(() => {
    document.title = "⚡ Flash Sale — SoleBlessing";
    fetch("/api/inventory?flash=1").then(r => r.json()).then(d => setMeta(d.flash || null)).catch(() => setMeta(null));
  }, []);
  const left = useTick(meta?.endsAt);

  // flash-covered pairs grouped by SKU
  const groups = useMemo(() => {
    const by: Record<string, any> = {};
    for (const it of (items as any[]) || []) {
      if (!it.flash || it.status !== "AVAILABLE") continue;
      const k = it.sku || it.itemCode;
      if (!by[k]) by[k] = { sku: it.sku, name: it.name, imageUrl: it.imageUrl, flashPrice: it.sellingPrice,
        // strikethrough vs SRP when it's higher (matches the catalog + Pia's spec: ₱4,300 → ₱1,499)
        origPrice: Math.max(it.srp || 0, it.flash.origPrice || 0), srp: it.srp, pairs: [] as any[] };
      by[k].pairs.push(it);
      if (!by[k].imageUrl && it.imageUrl) by[k].imageUrl = it.imageUrl;
    }
    return Object.values(by);
  }, [items]);

  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  const expired = meta != null && left <= 0;

  // ---------- EMPTY STATE (no campaign / expired) ----------
  if (meta === null || expired) return (
    <div className="min-h-[70vh] bg-white flex items-center justify-center px-6" data-testid="flash-empty">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-3">⚡</div>
        <h1 className="text-2xl font-black text-[#0a0a0a] mb-2">No flash sale right now</h1>
        <p className="text-sm text-[#9b9b98] mb-6">Pero may bagong drops kami linggo-linggo! Follow us para unang-una ka sa next flash sale.</p>
        <button onClick={() => setLocation("/products")}
          className="bg-[#0a0a0a] text-white px-8 py-3.5 text-xs font-black tracking-[.12em] uppercase rounded-full hover:bg-[#262626] transition-colors">
          Shop All Products →
        </button>
      </div>
    </div>
  );

  if (meta === undefined || isLoading) return (
    <div className="min-h-[70vh] bg-white flex items-center justify-center">
      <div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-[#FF5A1F] rounded-full animate-bounce" style={{ animationDelay: `${i * .15}s` }} />)}</div>
    </div>
  );

  const limitTotal = meta.stockLimit || meta.totalPairs || 0;
  const pairsLeft = Math.max(limitTotal - (meta.sold || 0), 0);
  const single = groups.length === 1 ? groups[0] : null;

  const doAdd = (goCheckout: boolean) => {
    if (!single) return;
    if (!selected) { toast.error("Please select a size first"); return; }
    addItem({
      id: selected.itemCode, sku: single.sku, name: single.name,
      brand: selected.brand || single.pairs?.[0]?.brand || "SoleBlessing",
      size: selected.size, price: selected.sellingPrice > 0 ? selected.sellingPrice : selected.srp,
      imageUrl: selected.imageUrl || single.imageUrl || undefined,
    });
    if (goCheckout) { setLocation("/checkout"); return; }
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* HERO */}
      <div className="bg-[#0a0a0a] text-white text-center px-4 py-10" data-testid="flash-hero">
        <span className="inline-block bg-red-600 text-[10px] font-black tracking-[.16em] rounded-full px-4 py-1.5 mb-4">⚡ LIVE NOW · WHILE STOCKS LAST</span>
        <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight uppercase">
          {meta.name.replace(/super sale/i, "")}<span className="text-[#FF5A1F]"> SUPER SALE</span>
        </h1>
        <div className="flex justify-center gap-2.5 mt-6 mb-3" data-testid="flash-landing-countdown">
          {[[h, "HOURS"], [m, "MINS"], [s, "SECS"]].map(([v, l]) => (
            <div key={l as string} className="bg-[#17262e] border border-white/10 rounded-2xl w-[82px] py-3">
              <div className="text-3xl font-black tabular-nums">{two(v as number)}</div>
              <div className="text-[8.5px] font-black tracking-[.16em] text-white/40 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        <p className="text-[12px] font-bold text-red-300">⏳ Offer ends when the timer hits zero — price locked once you order</p>
      </div>

      {/* SINGLE PRODUCT */}
      {single && (
        <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8 items-center">
          <div className="bg-[#f6f6f5] rounded-3xl overflow-hidden aspect-square">
            {single.imageUrl
              ? <img src={single.imageUrl} alt={single.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">👟</div>}
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-[#0a0a0a]">{single.name}</h2>
            <p className="text-[11px] text-[#9b9b98] font-mono mt-1 mb-4">{single.sku} · Verified Authentic · Brand New</p>
            <div className="flex items-baseline gap-3 flex-wrap mb-1">
              {single.origPrice > single.flashPrice && <span className="text-lg text-[#b3b3b0] line-through">{fmt(single.origPrice)}</span>}
              <span className="text-4xl font-black text-red-600 tabular-nums">{fmt(single.flashPrice)}</span>
            </div>
            {single.origPrice > single.flashPrice && (
              <span className="inline-block bg-red-50 text-red-600 text-[11px] font-black px-3 py-1.5 rounded-full mb-4">
                YOU SAVE {fmt(single.origPrice - single.flashPrice)} · {Math.round((single.origPrice - single.flashPrice) / single.origPrice * 100)}% OFF
              </span>
            )}
            <div className="text-[10px] font-black uppercase tracking-wider text-[#9b9b98] mb-2">Select size (US) — live stock only</div>
            <div className="flex flex-wrap gap-2 mb-5">
              {Object.entries(single.pairs.reduce((a: any, p: any) => { const k = p.size || "?"; (a[k] = a[k] || []).push(p); return a; }, {}))
                .sort((x: any, y: any) => parseFloat(x[0]) - parseFloat(y[0]))
                .map(([sz, ps]: any) => (
                  <button key={sz} onClick={() => setSelected(ps[0])}
                    className={`rounded-xl px-4 py-2.5 text-sm font-black border-2 transition ${selected && ps.some((p: any) => p.itemCode === selected.itemCode) ? "border-red-600 bg-red-50 text-red-600" : "border-[#e4e2df] text-[#0a0a0a] hover:border-[#0a0a0a]"}`}>
                    {sz}<span className="block text-[8.5px] font-bold text-[#9b9b98]">{ps.length} left</span>
                  </button>
                ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => doAdd(false)}
                className="flex-1 border-2 border-[#0a0a0a] text-[#0a0a0a] rounded-xl py-3.5 text-[13px] font-black flex items-center justify-center gap-2 hover:bg-[#0a0a0a] hover:text-white transition">
                {added ? <><Check className="h-4 w-4" /> Added!</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
              </button>
              <button onClick={() => doAdd(true)}
                className="flex-[1.3] bg-red-600 text-white rounded-xl py-3.5 text-[13px] font-black hover:bg-red-700 transition">
                ⚡ BUY NOW — {fmt(single.flashPrice)}
              </button>
            </div>
            {limitTotal > 0 && (
              <div className="mt-4" data-testid="flash-pairs-left">
                <div className="text-[11px] font-black text-[#b45309]">🔥 {pairsLeft} of {limitTotal} pairs left</div>
                <div className="h-1.5 bg-[#f1efec] rounded-full overflow-hidden mt-1.5 max-w-[300px]">
                  <div className="h-full bg-gradient-to-r from-red-600 to-[#EA580C]" style={{ width: `${Math.max(Math.min(pairsLeft / limitTotal * 100, 100), 4)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MULTI-PRODUCT GRID */}
      {!single && groups.length > 1 && (
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map((g: any) => (
            <button key={g.sku} onClick={() => setLocation(`/inventory/${g.pairs[0].itemCode}`)} className="text-left border border-[#f0f0ef] rounded-2xl overflow-hidden hover:shadow-lg transition">
              <div className="aspect-square bg-[#f6f6f5]">{g.imageUrl && <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />}</div>
              <div className="p-3">
                <div className="text-[12px] font-black text-[#0a0a0a] truncate">{g.name}</div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[15px] font-black text-red-600">{fmt(g.flashPrice)}</span>
                  {g.origPrice > g.flashPrice && <span className="text-[10px] text-[#b3b3b0] line-through">{fmt(g.origPrice)}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* campaign live but its pairs all sold */}
      {groups.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-sm font-bold text-[#9b9b98]">Sold out na ang flash items! 🔥 Check our other drops:</p>
          <button onClick={() => setLocation("/products")} className="mt-4 bg-[#0a0a0a] text-white px-8 py-3 text-xs font-black tracking-[.12em] uppercase rounded-full">Shop All Products →</button>
        </div>
      )}

      {/* trust footer */}
      <div className="border-t border-[#f0f0ef] mt-6 pt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10.5px] font-black text-[#9b9b98] px-4">
        <span>✓ COD Nationwide</span><span>✓ GCash · Maya · Bank Transfer</span><span>✓ Legit & Authenticated</span><span>✓ Ships in 24–48h</span>
      </div>
    </div>
  );
}
