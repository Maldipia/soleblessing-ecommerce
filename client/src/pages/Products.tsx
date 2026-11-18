// SB2.0 — products grid: white page, pill filters, modern cards. Logic unchanged.
import { useState, useMemo } from "react";
import { useInventory } from "@/hooks/useInventory";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, Heart, X } from "lucide-react";
import { useWishlist } from "@/pages/Wishlist";
import LazyImage from "@/components/LazyImage";

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;

function normalizeSize(s: string): string {
  if (!s) return "";
  let n = s.toString().trim();
  n = n.replace(/\s*CM\s*/gi, "").trim();
  const num = parseFloat(n);
  return isNaN(num) ? n.toUpperCase() : String(num);
}

export default function Products() {
  const [, setLocation] = useLocation();
  const { data: raw, isLoading } = useInventory();
  const { toggle, isWishlisted } = useWishlist();

  // Honor ?search= / ?q= in the URL so shared/typed search links land filtered
  const [search, setSearch] = useState(() => {
    try { const sp = new URLSearchParams(window.location.search); return sp.get("search") || sp.get("q") || ""; } catch { return ""; }
  });
  const [brandFilter, setBrandFilter] = useState("All");
  const [sizeFilter, setSizeFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Group by SKU → one card per model, all sizes listed
  const products = useMemo(() => {
    if (!raw) return [];
    const grouped = new Map<string, any>();
    raw.forEach(item => {
      const key = item.sku || item.itemCode;
      const sz = normalizeSize(item.size);
      if (!grouped.has(key)) {
        grouped.set(key, {
          itemCode: item.itemCode,
          sku: item.sku,
          name: item.name,
          brand: item.brand || "Other",
          // What the customer pays is always sellingPrice (srp only as fallback);
          // hype pairs sell ABOVE srp, so never show srp as the big price.
          price: item.sellingPrice > 0 && item.sellingPrice >= item.srp ? item.sellingPrice : (item.srp || item.sellingPrice),
          salePrice: item.sellingPrice > 0 && item.sellingPrice < item.srp ? item.sellingPrice : null,
          imageUrl: item.imageUrl,
          sizes: sz ? [sz] : [],
          rawSizes: [item.size],
          discount: item.discount,
          addedAt: item.itemCode,
        });
      } else {
        const p = grouped.get(key);
        if (sz && !p.sizes.includes(sz)) p.sizes.push(sz);
        if (!p.rawSizes.includes(item.size)) p.rawSizes.push(item.size);
        if (!p.imageUrl && item.imageUrl) p.imageUrl = item.imageUrl;
      }
    });
    return Array.from(grouped.values());
  }, [raw]);

  const brands = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.brand))).sort()], [products]);
  const allSizes = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => p.sizes.forEach((sz: string) => s.add(sz)));
    return Array.from(s).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [products]);

  const filtered = useMemo(() => {
    let f = products.filter(p => {
      if (brandFilter !== "All" && p.brand !== brandFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
      if (sizeFilter && !p.sizes.includes(sizeFilter)) return false;
      return true;
    });
    if (sort === "price-low") f.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    else if (sort === "price-high") f.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    else if (sort === "name") f.sort((a, b) => a.name.localeCompare(b.name));
    return f;
  }, [products, brandFilter, search, sizeFilter, sort]);

  return (
    <div className="min-h-screen bg-white">
      {/* Title row */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-10 pt-8 pb-1">
        <h1 className="text-[28px] md:text-4xl font-black text-[#0a0a0a] tracking-[-.01em] leading-none">All Products</h1>
        <p className="text-[#9b9b98] text-xs mt-1.5 font-semibold">{isLoading ? "Loading…" : `${filtered.length} products`}</p>
      </div>

      {/* Search + Filter bar */}
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
            <option value="newest">Newest</option>
            <option value="price-low">Price ↑</option>
            <option value="price-high">Price ↓</option>
            <option value="name">A–Z</option>
          </select>
          <button onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition-colors ${
              showFilters || sizeFilter ? "bg-[#0a0a0a] text-white" : "border-[1.5px] border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"}`}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
            {sizeFilter && <span className="w-1.5 h-1.5 bg-[#FF5A1F] rounded-full" />}
          </button>
        </div>

        {/* Brand pills */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-10 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {brands.map(b => (
            <button key={b} onClick={() => setBrandFilter(b)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11.5px] font-bold transition-all border-[1.5px] ${
                brandFilter === b ? "bg-[#0a0a0a] text-white border-[#0a0a0a]" : "bg-white text-[#555] border-[#e6e6e4] hover:border-[#0a0a0a]"
              }`}>
              {b}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="max-w-[1400px] mx-auto px-4 md:px-10 pb-4 border-t border-[#f0f0ef] pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b9b98]">Filter by Size</span>
              {sizeFilter && (
                <button onClick={() => setSizeFilter("")} className="text-xs text-[#FF5A1F] font-bold flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allSizes.map(sz => (
                <button key={sz} onClick={() => setSizeFilter(sizeFilter === sz ? "" : sz)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border-[1.5px] transition-all ${
                    sizeFilter === sz ? "bg-[#0a0a0a] text-white border-[#0a0a0a]" : "bg-white text-[#555] border-[#e6e6e4] hover:border-[#0a0a0a]"
                  }`}>
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-6 md:py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white border border-[#f0f0ef] rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#f6f6f5]" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-[#f0f0ef] rounded w-1/3" />
                  <div className="h-4 bg-[#f0f0ef] rounded w-3/4" />
                  <div className="h-4 bg-[#f0f0ef] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-2">👟</p>
            <p className="text-lg font-black text-[#0a0a0a] mb-1">No products found</p>
            <p className="text-sm text-[#9b9b98] mb-5">Try a different search or filter</p>
            <button onClick={() => { setSearch(""); setBrandFilter("All"); setSizeFilter(""); }}
              className="bg-[#0a0a0a] text-white px-7 py-3 text-xs font-black tracking-[.1em] uppercase rounded-full hover:bg-[#262626]">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map(p => {
              const wishlisted = isWishlisted(p.itemCode);
              const displaySizes = p.sizes.slice(0, 4);
              return (
                <div key={p.itemCode}
                  className="bg-white rounded-2xl overflow-hidden border border-[#f0f0ef] hover:shadow-[0_14px_34px_rgba(0,0,0,.1)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  onClick={() => setLocation(`/inventory/${p.itemCode}`)}>
                  {/* Image */}
                  <div className="relative aspect-square bg-[#f6f6f5] overflow-hidden">
                    {p.imageUrl ? (
                      <LazyImage src={p.imageUrl} alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">👟</div>
                    )}
                    {p.discount > 0 && (
                      <span className="absolute top-2 left-2 bg-[#FF5A1F] text-white text-[8.5px] font-black tracking-[.06em] px-2 py-1 rounded-full">
                        SALE
                      </span>
                    )}
                    <button aria-label="Wishlist"
                      onClick={e => { e.stopPropagation(); toggle({ id: p.itemCode, sku: p.sku, name: p.name, brand: p.brand, price: p.salePrice || p.price, imageUrl: p.imageUrl, itemCode: p.itemCode }); }}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${wishlisted ? "bg-[#FF5A1F] text-white" : "bg-white/95 text-[#9b9b98] hover:text-[#FF5A1F]"}`}>
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                    </button>
                  </div>
                  {/* Info */}
                  <div className="p-3.5">
                    <p className="text-[8.5px] font-black tracking-[.14em] uppercase text-[#9b9b98] mb-0.5">{p.brand}</p>
                    <h3 className="text-[13px] font-bold text-[#0a0a0a] leading-tight truncate mb-1.5">{p.name}</h3>
                    {/* Sizes */}
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {displaySizes.map((sz: string) => (
                        <span key={sz} className="text-[9.5px] bg-[#f6f6f5] text-[#555] px-1.5 py-0.5 rounded font-bold">{sz}</span>
                      ))}
                      {p.sizes.length > 4 && (
                        <span className="text-[9.5px] text-[#b3b3b0] px-1 py-0.5 font-bold">+{p.sizes.length - 4}</span>
                      )}
                    </div>
                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {p.salePrice ? (
                        <>
                          <span className="text-[15px] font-black text-[#0a0a0a]">{fmt(p.salePrice)}</span>
                          <span className="text-[10.5px] text-[#b3b3b0] line-through">{fmt(p.price)}</span>
                          <span className="text-[10px] font-black text-[#FF5A1F]">-{p.discount}%</span>
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
