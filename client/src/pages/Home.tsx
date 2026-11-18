// SB2.0 homepage — photo-led hero, image category cards, editorial sections.
// Same data sources and routes as before; visual layer only.
import RecommendedProducts from "@/components/RecommendedProducts";
import NewArrivals from "@/components/NewArrivals";
import ClearanceSection from "@/components/ClearanceSection";
import LastPairSection from "@/components/LastPairSection";
import { useInventory } from "@/hooks/useInventory";
import { ArrowRight, Shield, Truck, MessageCircle, Lock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";

// Pairs whose photos lead the hero / category art, with graceful fallbacks.
const HERO_SKUS = ["CZ0790106", "553558163", "FN8927621"];

const TRUST = [
  { icon: Shield, label: "100% Authentic", sub: "Every pair verified" },
  { icon: Truck, label: "COD Nationwide", sub: "J&T · LBC · Lalamove" },
  { icon: MessageCircle, label: "Real human support", sub: "Message us on Facebook" },
  { icon: Lock, label: "Safe payments", sub: "GCash · Maya · BDO · BPI" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: inv } = useInventory();
  const [slide, setSlide] = useState(0);

  // hero + category artwork straight from live inventory photos
  const art = useMemo(() => {
    const bySku = (k: string) => inv?.find((i: any) => String(i.sku || "").replace(/\s/g, "").toUpperCase() === k && i.imageUrl)?.imageUrl;
    const firstWith = (f: (i: any) => boolean) => inv?.find((i: any) => i.imageUrl && f(i))?.imageUrl;
    return {
      hero: bySku(HERO_SKUS[0]) || firstWith(() => true),
      hero2: bySku(HERO_SKUS[1]) || firstWith((i: any) => i.discount > 0),
      sneakers: bySku("IG5535") || firstWith((i: any) => (i.brand || "").toLowerCase().includes("adidas")),
      sale: bySku("FQ8108110") || firstWith((i: any) => i.discount >= 25),
    };
  }, [inv]);

  const SLIDES = [
    {
      img: () => art.hero, label: "Air Jordan · New Drop",
      headline: ["LEGIT.", "FRESH.", "YOURS."],
      sub: "Discover your next everyday sneaker — authenticated and shipped nationwide.",
      cta: "Shop Now", href: "/products?sort=newest", ctaClass: "bg-white text-[#0a0a0a]",
    },
    {
      img: () => art.hero2, label: "Clearance · Up to 50% Off",
      headline: ["LAST", "PAIRS.", "GRAB NOW."],
      sub: "Limited stocks — once it's gone, it's gone. COD available.",
      cta: "Shop Sale", href: "/clearance", ctaClass: "bg-[#FF5A1F] text-white",
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const s = SLIDES[slide];
  const heroImg = s.img();

  return (
    <div className="min-h-screen bg-white">

      {/* HERO — full-bleed product photo */}
      <section className="relative bg-[#0a0a0a] min-h-[560px] md:min-h-[82vh] flex items-end overflow-hidden">
        {heroImg && (
          <img src={heroImg} alt="" key={heroImg}
            className="absolute inset-0 w-full h-full object-cover opacity-[.82]"
            style={{ animation: "heroIn .9s ease both" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/30" />

        {/* Slide dots */}
        <div className="absolute top-6 right-6 flex gap-2 z-10">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === slide ? "bg-[#FF5A1F] w-7" : "bg-white/30 w-4"}`} />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-5 md:px-16 pb-12 md:pb-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-px bg-[#FF5A1F]" />
            <span className="text-[10px] font-black tracking-[.28em] uppercase text-[#FF5A1F]">{s.label}</span>
          </div>
          <h1 className="font-black text-white leading-[.95] mb-5 tracking-[-.01em]" style={{ fontSize: "clamp(44px,7.5vw,104px)" }}>
            {s.headline.map((line, i) => <span key={i}>{line}<br /></span>)}
          </h1>
          <p className="text-[13.5px] md:text-sm text-white/75 leading-relaxed max-w-sm mb-7">{s.sub}</p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setLocation(s.href)}
              className={`${s.ctaClass} px-9 py-4 text-xs font-black tracking-[.14em] uppercase rounded-full hover:opacity-90 transition-opacity flex items-center gap-2`}>
              {s.cta} <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setLocation("/upload-payment")}
              className="border-[1.5px] border-white/40 text-white px-8 py-4 text-xs font-bold tracking-[.12em] uppercase rounded-full hover:bg-white hover:text-[#0a0a0a] transition-all">
              Upload Payment
            </button>
          </div>
        </div>
        <style>{`@keyframes heroIn{0%{transform:scale(1.06);opacity:0}100%{transform:scale(1);opacity:.82}}`}</style>
      </section>

      {/* MARQUEE */}
      <div className="bg-[#0a0a0a] py-2.5 overflow-hidden">
        <div className="flex gap-0 whitespace-nowrap" style={{ animation: "marquee 28s linear infinite" }}>
          {["Authentic & Verified", "✦", "Adidas · Nike · Jordan", "✦", "COD Nationwide", "✦", "GCash · Maya · BDO · BPI", "✦", "Ships Nationwide 🇵🇭", "✦", "Authentic & Verified", "✦", "Adidas · Nike · Jordan", "✦", "COD Nationwide", "✦", "GCash · Maya · BDO · BPI", "✦", "Ships Nationwide 🇵🇭", "✦"].map((t, i) => (
            <span key={i} className={`text-[12px] font-black tracking-[.2em] uppercase px-8 ${t === "✦" ? "text-[#FF5A1F]" : "text-white/25"}`}>{t}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>

      {/* SHOP BY CATEGORY — image-led */}
      <section className="px-5 md:px-10 pt-12 md:pt-16 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-7">
          <h2 className="text-[26px] md:text-4xl font-black text-[#0a0a0a] leading-none tracking-[-.01em]">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "Sneakers", sub: "1,400+ pairs", href: "/products", img: art.sneakers },
            { name: "Sale 🔥", sub: "Up to 50% off", href: "/clearance", img: art.sale, orange: true },
            { name: "Perfume", sub: "Authentic EDP", href: "/products?category=perfume", emoji: "🌸" },
            { name: "Gadgets", sub: "Earbuds & more", href: "/products?category=gadgets", emoji: "🎧" },
          ].map(c => (
            <button key={c.name} onClick={() => setLocation(c.href)}
              className="relative rounded-2xl overflow-hidden group cursor-pointer text-left bg-[#141414] h-[120px] md:h-[170px]">
              {c.img
                ? <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 group-hover:scale-[1.04] transition-all duration-500" loading="lazy" />
                : <div className="absolute right-3 top-2 text-6xl opacity-15">{c.emoji}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="relative p-4 flex flex-col justify-end h-full">
                <div className={`text-[9px] font-bold tracking-[.14em] uppercase mb-1 ${c.orange ? "text-[#FF5A1F]" : "text-white/60"}`}>{c.sub}</div>
                <div className="text-lg md:text-xl font-black text-white tracking-wide leading-none">{c.name}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="py-12 md:py-16 px-5 md:px-10 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[10px] font-black tracking-[.2em] uppercase text-[#FF5A1F] mb-1.5">Just Landed</p>
            <h2 className="text-[26px] md:text-4xl font-black text-[#0a0a0a] leading-none tracking-[-.01em]">New Arrivals</h2>
          </div>
          <Link href="/products?sort=newest" className="text-[11px] font-black tracking-[.1em] uppercase text-[#FF5A1F] hover:opacity-70 transition-opacity whitespace-nowrap">
            View all →
          </Link>
        </div>
        <NewArrivals />
      </section>

      {/* BEST SELLERS — dark band */}
      <section className="bg-[#0a0a0a] py-12 md:py-16 px-5 md:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] font-black tracking-[.2em] uppercase text-[#FF5A1F] mb-1.5">Customer Faves</p>
              <h2 className="text-[26px] md:text-4xl font-black text-white leading-none tracking-[-.01em]">Best Sellers</h2>
            </div>
            <Link href="/products" className="text-[11px] font-black tracking-[.1em] uppercase text-white/60 hover:text-[#FF5A1F] transition-colors whitespace-nowrap">
              Shop all →
            </Link>
          </div>
          <RecommendedProducts />
        </div>
      </section>

      {/* LAST PAIRS */}
      <section className="py-12 md:py-16 px-5 md:px-10 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[10px] font-black tracking-[.2em] uppercase text-[#FF5A1F] mb-1.5">Grab Before They're Gone</p>
            <h2 className="text-[26px] md:text-4xl font-black text-[#0a0a0a] leading-none tracking-[-.01em]">Last Pairs 🔥</h2>
          </div>
          <Link href="/products?filter=lastpair" className="text-[11px] font-black tracking-[.1em] uppercase text-[#FF5A1F] hover:opacity-70 transition-opacity whitespace-nowrap">
            View all →
          </Link>
        </div>
        <LastPairSection />
      </section>

      {/* CLEARANCE strip */}
      <section className="bg-[#f6f6f5] py-12 md:py-16 px-5 md:px-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] font-black tracking-[.2em] uppercase text-[#FF5A1F] mb-1.5">Up to 50% Off</p>
              <h2 className="text-[26px] md:text-4xl font-black text-[#0a0a0a] leading-none tracking-[-.01em]">Clearance Sale</h2>
            </div>
            <Link href="/clearance" className="text-[11px] font-black tracking-[.1em] uppercase text-[#FF5A1F] hover:opacity-70 transition-opacity whitespace-nowrap">
              Shop sale →
            </Link>
          </div>
          <ClearanceSection />
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-12 md:py-16 px-5 md:px-10 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[10px] font-black tracking-[.2em] uppercase text-[#FF5A1F] mb-1.5">Real Buyers · Real Reviews</p>
            <h2 className="text-[26px] md:text-4xl font-black text-[#0a0a0a] leading-none tracking-[-.01em]">What They're Saying</h2>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-[#0a0a0a] leading-none">4.9</div>
            <div className="text-[#FF5A1F] text-xs">★★★★★</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { name: "Rhea M., Cavite", text: "Legit talaga! Ang ganda ng pair, exactly as shown. Dumating in 2 days via J&T. Will order again!", product: "Adidas Samba OG" },
            { name: "Nico R., Manila", text: "Best online shop for sneakers sa Pinas. COD option is perfect, packaging solid, 100% authentic.", product: "Nike Dunk Low" },
            { name: "Trish L., Batangas", text: "Smooth transaction! Mabilis ang GCash payment verification nila at ang bilis mag-reply.", product: "Air Jordan 1 Low" },
          ].map(r => (
            <div key={r.name} className="bg-white p-6 border border-[#f0f0ef] rounded-2xl">
              <div className="text-[#FF5A1F] text-sm mb-3">★★★★★</div>
              <p className="text-[13px] text-[#555] leading-relaxed mb-4">"{r.text}"</p>
              <div className="text-xs font-black tracking-wide text-[#0a0a0a]">{r.name}</div>
              <div className="text-[10px] text-[#9b9b98] mt-0.5">✓ Verified · {r.product}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY SOLEBLESSING */}
      <section className="px-5 md:px-10 pb-14 max-w-[1400px] mx-auto">
        <h2 className="text-[26px] md:text-4xl font-black text-[#0a0a0a] leading-none tracking-[-.01em] mb-7">Why SoleBlessing</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TRUST.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-[#f6f6f5] rounded-2xl p-5">
              <Icon className="h-5 w-5 text-[#0a0a0a] mb-3" />
              <div className="text-[12.5px] font-black text-[#0a0a0a] leading-snug">{label}</div>
              <div className="text-[10.5px] text-[#8b8b88] mt-1">{sub}</div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
