import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import SimilarProducts from "@/components/SimilarProducts";
import CountdownTimer from "@/components/CountdownTimer";
import ImageLightbox from "@/components/ImageLightbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Heart, ShoppingCart, Ruler, ChevronLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function ProductDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const productId = parseInt(params.id || "0");
  
  // Track product view for recommendations
  const trackViewMutation = trpc.recommendations.trackView.useMutation();
  
  // Track view when product loads
  useEffect(() => {
    if (user && productId > 0) {
      trackViewMutation.mutate({ productId });
    }
  }, [productId, user]);

  const { data: product, isLoading } = trpc.products.getById.useQuery(
    { id: productId },
    { enabled: productId > 0 }
  );

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquirySize, setInquirySize] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");

  const addToCartMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Added to cart!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add to cart");
    },
  });

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
  
  const isInWishlist = wishlistItems?.some((item: any) => item.productId === productId);
  
  const toggleWishlist = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (isInWishlist) {
      removeFromWishlistMutation.mutate({ productId });
    } else {
      addToWishlistMutation.mutate({ productId });
    }
  };

  const submitInquiryMutation = trpc.admin.inquiries.create.useMutation({
    onSuccess: () => {
      toast.success("Inquiry submitted! We'll get back to you soon.");
      setInquiryOpen(false);
      setInquirySize("");
      setInquiryMessage("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit inquiry");
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12 px-6 text-center">
            <p className="text-muted-foreground mb-4">Product not found</p>
            <Button onClick={() => setLocation("/products")}>Browse Products</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = product.images ? JSON.parse(product.images) : [];
  const sizes = product.sizes ? JSON.parse(product.sizes) : [];
  const sizeStock = product.sizeStock ? JSON.parse(product.sizeStock) : {};
  const price = product.salePrice || product.basePrice;
  const hasDiscount = !!product.salePrice;
  const discountPercent = hasDiscount && product.salePrice
    ? Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }

    const stock = sizeStock[selectedSize] || 0;
    if (stock < quantity) {
      toast.error("Not enough stock available");
      return;
    }

    addToCartMutation.mutate({
      productId: product.id,
      size: selectedSize,
      quantity,
    });
  };

  const handleInquiry = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!inquirySize || !inquiryMessage.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    submitInquiryMutation.mutate({
      productId: product.id,
      productName: product.name,
      size: inquirySize,
      message: inquiryMessage,
      customerEmail: user.email || "",
      customerName: user.name || "",
    });
  };

  const sizeGuideData = [
    { us: "7", uk: "6", eu: "40", cm: "25" },
    { us: "7.5", uk: "6.5", eu: "40.5", cm: "25.5" },
    { us: "8", uk: "7", eu: "41", cm: "26" },
    { us: "8.5", uk: "7.5", eu: "42", cm: "26.5" },
    { us: "9", uk: "8", eu: "42.5", cm: "27" },
    { us: "9.5", uk: "8.5", eu: "43", cm: "27.5" },
    { us: "10", uk: "9", eu: "44", cm: "28" },
    { us: "10.5", uk: "9.5", eu: "44.5", cm: "28.5" },
    { us: "11", uk: "10", eu: "45", cm: "29" },
    { us: "11.5", uk: "10.5", eu: "45.5", cm: "29.5" },
    { us: "12", uk: "11", eu: "46", cm: "30" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <button
          onClick={() => setLocation("/products")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div>
            <div 
              className="aspect-square mb-4 rounded-lg overflow-hidden bg-muted cursor-zoom-in relative group"
              onClick={() => setLightboxOpen(true)}
            >
              {images[selectedImage] && (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="eager"
                />
              )}
              {/* Zoom hint overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-full text-sm font-medium">
                  Click to zoom
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {images.map((img: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">{product.brand}</p>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-sm text-muted-foreground mb-4">{product.category}</p>

            {/* Sale Countdown */}
            {product.salePrice && product.saleEndDate && (
              <div className="mb-4">
                <CountdownTimer endDate={product.saleEndDate} />
              </div>
            )}
            
            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold">₱{(price / 100).toLocaleString()}</span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    ₱{(product.basePrice / 100).toLocaleString()}
                  </span>
                  <span className="bg-red-500 text-white text-sm px-2 py-1 rounded">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>

            {product.clearance === 1 && (
              <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-500 px-4 py-2 rounded-lg mb-6">
                <p className="font-bold">CLEARANCE SALE - Limited Stock!</p>
              </div>
            )}

            {/* Size Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Select Size</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" size="sm" className="h-auto p-0">
                      <Ruler className="h-4 w-4 mr-1" />
                      Size Guide
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Size Guide</DialogTitle>
                      <DialogDescription>
                        Find your perfect fit with our size conversion chart
                      </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">US</th>
                            <th className="text-left p-2">UK</th>
                            <th className="text-left p-2">EU</th>
                            <th className="text-left p-2">CM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sizeGuideData.map((row) => (
                            <tr key={row.us} className="border-b">
                              <td className="p-2">{row.us}</td>
                              <td className="p-2">{row.uk}</td>
                              <td className="p-2">{row.eu}</td>
                              <td className="p-2">{row.cm}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {sizes.map((size: string) => {
                  const stock = sizeStock[size] || 0;
                  const isAvailable = stock > 0;
                  const isSelected = selectedSize === size;

                  return (
                    <Button
                      key={size}
                      variant={isSelected ? "default" : "outline"}
                      className={`relative ${!isAvailable ? "opacity-50" : ""}`}
                      onClick={() => isAvailable && setSelectedSize(size)}
                      disabled={!isAvailable}
                    >
                      {size}
                      {isAvailable && stock < 5 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
                      )}
                      {!isAvailable && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="h-px w-full bg-foreground rotate-45" />
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
              {selectedSize && sizeStock[selectedSize] > 0 && sizeStock[selectedSize] < 10 && (
                <p className="text-sm text-orange-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Only {sizeStock[selectedSize]} left in stock!
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <Label className="text-base font-semibold mb-3 block">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                />
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
            <div className="flex gap-3 mb-6">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleAddToCart}
                disabled={!selectedSize || addToCartMutation.isPending}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={toggleWishlist}
              >
                <Heart
                  className={`h-5 w-5 ${
                    isInWishlist ? "fill-red-500 text-red-500" : ""
                  }`}
                />
              </Button>
            </div>

            {/* Inquiry for Out of Stock */}
            <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Can't find your size? Inquire here
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Product Inquiry</DialogTitle>
                  <DialogDescription>
                    Let us know what size you're looking for and we'll check if we can source it for you.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Size Needed</Label>
                    <Input
                      placeholder="e.g., US 10"
                      value={inquirySize}
                      onChange={(e) => setInquirySize(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Tell us more about your request..."
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleInquiry}
                    disabled={submitInquiryMutation.isPending}
                  >
                    Submit Inquiry
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Description */}
            {product.description && (
              <div className="mt-8 pt-8 border-t">
                <h2 className="text-xl font-bold mb-3">Description</h2>
                <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Product Details */}
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-medium">{product.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{product.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-medium">#{product.id}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Similar Products */}
        <div className="container">
          <SimilarProducts productId={productId} />
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={selectedImage}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(index) => setSelectedImage(index)}
        />
      )}
    </div>
  );
}
