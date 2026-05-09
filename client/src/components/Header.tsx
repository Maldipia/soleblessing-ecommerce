import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ShoppingCart, User, Menu, LogOut, Package, Shield, Heart, Trophy, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";

const megaMenus: Record<string, { cols: { title: string; links: string[] }[]; badge?: string }> = {
  Sneakers: {
    badge: "New Drop",
    cols: [
      { title: "By Style", links: ["Running", "Lifestyle / Casual", "Basketball", "Skateboarding", "Low-Cut", "High-Top"] },
      { title: "By Brand", links: ["Adidas", "Nike", "New Balance", "Jordan", "Vans", "Converse"] },
      { title: "Discover", links: ["New Arrivals", "Best Sellers", "Limited Edition", "On Sale", "Last Pair"] },
    ],
  },
  Perfume: {
    cols: [
      { title: "By Type", links: ["Eau de Parfum", "Eau de Toilette", "Unisex", "Men's Scents", "Women's Scents"] },
      { title: "Top Brands", links: ["Lattafa", "Armaf", "Arabian Oud", "Rasasi", "Swiss Arabian"] },
    ],
  },
  Gadgets: {
    cols: [
      { title: "Categories", links: ["Wireless Earbuds", "Smartwatch", "Phone Accessories", "Speakers", "Cables & Hubs"] },
      { title: "Deals", links: ["Under ₱999", "Bundle Deals", "Flash Sale", "New Arrivals"] },
    ],
  },
};

export default function Header() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: cartItems } = trpc.cart.get.useQuery(undefined, { enabled: !!user });
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = "/"; } });
  const cartItemCount = cartItems?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) { setLocation(`/products?search=${encodeURIComponent(searchQuery)}`); setSearchQuery(""); setSearchOpen(false); }
  };

  const openMega = (name: string) => { if (megaTimeout.current) clearTimeout(megaTimeout.current); setActiveMega(name); };
  const closeMega = () => { megaTimeout.current = setTimeout(() => setActiveMega(null), 120); };

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "New Drop", path: "/products?sort=newest" },
    { label: "Sneakers", path: "/products?category=sneakers", mega: true },
    { label: "Perfume", path: "/products?category=perfume", mega: true },
    { label: "Gadgets", path: "/products?category=gadgets", mega: true },
    { label: "Sale 🔥", path: "/clearance", highlight: true },
    { label: "Track Order", path: "/profile" },
  ];

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-[#C9A84C] text-[#0d2430] text-center py-2 text-[11px] font-semibold tracking-widest uppercase px-4">
        🚚 Free Shipping ₱3,000+ &nbsp;·&nbsp; COD Available &nbsp;·&nbsp; GCash · Maya · BDO · BPI
      </div>

      <header className="sticky top-0 z-50 w-full bg-[#050f12] border-b border-white/[.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex h-[62px] items-center justify-between">

          {/* Logo */}
          <button onClick={() => setLocation("/")} className="flex items-center gap-2.5 hover:opacity-85 transition-opacity flex-shrink-0">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-7 w-7 rounded" />
            <span className="font-bold text-[17px] tracking-[.1em] text-white uppercase">{APP_TITLE}</span>
            <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full mb-3 -ml-1" />
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center h-full">
            {navLinks.map(link => (
              <div key={link.label}
                className="relative h-full flex items-center"
                onMouseEnter={() => link.mega ? openMega(link.label) : null}
                onMouseLeave={link.mega ? closeMega : undefined}>
                <button
                  onClick={() => setLocation(link.path)}
                  className={`px-4 h-full flex items-center gap-1 text-[11.5px] font-medium tracking-[.07em] uppercase transition-colors ${
                    link.highlight ? "text-red-400 hover:text-red-300" :
                    location === link.path ? "text-[#C9A84C]" :
                    "text-white/50 hover:text-white"
                  }`}>
                  {link.label}
                  {link.mega && <ChevronDown className="h-3 w-3 opacity-50" />}
                </button>

                {/* Mega Menu */}
                {link.mega && activeMega === link.label && megaMenus[link.label] && (
                  <div
                    className="absolute top-[62px] left-0 bg-[#091821] border border-white/[.08] shadow-2xl p-8 min-w-[520px] z-50"
                    onMouseEnter={() => openMega(link.label)}
                    onMouseLeave={closeMega}>
                    <div className={`grid gap-8 ${megaMenus[link.label].cols.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {megaMenus[link.label].cols.map(col => (
                        <div key={col.title}>
                          <h4 className="text-[9.5px] font-bold tracking-[.16em] uppercase text-[#C9A84C] mb-3 pb-2 border-b border-white/[.06]">{col.title}</h4>
                          {col.links.map(lnk => (
                            <button key={lnk} onClick={() => { setLocation(`/products?q=${encodeURIComponent(lnk)}`); setActiveMega(null); }}
                              className="block text-left text-[12.5px] text-white/45 hover:text-white py-1.5 w-full transition-colors">
                              {lnk}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    {megaMenus[link.label].badge && (
                      <div className="mt-6 pt-4 border-t border-white/[.06] flex items-center justify-between">
                        <span className="text-[10px] text-white/25 uppercase tracking-wider">Exclusive · {megaMenus[link.label].badge}</span>
                        <button onClick={() => { setLocation('/products'); setActiveMega(null); }}
                          className="text-[11px] text-[#C9A84C] font-semibold tracking-wide uppercase hover:opacity-80">
                          Shop All →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(s => !s)}
              className="text-white/50 hover:text-white hover:bg-white/[.06] h-9 w-9">
              <Search className="h-4.5 w-4.5" />
            </Button>

            {/* Wishlist */}
            <Button variant="ghost" size="icon" onClick={() => setLocation("/wishlist")}
              className="text-white/50 hover:text-white hover:bg-white/[.06] h-9 w-9 hidden md:flex">
              <Heart className="h-4.5 w-4.5" />
            </Button>

            {/* Cart */}
            <Button variant="ghost" size="icon" onClick={() => setLocation("/cart")}
              className="text-white/50 hover:text-white hover:bg-white/[.06] h-9 w-9 relative">
              <ShoppingCart className="h-4.5 w-4.5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#C9A84C] text-[#050f12] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>

            {/* Pay Now CTA */}
            <button onClick={() => setLocation("/upload-payment")}
              className="hidden md:flex items-center bg-[#C9A84C] text-[#050f12] text-[11px] font-bold tracking-widest uppercase px-4 h-8 ml-2 hover:opacity-90 transition-opacity">
              Pay Now
            </button>

            {/* User */}
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/[.06] h-9 w-9">
                      <User className="h-4.5 w-4.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-[#091821] border-white/[.08] text-white">
                    <DropdownMenuLabel className="text-white/40 text-xs">{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/[.06]" />
                    <DropdownMenuItem onClick={() => setLocation("/profile")} className="hover:bg-white/[.06] cursor-pointer">
                      <Package className="mr-2 h-4 w-4" /> My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/wishlist")} className="hover:bg-white/[.06] cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" /> Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/loyalty")} className="hover:bg-white/[.06] cursor-pointer">
                      <Trophy className="mr-2 h-4 w-4" /> Loyalty Points
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <>
                        <DropdownMenuSeparator className="bg-white/[.06]" />
                        <DropdownMenuItem onClick={() => setLocation("/admin")} className="hover:bg-white/[.06] cursor-pointer text-[#C9A84C]">
                          <Shield className="mr-2 h-4 w-4" /> Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-white/[.06]" />
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="hover:bg-white/[.06] cursor-pointer text-red-400">
                      <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => window.location.href = getLoginUrl()} size="sm"
                  className="hidden md:flex bg-white/[.08] hover:bg-white/[.14] text-white border-0 text-xs h-8 ml-1">
                  Sign In
                </Button>
              )
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white/50 hover:text-white hover:bg-white/[.06] h-9 w-9 ml-1">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-[#050f12] border-white/[.06] p-0">
                <SheetHeader className="px-6 py-5 border-b border-white/[.06]">
                  <SheetTitle className="text-white font-bold tracking-widest uppercase text-sm">Menu</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  {navLinks.map(link => (
                    <button key={link.label} onClick={() => { setLocation(link.path); setMobileOpen(false); }}
                      className={`w-full text-left px-6 py-3.5 text-sm font-medium tracking-wide transition-colors ${link.highlight ? 'text-red-400' : 'text-white/55 hover:text-white hover:bg-white/[.04]'}`}>
                      {link.label}
                    </button>
                  ))}
                  <div className="px-6 pt-6 border-t border-white/[.06] mt-4">
                    <button onClick={() => { setLocation("/upload-payment"); setMobileOpen(false); }}
                      className="w-full bg-[#C9A84C] text-[#050f12] font-bold tracking-widest uppercase text-xs py-3 mb-3">
                      Upload Payment
                    </button>
                    {!user && (
                      <button onClick={() => window.location.href = getLoginUrl()}
                        className="w-full border border-white/[.12] text-white/60 text-xs font-medium py-3">
                        Sign In
                      </button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="bg-[#091821] border-t border-white/[.06] px-6 md:px-10 py-4">
            <form onSubmit={handleSearch} className="max-w-[640px] mx-auto flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search sneakers, perfume, gadgets…"
                  className="w-full bg-white/[.06] border border-white/[.1] pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#C9A84C] rounded transition-colors"
                />
              </div>
              <button type="submit" className="bg-[#C9A84C] text-[#050f12] px-5 text-xs font-bold tracking-widest uppercase rounded hover:opacity-90">
                Search
              </button>
              <button type="button" onClick={() => setSearchOpen(false)} className="text-white/30 hover:text-white text-lg px-2">✕</button>
            </form>
            <div className="max-w-[640px] mx-auto mt-3 flex gap-2 flex-wrap">
              {["Adidas Samba", "Nike Dunk Low", "Lattafa Khamrah", "Size 9"].map(s => (
                <button key={s} onClick={() => { setSearchQuery(s); setLocation(`/products?search=${encodeURIComponent(s)}`); setSearchOpen(false); }}
                  className="text-[11px] text-white/35 hover:text-[#C9A84C] transition-colors px-3 py-1 border border-white/[.08] rounded-full">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
