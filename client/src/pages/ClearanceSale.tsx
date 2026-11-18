// SB2.0 — Clearance: white grid, orange SALE identity. Live /api/inventory data.
import { useState, useMemo } from "react";
import { useInventory } from "@/hooks/useInventory";
import { useLocation } from "wouter";
import { Search, Heart, Flame } from "lucide-react";
import { useWishlist } from "@/pages/Wishlist";
import LazyImage from "@/components/LazyImage";

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;

function normalizeSize(s: string): string {
  if (!s) return "";
  let n = s.toString().trim().replace(/\s*CM\s*/gi, "").trim();
  const num = parseFloat(n);
  return isNaN(num) ? n.toUpperCase() : String(num);
}

export default function ClearanceSale() {
  const [, setLocation] = useLocation();
  const { data: raw, isLoading, error, refetch } = useInventory();
  const { toggle, isWishlisted } = useWishlist();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("discount-high");

  // Discounted items only, grouped by SKU → one card per model
  const products = useMemo(() => {
    if (!raw) return [];
    const grouped = new Map<string, any>();
    raw.filter(item => item.discount > 0).forEach(item => {
      const key = item.sku || item.itemCode;
      const sz = normalizeSize(item.size);
      if (!grouped.has(key)) {
        grouped.set(key, {
          itemCode: item.itemCode, sku: item.sku, name: item.name,
          brand: item.brand || "Other",
          price: item.sellingPrice > 0 && item.sellingPrice >= item.srp ? item.sellingPrice : (item.srp || item.sellingPrice),
          salePrice: item.sellingPrice > 0 && item.sellingPrice < item.srp ? item.sellingPrice : null,
          imageUrl: item.imageUrl,
          sizes: sz ? [sz] : [],
          discount: item.discount,
        });
      } else {
        const p = grouped.get(key);
        if (sz && !p.sizes.includes(sz)) p.sizes.push(sz);
        if (!p.imageUrl && item.imageUrl) p.imageUrl = item.imageUrl;
        if (item.discount > p.discount) p.discount = item.discount;
      }
    });
    return Array.from(grouped.values());
  }, [raw]);

  const maxDiscount = useMemo(() => products.reduce((m, p) => Math.max(m, p.discount), 0), [products]);

  const filtered = useMemo(() => {
    let f = products.filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === "discount-high") f.sort((a, b) => b.discount - a.discount);
    else if (sort === "price-low") f.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    else if (sort === "price-high") f.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    return f;
  }, [products, search, sort]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-lg text-[#0a0a0a] font-black">Couldn't load the sale</div>
        <div className="text-sm text-[#9b9b98]">{error}</div>
        <button onClick={() => refetch()} className="bg-[#FF5A1F] text-white font-black px-7 py-3 rounded-full text-xs tracking-[.1em] uppercase">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header band */}
      <div className="bg-[#0a0a0a] px-5 md:px-10 py-10 md:py-12">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[10px] font-black tracking-[.24em] uppercase text-[#FF5A1F] mb-2 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />{maxDiscount > 0 ? `Up to ${maxDiscount}% off` : "Deals"}
          </p>
          <h1 className="text-[32px] md:text-5xl font-black text-white tracking-[-.01em] leading-none">Clearance Sale</h1>
          <p className="text-white/50 text-xs mt-2 font-semibold">{isLoading ? "Loading…" : `${filtered.length} deals · once it's gone, it's gone`}</p>
        </div>
      </div>

      {/* Search + sort */}
      <div className="sticky top-[60px] z-20 bg-white/95 backdrop-blur border-b border-[#f0f0ef]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-3 flex items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b3b3b0]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or SKU…" inputMode="search"
              className="w-full pl-11 pr-4 py-2.5 text-[13px] bg-[#fafaf9] border-[1.5px] border-[#e6e6e4] rounded-full outline-none focus:border-[#0a0a0a] transition-colors" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-xs font-bold border-[1.5px] border-[#e6e6e4] rounded-full px-3.5 py-2.5 bg-white outline-none text-[#555]">
            <option value="discount-high">Biggest discount</option>
            <option value="price-low">Price ↑</option>
            <option value="price-high">Price ↓</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-6 md:py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#f0f0ef] rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#f6f6f5]" />
                <div className="p-4 space-y-2"><div className="h-3 bg-[#f0f0ef] rounded w-2/3" /><div className="h-4 bg-[#f0f0ef] rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#9b9b98] font-semibold">No clearance deals right now — check back soon!</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map(p => {
              const wishlisted = isWishlisted(p.itemCode);
              const displaySizes = p.sizes.slice(0, 4);
              return (
                <div key={p.itemCode}
                  className="bg-white rounded-2xl overflow-hidden border border-[#f0f0ef] hover:shadow-[0_14px_34px_rgba(0,0,0,.1)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  onClick={() => setLocation(`/inventory/${p.itemCode}`)}>
                  <div className="relative aspect-square bg-[#f6f6f5] overflow-hidden">
                    {p.imageUrl ? (
                      <LazyImage src={p.imageUrl} alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">👟</div>
                    )}
                    <span className="absolute top-2 left-2 bg-[#FF5A1F] text-white text-[8.5px] font-black tracking-[.06em] px-2 py-1 rounded-full">
                      -{p.discount}%
                    </span>
                    <button aria-label="Wishlist"
                      onClick={e => { e.stopPropagation(); toggle({ id: p.itemCode, sku: p.sku, name: p.name, brand: p.brand, price: p.salePrice || p.price, imageUrl: p.imageUrl, itemCode: p.itemCode }); }}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${wishlisted ? "bg-[#FF5A1F] text-white" : "bg-white/95 text-[#9b9b98] hover:text-[#FF5A1F]"}`}>
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                    </button>
                  </div>
                  <div className="p-3.5">
                    <p className="text-[8.5px] font-black tracking-[.14em] uppercase text-[#9b9b98] mb-0.5">{p.brand}</p>
                    <h3 className="text-[13px] font-bold text-[#0a0a0a] leading-tight truncate mb-1.5">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {displaySizes.map((sz: string) => (
                        <span key={sz} className="text-[9.5px] bg-[#f6f6f5] text-[#555] px-1.5 py-0.5 rounded font-bold">{sz}</span>
                      ))}
                      {p.sizes.length > 4 && <span className="text-[9.5px] text-[#b3b3b0] px-1 py-0.5 font-bold">+{p.sizes.length - 4}</span>}
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {p.salePrice ? (
                        <>
                          <span className="text-[15px] font-black text-[#0a0a0a]">{fmt(p.salePrice)}</span>
                          <span className="text-[10.5px] text-[#b3b3b0] line-through">{fmt(p.price)}</span>
                        </>
                      ) : (
                        <span className="text-[15px] font-black text-[#0a0a0a]">{fmt(p.price)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
