import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import LazyImage from "@/components/LazyImage";

interface SimilarProductsProps {
  productId: number;
}

export default function SimilarProducts({ productId }: SimilarProductsProps) {
  const [, setLocation] = useLocation();
  const { data: similar, isLoading } = trpc.recommendations.getSimilar.useQuery({ productId });

  if (isLoading) {
    return (
      <div className="py-12 border-t">
        <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  if (!similar || similar.length === 0) {
    return null;
  }

  return (
    <div className="py-12 border-t">
      <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {similar.map((product: any) => {
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
              <div className="relative overflow-hidden bg-muted">
                <LazyImage
                  src={thumbnailImage}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
