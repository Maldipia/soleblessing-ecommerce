import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Cart() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: cartItems, isLoading } = trpc.cart.get.useQuery(undefined, {
    enabled: !!user,
  });

  const updateQuantityMutation = trpc.cart.updateQuantity.useMutation({
    onMutate: async ({ cartItemId, quantity }) => {
      await utils.cart.get.cancel();
      const previousCart = utils.cart.get.getData();

      utils.cart.get.setData(undefined, (old) =>
        old?.map((item) =>
          item.id === cartItemId ? { ...item, quantity } : item
        )
      );

      return { previousCart };
    },
    onError: (err: any, variables: any, context: any) => {
      if (context?.previousCart) {
        utils.cart.get.setData(undefined, context.previousCart);
      }
      toast.error("Failed to update quantity");
    },
    onSettled: () => {
      utils.cart.get.invalidate();
    },
  });

  const removeItemMutation = trpc.cart.remove.useMutation({
    onMutate: async ({ cartItemId }) => {
      await utils.cart.get.cancel();
      const previousCart = utils.cart.get.getData();

      utils.cart.get.setData(undefined, (old) =>
        old?.filter((item) => item.id !== cartItemId)
      );

      return { previousCart };
    },
    onSuccess: () => {
      toast.success("Item removed from cart");
    },
    onError: (err: any, variables: any, context: any) => {
      if (context?.previousCart) {
        utils.cart.get.setData(undefined, context.previousCart);
      }
      toast.error("Failed to remove item");
    },
    onSettled: () => {
      utils.cart.get.invalidate();
    },
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12 px-6 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Sign in to view your cart</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to access your shopping cart
            </p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleQuantityChange = (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantityMutation.mutate({ cartItemId, quantity: newQuantity });
  };

  const handleRemoveItem = (cartItemId: number) => {
    removeItemMutation.mutate({ cartItemId });
  };

  const subtotal = cartItems?.reduce((sum, item) => {
    if (!item.product) return sum;
    const price = item.product.salePrice || item.product.basePrice;
    return sum + price * item.quantity;
  }, 0) || 0;

  const itemCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12 px-6 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add some sneakers to get started!
            </p>
            <Button onClick={() => setLocation("/products")}>
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              if (!item.product) return null;
              const images = item.product.images ? JSON.parse(item.product.images) : [];
              const price = item.product.salePrice || item.product.basePrice;
              const hasDiscount = !!item.product.salePrice;

              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        {images[0] && (
                          <img
                            src={images[0]}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {item.product.brand}
                            </p>
                            <h3 className="font-semibold text-lg truncate">
                              {item.product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Size: {item.size}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex justify-between items-end">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              ₱{((price * item.quantity) / 100).toLocaleString()}
                            </p>
                            {hasDiscount && (
                              <p className="text-xs text-muted-foreground line-through">
                                ₱
                                {(
                                  (item.product.basePrice * item.quantity) /
                                  100
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Items ({itemCount})
                    </span>
                    <span>₱{(subtotal / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-muted-foreground">
                      Calculated at checkout
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Subtotal</span>
                      <span>₱{(subtotal / 100).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full mb-3"
                  size="lg"
                  onClick={() => setLocation("/checkout")}
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/products")}
                >
                  Continue Shopping
                </Button>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Secure checkout powered by PayMongo
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
