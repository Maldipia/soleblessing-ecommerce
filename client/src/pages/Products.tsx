import { useState, useMemo } from "react";
import { useInventory } from "@/hooks/useInventory";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, Heart, X } from "lucide-react";
import { useWishlist } from "@/pages/Wishlist";
import LazyImage from "@/components/LazyImage";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

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

  const [search, setSearch] = useState("");
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
          brand: (item.sku.match(/^[A-Za-z]+/) || [""])[0].toUpperCase() || "OTHER",
          price: item.srp || item.sellingPrice,
          salePrice: item.sellingPrice < item.srp ? item.sellingPrice : null,
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
    <div className="min-h-screen bg-[#F7F4EF]">
      {/* Header */}
      <div className="bg-[#050f12] px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-2">SoleBlessing</p>
          <h1 className="text-4xl font-black text-white tracking-tight">All Products</h1>
          <p className="text-white/40 text-sm mt-1">{isLoading ? "Loading…" : `${filtered.length} products`}</p>
        </div>
      </div>

      {/* Search + Filter bar */}
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
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="name">A–Z</option>
          </select>
          <button onClick={() => setShowFilters(s => !s)}
            className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">
            <SlidersHorizontal className="h-4 w-4"/>
            Filters
            {(sizeFilter || brandFilter !== "All") && <span className="w-2 h-2 bg-[#C9A84C] rounded-full"/>}
          </button>
        </div>

        {/* Brand pills */}
        <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {brands.map(b => (
            <button key={b} onClick={() => setBrandFilter(b)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                brandFilter === b ? "bg-[#0d2430] text-white border-[#0d2430]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}>
              {b}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="max-w-7xl mx-auto px-6 pb-4 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter by Size</span>
              {sizeFilter && (
                <button onClick={() => setSizeFilter("")} className="text-xs text-[#C9A84C] flex items-center gap-1">
                  <X className="h-3 w-3"/> Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allSizes.map(sz => (
                <button key={sz} onClick={() => setSizeFilter(sizeFilter === sz ? "" : sz)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    sizeFilter === sz ? "bg-[#0d2430] text-white border-[#0d2430]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}>
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100"/>
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/3"/>
                  <div className="h-4 bg-gray-100 rounded w-3/4"/>
                  <div className="h-4 bg-gray-100 rounded w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-2">👟</p>
            <p className="text-lg font-black text-[#0d2430] mb-1">No products found</p>
            <p className="text-sm text-gray-400 mb-4">Try a different search or filter</p>
            <button onClick={() => { setSearch(""); setBrandFilter("All"); setSizeFilter(""); }}
              className="bg-[#0d2430] text-white px-6 py-2.5 text-sm font-bold rounded-xl hover:bg-[#122d3a]">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(p => {
              const wishlisted = isWishlisted(p.itemCode);
              const displaySizes = p.sizes.slice(0, 5);
              return (
                <div key={p.itemCode}
                  className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => setLocation(`/inventory/${p.itemCode}`)}>
                  {/* Image */}
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
                  {/* Info */}
                  <div className="p-4">
                    <p className="text-[9px] font-bold tracking-[.12em] uppercase text-[#C9A84C] mb-1">{p.brand}</p>
                    <h3 className="text-sm font-bold text-[#0d2430] leading-tight line-clamp-2 mb-2">{p.name}</h3>
                    {/* Sizes */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {displaySizes.map((sz: string) => (
                        <span key={sz} className="text-[10px] bg-[#EDE9E3] text-[#0d2430] px-2 py-0.5 rounded font-semibold">{sz}</span>
                      ))}
                      {p.sizes.length > 5 && (
                        <span className="text-[10px] text-gray-400 px-1 py-0.5">+{p.sizes.length - 5}</span>
                      )}
                    </div>
                    {/* Price */}
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
