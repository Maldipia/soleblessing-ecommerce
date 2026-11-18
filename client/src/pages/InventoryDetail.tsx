// SB2.0 — product detail: white page, two-line size buttons, sticky mobile
// add-to-cart bar. All data/cart/review logic unchanged.
import { useInventory } from "@/hooks/useInventory";
import { useParams, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ShoppingCart, AlertCircle, Ruler, QrCode, Check } from "lucide-react";
import { SizeGuideModal } from "@/components/SizeGuideModal";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { ReviewList } from "@/components/ReviewList";
import { ReviewForm } from "@/components/ReviewForm";

export default function InventoryDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const itemCode = params.itemCode || "";

  const { data: inventoryProducts, isLoading } = useInventory();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [addedToCart, setAddedToCart] = useState(false);

  const { product, allSizes, selectedProduct } = useMemo(() => {
    if (!inventoryProducts || !itemCode) return { product: null, allSizes: [], selectedProduct: null };
    const mainProduct = inventoryProducts.find(p => p.itemCode === itemCode);
    if (!mainProduct) return { product: null, allSizes: [], selectedProduct: null };
    const sameSkuProducts = inventoryProducts.filter(p => p.sku === mainProduct.sku);
    // One button per size (several pairs can share a size); prefer an available pair.
    const bySize = new Map<string, { size: string; sizeCm?: string; itemCode: string; status: string }>();
    sameSkuProducts.forEach(p => {
      if (!p.size) return;
      const cur = bySize.get(p.size);
      const avail = p.status === "AVAILABLE";
      if (!cur || (avail && cur.status !== "AVAILABLE"))
        bySize.set(p.size, { size: p.size, sizeCm: p.sizeCm, itemCode: p.itemCode, status: p.status });
    });
    const sizes = Array.from(bySize.values())
      .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
    const selected = selectedSize ? sameSkuProducts.find(p => p.size === selectedSize) : mainProduct;
    // A pair without its own photo borrows the SKU's photo from a sibling pair.
    const hero = mainProduct.imageUrl || sameSkuProducts.find(p => p.imageUrl)?.imageUrl || "";
    return { product: { ...mainProduct, imageUrl: hero }, allSizes: sizes, selectedProduct: selected || mainProduct };
  }, [inventoryProducts, itemCode, selectedSize]);

  // Single-size items (e.g. shoe care products) need no size choice — preselect it.
  useEffect(() => {
    if (!selectedSize && allSizes.length === 1 && allSizes[0].status?.toUpperCase().includes("AVAILABLE")) {
      setSelectedSize(allSizes[0].size);
    }
  }, [allSizes, selectedSize]);

  const handleAddToCart = () => {
    if (!selectedSize) { toast.error("Please select a size first"); return; }
    if (!product || !selectedProduct) return;
    addItem({
      id: selectedProduct.itemCode,
      sku: product.sku,
      name: product.name,
      brand: product.sku.split(/[^a-zA-Z]/)[0] || "Brand",
      size: selectedSize,
      price: selectedProduct.sellingPrice > 0 ? selectedProduct.sellingPrice : selectedProduct.srp,
      imageUrl: selectedProduct.imageUrl || product.imageUrl || undefined,
    });
    setAddedToCart(true);
    toast.success(`Added to cart — Size ${selectedSize}`);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-[#FF5A1F] rounded-full animate-bounce" style={{ animationDelay: `${i * .15}s` }} />)}</div>
        <p className="text-xs text-[#9b9b98] tracking-[.14em] font-bold uppercase">Loading product</p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="bg-white border border-[#f0f0ef] rounded-2xl p-10 text-center max-w-sm shadow-sm">
        <AlertCircle className="h-12 w-12 text-[#d9d9d6] mx-auto mb-4" />
        <h2 className="text-xl font-black text-[#0a0a0a] mb-2">Product Not Found</h2>
        <p className="text-sm text-[#9b9b98] mb-6">This item may have been sold or removed.</p>
        <button onClick={() => setLocation("/products")} className="bg-[#0a0a0a] text-white px-7 py-3 text-xs font-black tracking-[.1em] uppercase rounded-full hover:bg-[#262626] transition-colors">
          Browse Products
        </button>
      </div>
    </div>
  );

  const discount = selectedProduct?.discount || 0;
  const brand = product.sku.split(/[^a-zA-Z]/)[0] || "Brand";
  const availableCount = allSizes.filter(s => s.status === "AVAILABLE").length;
  const fmt = (c: number) => `₱${Math.round(c / 100).toLocaleString("en-PH")}`;
  const bigPrice = selectedProduct.sellingPrice > 0 ? selectedProduct.sellingPrice : selectedProduct.srp;

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      <div className="max-w-[1300px] mx-auto px-4 md:px-10 py-5 md:py-8">
        <button onClick={() => setLocation("/products")}
          className="flex items-center gap-1.5 text-[11px] font-black tracking-[.1em] uppercase text-[#9b9b98] hover:text-[#0a0a0a] transition-colors mb-5 md:mb-8">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Products
        </button>

        <div className="grid md:grid-cols-2 gap-7 lg:gap-16">
          {/* Image */}
          <div className="space-y-3">
            <div className="relative bg-[#f6f6f5] overflow-hidden aspect-square rounded-2xl">
              {product.imageUrl
                ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">👟</div>}
              <div className="absolute bottom-3 right-3 bg-[#0a0a0a]/90 text-white px-3.5 py-2 flex items-center gap-2 rounded-full">
                <QrCode className="h-3.5 w-3.5 text-[#FF5A1F]" />
                <span className="text-[9.5px] font-black tracking-[.1em] uppercase">Scan In-Store</span>
              </div>
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                {discount > 0 && <span className="bg-[#FF5A1F] text-white text-[9px] font-black px-2.5 py-1 uppercase rounded-full tracking-[.06em]">Sale {discount}% Off</span>}
                {availableCount === 1 && <span className="bg-white text-[#0a0a0a] border-[1.5px] border-[#0a0a0a] text-[9px] font-black px-2.5 py-1 uppercase rounded-full tracking-[.06em]">Last Pair</span>}
                {availableCount > 1 && availableCount <= 3 && <span className="bg-[#0a0a0a] text-white text-[9px] font-black px-2.5 py-1 uppercase rounded-full tracking-[.06em]">Low Stock</span>}
              </div>
            </div>
            <div className="bg-[#0a0a0a] px-5 py-4 flex items-center gap-4 rounded-2xl">
              <QrCode className="h-8 w-8 text-[#FF5A1F] flex-shrink-0" />
              <div>
                <div className="text-[10px] font-black tracking-[.14em] uppercase text-[#FF5A1F] mb-0.5">QR Smart Shopping</div>
                <div className="text-[11px] text-white/50 leading-relaxed">Scan this QR in-store to view live sizes and check out.</div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-[10px] font-black tracking-[.2em] uppercase text-[#FF5A1F] mb-2">{brand} · Verified Authentic</div>
            <h1 className="text-[26px] md:text-4xl font-black text-[#0a0a0a] leading-tight tracking-[-.01em] mb-1.5">{product.name}</h1>
            <p className="text-[11px] text-[#9b9b98] font-mono mb-5">SKU {product.sku} · Item {selectedProduct.itemCode}</p>

            <div className="flex items-baseline gap-2.5 mb-2 flex-wrap">
              <span className="text-[32px] md:text-4xl font-black text-[#0a0a0a]">{fmt(bigPrice)}</span>
              {discount > 0 && <>
                <span className="text-lg text-[#b3b3b0] line-through">{fmt(selectedProduct.srp)}</span>
                <span className="bg-[#FF5A1F] text-white text-[11px] font-black px-2.5 py-1 rounded-full">-{discount}%</span>
              </>}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${selectedProduct.status === "AVAILABLE" ? "bg-[#e8f5ee] text-[#1a7f4e]" : "bg-red-50 text-red-600"}`}>
                {selectedProduct.status === "AVAILABLE" ? "✓ In Stock" : "Out of Stock"}
              </span>
              <span className="text-xs text-[#9b9b98] font-semibold">Brand New · Authenticated</span>
            </div>

            {/* Size selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black tracking-[.1em] uppercase text-[#0a0a0a]">Select Size (US)</span>
                <SizeGuideModal trigger={
                  <button className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-[#FF5A1F] hover:opacity-75 uppercase">
                    <Ruler className="h-3 w-3" /> Size Guide
                  </button>
                } />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {allSizes.map(({ size, sizeCm, itemCode: sic, status }) => {
                  const avail = status === "AVAILABLE";
                  const sel = selectedSize === size;
                  return (
                    <button key={sic} disabled={!avail} onClick={() => setSelectedSize(size)}
                      className={`py-2 text-[13px] font-black border-[1.5px] rounded-xl transition-all relative ${
                        sel ? "bg-[#0a0a0a] text-white border-[#0a0a0a]" :
                        avail ? "bg-white text-[#0a0a0a] border-[#e6e6e4] hover:border-[#0a0a0a]" :
                        "bg-white text-[#d0d0cd] border-dashed border-[#e6e6e4] cursor-not-allowed line-through"
                      }`}>
                      <span className="block leading-tight">{size}</span>
                      <span className={`block text-[8.5px] font-semibold leading-tight ${sel ? "text-white/60" : avail ? "text-[#9b9b98]" : "text-[#d0d0cd]"}`}>
                        {sizeCm ? `${sizeCm} cm` : " "}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedSize && <p className="text-xs text-[#1a7f4e] font-bold mt-2.5 flex items-center gap-1"><Check className="h-3 w-3" /> Size {selectedSize} selected</p>}
            </div>

            {/* CTAs (desktop + inline mobile) */}
            <div className="space-y-2.5 mb-6">
              <button onClick={handleAddToCart} disabled={!selectedSize}
                className={`w-full py-4 text-sm font-black tracking-[.12em] uppercase flex items-center justify-center gap-2 transition-all rounded-full ${
                  addedToCart ? "bg-[#1a7f4e] text-white" :
                  selectedSize ? "bg-[#0a0a0a] text-white hover:bg-[#262626]" :
                  "bg-[#f0f0ef] text-[#b3b3b0] cursor-not-allowed"
                }`}>
                {addedToCart ? <><Check className="h-4 w-4" /> Added to Cart!</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
              </button>
              <button onClick={() => setLocation("/checkout")}
                className="w-full py-4 text-xs font-black tracking-[.12em] uppercase bg-[#FF5A1F] text-white hover:opacity-90 transition-opacity rounded-full">
                Buy Now — GCash / Maya / COD →
              </button>
            </div>

            {/* Details */}
            <div className="bg-white border border-[#f0f0ef] rounded-2xl divide-y divide-[#f7f7f6] mb-4 overflow-hidden">
              {[
                ["Status", selectedProduct.status === "AVAILABLE" ? "✓ In Stock" : "Out of Stock", selectedProduct.status === "AVAILABLE" ? "text-[#1a7f4e]" : "text-red-500"],
                ["Condition", "Brand New", "text-[#0a0a0a]"],
                ["Authentication", "Verified Authentic", "text-[#0a0a0a]"],
                ["Item Code", selectedProduct.itemCode, "font-mono text-xs text-[#9b9b98]"],
              ].map(([label, val, cls]) => (
                <div key={label as string} className="flex justify-between px-4 py-3 text-[13px]">
                  <span className="text-[#9b9b98] font-semibold">{label}</span>
                  <span className={`font-bold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>

            {/* Payment chips */}
            <div className="bg-[#f6f6f5] rounded-2xl p-4">
              <p className="text-[9.5px] font-black tracking-[.14em] uppercase text-[#9b9b98] mb-2.5">Accepted Payments</p>
              <div className="flex flex-wrap gap-1.5">
                {["GCash", "Maya", "COD", "BDO", "BPI", "Visa/MC"].map(m => (
                  <span key={m} className="bg-white text-[#0a0a0a] text-[10px] font-bold px-2.5 py-1 tracking-wide rounded-full border border-[#ececeb]">{m}</span>
                ))}
              </div>
              <p className="text-[9.5px] font-black tracking-[.14em] uppercase text-[#9b9b98] mt-3.5 mb-2.5">Shipping</p>
              <div className="flex flex-wrap gap-1.5">
                {["J&T", "LBC", "Lalamove", "Grab Express"].map(m => (
                  <span key={m} className="bg-white text-[#0a0a0a] text-[10px] font-bold px-2.5 py-1 tracking-wide rounded-full border border-[#ececeb]">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {product && (
        <div className="max-w-[1300px] mx-auto px-4 md:px-10 py-10 border-t border-[#f0f0ef]">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-lg font-black text-[#0a0a0a] mb-5 uppercase tracking-wide">Customer Reviews</h2>
              <ReviewList sku={product.sku} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0a0a0a] mb-5 uppercase tracking-wide">Write a Review</h2>
              <ReviewForm sku={product.sku} itemCode={product.itemCode} />
            </div>
          </div>
        </div>
      )}

      {/* Sticky mobile add-to-cart bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#ececeb] px-4 py-3 flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="text-[17px] font-black text-[#0a0a0a] leading-none">{fmt(bigPrice)}</div>
          <div className="text-[9px] font-bold text-[#9b9b98] tracking-[.08em] uppercase mt-0.5">
            {selectedSize ? `Size ${selectedSize}` : "Pick a size"}
          </div>
        </div>
        <button onClick={handleAddToCart} disabled={!selectedSize}
          className={`flex-1 py-3.5 text-xs font-black tracking-[.12em] uppercase rounded-full transition-all ${
            addedToCart ? "bg-[#1a7f4e] text-white" :
            selectedSize ? "bg-[#0a0a0a] text-white" : "bg-[#f0f0ef] text-[#b3b3b0]"
          }`}>
          {addedToCart ? "✓ Added!" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
