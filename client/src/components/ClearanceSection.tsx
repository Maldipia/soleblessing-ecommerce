import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

export default function ClearanceSection() {
  const [, setLocation] = useLocation();
  
  // Fetch inventory from Google Sheets
  const { data: inventoryProducts, isLoading } = trpc.inventory.list.useQuery();
  
  // Filter top clearance products (discount >= 50%, limit to 4)
  const clearanceProducts = useMemo(() => {
    if (!inventoryProducts) return [];
    
    return inventoryProducts
      .filter(item => item.discount >= 50)
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 4)
      .map(item => ({
        id: parseInt(item.itemCode) || 0,
        name: item.name,
        brand: item.sku.split(/[^a-zA-Z]/)[0] || 'Unknown',
        basePrice: Math.round(item.srp),
        salePrice: Math.round(item.sellingPrice),
        discount: item.discount,
        imageUrl: item.imageUrl,
        size: item.size,
        itemCode: item.itemCode,
      }));
  }, [inventoryProducts]);
  
  if (isLoading || clearanceProducts.length === 0) {
    return null;
  }
  
  return (
    <section className="py-16 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-full mb-4">
            <Flame className="h-6 w-6 animate-pulse" />
            <span className="text-xl font-bold">CLEARANCE SALE</span>
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-4xl font-bold mb-3">Up to 76% OFF!</h2>
          <p className="text-xl text-muted-foreground">Limited stock - grab them before they're gone!</p>
        </div>
        
        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {clearanceProducts.map(product => {
            const savings = product.basePrice - product.salePrice;
            
            return (
              <Card 
                key={`${product.itemCode}-${product.size}`}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-orange-300 bg-white/90 backdrop-blur"
                onClick={() => setLocation(`/product/${product.id}`)}
              >
                {/* Discount Badge */}
                <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                  <Flame className="h-4 w-4" />
                  {product.discount}% OFF
                </div>
                
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
                    <h3 className="font-semibold text-base mb-2 line-clamp-2 min-h-[3rem]">
                      {product.name}
                    </h3>
                    <div className="text-xs text-muted-foreground mb-3">Size: {product.size}</div>
                    
                    {/* Pricing */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-red-600">
                          ₱{(product.salePrice / 100).toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ₱{(product.basePrice / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-green-600 font-semibold">
                        Save ₱{(savings / 100).toFixed(2)}!
                      </div>
                    </div>
                    
                    {/* Limited Badge */}
                    <div className="mt-4 inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">
                      <Flame className="h-3 w-3" />
                      LIMITED STOCK
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
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-lg px-8 py-6"
            onClick={() => setLocation("/clearance")}
          >
            View All Clearance Items
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
