import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, Heart, Ruler } from "lucide-react";
import { SizeGuideModal } from "@/components/SizeGuideModal";
import CountdownTimer from "@/components/CountdownTimer";
import LazyImage from "@/components/LazyImage";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Products() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  // Use Google Sheets inventory
  const { data: inventoryProducts, isLoading, error } = trpc.inventory.list.useQuery(undefined, {
    retry: 3,
    retryDelay: 1000,
  });
  
  // Normalize size format to remove duplicates (27.5 CM, 27.5CM, 27.50 → 27.5)
  const normalizeSize = (size: string): string => {
    if (!size) return '';
    
    // Remove whitespace and convert to uppercase for comparison
    let normalized = size.toString().trim();
    
    // Remove "CM" suffix (case insensitive) and any spaces
    normalized = normalized.replace(/\s*CM\s*/gi, '').trim();
    
    // Parse as number to remove trailing zeros (27.50 → 27.5)
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      return num.toString();
    }
    
    // For non-numeric sizes (like 10.5K), just return cleaned version
    return normalized;
  };

  // Transform inventory and group by SKU
  const products = useMemo(() => {
    if (!inventoryProducts) return [];
    
    // Group products by SKU
    const grouped = new Map<string, any>();
    
    inventoryProducts.forEach(item => {
      const sku = item.sku;
      const normalizedSize = normalizeSize(item.size);
      
      if (!grouped.has(sku)) {
        // Create new product entry
        grouped.set(sku, {
          id: parseInt(item.itemCode) || 0,
          itemCode: item.itemCode,
          name: item.name,
          description: item.name,
          brand: sku.split(/[^a-zA-Z]/)[0] || 'Unknown',
          category: 'Sneakers',
          basePrice: Math.round(item.srp),
          salePrice: item.sellingPrice > 0 ? Math.round(item.sellingPrice) : null,
          saleEndDate: null,
          images: JSON.stringify(item.imageUrl ? [item.imageUrl] : []),
          sizes: normalizedSize ? [normalizedSize] : [],
          rawSizes: [item.size], // Keep original for kids detection
          sizeStock: { [normalizedSize]: item.status === 'AVAILABLE' ? 1 : 0 },
          stock: item.status === 'AVAILABLE' ? 1 : 0,
          featured: 0,
          clearance: 0,
          clearanceEndDate: null,
          fitNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          sku: sku,
        });
      } else {
        // Add size to existing product (only if not already present after normalization)
        const existing = grouped.get(sku);
        if (normalizedSize && !existing.sizes.includes(normalizedSize)) {
          existing.sizes.push(normalizedSize);
        }
        // Keep raw sizes for kids detection
        if (!existing.rawSizes.includes(item.size)) {
          existing.rawSizes.push(item.size);
        }
        existing.sizeStock[normalizedSize] = (existing.sizeStock[normalizedSize] || 0) + (item.status === 'AVAILABLE' ? 1 : 0);
        existing.stock += item.status === 'AVAILABLE' ? 1 : 0;
        
        // Update image if current product has one and existing doesn't
        const existingImages = JSON.parse(existing.images);
        if (item.imageUrl && existingImages.length === 0) {
          existing.images = JSON.stringify([item.imageUrl]);
        }
      }
    });
    
    // Convert map to array and add Last Pair/Last Size categorization
    return Array.from(grouped.values()).map(product => {
      const sortedSizes = product.sizes.sort((a: string, b: string) => parseFloat(a) - parseFloat(b));
      const availableSizesCount = sortedSizes.length;
      
      // Last Pair: Only 1 size available for this product
      const isLastPair = availableSizesCount === 1;
      
      // Last Size: Multiple sizes available for this product
      const isLastSize = availableSizesCount > 1;
      
      // Kids: Products with CM suffix in ORIGINAL size OR kids-specific product name indicators
      // Note: Do NOT use size < 24 as that incorrectly tags adult small sizes
      // Use rawSizes (original format) to detect CM suffix since normalized sizes remove it
      const productName = product.name?.toUpperCase() || '';
      const isKids = (product.rawSizes || []).some((size: string) => {
        const sizeStr = size.toString().toUpperCase();
        // Check for CM suffix (kids sizes like 20CM, 27.5 CM)
        return sizeStr.includes('CM');
      }) || 
      // Check for kids product indicators in name (C suffix = Children's, K = Kids)
      productName.includes(' C ') || 
      productName.endsWith(' C') || 
      productName.includes('KIDS') || 
      productName.includes('JUNIOR') || 
      productName.includes(' J ') || 
      productName.endsWith(' J');
      
      return {
        ...product,
        sizes: JSON.stringify(sortedSizes),
        sizeStock: JSON.stringify(product.sizeStock),
        isLastPair,
        isLastSize,
        isKids,
      };
    });
  }, [inventoryProducts]);
  
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
  
  const removeFromWishlistMutation = trpc.wishlist.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from wishlist");
      utils.wishlist.get.invalidate();
    },
    onError: () => {
      toast.error("Failed to remove from wishlist");
    },
  });
  
  const isInWishlist = (productId: number) => {
    return wishlistItems?.some((item: any) => item.productId === productId);
  };
  
  const toggleWishlist = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to add to wishlist");
      return;
    }
    if (isInWishlist(productId)) {
      removeFromWishlistMutation.mutate({ productId });
    } else {
      addToWishlistMutation.mutate({ productId });
    }
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showOnSale, setShowOnSale] = useState(false);
  const [showClearance, setShowClearance] = useState(false);
  const [showLastPair, setShowLastPair] = useState(false);
  const [showLastSize, setShowLastSize] = useState(false);
  const [showKids, setShowKids] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  // Extract unique values for filters
  const brands = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map(p => p.brand))).sort();
  }, [products]);

  const categories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  const sizes = useMemo(() => {
    if (!products) return [];
    const allSizes = new Set<string>();
    products.forEach(p => {
      if (p.sizes) {
        try {
          const productSizes = JSON.parse(p.sizes);
          productSizes.forEach((size: string) => allSizes.add(size));
        } catch (e) {}
      }
    });
    return Array.from(allSizes).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products.filter(product => {
      // Search query
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Brand filter
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
        return false;
      }

      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
        return false;
      }

      // Price filter
      const price = product.salePrice || product.basePrice;
      if (price < priceRange[0] * 100 || price > priceRange[1] * 100) {
        return false;
      }

      // Size filter
      if (selectedSizes.length > 0) {
        try {
          const productSizes = JSON.parse(product.sizes);
          const hasSize = selectedSizes.some(size => productSizes.includes(size));
          if (!hasSize) return false;
        } catch (e) {
          return false;
        }
      }

      // On Sale filter
      if (showOnSale && !product.salePrice) {
        return false;
      }

      // Clearance filter
      if (showClearance && product.clearance !== 1) {
        return false;
      }

      // Last Pair filter - only show products with 1 size available
      if (showLastPair && !product.isLastPair) {
        return false;
      }

      // Kids filter - only show products with kids sizes
      if (showKids && !product.isKids) {
        return false;
      }

      return true;
    });

    // Helper function to normalize size for sorting
    const normalizeSize = (sizeStr: string): number => {
      if (!sizeStr) return 999; // Put empty sizes at the end
      
      // Remove whitespace
      const cleaned = sizeStr.trim();
      
      // Handle CM sizes (20CM → 20)
      if (cleaned.toUpperCase().includes('CM')) {
        const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 999 : num;
      }
      
      // Handle Kids sizes (10.5K → 10.5, treat as smaller than adult sizes)
      if (cleaned.toUpperCase().includes('K')) {
        const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 999 : num; // Kids sizes are typically smaller
      }
      
      // Regular numeric sizes
      const num = parseFloat(cleaned);
      return isNaN(num) ? 999 : num;
    };

    // Sort
    switch (sortBy) {
      case "size-small":
        filtered.sort((a, b) => {
          // Get smallest size from each product
          const getSizes = (product: any): number[] => {
            try {
              const sizes = JSON.parse(product.sizes);
              return sizes.map((s: string) => normalizeSize(s));
            } catch {
              return [999];
            }
          };
          
          const minSizeA = Math.min(...getSizes(a));
          const minSizeB = Math.min(...getSizes(b));
          return minSizeA - minSizeB;
        });
        break;
      case "price-low":
        filtered.sort((a, b) => {
          const priceA = a.salePrice || a.basePrice;
          const priceB = b.salePrice || b.basePrice;
          return priceA - priceB;
        });
        break;
      case "price-high":
        filtered.sort((a, b) => {
          const priceA = a.salePrice || a.basePrice;
          const priceB = b.salePrice || b.basePrice;
          return priceB - priceA;
        });
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [products, searchQuery, selectedBrands, selectedCategories, selectedSizes, priceRange, showOnSale, showClearance, showLastPair, showKids, sortBy]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedSizes([]);
    setPriceRange([0, 50000]);
    setShowOnSale(false);
    setShowClearance(false);
    setShowLastPair(false);
    setShowKids(false);
  };

  const activeFilterCount = selectedBrands.length + selectedCategories.length + selectedSizes.length + 
    (showOnSale ? 1 : 0) + (showClearance ? 1 : 0) + (showLastPair ? 1 : 0) + (showKids ? 1 : 0);

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Size Guide */}
      <div className="mb-4">
        <SizeGuideModal 
          trigger={
            <button className="w-full py-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-500 hover:bg-amber-500/20 flex items-center justify-center gap-2 transition-colors text-sm font-medium">
              <Ruler className="h-4 w-4" />
              Size Guide
            </button>
          }
        />
      </div>

      {/* Quick Filters */}
      <div>
        <h3 className="font-semibold mb-3">Quick Filters</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={showOnSale}
              onCheckedChange={(checked) => setShowOnSale(checked as boolean)}
            />
            <span className="text-sm">On Sale</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={showClearance}
              onCheckedChange={(checked) => setShowClearance(checked as boolean)}
            />
            <span className="text-sm">Clearance</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={showLastPair}
              onCheckedChange={(checked) => setShowLastPair(checked as boolean)}
            />
            <span className="text-sm">Last Pair</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={showKids}
              onCheckedChange={(checked) => setShowKids(checked as boolean)}
            />
            <span className="text-sm">Kids</span>
          </label>
        </div>
      </div>

      {/* Brand Filter */}
      <div>
        <h3 className="font-semibold mb-3">Brand</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {brands.map(brand => (
            <label key={brand} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
              />
              <span className="text-sm">{brand}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="font-semibold mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map(category => (
            <label key={category} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => toggleCategory(category)}
              />
              <span className="text-sm">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Size Filter */}
      <div>
        <h3 className="font-semibold mb-3">Size</h3>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map(size => (
            <Button
              key={size}
              variant={selectedSizes.includes(size) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSize(size)}
              className="text-xs"
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">Price Range</h3>
        <div className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={0}
            max={50000}
            step={500}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>₱{priceRange[0].toLocaleString()}</span>
            <span>₱{priceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={clearAllFilters} className="w-full">
          Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-lg">Loading inventory from Google Sheets...</div>
        <div className="text-sm text-muted-foreground">This may take a moment</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-lg text-red-500">Error loading inventory</div>
        <div className="text-sm text-muted-foreground">{error.message}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">All Products</h1>
          <p className="text-muted-foreground">
            Showing {filteredProducts.length} of {products?.length || 0} products
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="size-small">Size: Smallest to Largest</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name: A to Z</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Refine your product search
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-6">
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => {
                  const price = product.salePrice || product.basePrice;
                  const hasDiscount = !!product.salePrice;
                  const images = product.images ? JSON.parse(product.images) : [];
                  const productSizes = product.sizes ? JSON.parse(product.sizes) : [];

                  return (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setLocation(`/inventory/${product.itemCode}`)}
                    >
                      <div className="relative aspect-square group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => toggleWishlist(e, product.id)}
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              isInWishlist(product.id)
                                ? "fill-red-500 text-red-500"
                                : "text-gray-600"
                            }`}
                          />
                        </Button>
                        {images[0] && (
                          <LazyImage
                            src={images[0]}
                            alt={product.name}
                            className="object-cover w-full h-full rounded-t-lg"
                          />
                        )}
                        {hasDiscount && (
                          <>
                            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                              SALE
                            </span>
                            {product.saleEndDate && (
                              <div className="absolute bottom-2 left-2">
                                <CountdownTimer endDate={product.saleEndDate} compact />
                              </div>
                            )}
                          </>
                        )}
                        {product.clearance === 1 && (
                          <span className="absolute top-2 left-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold">
                            CLEARANCE
                          </span>
                        )}
                        {/* Last Pair badge - only 1 size available */}
                        {product.isLastPair && (
                          <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">
                            LAST PAIR
                          </span>
                        )}
                        {/* Kids badge - children's sizes */}
                        {product.isKids && !product.isLastPair && (
                          <span className="absolute bottom-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">
                            KIDS
                          </span>
                        )}
                        {product.isKids && product.isLastPair && (
                          <span className="absolute bottom-2 left-24 bg-pink-500 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">
                            KIDS
                          </span>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                        <h3 className="font-semibold mb-2 line-clamp-2 force-black-text">{product.name}</h3>
                        
                        {/* Available Sizes */}
                        {productSizes.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground mb-1">Available Sizes:</p>
                            <div className="flex flex-wrap gap-1">
                              {productSizes.slice(0, 5).map((size: string) => (
                                <span key={size} className="text-xs px-2 py-0.5 bg-muted rounded">
                                  {size}
                                </span>
                              ))}
                              {productSizes.length > 5 && (
                                <span className="text-xs px-2 py-0.5 text-muted-foreground">
                                  +{productSizes.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            ₱{(price / 100).toLocaleString()}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              ₱{(product.basePrice / 100).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {product.stock < 10 && product.stock > 0 && (
                          <p className="text-xs text-orange-500 mt-2">Only {product.stock} left!</p>
                        )}
                        {product.stock === 0 && (
                          <p className="text-xs text-red-500 mt-2">Out of stock</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No products found matching your filters</p>
                  <Button onClick={clearAllFilters}>Clear Filters</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
