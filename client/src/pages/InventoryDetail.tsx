import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ShoppingCart, Heart, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function InventoryDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const itemCode = params.itemCode || "";
  
  // Fetch all inventory and filter by SKU to get all sizes
  const { data: inventoryProducts, isLoading } = trpc.inventory.list.useQuery();
  
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  
  // Find the product and all its size variants
  const { product, allSizes, selectedProduct } = useMemo(() => {
    if (!inventoryProducts || !itemCode) {
      return { product: null, allSizes: [], selectedProduct: null };
    }
    
    // Find the main product by itemCode
    const mainProduct = inventoryProducts.find(p => p.itemCode === itemCode);
    if (!mainProduct) {
      return { product: null, allSizes: [], selectedProduct: null };
    }
    
    // Find all products with the same SKU
    const sameSkuProducts = inventoryProducts.filter(p => p.sku === mainProduct.sku);
    
    // Get all available sizes
    const sizes = sameSkuProducts
      .map(p => ({ size: p.size, itemCode: p.itemCode, status: p.status }))
      .filter(s => s.size)
      .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
    
    // Find the selected size product
    const selected = selectedSize 
      ? sameSkuProducts.find(p => p.size === selectedSize)
      : mainProduct;
    
    return {
      product: mainProduct,
      allSizes: sizes,
      selectedProduct: selected || mainProduct
    };
  }, [inventoryProducts, itemCode, selectedSize]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading product...</p>
        </div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => setLocation("/products")}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const handleAddToCart = () => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      window.location.href = getLoginUrl();
      return;
    }
    
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    
    toast.info("Cart functionality is being updated for inventory products");
  };
  
  const discount = selectedProduct?.discount || 0;
  const savings = selectedProduct ? selectedProduct.srp - selectedProduct.sellingPrice : 0;
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/products")}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={product.imageUrl || '/placeholder-product.png'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="text-sm text-primary font-semibold mb-2">
                {product.sku.split(/[^a-zA-Z]/)[0] || 'Brand'}
              </div>
              <h1 className="text-3xl font-bold mb-2 force-black-text">{product.name}</h1>
              <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            </div>
            
            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  ₱{(selectedProduct.sellingPrice / 100).toFixed(2)}
                </span>
                {discount > 0 && (
                  <span className="text-xl text-muted-foreground line-through">
                    ₱{(selectedProduct.srp / 100).toFixed(2)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-semibold">
                    {discount}% OFF
                  </span>
                  <span className="text-sm text-green-600 font-semibold">
                    You save ₱{(savings / 100).toFixed(2)}!
                  </span>
                </div>
              )}
            </div>
            
            {/* Size Selection */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">
                Select Size
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {allSizes.map(({ size, itemCode: sizeItemCode, status }) => {
                  const isAvailable = status === 'AVAILABLE';
                  const isSelected = selectedSize === size;
                  
                  return (
                    <Button
                      key={sizeItemCode}
                      variant={isSelected ? "default" : "outline"}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(size)}
                      className={`${!isAvailable ? 'opacity-50' : ''}`}
                    >
                      {size}
                    </Button>
                  );
                })}
              </div>
              {selectedSize && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Size {selectedSize} available
                </p>
              )}
            </div>
            
            {/* Quantity */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">
                Quantity
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={handleAddToCart}
                disabled={!selectedSize}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => {
                  if (!user) {
                    toast.error("Please sign in to add to wishlist");
                    window.location.href = getLoginUrl();
                    return;
                  }
                  toast.info("Wishlist functionality is being updated for inventory products");
                }}
              >
                <Heart className="h-5 w-5 mr-2" />
                Add to Wishlist
              </Button>
            </div>
            
            {/* Product Details */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-green-600">
                    {selectedProduct.status === 'AVAILABLE' ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Condition:</span>
                  <span className="font-semibold">BRAND NEW</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Item Code:</span>
                  <span className="font-mono text-xs">{selectedProduct.itemCode}</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Methods */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">PAYMENT METHODS:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">
                      COD
                    </div>
                    <span className="text-sm font-medium">Cash on Delivery</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                      G
                    </div>
                    <span className="text-sm font-medium">GCash</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center text-white font-bold text-xs">
                      CC
                    </div>
                    <span className="text-sm font-medium">Credit Card</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white font-bold text-xs">
                      BT
                    </div>
                    <span className="text-sm font-medium">Bank Transfer</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
