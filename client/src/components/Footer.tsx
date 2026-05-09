import { Link } from "wouter";
import { Facebook, Instagram, Mail } from "lucide-react";
import { APP_TITLE } from "@/const";

export default function Footer() {
  return (
    <footer className="bg-[#050f12] text-white/40 border-t border-white/[.06]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <div className="text-white font-black text-2xl tracking-[.15em] uppercase mb-3 flex items-center gap-1">
              {APP_TITLE}<span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full mb-4 ml-0.5" />
            </div>
            <p className="text-[12px] text-white/30 italic leading-relaxed mb-5">
              "Legit. Fresh. Yours."<br />
              Authenticated sneakers, perfume &amp;<br />gadgets — shipped across the Philippines.
            </p>
            <div className="flex gap-2.5">
              {[
                { icon: Facebook, href: "https://facebook.com/soleblessing" },
                { icon: Instagram, href: "https://instagram.com/soleblessing" },
                { icon: Mail, href: "mailto:soleblessing@gmail.com" },
              ].map(({ icon: Icon, href }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 border border-white/10 flex items-center justify-center text-white/30 hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all">
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: "Shop", links: [
              { label: "New Arrivals", href: "/products?sort=newest" },
              { label: "Sneakers", href: "/products?category=sneakers" },
              { label: "Perfume", href: "/products?category=perfume" },
              { label: "Gadgets", href: "/products?category=gadgets" },
              { label: "Clearance Sale", href: "/clearance" },
              { label: "All Products", href: "/products" },
            ]},
            { title: "Help", links: [
              { label: "Track Your Order", href: "/profile" },
              { label: "Upload Payment", href: "/upload-payment" },
              { label: "Size Guide", href: "/products" },
              { label: "Shipping Info", href: "/shipping-policy" },
              { label: "Returns Policy", href: "/returns-policy" },
              { label: "Privacy Policy", href: "/privacy-policy" },
            ]},
            { title: "SoleBlessing", links: [
              { label: "About Us", href: "/" },
              { label: "Authenticity Guarantee", href: "/" },
              { label: "Loyalty Rewards", href: "/loyalty" },
              { label: "Raffles", href: "/raffles" },
              { label: "Sale Events", href: "/sale-events" },
              { label: "Terms of Service", href: "/terms-of-service" },
            ]},
          ].map(col => (
            <div key={col.title}>
              <h5 className="text-[9.5px] font-bold tracking-[.16em] uppercase text-[#C9A84C] mb-4">{col.title}</h5>
              {col.links.map(l => (
                <Link key={l.label} href={l.href}
                  className="block text-[12.5px] text-white/35 hover:text-white transition-colors py-1.5">
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-white/[.06] pt-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-[10.5px] text-white/20">
            © 2026 SoleBlessing Official · TYG Services · Amadeo, Cavite 🇵🇭
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["GCash", "Maya", "COD", "BDO", "BPI", "Visa/MC", "J&T", "LBC", "Lalamove"].map(m => (
              <span key={m} className="bg-white/[.04] border border-white/[.06] px-2.5 py-1 text-[9.5px] font-semibold tracking-wide text-white/30">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
