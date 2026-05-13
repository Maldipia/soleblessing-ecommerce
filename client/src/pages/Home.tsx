import { useAuth } from "@/_core/hooks/useAuth";
import RecommendedProducts from "@/components/RecommendedProducts";
import NewArrivals from "@/components/NewArrivals";
import ClearanceSection from "@/components/ClearanceSection";
import LastPairSection from "@/components/LastPairSection";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { ShoppingCart, Search, ArrowRight, Star, Shield, Truck, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";

const HERO_SLIDES = [
  { label: "New Drop · Summer 2026", headline: ["LEGIT.", "FRESH.", "YOURS."], sub: "Authenticated branded sneakers, perfume & gadgets — shipped nationwide.", cta: "Shop New Drop", href: "/products?sort=newest", accent: "#C9A84C" },
  { label: "Clearance Sale · Up to 30% Off", headline: ["LAST", "PAIRS.", "GRAB NOW."], sub: "Limited stocks. Once it's gone — it's gone. COD available.", cta: "Shop Clearance", href: "/clearance", accent: "#E53935" },
  { label: "Fragrance Edit", headline: ["SCENT.", "PREMIUM.", "AFFORDABLE."], sub: "Lattafa, Armaf, Arabian Oud — authentic EDP from ₱899.", cta: "Shop Perfume", href: "/products?category=perfume", accent: "#C9A84C" },
];

const TRUST = [
  { icon: Shield, label: "100% Authentic", sub: "Every item verified" },
  { icon: Truck, label: "COD Nationwide", sub: "J&T · LBC · Lalamove" },
  { icon: RefreshCw, label: "7-Day Returns", sub: "Hassle-free policy" },
  { icon: Star, label: "4.9★ Rating", sub: "2,800+ reviews" },
];

const CATS = [
  { emoji: "👟", name: "Sneakers", sub: "200+ styles", href: "/products?category=sneakers", bg: "from-[#091821] to-[#0d2430]" },
  { emoji: "🌸", name: "Perfume", sub: "50+ fragrances", href: "/products?category=perfume", bg: "from-[#1a0810] to-[#2d1020]" },
  { emoji: "🎧", name: "Gadgets", sub: "30+ items", href: "/products?category=gadgets", bg: "from-[#0a1020] to-[#101828]" },
  { emoji: "🔥", name: "Sale", sub: "Up to 30% off", href: "/clearance", bg: "from-[#1a0000] to-[#2d0808]" },
];

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [slide, setSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const s = HERO_SLIDES[slide];

  return (
    <div className="min-h-screen bg-[#F7F4EF]">

      {/* HERO */}
      <section className="relative bg-[#050f12] min-h-[92vh] flex items-end overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_40%,rgba(13,100,80,.18),transparent)]" />
        {/* Big BG text */}
        <div className="absolute bottom-0 left-0 font-black text-white/[.025] leading-none select-none pointer-events-none" style={{ fontSize: "clamp(120px,18vw,260px)", fontFamily: "sans-serif", letterSpacing: "-.02em" }}>
          SOLEBLESSING
        </div>

        {/* Slide dots */}
        <div className="absolute top-8 right-10 flex gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className={`w-6 h-1 rounded-full transition-all ${i === slide ? "bg-[#C9A84C]" : "bg-white/20"}`} />
          ))}
        </div>

        {/* Legit badge */}
        <div className="absolute top-8 right-10 mt-8 z-10 hidden md:flex flex-col items-center border border-[#C9A84C]/20 px-4 py-3 mr-24">
          <span className="text-[9px] tracking-[.16em] text-white/30 uppercase">100%</span>
          <span className="text-xl font-black text-[#C9A84C] tracking-wider">LEGIT</span>
          <span className="text-[9px] tracking-[.16em] text-white/30 uppercase">Verified</span>
        </div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-8 md:px-16 pb-16 md:pb-20">
          <div className="grid md:grid-cols-2 gap-8 items-end">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-px bg-[#C9A84C]/50" />
                <span className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#C9A84C]">{s.label}</span>
              </div>
              <h1 className="font-black text-white leading-[.88] mb-6" style={{ fontSize: "clamp(52px,8vw,110px)", fontFamily: "sans-serif", letterSpacing: ".02em" }}>
                {s.headline.map((line, i) => (
                  <span key={i} className={i === 1 ? "text-[#C9A84C] italic" : ""}>{line}<br /></span>
                ))}
              </h1>
              <p className="text-sm text-white/45 leading-relaxed max-w-sm mb-8">{s.sub}</p>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => setLocation(s.href)} className="bg-[#C9A84C] text-[#050f12] px-8 py-3.5 text-xs font-bold tracking-[.12em] uppercase hover:opacity-90 transition-opacity flex items-center gap-2">
                  {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setLocation("/upload-payment")} className="border border-white/15 text-white/60 px-8 py-3.5 text-xs font-medium tracking-[.1em] uppercase hover:border-white/35 hover:text-white transition-all">
                  Upload Payment
                </button>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end gap-6">
              <div className="flex gap-6">
                {[{ n: "10K+", l: "Orders" }, { n: "4.9★", l: "Rating" }, { n: "500+", l: "SKUs" }].map(s => (
                  <div key={s.l} className="text-center">
                    <div className="text-3xl font-black text-white tracking-wide">{s.n}</div>
                    <div className="text-[10px] tracking-[.12em] uppercase text-white/30 mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-white/25 text-[10px] tracking-[.12em] uppercase">
                <div className="w-8 h-px bg-white/15" />
                Scroll to shop
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-10 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          {TRUST.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#050f12]/5 flex items-center justify-center">
                <Icon className="h-4 w-4 text-[#0d2430]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#0d2430]">{label}</div>
                <div className="text-[10px] text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MARQUEE */}
      <div className="bg-[#050f12] py-3 overflow-hidden border-t border-white/[.04]">
        <div className="flex gap-0 whitespace-nowrap" style={{ animation: "marquee 28s linear infinite" }}>
          {["Authentic & Verified", "✦", "Adidas · Nike · Jordan", "✦", "COD Nationwide", "✦", "GCash · Maya · BDO · BPI", "✦", "Free Shipping ₱3K+", "✦", "Authentic & Verified", "✦", "Adidas · Nike · Jordan", "✦", "COD Nationwide", "✦", "GCash · Maya · BDO · BPI", "✦", "Free Shipping ₱3K+", "✦"].map((t, i) => (
            <span key={i} className={`text-[13px] font-bold tracking-[.2em] uppercase px-8 ${t === "✦" ? "text-[#C9A84C]" : "text-white/15"}`}>{t}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>

      {/* NEW ARRIVALS */}
      <section className="py-16 px-6 md:px-10 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-2">Just Landed</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#0d2430] leading-none tracking-tight">New Arrivals</h2>
          </div>
          <Link href="/products?sort=newest" className="text-xs font-semibold tracking-[.1em] uppercase text-[#0d2430] border-b border-[#0d2430] pb-0.5 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-colors">
            View All
          </Link>
        </div>
        <NewArrivals />
      </section>

      {/* CATEGORY GRID */}
      <section className="px-6 md:px-10 pb-16 max-w-[1400px] mx-auto">
        <div className="mb-10">
          <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-2">Browse</p>
          <h2 className="text-4xl md:text-5xl font-black text-[#0d2430] leading-none tracking-tight">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CATS.map(c => (
            <button key={c.name} onClick={() => setLocation(c.href)}
              className={`relative bg-gradient-to-br ${c.bg} overflow-hidden group cursor-pointer text-left`} style={{ minHeight: 200 }}>
              <div className="absolute right-3 top-3 text-6xl opacity-10 group-hover:opacity-18 transition-opacity">{c.emoji}</div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[.04] transition-colors" />
              <div className="relative p-5 flex flex-col justify-end h-full">
                <div className="text-[9px] font-semibold tracking-[.14em] uppercase text-white/35 mb-1.5">{c.sub}</div>
                <div className="text-2xl font-black text-white tracking-wide leading-none">{c.name}</div>
              </div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border border-white/15 rounded-full flex items-center justify-center text-white text-sm group-hover:bg-[#C9A84C] group-hover:border-[#C9A84C] transition-all">→</div>
            </button>
          ))}
        </div>
      </section>

      {/* BEST SELLERS / RECOMMENDED */}
      <section className="bg-[#050f12] py-16 px-6 md:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-2">Customer Faves</p>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tight">Best Sellers</h2>
            </div>
            <Link href="/products" className="text-xs font-semibold tracking-[.1em] uppercase text-white/40 border-b border-white/20 pb-0.5 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-colors">
              Shop All
            </Link>
          </div>
          <RecommendedProducts />
        </div>
      </section>

      {/* LAST PAIRS */}
      <section className="py-16 px-6 md:px-10 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-2">Grab Before They're Gone</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#0d2430] leading-none tracking-tight">Last Pairs</h2>
          </div>
          <Link href="/products?filter=lastpair" className="text-xs font-semibold tracking-[.1em] uppercase text-[#0d2430] border-b border-[#0d2430] pb-0.5 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-colors">
            View All
          </Link>
        </div>
        <LastPairSection />
      </section>

      {/* CLEARANCE */}
      <section className="bg-[#1a0000] py-16 px-6 md:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] uppercase text-red-400 mb-2">Up to 30% Off</p>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tight">Clearance Sale</h2>
            </div>
            <Link href="/clearance" className="text-xs font-semibold tracking-[.1em] uppercase text-red-400 border-b border-red-400/50 pb-0.5 hover:border-red-300 hover:text-red-300 transition-colors">
              Shop Sale
            </Link>
          </div>
          <ClearanceSection />
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="bg-[#F7F4EF] py-16 px-6 md:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-2">Real Buyers · Real Reviews</p>
              <h2 className="text-4xl font-black text-[#0d2430] leading-none tracking-tight">What They're Saying</h2>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-[#0d2430]">4.9</div>
              <div className="text-[#C9A84C] text-sm">★★★★★</div>
              <div className="text-[10px] text-gray-400 mt-0.5">2,800+ reviews</div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Rhea M., Cavite", text: "Legit talaga! Ang ganda ng Samba, exactly as shown. Dumating in 2 days via J&T. Will order again!", product: "Adidas Samba OG" },
              { name: "Nico R., Manila", text: "Best online shop for sneakers sa Pinas. COD option is perfect, packaging solid, 100% authentic.", product: "Nike Dunk Low" },
              { name: "Trish L., Batangas", text: "Ang bango ng Khamrah! Sulit na sulit. Mabilis din ang GCash payment verification nila.", product: "Lattafa Khamrah EDP" },
            ].map(r => (
              <div key={r.name} className="bg-white p-6 border border-gray-100">
                <div className="text-[#C9A84C] text-sm mb-3">★★★★★</div>
                <p className="text-sm text-gray-600 italic leading-relaxed mb-4">"{r.text}"</p>
                <div className="text-xs font-bold tracking-wide text-[#0d2430]">{r.name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">✓ Verified · {r.product}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMAIL CAPTURE */}
      <section className="bg-[#050f12] py-20 px-6 md:px-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative z-10 max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[.22em] uppercase text-[#C9A84C] mb-4">Join the Community</p>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tight mb-4">GET DROP<br />ALERTS FIRST</h2>
          <p className="text-sm text-white/35 italic mb-8">New stock · Exclusive deals · Restocks — straight to you</p>
          {emailSent ? (
            <div className="text-[#C9A84C] font-semibold tracking-wide">✓ You're in! Watch your inbox.</div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setEmailSent(true); }} className="flex max-w-sm mx-auto">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
                className="flex-1 bg-white/[.06] border border-white/10 border-r-0 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#C9A84C] transition-colors" />
              <button type="submit" className="bg-[#C9A84C] text-[#050f12] px-5 text-xs font-bold tracking-[.12em] uppercase hover:opacity-90">
                Join
              </button>
            </form>
          )}
          <p className="text-[10px] text-white/15 mt-4 tracking-wide">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

    </div>
  );
}
