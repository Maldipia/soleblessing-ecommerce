import { useAuth } from "@/_core/hooks/useAuth";
import RecommendedProducts from "@/components/RecommendedProducts";
import NewArrivals from "@/components/NewArrivals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, User, Menu, Search, Zap, Trophy } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: featuredProducts, isLoading } = trpc.products.featured.useQuery();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatPrice = (centavos: number) => {
    return `₱${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
              <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />
              {APP_TITLE}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
                Products
              </Link>
              <Link href="/raffles" className="text-sm font-medium hover:text-primary transition-colors">
                Raffles
              </Link>
              <Link href="/sale-events" className="text-sm font-medium hover:text-primary transition-colors">
                Sale Events
              </Link>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Search className="h-5 w-5" />
              </Button>
              <Link href="/cart">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
              </Link>
              {isAuthenticated ? (
                <Link href="/profile">
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Button asChild>
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-3">
                <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
                  Products
                </Link>
                <Link href="/raffles" className="text-sm font-medium hover:text-primary transition-colors">
                  Raffles
                </Link>
                <Link href="/sale-events" className="text-sm font-medium hover:text-primary transition-colors">
                  Sale Events
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="container relative py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Premium Sneakers,
              <br />
              Authentic Drops
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Get exclusive access to the latest sneaker releases, limited raffles, and unbeatable deals on your favorite brands.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="text-base">
                <Link href="/products">Shop Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="/raffles">Enter Raffles</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-y border-border bg-card/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Instant Drops</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to access the latest sneaker releases
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Exclusive Raffles</h3>
              <p className="text-sm text-muted-foreground">
                Win limited edition sneakers through our raffle system
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Easy Checkout</h3>
              <p className="text-sm text-muted-foreground">
                Secure payments and order tracking for peace of mind
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Drops</h2>
            <Button asChild variant="outline">
              <Link href="/products">View All</Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-96 animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.slice(0, 4).map((product) => {
                const images = JSON.parse(product.images as string) as string[];
                const currentPrice = product.salePrice || product.basePrice;
                const hasDiscount = product.salePrice && product.salePrice < product.basePrice;

                return (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                      <div className="aspect-square overflow-hidden bg-muted relative">
                        {hasDiscount && (
                          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-bold z-10">
                            SALE
                          </div>
                        )}
                        <img
                          src={images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                        <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(currentPrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.basePrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">{APP_TITLE}</h3>
              <p className="text-sm text-muted-foreground">
                Your trusted source for authentic sneakers and exclusive drops.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
                <Link href="/raffles" className="hover:text-primary transition-colors">Raffles</Link>
                <Link href="/sale-events" className="hover:text-primary transition-colors">Sale Events</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="/profile" className="hover:text-primary transition-colors">My Profile</Link>
                <Link href="/cart" className="hover:text-primary transition-colors">Shopping Cart</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <p className="text-sm text-muted-foreground">
                Follow us on social media for the latest updates and exclusive offers.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2024 {APP_TITLE}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* New Arrivals */}
      <NewArrivals />
      
      {/* AI Recommendations */}
      {user && <RecommendedProducts />}
    </div>
  );
}
