import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";

export default function NewArrivals() {
  const [, setLocation] = useLocation();
  const { data: newProducts, isLoading } = trpc.products.newArrivals.useQuery();

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">New Arrivals</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!newProducts || newProducts.length === 0) {
    return null;
  }

  return (
    <div className="container py-12 border-t">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">New Arrivals</h2>
        </div>
        <Button variant="outline" onClick={() => setLocation("/products?sort=newest")}>
          View All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {newProducts.map((product: any) => {
          const images = product.images ? JSON.parse(product.images) : [];
          const mainImage = images[0] || "/placeholder.png";
          const price = product.salePrice || product.basePrice;
          const hasDiscount = !!product.salePrice;
          
          // Check if product is new (added within last 7 days)
          const isNew = product.createdAt && 
            (new Date().getTime() - new Date(product.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

          return (
            <Card
              key={product.id}
              className="group cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => setLocation(`/product/${product.id}`)}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {isNew && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
                    NEW
                  </div>
                )}
                {hasDiscount && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                    SALE
                  </div>
                )}
                {product.clearance === 1 && (
                  <div className="absolute bottom-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                    CLEARANCE
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>

                <div className="flex items-center gap-2">
                  {hasDiscount ? (
                    <>
                      <span className="text-lg font-bold text-primary">
                        ₱{(price / 100).toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        ₱{(product.basePrice / 100).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold">
                      ₱{(price / 100).toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
