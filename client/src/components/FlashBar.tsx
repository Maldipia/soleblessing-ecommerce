// ⚡ Flash sale announcement bar + homepage banner (Promotions module).
// Shows only while a banner-enabled campaign is live; prices themselves come
// from /api/inventory (server-applied) and are enforced again in sb_place_order.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type Flash = {
  name: string; endsAt: string; price: number | null; percent: number | null;
  origPrice: number; imageUrl: string; productName: string; sku: string; search: string;
};

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;

// one fetch per page load, shared by bar + banner
let flashPromise: Promise<Flash | null> | null = null;
function getFlash(): Promise<Flash | null> {
  if (!flashPromise) {
    flashPromise = fetch("/api/inventory?flash=1")
      .then(r => (r.ok ? r.json() : { flash: null }))
      .then(d => (d && d.flash ? d.flash : null))
      .catch(() => null);
  }
  return flashPromise;
}

function useCountdown(endsAt?: string) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(new Date(endsAt).getTime() - Date.now(), 0));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return left;
}
const two = (n: number) => String(n).padStart(2, "0");

export default function FlashBar() {
  const [location, setLocation] = useLocation();
  const [flash, setFlash] = useState<Flash | null>(null);
  useEffect(() => { getFlash().then(setFlash); }, []);
  const left = useCountdown(flash?.endsAt);
  if (!flash || left <= 0) return null;

  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  const go = () => setLocation(`/products?search=${encodeURIComponent(flash.search || flash.sku)}`);
  const flashPrice = flash.price || (flash.origPrice && flash.percent ? Math.floor(flash.origPrice * (100 - flash.percent) / 100) : 0);

  return (
    <>
      {/* top announcement bar — every public page */}
      <button onClick={go} className="w-full block text-left" data-testid="flash-bar">
        <div className="bg-gradient-to-r from-red-600 to-[#EA580C] text-white px-4 py-2 flex items-center gap-3 flex-wrap justify-center sm:justify-between">
          <span className="text-[12px] sm:text-[13px] font-black tracking-wide">
            ⚡ {flash.name.toUpperCase()} {flashPrice ? `— ${fmt(flashPrice)}` : flash.percent ? `— ${flash.percent}% OFF` : ""}
            <span className="hidden sm:inline font-bold opacity-90"> · while stocks last</span>
          </span>
          <span className="flex items-center gap-1 text-[13px] font-black tabular-nums">
            <span className="bg-black/25 rounded px-1.5 py-0.5">{two(h)}</span>:
            <span className="bg-black/25 rounded px-1.5 py-0.5">{two(m)}</span>:
            <span className="bg-black/25 rounded px-1.5 py-0.5">{two(s)}</span>
            <span className="ml-2 underline underline-offset-2 text-[11px]">SHOP NOW →</span>
          </span>
        </div>
      </button>

      {/* homepage banner card */}
      {location === "/" && (
        <div className="max-w-6xl mx-auto px-4 mt-4" data-testid="flash-home-banner">
          <button onClick={go} className="w-full text-left">
            <div className="bg-[#0d2430] rounded-2xl text-white flex items-center gap-4 p-4 hover:opacity-95 transition">
              {flash.imageUrl && <img src={flash.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover bg-white shrink-0" />}
              <div className="min-w-0">
                <p className="font-black text-sm sm:text-base truncate">⚡ {flash.name}: {flash.productName || flash.sku}</p>
                <p className="text-xs text-white/60 mt-0.5">
                  {flash.origPrice ? <span className="line-through mr-1">{fmt(flash.origPrice)}</span> : null}
                  {flashPrice ? <b className="text-white not-italic">{fmt(flashPrice)}</b> : `${flash.percent}% OFF`} · ends {new Date(flash.endsAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} · while stocks last
                </p>
              </div>
              <span className="ml-auto shrink-0 bg-[#EA580C] text-white text-[11px] font-black rounded-full px-4 py-2">SHOP NOW →</span>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
