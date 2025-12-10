import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Search, Flame, Clock, TrendingDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClearanceSale() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  // Fetch inventory from Google Sheets
  const { data: inventoryProducts, isLoading, error } = trpc.inventory.list.useQuery(undefined, {
    retry: 3,
    retryDelay: 1000,
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"discount-high" | "price-low" | "price-high" | "newest">("discount-high");
  
  // Filter clearance products (discount >= 50%)
  const clearanceProducts = useMemo(() => {
    if (!inventoryProducts) return [];
    
    return inventoryProducts
      .filter(item => item.discount >= 50) // Only products with 50%+ discount
      .map(item => ({
        id: parseInt(item.itemCode) || 0,
        name: item.name,
        description: `${item.name} - Size ${item.size}`,
        brand: item.sku.split(/[^a-zA-Z]/)[0] || 'Unknown',
        category: 'Sneakers',
        basePrice: Math.round(item.srp),
        salePrice: Math.round(item.sellingPrice),
        discount: item.discount,
        images: JSON.stringify(item.imageUrl ? [item.imageUrl] : []),
        sizes: JSON.stringify([item.size]),
        stock: item.status === 'AVAILABLE' ? 1 : 0,
        itemCode: item.itemCode,
        size: item.size,
        imageUrl: item.imageUrl,
        createdAt: new Date(),
      }));
  }, [inventoryProducts]);
  
  // Apply search and sort
  const filteredProducts = useMemo(() => {
    let filtered = [...clearanceProducts];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query)
      );
    }
    
    // Sort
    switch (sortBy) {
      case "discount-high":
        filtered.sort((a, b) => b.discount - a.discount);
        break;
      case "price-low":
        filtered.sort((a, b) => a.salePrice - b.salePrice);
        break;
      case "price-high":
        filtered.sort((a, b) => b.salePrice - a.salePrice);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    
    return filtered;
  }, [clearanceProducts, searchQuery, sortBy]);
  
  const { data: wishlistItems } = trpc.wishlist.get.useQuery(undefined, {
    enabled: !!user,
  });
  
  const addToWishlistMutation = trpc.wishlist.add.useMutation({
    onSuccess: () => {
      toast.success("Added to wishlist");
      utils.wishlist.get.invalidate();
    },
    onError: () => {
      toast.error("Failed to add to wishlist");
    },
  });
  
  const handleAddToWishlist = (productId: number) => {
    if (!user) {
      toast.error("Please sign in to add to wishlist");
      return;
    }
    addToWishlistMutation.mutate({ productId });
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Flame className="h-12 w-12 text-orange-500 animate-pulse" />
        <div className="text-lg">Loading clearance deals...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-lg text-red-500">Error loading clearance items</div>
        <div className="text-sm text-muted-foreground">{error.message}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white py-12">
        <div className="container">
          <div className="flex items-center gap-3 mb-4">
            <Flame className="h-10 w-10 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold">CLEARANCE SALE</h1>
            <Flame className="h-10 w-10 animate-pulse" />
          </div>
          <p className="text-xl md:text-2xl mb-2">Up to 76% OFF Premium Sneakers!</p>
          <div className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            <span>Limited Stock - While Supplies Last</span>
          </div>
        </div>
      </div>
      
      <div className="container py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur border-orange-200">
            <CardContent className="p-6 text-center">
              <TrendingDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-orange-600">{clearanceProducts.length}</div>
              <div className="text-sm text-muted-foreground">Items on Clearance</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur border-red-200">
            <CardContent className="p-6 text-center">
              <Flame className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-red-600">50-76%</div>
              <div className="text-sm text-muted-foreground">Discount Range</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur border-pink-200">
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-pink-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-pink-600">LIMITED</div>
              <div className="text-sm text-muted-foreground">Stock Available</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search and Sort Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clearance items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 backdrop-blur"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/80 backdrop-blur">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discount-high">Highest Discount</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Results Count */}
        <div className="mb-6">
          <p className="text-lg font-semibold">
            Showing {filteredProducts.length} clearance {filteredProducts.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        
        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const images = product.images ? JSON.parse(product.images) : [];
              const imageUrl = images[0] || '/placeholder-product.png';
              const isInWishlist = wishlistItems?.some(item => item.productId === product.id);
              const savings = product.basePrice - product.salePrice;
              
              return (
                <Card 
                  key={`${product.itemCode}-${product.size}`}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-orange-200 bg-white/90 backdrop-blur"
                  onClick={() => setLocation(`/products/${product.id}`)}
                >
                  {/* Clearance Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Flame className="h-3 w-3" />
                    {product.discount}% OFF
                  </div>
                  
                  {/* Limited Stock Badge */}
                  {product.stock > 0 && (
                    <div className="absolute top-2 right-2 z-10 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold shadow-lg">
                      LIMITED
                    </div>
                  )}
                  
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4">
                      <div className="text-xs text-orange-600 font-semibold mb-1">{product.brand}</div>
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <div className="text-xs text-muted-foreground mb-3">Size: {product.size}</div>
                      
                      {/* Pricing */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-red-600">
                            ₱{(product.salePrice / 100).toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            ₱{(product.basePrice / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-green-600 font-semibold">
                          You save ₱{(savings / 100).toFixed(2)}!
                        </div>
                      </div>
                      
                      {/* Stock Status */}
                      {product.stock > 0 ? (
                        <div className="mt-3 text-xs text-green-600 font-semibold flex items-center gap-1">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          In Stock - Order Now!
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-red-600 font-semibold">
                          Out of Stock
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Flame className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No clearance items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search" : "Check back soon for new deals!"}
            </p>
            <Button onClick={() => setLocation("/products")}>
              Browse All Products
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
