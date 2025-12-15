import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

export default function LastPairSection() {
  const [, setLocation] = useLocation();
  
  // Fetch inventory from Google Sheets
  const { data: inventoryProducts, isLoading } = trpc.inventory.list.useQuery();
  
  // Filter Last Pair products (products with only 1 size available)
  const lastPairProducts = useMemo(() => {
    if (!inventoryProducts) return [];
    
    // Group by SKU to find products with only 1 size
    const grouped = new Map<string, any[]>();
    inventoryProducts.forEach(item => {
      const sku = item.sku;
      if (!grouped.has(sku)) {
        grouped.set(sku, []);
      }
      grouped.get(sku)!.push(item);
    });
    
    // Filter for SKUs with only 1 unique size (Last Pair)
    const lastPairItems: any[] = [];
    grouped.forEach((items, sku) => {
      const uniqueSizes = new Set(items.map(i => i.size));
      if (uniqueSizes.size === 1) {
        // Take the first item as representative
        const item = items[0];
        lastPairItems.push({
          id: parseInt(item.itemCode) || 0,
          name: item.name,
          brand: sku.split(/[^a-zA-Z]/)[0] || 'Unknown',
          basePrice: Math.round(item.srp),
          salePrice: item.sellingPrice > 0 ? Math.round(item.sellingPrice) : null,
          discount: item.discount,
          imageUrl: item.imageUrl,
          size: item.size,
          itemCode: item.itemCode,
          sku: sku,
        });
      }
    });
    
    // Sort by discount (highest first) and limit to 4
    return lastPairItems
      .sort((a, b) => (b.discount || 0) - (a.discount || 0))
      .slice(0, 4);
  }, [inventoryProducts]);
  
  if (isLoading || lastPairProducts.length === 0) {
    return null;
  }
  
  return (
    <section className="py-16 bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-full mb-4">
            <Clock className="h-6 w-6 animate-pulse" />
            <span className="text-xl font-bold">LAST PAIR</span>
            <Zap className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-4xl font-bold mb-3 text-white">Grab It Before It's Gone!</h2>
          <p className="text-xl text-orange-200">Only one size left - don't miss out on these exclusive deals!</p>
        </div>
        
        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {lastPairProducts.map(product => {
            const hasDiscount = product.salePrice && product.salePrice < product.basePrice;
            const displayPrice = product.salePrice || product.basePrice;
            const savings = hasDiscount ? product.basePrice - product.salePrice : 0;
            
            return (
              <Card 
                key={`${product.itemCode}-${product.size}`}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-orange-400 bg-white/95 backdrop-blur"
                onClick={() => setLocation(`/inventory/${product.itemCode}`)}
              >
                {/* Last Pair Badge */}
                <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                  <Clock className="h-4 w-4" />
                  LAST PAIR
                </div>
                
                {/* Discount Badge (if applicable) */}
                {hasDiscount && product.discount > 0 && (
                  <div className="absolute top-3 right-3 z-10 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    {product.discount}% OFF
                  </div>
                )}
                
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.imageUrl || '/placeholder-product.png'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-5">
                    <div className="text-xs text-orange-600 font-semibold mb-1">{product.brand}</div>
                    <h3 className="font-semibold text-base mb-2 line-clamp-2 min-h-[3rem] text-gray-900">
                      {product.name}
                    </h3>
                    <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
                      Size: {product.size}
                    </div>
                    
                    {/* Pricing */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-orange-600">
                          ₱{(displayPrice / 100).toLocaleString()}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₱{(product.basePrice / 100).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {hasDiscount && savings > 0 && (
                        <div className="text-sm text-green-600 font-semibold">
                          Save ₱{(savings / 100).toLocaleString()}!
                        </div>
                      )}
                    </div>
                    
                    {/* Urgency Badge */}
                    <div className="mt-4 inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      <Zap className="h-3 w-3" />
                      ONLY 1 LEFT!
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* View All Button */}
        <div className="text-center">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-lg px-8 py-6"
            onClick={() => setLocation("/products?filter=lastpair")}
          >
            View All Last Pair Deals
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
