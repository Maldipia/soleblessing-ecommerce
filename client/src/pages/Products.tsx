import { trpc } from "@/lib/trpc";
import { useInventory } from "@/hooks/useInventory";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, Heart, Ruler, X, ChevronDown } from "lucide-react";
import { SizeGuideModal } from "@/components/SizeGuideModal";
import CountdownTimer from "@/components/CountdownTimer";
import LazyImage from "@/components/LazyImage";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Products() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: inventoryProducts, isLoading, error } = useInventory();

  const normalizeSize = (size: string): string => {
    if (!size) return '';
    let normalized = size.toString().trim();
    normalized = normalized.replace(/\s*CM\s*/gi, '').trim();
    const num = parseFloat(normalized);
    if (!isNaN(num)) return num.toString();
    return normalized;
  };

  const products = useMemo(() => {
    if (!inventoryProducts) return [];
    const grouped = new Map<string, any>();
    inventoryProducts.forEach(item => {
      const sku = item.sku;
      const normalizedSize = normalizeSize(item.size);
      if (!grouped.has(sku)) {
        grouped.set(sku, {
          id: parseInt(item.itemCode) || 0,
          itemCode: item.itemCode,
          name: item.name,
          description: item.name,
          brand: sku.split(/[^a-zA-Z]/)[0] || 'Unknown',
          category: 'Sneakers',
          basePrice: Math.round(item.srp),
          salePrice: item.sellingPrice > 0 ? Math.round(item.sellingPrice) : null,
          saleEndDate: null,
          images: JSON.stringify(item.imageUrl ? [item.imageUrl] : []),
          sizes: normalizedSize ? [normalizedSize] : [],
          rawSizes: [item.size],
          sizeStock: { [normalizedSize]: item.status === 'AVAILABLE' ? 1 : 0 },
          stock: item.status === 'AVAILABLE' ? 1 : 0,
          featured: 0, clearance: 0, clearanceEndDate: null, fitNotes: null,
          createdAt: new Date(), updatedAt: new Date(), sku: sku,
        });
      } else {
        const existing = grouped.get(sku);
        if (normalizedSize && !existing.sizes.includes(normalizedSize)) existing.sizes.push(normalizedSize);
        if (!existing.rawSizes.includes(item.size)) existing.rawSizes.push(item.size);
        existing.sizeStock[normalizedSize] = (existing.sizeStock[normalizedSize] || 0) + (item.status === 'AVAILABLE' ? 1 : 0);
        existing.stock += item.status === 'AVAILABLE' ? 1 : 0;
        const existingImages = JSON.parse(existing.images);
        if (item.imageUrl && existingImages.length === 0) existing.images = JSON.stringify([item.imageUrl]);
      }
    });
    return Array.from(grouped.values()).map(product => {
      const sortedSizes = product.sizes.sort((a: string, b: string) => parseFloat(a) - parseFloat(b));
      const availableSizesCount = sortedSizes.length;
      const isLastPair = availableSizesCount === 1;
      const isLastSize = availableSizesCount > 1;
      const isKids = false;
      return { ...product, sizes: JSON.stringify(sortedSizes), sizeStock: JSON.stringify(product.sizeStock), isLastPair, isLastSize, isKids };
    });
  }, [inventoryProducts]);

  const { data: wishlistItems } = trpc.wishlist.get.useQuery(undefined, { enabled: !!user });
  const addToWishlistMutation = trpc.wishlist.add.useMutation({
    onSuccess: () => { toast.success("Added to wishlist"); utils.wishlist.get.invalidate(); },
    onError: () => { toast.error("Failed to add to wishlist"); },
  });
  const removeFromWishlistMutation = trpc.wishlist.remove.useMutation({
    onSuccess: () => { toast.success("Removed from wishlist"); utils.wishlist.get.invalidate(); },
    onError: () => { toast.error("Failed to remove from wishlist"); },
  });
  const isInWishlist = (productId: number) => wishlistItems?.some((item: any) => item.productId === productId);
  const toggleWishlist = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (!user) { toast.error("Please sign in to add to wishlist"); return; }
    if (isInWishlist(productId)) removeFromWishlistMutation.mutate({ productId });
    else addToWishlistMutation.mutate({ productId });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showOnSale, setShowOnSale] = useState(false);
  const [showClearance, setShowClearance] = useState(false);
  const [showLastPair, setShowLastPair] = useState(false);
  const [showLastSize, setShowLastSize] = useState(false);
  const [showKids, setShowKids] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [activeBrandPill, setActiveBrandPill] = useState("All");

  const brands = useMemo(() => { if (!products) return []; return Array.from(new Set(products.map(p => p.brand))).sort(); }, [products]);
  const categories = useMemo(() => { if (!products) return []; return Array.from(new Set(products.map(p => p.category))).sort(); }, [products]);
  const sizes = useMemo(() => {
    if (!products) return [];
    const allSizes = new Set<string>();
    products.forEach(p => { if (p.sizes) { try { JSON.parse(p.sizes).forEach((s: string) => allSizes.add(s)); } catch (e) {} } });
    return Array.from(allSizes).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products.filter(product => {
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) return false;
      const price = product.salePrice || product.basePrice;
      if (price < priceRange[0] * 100 || price > priceRange[1] * 100) return false;
      if (selectedSizes.length > 0) { try { const ps = JSON.parse(product.sizes); if (!selectedSizes.some(s => ps.includes(s))) return false; } catch (e) { return false; } }
      if (showOnSale && !product.salePrice) return false;
      if (showClearance && product.clearance !== 1) return false;
      if (showLastPair && !product.isLastPair) return false;
      if (showKids && !product.isKids) return false;
      return true;
    });
    const normSz = (s: string) => { if (!s) return 999; const c = s.trim(); if (c.toUpperCase().includes('CM')) { const n = parseFloat(c.replace(/[^0-9.]/g, '')); return isNaN(n) ? 999 : n; } if (c.toUpperCase().includes('K')) { const n = parseFloat(c.replace(/[^0-9.]/g, '')); return isNaN(n) ? 999 : n; } const n = parseFloat(c); return isNaN(n) ? 999 : n; };
    switch (sortBy) {
      case "size-small": filtered.sort((a, b) => { const gs = (p: any) => { try { return JSON.parse(p.sizes).map((s: string) => normSz(s)); } catch { return [999]; } }; return Math.min(...gs(a)) - Math.min(...gs(b)); }); break;
      case "price-low": filtered.sort((a, b) => (a.salePrice || a.basePrice) - (b.salePrice || b.basePrice)); break;
      case "price-high": filtered.sort((a, b) => (b.salePrice || b.basePrice) - (a.salePrice || a.basePrice)); break;
      case "newest": filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "name": filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return filtered;
  }, [products, searchQuery, selectedBrands, selectedCategories, selectedSizes, priceRange, showOnSale, showClearance, showLastPair, showKids, sortBy]);

  const toggleBrand = (brand: string) => setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  const toggleCategory = (c: string) => setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const toggleSize = (s: string) => setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const clearAllFilters = () => { setSearchQuery(""); setSelectedBrands([]); setSelectedCategories([]); setSelectedSizes([]); setPriceRange([0, 50000]); setShowOnSale(false); setShowClearance(false); setShowLastPair(false); setShowKids(false); setActiveBrandPill("All"); };
  const activeFilterCount = selectedBrands.length + selectedCategories.length + selectedSizes.length + (showOnSale ? 1 : 0) + (showClearance ? 1 : 0) + (showLastPair ? 1 : 0) + (showKids ? 1 : 0);

  const handleBrandPill = (brand: string) => {
    setActiveBrandPill(brand);
    if (brand === "All") setSelectedBrands([]);
    else setSelectedBrands([brand]);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <SizeGuideModal trigger={
        <button className="w-full py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors text-sm font-medium">
          <Ruler className="h-4 w-4" /> Size Guide
        </button>
      } />
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-3">Quick Filters</h3>
        <div className="space-y-2.5">
          {[
            { label: "On Sale", state: showOnSale, setter: setShowOnSale },
            { label: "Clearance", state: showClearance, setter: setShowClearance },
            { label: "Last Pair", state: showLastPair, setter: setShowLastPair },
          ].map(({ label, state, setter }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox checked={state} onCheckedChange={(c) => setter(c as boolean)} className="border-gray-300 data-[state=checked]:bg-[#0d2430] data-[state=checked]:border-[#0d2430]" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-3">Brand</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {brands.map(brand => (
            <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox checked={selectedBrands.includes(brand)} onCheckedChange={() => toggleBrand(brand)} className="border-gray-300 data-[state=checked]:bg-[#0d2430] data-[state=checked]:border-[#0d2430]" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{brand}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map(category => (
            <label key={category} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox checked={selectedCategories.includes(category)} onCheckedChange={() => toggleCategory(category)} className="border-gray-300 data-[state=checked]:bg-[#0d2430] data-[state=checked]:border-[#0d2430]" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{category}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-3">Size</h3>
        <div className="flex flex-wrap gap-1.5">
          {sizes.map(size => (
            <button key={size} onClick={() => toggleSize(size)}
              className={`text-xs px-2.5 py-1.5 rounded border font-medium transition-all ${selectedSizes.includes(size) ? 'bg-[#0d2430] text-white border-[#0d2430]' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
              {size}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-3">Price Range</h3>
        <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={50000} step={500} className="w-full" />
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>₱{priceRange[0].toLocaleString()}</span>
          <span>₱{priceRange[1].toLocaleString()}</span>
        </div>
      </div>
      {activeFilterCount > 0 && (
        <button onClick={clearAllFilters} className="w-full py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
          <X className="h-3.5 w-3.5" /> Clear All ({activeFilterCount})
        </button>
      )}
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-[#F7F4EF] flex flex-col items-center justify-center gap-4">
      <div className="flex gap-2">
        {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
      <div className="text-sm text-gray-500 tracking-wider uppercase">Loading inventory</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-lg text-red-500 font-medium">Failed to load inventory</div>
      <div className="text-sm text-gray-400">{error.message}</div>
      <Button onClick={() => window.location.reload()} className="bg-[#0d2430] hover:bg-[#122d3a] text-white">Retry</Button>
    </div>
  );

  const allBrandPills = ["All", ...brands.slice(0, 8)];

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-10 py-10">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-xs font-semibold tracking-[.16em] uppercase text-[#C9A84C] mb-2">Shop</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0d2430] mb-2">All Products</h1>
          <p className="text-sm text-gray-400">{filteredProducts.length} of {products?.length || 0} products</p>
        </div>
      </div>

      {/* Brand Pills */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-10 py-3 overflow-x-auto">
        <div className="max-w-[1400px] mx-auto flex gap-2 items-center whitespace-nowrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mr-2 flex-shrink-0">Brand</span>
          {allBrandPills.map(brand => (
            <button key={brand} onClick={() => handleBrandPill(brand)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all flex-shrink-0 ${activeBrandPill === brand ? 'bg-[#0d2430] text-white border-[#0d2430]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'}`}>
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 md:px-10 py-4 flex items-center justify-between gap-4 max-w-[1400px] mx-auto">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-gray-200 focus:border-[#0d2430] text-sm rounded-lg h-10" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-white border-gray-200 text-sm h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="size-small">Size: Small → Large</SelectItem>
              <SelectItem value="price-low">Price: Low → High</SelectItem>
              <SelectItem value="price-high">Price: High → Low</SelectItem>
              <SelectItem value="name">Name: A → Z</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden h-10 border-gray-200 bg-white text-sm">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters {activeFilterCount > 0 && <span className="ml-1 bg-[#0d2430] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader><SheetTitle className="text-[#0d2430]">Filters</SheetTitle></SheetHeader>
              <div className="mt-6 overflow-y-auto h-[calc(100vh-80px)] pr-2"><FilterContent /></div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Layout */}
      <div className="px-6 md:px-10 pb-16 max-w-[1400px] mx-auto flex gap-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 flex-shrink-0 pt-2">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-20">
            <FilterContent />
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-gray-100 rounded-lg overflow-hidden">
              {filteredProducts.map(product => {
                const price = product.salePrice || product.basePrice;
                const hasDiscount = !!product.salePrice;
                const images = product.images ? JSON.parse(product.images) : [];
                const productSizes = product.sizes ? JSON.parse(product.sizes) : [];

                return (
                  <div key={product.id}
                    className="bg-white cursor-pointer group relative overflow-hidden"
                    onClick={() => setLocation(`/inventory/${product.itemCode}`)}>
                    {/* Image */}
                    <div className="relative aspect-square bg-[#F0ECE4] overflow-hidden">
                      {images[0] ? (
                        <LazyImage src={images[0]} alt={product.name}
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl opacity-20">👟</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        {hasDiscount && <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide">Sale</span>}
                        {product.clearance === 1 && <span className="bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide">Clearance</span>}
                        {product.isLastPair && <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide">Last Pair</span>}
                      </div>

                      {/* Wishlist */}
                      <button
                        className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm"
                        onClick={e => toggleWishlist(e, product.id)}>
                        <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                      </button>

                      {/* Quick Add overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-[#0d2430] py-2.5 text-white text-[10px] font-bold tracking-widest uppercase text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        View Product
                      </div>

                      {/* Countdown */}
                      {hasDiscount && product.saleEndDate && (
                        <div className="absolute bottom-2 left-2">
                          <CountdownTimer endDate={product.saleEndDate} compact />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3.5 bg-white">
                      <p className="text-[9px] font-bold tracking-[.12em] uppercase text-[#C9A84C] mb-1">{product.brand}</p>
                      <h3 className="text-sm font-medium text-[#0d2430] leading-snug line-clamp-2 mb-2">{product.name}</h3>

                      {/* Sizes */}
                      {productSizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {productSizes.slice(0, 4).map((size: string) => (
                            <span key={size} className="text-[10px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-500 rounded">
                              {size}
                            </span>
                          ))}
                          {productSizes.length > 4 && (
                            <span className="text-[10px] text-gray-400">+{productSizes.length - 4}</span>
                          )}
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-[#0d2430]">₱{(price / 100).toLocaleString()}</span>
                        {hasDiscount && <span className="text-xs text-gray-400 line-through">₱{(product.basePrice / 100).toLocaleString()}</span>}
                      </div>

                      {product.stock < 10 && product.stock > 0 && (
                        <p className="text-[10px] text-orange-500 mt-1 font-medium">Only {product.stock} left</p>
                      )}
                      {product.stock === 0 && (
                        <p className="text-[10px] text-red-400 mt-1">Out of stock</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
              <p className="text-gray-400 mb-4 text-sm">No products match your filters</p>
              <button onClick={clearAllFilters} className="px-5 py-2 bg-[#0d2430] text-white text-sm rounded-lg hover:bg-[#122d3a] transition-colors">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
