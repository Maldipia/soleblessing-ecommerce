import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, ShoppingCart, User, Menu, LogOut, Package, Shield, MessageCircle, Heart, Trophy, ClipboardList, Flame, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Header() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: cartItems } = trpc.cart.get.useQuery(undefined, {
    enabled: !!user,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const cartItemCount = cartItems?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { label: "Products", path: "/products" },
    { label: "Clearance", path: "/clearance", icon: Flame, highlight: true },
    { label: "Shoe Cleaner", path: "/shoe-cleaner", icon: Sparkles, special: true },
    { label: "Raffles", path: "/raffles" },
    { label: "Sale Events", path: "/sale-events" },
  ];

  const isActive = (path: string) => location === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />
            <span className="font-bold text-lg hidden sm:inline">{APP_TITLE}</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => setLocation(link.path)}
                  className={`text-sm font-medium transition-all flex items-center gap-1.5 ${
                    link.highlight
                      ? "text-orange-600 hover:text-orange-700 font-bold"
                      : link.special
                      ? "text-yellow-600 hover:text-yellow-700 font-semibold"
                      : isActive(link.path)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {Icon && <Icon className={`h-4 w-4 ${link.special ? "text-yellow-500" : ""}`} />}
                  {link.label}
                  {link.highlight && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded font-bold">HOT</span>
                  )}
                  {link.special && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded font-bold">NEW</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Search, Cart, and User Menu */}
        <div className="hidden md:flex items-center gap-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10"
            />
          </form>

          {/* Cart Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setLocation("/cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Button>

          {/* User Menu */}
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name || "Customer"}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/wishlist")}>
                  <Heart className="mr-2 h-4 w-4" />
                  Wishlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/loyalty")}>
                  <Trophy className="mr-2 h-4 w-4" />
                  Rewards
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <Package className="mr-2 h-4 w-4" />
                  My Orders
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/admin")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/admin/chat")}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Customer Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/admin/orders")}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Order Management
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => (window.location.href = getLoginUrl())}>Login</Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setLocation("/cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Button>

          {/* Mobile Menu Sheet */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {/* Mobile Search */}
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </form>

                {/* Mobile Navigation Links */}
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Button
                        key={link.path}
                        variant={isActive(link.path) ? "default" : "ghost"}
                        className={`justify-start ${
                          link.highlight ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : 
                          link.special ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : ""
                        }`}
                        onClick={() => {
                          setLocation(link.path);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {Icon && <Icon className="mr-2 h-4 w-4" />}
                        {link.label}
                        {link.highlight && (
                          <span className="ml-auto px-2 py-0.5 text-xs bg-orange-600 text-white rounded font-bold">HOT</span>
                        )}
                        {link.special && (
                          <span className="ml-auto px-2 py-0.5 text-xs bg-yellow-600 text-white rounded font-bold">NEW</span>
                        )}
                      </Button>
                    );
                  })}
                </nav>

                {/* Mobile User Menu */}
                <div className="border-t pt-4 mt-4">
                  {user ? (
                    <div className="flex flex-col gap-2">
                      <div className="px-2 py-1">
                        <p className="font-medium">{user.name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          setLocation("/profile");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        My Orders
                      </Button>
                      {user.role === "admin" && (
                        <Button
                          variant="ghost"
                          className="justify-start"
                          onClick={() => {
                            setLocation("/admin");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => logoutMutation.mutate()}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => (window.location.href = getLoginUrl())}
                    >
                      Login
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
