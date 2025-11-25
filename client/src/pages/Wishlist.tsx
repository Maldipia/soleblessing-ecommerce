import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Wishlist() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: wishlistItems, isLoading } = trpc.wishlist.get.useQuery(undefined, {
    enabled: !!user,
  });

  const removeFromWishlistMutation = trpc.wishlist.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from wishlist");
      utils.wishlist.get.invalidate();
    },
    onError: () => {
      toast.error("Failed to remove from wishlist");
    },
  });

  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Added to cart");
      utils.cart.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add to cart");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Heart className="h-16 w-16 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-bold">Sign in to view your wishlist</h2>
        <p className="text-muted-foreground">Save your favorite sneakers for later</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>
          Sign In
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

  if (!wishlistItems || wishlistItems.length === 0) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto text-center">
          <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-6">
            Start adding your favorite sneakers to your wishlist
          </p>
          <Button onClick={() => setLocation("/products")}>
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <p className="text-muted-foreground">
          {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlistItems.map((item: any) => {
          const product = item.product;
          if (!product) return null;

          const images = product.images ? JSON.parse(product.images) : [];
          const mainImage = images[0] || "/placeholder.png";
          const hasDiscount = product.salePrice && product.salePrice < product.price;

          return (
            <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={mainImage}
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
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFromWishlistMutation.mutate({ productId: product.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                <h3
                  className="font-semibold mb-2 line-clamp-2 cursor-pointer hover:text-primary"
                  onClick={() => setLocation(`/product/${product.id}`)}
                >
                  {product.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  {hasDiscount ? (
                    <>
                      <span className="text-lg font-bold text-primary">
                        ₱{product.salePrice?.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        ₱{product.price.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold">
                      ₱{product.price.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setLocation(`/product/${product.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
