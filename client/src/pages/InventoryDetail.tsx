import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { ChevronLeft, ShoppingCart, Heart, AlertCircle, Ruler, QrCode, Shirt, Check } from "lucide-react";
import { SizeGuideModal } from "@/components/SizeGuideModal";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";

export default function InventoryDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const itemCode = params.itemCode || "";

  const { data: inventoryProducts, isLoading } = trpc.inventory.list.useQuery();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [fittingRequested, setFittingRequested] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const { product, allSizes, selectedProduct } = useMemo(() => {
    if (!inventoryProducts || !itemCode) return { product: null, allSizes: [], selectedProduct: null };
    const mainProduct = inventoryProducts.find(p => p.itemCode === itemCode);
    if (!mainProduct) return { product: null, allSizes: [], selectedProduct: null };
    const sameSkuProducts = inventoryProducts.filter(p => p.sku === mainProduct.sku);
    const sizes = sameSkuProducts
      .map(p => ({ size: p.size, itemCode: p.itemCode, status: p.status }))
      .filter(s => s.size)
      .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
    const selected = selectedSize ? sameSkuProducts.find(p => p.size === selectedSize) : mainProduct;
    return { product: mainProduct, allSizes: sizes, selectedProduct: selected || mainProduct };
  }, [inventoryProducts, itemCode, selectedSize]);

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
      imageUrl: selectedProduct.imageUrl || undefined,
    });
    setAddedToCart(true);
    toast.success(`Added to cart — Size ${selectedSize}`);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleFittingRoom = () => {
    if (!selectedSize) { toast.error("Please select a size first"); return; }
    setFittingRequested(true);
    toast.success("Staff notified — fitting room request sent!");
    setTimeout(() => setFittingRequested(false), 4000);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>
        <p className="text-sm text-gray-400 tracking-widest uppercase">Loading product</p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-6">
      <div className="bg-white border border-gray-100 rounded-xl p-10 text-center max-w-sm">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-[#0d2430] mb-2">Product Not Found</h2>
        <p className="text-sm text-gray-400 mb-6">This item may have been sold or removed.</p>
        <button onClick={()=>setLocation("/products")} className="bg-[#0d2430] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#122d3a] transition-colors">
          Browse Products
        </button>
      </div>
    </div>
  );

  const discount = selectedProduct?.discount || 0;
  const brand = product.sku.split(/[^a-zA-Z]/)[0] || "Brand";
  const availableCount = allSizes.filter(s => s.status === "AVAILABLE").length;
  const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="max-w-[1300px] mx-auto px-6 md:px-10 py-8">
        <button onClick={()=>setLocation("/products")}
          className="flex items-center gap-1.5 text-xs font-semibold tracking-[.08em] uppercase text-gray-400 hover:text-[#0d2430] transition-colors mb-8">
          <ChevronLeft className="h-3.5 w-3.5"/> Back to Products
        </button>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <div className="space-y-3">
            <div className="relative bg-[#EDE9E3] overflow-hidden aspect-square">
              {product.imageUrl
                ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">👟</div>}
              <div className="absolute bottom-3 right-3 bg-[#0d2430] text-white px-3 py-2 flex items-center gap-2">
                <QrCode className="h-3.5 w-3.5 text-[#C9A84C]"/>
                <span className="text-[10px] font-bold tracking-widest uppercase">Scan In-Store</span>
              </div>
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {discount>0&&<span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 uppercase">Sale {discount}% Off</span>}
                {availableCount===1&&<span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 uppercase">Last Pair</span>}
                {availableCount>1&&availableCount<=3&&<span className="bg-amber-400 text-amber-900 text-[9px] font-bold px-2 py-0.5 uppercase">Low Stock</span>}
              </div>
            </div>
            <div className="bg-[#050f12] px-5 py-4 flex items-center gap-4">
              <QrCode className="h-8 w-8 text-[#C9A84C] flex-shrink-0"/>
              <div>
                <div className="text-[10px] font-bold tracking-[.12em] uppercase text-[#C9A84C] mb-0.5">QR Smart Shopping</div>
                <div className="text-[11px] text-white/40 leading-relaxed">Scan this QR in-store to view live sizes, request a fitting room, or check out.</div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-[10px] font-bold tracking-[.12em] uppercase text-[#C9A84C] mb-2">{brand} · Authenticated</div>
            <h1 className="text-3xl md:text-4xl font-black text-[#0d2430] leading-tight mb-2">{product.name}</h1>
            <p className="text-xs text-gray-400 font-mono mb-5">SKU: {product.sku}</p>

            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-4xl font-black text-[#0d2430]">{fmt(selectedProduct.sellingPrice/100>0?selectedProduct.sellingPrice:selectedProduct.srp)}</span>
              {discount>0&&<span className="text-xl text-gray-300 line-through">{fmt(selectedProduct.srp)}</span>}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`text-xs font-semibold px-2 py-1 ${selectedProduct.status==="AVAILABLE"?"bg-green-50 text-green-700 border border-green-100":"bg-red-50 text-red-600 border border-red-100"}`}>
                {selectedProduct.status==="AVAILABLE"?"✓ In Stock":"Out of Stock"}
              </span>
              <span className="text-xs text-gray-400">Brand New · Authenticated</span>
            </div>

            {/* Size selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-[.08em] uppercase text-[#0d2430]">Select Size</span>
                <SizeGuideModal trigger={
                  <button className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-[#C9A84C] hover:opacity-75 uppercase">
                    <Ruler className="h-3 w-3"/> Size Guide
                  </button>
                }/>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {allSizes.map(({size, itemCode: sic, status}) => {
                  const avail = status === "AVAILABLE";
                  const sel = selectedSize === size;
                  return (
                    <button key={sic} disabled={!avail} onClick={()=>setSelectedSize(size)}
                      className={`py-2.5 text-xs font-semibold border transition-all relative ${
                        sel?"bg-[#0d2430] text-white border-[#0d2430]":
                        avail?"bg-white text-[#0d2430] border-gray-200 hover:border-[#0d2430]":
                        "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through"
                      }`}>
                      {size}
                    </button>
                  );
                })}
              </div>
              {selectedSize&&<p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1"><Check className="h-3 w-3"/> Size {selectedSize} selected</p>}
            </div>

            {/* CTAs */}
            <div className="space-y-2.5 mb-6">
              <button onClick={handleAddToCart} disabled={!selectedSize}
                className={`w-full py-4 text-sm font-bold tracking-[.1em] uppercase flex items-center justify-center gap-2 transition-all ${
                  addedToCart?"bg-green-600 text-white":
                  selectedSize?"bg-[#0d2430] text-white hover:bg-[#122d3a]":
                  "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}>
                {addedToCart?<><Check className="h-4 w-4"/> Added to Cart!</>:<><ShoppingCart className="h-4 w-4"/> Add to Cart</>}
              </button>
              <button onClick={handleFittingRoom}
                className={`w-full py-4 text-sm font-bold tracking-[.1em] uppercase flex items-center justify-center gap-2 transition-all border ${
                  fittingRequested?"bg-amber-50 text-amber-700 border-amber-200":"bg-white text-[#0d2430] border-gray-200 hover:border-[#0d2430]"
                }`}>
                <Shirt className="h-4 w-4"/>
                {fittingRequested?"Staff Notified ✓":"Request Fitting Room"}
              </button>
              <button onClick={()=>setLocation("/checkout")}
                className="w-full py-3.5 text-xs font-bold tracking-[.12em] uppercase bg-[#C9A84C] text-[#050f12] hover:opacity-90 transition-opacity">
                Buy Now — Pay via GCash / Maya / COD →
              </button>
            </div>

            {/* Details */}
            <div className="bg-white border border-gray-100 divide-y divide-gray-50 mb-4">
              {[
                ["Status", selectedProduct.status==="AVAILABLE"?"✓ In Stock":"Out of Stock", selectedProduct.status==="AVAILABLE"?"text-green-600":"text-red-500"],
                ["Condition","Brand New","text-[#0d2430]"],
                ["Authentication","Verified Authentic","text-[#0d2430]"],
                ["Item Code", selectedProduct.itemCode,"font-mono text-xs text-gray-400"],
              ].map(([label,val,cls])=>(
                <div key={label as string} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className={`font-semibold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>

            {/* Payment chips */}
            <div className="bg-white border border-gray-100 p-4">
              <p className="text-[10px] font-bold tracking-[.1em] uppercase text-gray-400 mb-3">Accepted Payments</p>
              <div className="flex flex-wrap gap-2">
                {["GCash","Maya","COD","BDO","BPI","Visa/MC"].map(m=>(
                  <span key={m} className="bg-[#050f12]/5 text-[#0d2430] text-[10px] font-bold px-2.5 py-1 tracking-wide">{m}</span>
                ))}
              </div>
              <p className="text-[10px] font-bold tracking-[.1em] uppercase text-gray-400 mt-3 mb-2">Shipping</p>
              <div className="flex flex-wrap gap-2">
                {["J&T","LBC","Lalamove","Grab Express"].map(m=>(
                  <span key={m} className="bg-[#050f12]/5 text-[#0d2430] text-[10px] font-bold px-2.5 py-1 tracking-wide">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
