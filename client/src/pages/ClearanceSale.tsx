// Clearance Sale — live /api/inventory data (rebuilt off the dead legacy tRPC backend)
import { useState, useMemo } from "react";
import { useInventory } from "@/hooks/useInventory";
import { useLocation } from "wouter";
import { Search, Heart, Flame } from "lucide-react";
import { useWishlist } from "@/pages/Wishlist";
import LazyImage from "@/components/LazyImage";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

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
          price: item.srp || item.sellingPrice,
          salePrice: item.sellingPrice < item.srp ? item.sellingPrice : null,
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
      <div className="min-h-screen bg-[#F7F4EF] flex flex-col items-center justify-center gap-4">
        <div className="text-lg text-red-500 font-bold">Error loading clearance items</div>
        <div className="text-sm text-gray-500">{error}</div>
        <button onClick={() => refetch()} className="bg-[#C9A84C] text-[#050f12] font-bold px-6 py-2.5 rounded-xl">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      {/* Header */}
      <div className="bg-[#2a0a0a] px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] font-bold tracking-[.2em] uppercase text-red-400 mb-2 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5"/>{maxDiscount > 0 ? `Up to ${maxDiscount}% off` : "Deals"}
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight">Clearance Sale</h1>
          <p className="text-white/40 text-sm mt-1">{isLoading ? "Loading…" : `${filtered.length} deals`}</p>
        </div>
      </div>

      {/* Search + sort */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or SKU…"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#0d2430]"/>
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none text-gray-600">
            <option value="discount-high">Biggest discount</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#EDE9E3]"/>
                <div className="p-4 space-y-2"><div className="h-3 bg-gray-100 rounded w-2/3"/><div className="h-4 bg-gray-100 rounded w-1/2"/></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No clearance deals right now — check back soon!</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map(p => {
              const wishlisted = isWishlisted(p.itemCode);
              const displaySizes = p.sizes.slice(0, 5);
              return (
                <div key={p.itemCode}
                  className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => setLocation(`/inventory/${p.itemCode}`)}>
                  <div className="relative aspect-square bg-[#EDE9E3] overflow-hidden">
                    {p.imageUrl ? (
                      <LazyImage src={p.imageUrl} alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">👟</div>
                    )}
                    {p.discount > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full">
                        -{p.discount}%
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggle({ id: p.itemCode, sku: p.sku, name: p.name, brand: p.brand, price: p.salePrice || p.price, imageUrl: p.imageUrl, itemCode: p.itemCode }); }}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow ${wishlisted ? "bg-red-500 text-white" : "bg-white/90 text-gray-400 hover:text-red-400"}`}>
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`}/>
                    </button>
                  </div>
                  <div className="p-4">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 inline-block bg-[#C9A84C] text-[#050f12]">{p.brand}</span>
                    <h3 className="text-sm font-bold text-[#0d2430] leading-tight line-clamp-2 mb-2">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {displaySizes.map((sz: string) => (
                        <span key={sz} className="text-[10px] bg-[#EDE9E3] text-[#0d2430] px-2 py-0.5 rounded font-semibold">{sz}</span>
                      ))}
                      {p.sizes.length > 5 && <span className="text-[10px] text-gray-400 px-1 py-0.5">+{p.sizes.length - 5}</span>}
                    </div>
                    <div className="flex items-baseline gap-2">
                      {p.salePrice ? (
                        <>
                          <span className="text-base font-black text-[#0d2430]">{fmt(p.salePrice)}</span>
                          <span className="text-xs text-gray-400 line-through">{fmt(p.price)}</span>
                        </>
                      ) : (
                        <span className="text-base font-black text-[#0d2430]">{fmt(p.price)}</span>
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
