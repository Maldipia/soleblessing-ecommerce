// SB2.0 — website invoice: the site's own branded, printable invoice page
// (/invoice/:orderNumber). The GAS Google-Sheet invoice stays as the internal
// archive copy; customers and the admin open this page instead.
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Printer } from "lucide-react";

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

export default function Invoice() {
  const [, params] = useRoute("/invoice/:orderNumber");
  const orderNumber = params?.orderNumber || "";
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/track-order?order_number=${encodeURIComponent(orderNumber)}`);
        const d = await r.json();
        const o = Array.isArray(d) ? d[0] : d;
        if (!r.ok || !o || !o.order_number) throw new Error("not found");
        setOrder(o);
      } catch { setErr("Invoice not found — check the order number."); }
    })();
  }, [orderNumber]);

  if (err) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <p className="text-sm font-semibold text-[#8b8b88]">{err}</p>
    </div>
  );
  if (!order) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm font-semibold text-[#9b9b98]">Loading invoice…</p>
    </div>
  );

  const paid = order.payment_status === "verified";
  const cod = order.payment_method === "cod";
  const items = order.items || [];

  return (
    <div className="min-h-screen bg-[#f6f6f5] print:bg-white py-6 md:py-10 px-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } body { background: #fff } }`}</style>
      <div className="max-w-2xl mx-auto">
        {/* actions */}
        <div className="no-print flex justify-end mb-3">
          <button onClick={() => { try { window.print(); } catch {} }}
            className="flex items-center gap-2 bg-[#0a0a0a] text-white px-5 py-2.5 text-[11px] font-black tracking-[.1em] uppercase rounded-full hover:bg-[#262626]">
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl print:rounded-none border border-[#f0f0ef] print:border-0 overflow-hidden">
          {/* head */}
          <div className="bg-[#0a0a0a] px-6 md:px-8 py-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo-soleblessing.png" alt="SoleBlessing" className="w-11 h-11 rounded-full bg-white/10 object-contain" />
              <div>
                <p className="text-white font-black tracking-[.14em] text-[15px]">SOLEBLESSING</p>
                <p className="text-white/50 text-[10px] font-semibold">Legit. Fresh. Yours. · Amadeo, Cavite 🇵🇭</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black tracking-[.2em] uppercase text-white/40">Invoice</p>
              <p className="text-white font-black text-[15px]">{order.order_number}</p>
              <p className="text-white/50 text-[10.5px] font-semibold">{fmtDate(order.created_at)}</p>
            </div>
          </div>

          <div className="px-6 md:px-8 py-6">
            {/* status + billed to */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div>
                <p className="text-[9.5px] font-black tracking-[.18em] uppercase text-[#9b9b98] mb-1.5">Billed To</p>
                <p className="text-[14px] font-black text-[#0a0a0a]">{order.customer_name}</p>
                <p className="text-[12px] text-[#555] font-semibold leading-relaxed">
                  {order.shipping_address}<br />
                  {order.contact_number}{order.customer_email ? <> · {order.customer_email}</> : null}
                </p>
              </div>
              <span className={`text-[10px] font-black tracking-[.1em] uppercase px-3.5 py-2 rounded-full ${
                paid ? "bg-[#e8f5ee] text-[#1a7f4e]" : cod ? "border-[1.5px] border-[#0a0a0a] text-[#0a0a0a]" : "bg-[#fff7f3] text-[#FF5A1F]"}`}>
                {paid ? "✓ Paid" : cod ? "Cash on Delivery" : "Awaiting Payment"}
              </span>
            </div>

            {/* items */}
            <div className="border-t border-[#f0f0ef]">
              {items.map((it: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f6f6f5]">
                  <div className="w-12 h-12 rounded-lg bg-[#f6f6f5] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="opacity-30">👟</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0a0a0a] leading-tight">{it.name}</p>
                    <p className="text-[10.5px] text-[#9b9b98] font-semibold">{it.size ? `Size ${it.size} · ` : ""}×{it.qty || 1}{it.sku ? ` · ${it.sku}` : ""}</p>
                  </div>
                  <span className="text-[13px] font-black text-[#0a0a0a]">{fmt((it.price || 0) * (it.qty || 1))}</span>
                </div>
              ))}
            </div>

            {/* totals */}
            <div className="pt-4 space-y-1.5">
              <div className="flex justify-between text-[12.5px] font-semibold text-[#555]">
                <span>Subtotal</span><span>{fmt(order.subtotal ?? items.reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0))}</span>
              </div>
              <div className="flex justify-between text-[12.5px] font-semibold text-[#555]">
                <span>Shipping</span><span>{(order.shipping_fee || 0) === 0 ? <span className="text-[#1a7f4e] font-black">FREE</span> : fmt(order.shipping_fee)}</span>
              </div>
              {(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-[12.5px] font-black text-[#1a7f4e]">
                  <span>Discount{order.promo_code ? ` (${order.promo_code})` : ""}</span><span>−{fmt(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline border-t-2 border-[#0a0a0a] pt-2.5 mt-2">
                <span className="text-[13px] font-black text-[#0a0a0a] uppercase tracking-[.08em]">Total</span>
                <span className="text-[24px] font-black text-[#0a0a0a]">{fmt(order.total)}</span>
              </div>
              <div className="flex justify-between text-[11.5px] font-semibold text-[#8b8b88] pt-1">
                <span>Payment Method</span>
                <span className="font-black text-[#0a0a0a] capitalize">{String(order.payment_method || "").replace(/_/g, " ")}</span>
              </div>
              {order.payment_reference && (
                <div className="flex justify-between text-[11.5px] font-semibold text-[#8b8b88]">
                  <span>Reference No.</span><span className="font-black text-[#0a0a0a] font-mono">{order.payment_reference}</span>
                </div>
              )}
              {order.courier && order.tracking_reference && (
                <div className="flex justify-between text-[11.5px] font-semibold text-[#8b8b88]">
                  <span>Shipping</span><span className="font-black text-[#0a0a0a]">{order.courier} · <span className="font-mono">{order.tracking_reference}</span></span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#f6f6f5] print:bg-white px-6 md:px-8 py-4 text-center">
            <p className="text-[10.5px] text-[#9b9b98] font-semibold">
              Salamat sa pag-shop, {String(order.customer_name || "").split(/\s+/)[0]}! 🙏 · soleblessingofficial.com · © {new Date().getFullYear()} TYG Services
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
