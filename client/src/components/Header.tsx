// SB2.0 — white header, black type, orange accent (per approved design board)
import { APP_LOGO, APP_TITLE } from "@/const";
import { Search, ShoppingCart, Heart, Menu, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { useCart } from "@/contexts/CartContext";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

const megaMenus: Record<string, { cols: { title: string; links: string[] }[] }> = {
  Sneakers: {
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
      { title: "Categories", links: ["Wireless Earbuds", "Smartwatch", "Phone Accessories", "Speakers"] },
      { title: "Deals", links: ["Under ₱999", "Bundle Deals", "Flash Sale", "New Arrivals"] },
    ],
  },
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { count: cartItemCount } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  const openMega = (name: string) => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setActiveMega(name);
  };
  const closeMega = () => {
    megaTimeout.current = setTimeout(() => setActiveMega(null), 120);
  };

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "New Drop", path: "/products?sort=newest" },
    { label: "Sneakers", path: "/products", mega: true },
    { label: "Perfume", path: "/products?category=perfume", mega: true },
    { label: "Gadgets", path: "/products?category=gadgets", mega: true },
    { label: "Sale 🔥", path: "/clearance", highlight: true },
    { label: "Track Order", path: "/profile" },
  ];

  return (
    <>
      {/* Announcement Bar — slim, black, orange highlights */}
      <div className="bg-[#0a0a0a] text-white text-center py-[7px] text-[10px] font-semibold tracking-[.14em] uppercase px-4">
        🚚 Nationwide Delivery &nbsp;·&nbsp; <span className="text-[#FF5A1F] font-bold">COD Available</span> &nbsp;·&nbsp; GCash · Maya · BDO · BPI
      </div>

      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-[#f0f0ef]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-10 flex h-[60px] items-center justify-between">

          {/* Logo */}
          <button onClick={() => setLocation("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 rounded-full" />
            <span className="font-black text-[16px] tracking-[.14em] text-[#0a0a0a] uppercase">{APP_TITLE}</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center h-full">
            {navLinks.map(link => (
              <div key={link.label} className="relative h-full flex items-center"
                onMouseEnter={() => link.mega ? openMega(link.label) : undefined}
                onMouseLeave={link.mega ? closeMega : undefined}>
                <button onClick={() => setLocation(link.path)}
                  className={`px-4 h-full flex items-center gap-1 text-[11.5px] font-bold tracking-[.08em] uppercase transition-colors border-b-2 ${
                    link.highlight ? "text-[#FF5A1F] border-transparent hover:text-[#e24b12]" :
                    location === link.path ? "text-[#0a0a0a] border-[#0a0a0a]" :
                    "text-[#8b8b88] border-transparent hover:text-[#0a0a0a]"
                  }`}>
                  {link.label}
                  {link.mega && <ChevronDown className="h-3 w-3 opacity-50" />}
                </button>

                {/* Mega Menu */}
                {link.mega && activeMega === link.label && megaMenus[link.label] && (
                  <div className="absolute top-[60px] left-0 bg-white border border-[#ececeb] shadow-[0_24px_60px_rgba(0,0,0,.12)] rounded-b-2xl p-8 min-w-[480px] z-50"
                    onMouseEnter={() => openMega(link.label)}
                    onMouseLeave={closeMega}>
                    <div className={`grid gap-8 ${megaMenus[link.label].cols.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {megaMenus[link.label].cols.map(col => (
                        <div key={col.title}>
                          <h4 className="text-[9.5px] font-black tracking-[.16em] uppercase text-[#FF5A1F] mb-3 pb-2 border-b border-[#f0f0ef]">{col.title}</h4>
                          {col.links.map(lnk => (
                            <button key={lnk} onClick={() => { setLocation(`/products?q=${encodeURIComponent(lnk)}`); setActiveMega(null); }}
                              className="block text-left text-[12.5px] text-[#6b6b68] hover:text-[#0a0a0a] py-1.5 w-full transition-colors font-medium">
                              {lnk}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-[#f0f0ef] flex justify-end">
                      <button onClick={() => { setLocation('/products'); setActiveMega(null); }}
                        className="text-[11px] text-[#FF5A1F] font-bold tracking-wide uppercase hover:opacity-80">
                        Shop All →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setSearchOpen(s => !s)} aria-label="Search"
              className="text-[#0a0a0a] hover:bg-[#f6f6f5] h-10 w-10 flex items-center justify-center rounded-full transition-colors">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button onClick={() => setLocation("/wishlist")} aria-label="Wishlist"
              className="text-[#0a0a0a] hover:bg-[#f6f6f5] h-10 w-10 hidden md:flex items-center justify-center rounded-full transition-colors">
              <Heart className="h-[18px] w-[18px]" />
            </button>
            <button onClick={() => setLocation("/cart")} aria-label="Cart"
              className="text-[#0a0a0a] hover:bg-[#f6f6f5] h-10 w-10 flex items-center justify-center rounded-full relative transition-colors">
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartItemCount > 0 && (
                <span className="absolute top-0.5 right-0 bg-[#FF5A1F] text-white text-[9px] font-black w-[16px] h-[16px] rounded-full flex items-center justify-center">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
            <button onClick={() => setLocation("/upload-payment")}
              className="hidden md:flex items-center bg-[#0a0a0a] text-white text-[10.5px] font-bold tracking-[.12em] uppercase px-5 h-9 ml-2 rounded-full hover:bg-[#262626] transition-colors">
              Pay Now
            </button>

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button aria-label="Menu" className="lg:hidden text-[#0a0a0a] h-10 w-10 flex items-center justify-center ml-0.5">
                  <Menu className="h-[21px] w-[21px]" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-white border-[#f0f0ef] p-0">
                <SheetHeader className="px-6 py-5 border-b border-[#f0f0ef]">
                  <SheetTitle className="text-[#0a0a0a] font-black tracking-[.14em] uppercase text-sm flex items-center gap-2">
                    <img src={APP_LOGO} alt="" className="h-6 w-6 rounded-full" /> {APP_TITLE}
                  </SheetTitle>
                </SheetHeader>
                <div className="py-3">
                  {navLinks.map(link => (
                    <button key={link.label} onClick={() => { setLocation(link.path); setMobileOpen(false); }}
                      className={`w-full text-left px-6 py-[15px] text-[14px] font-bold tracking-wide transition-colors border-b border-[#f7f7f6] ${
                        link.highlight ? 'text-[#FF5A1F]' : 'text-[#0a0a0a] active:bg-[#f6f6f5]'}`}>
                      {link.label}
                    </button>
                  ))}
                  <div className="px-6 pt-6 space-y-3">
                    <button onClick={() => { setLocation("/upload-payment"); setMobileOpen(false); }}
                      className="w-full bg-[#FF5A1F] text-white font-bold tracking-[.12em] uppercase text-xs py-3.5 rounded-full">
                      Upload Payment
                    </button>
                    <button onClick={() => { setLocation("/cart"); setMobileOpen(false); }}
                      className="w-full border-[1.5px] border-[#0a0a0a] text-[#0a0a0a] text-xs font-bold tracking-[.1em] uppercase py-3.5 rounded-full">
                      View Cart{cartItemCount > 0 ? ` (${cartItemCount})` : ""}
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="bg-white border-t border-[#f0f0ef] px-4 md:px-10 py-4 shadow-[0_18px_40px_rgba(0,0,0,.08)]">
            <form onSubmit={handleSearch} className="max-w-[640px] mx-auto flex gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b3b3b0]" />
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search sneakers, perfume, gadgets…" inputMode="search"
                  className="w-full bg-[#fafaf9] border-[1.5px] border-[#e6e6e4] pl-11 pr-4 py-3 text-sm text-[#0a0a0a] placeholder-[#b3b3b0] outline-none focus:border-[#0a0a0a] rounded-full transition-colors" />
              </div>
              <button type="submit" className="bg-[#0a0a0a] text-white px-5 text-xs font-bold tracking-[.1em] uppercase rounded-full hover:bg-[#262626]">Search</button>
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="text-[#b3b3b0] hover:text-[#0a0a0a] text-lg px-1.5">✕</button>
            </form>
            <div className="max-w-[640px] mx-auto mt-3 flex gap-2 flex-wrap">
              {["Air Jordan 1", "Nike Dunk Low", "Stan Smith", "Size 9"].map(s => (
                <button key={s} onClick={() => { setSearchQuery(s); setLocation(`/products?search=${encodeURIComponent(s)}`); setSearchOpen(false); }}
                  className="text-[11px] text-[#6b6b68] hover:text-[#FF5A1F] hover:border-[#FF5A1F] transition-colors px-3.5 py-1.5 border-[1.5px] border-[#e6e6e4] rounded-full font-semibold">
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
