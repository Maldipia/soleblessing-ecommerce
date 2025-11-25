import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";

export default function RecommendedProducts() {
  const [, setLocation] = useLocation();
  const { data: recommendations, isLoading } = trpc.recommendations.getPersonalized.useQuery();

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Recommended for You</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
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

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="container py-12">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Recommended for You</h2>
        <p className="text-sm text-muted-foreground ml-2">Based on your browsing and wishlist</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {recommendations.map((product: any) => {
          const images = product.images ? JSON.parse(product.images) : [];
          const thumbnailImage = images[0] || "/placeholder.png";
          const price = product.salePrice || product.basePrice;
          const hasDiscount = !!product.salePrice;

          return (
            <Card
              key={product.id}
              className="group cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => setLocation(`/product/${product.id}`)}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={thumbnailImage}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {hasDiscount && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                    SALE
                  </div>
                )}
                {product.clearance === 1 && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                    CLEARANCE
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                <h3 className="font-semibold mb-2 line-clamp-2 text-sm">{product.name}</h3>

                <div className="flex items-center gap-2 mb-2">
                  {hasDiscount ? (
                    <>
                      <span className="text-base font-bold text-primary">
                        ₱{(price / 100).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        ₱{(product.basePrice / 100).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-base font-bold">
                      ₱{(price / 100).toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Button variant="outline" onClick={() => setLocation("/products")}>
          View All Products
        </Button>
      </div>
    </div>
  );
}
