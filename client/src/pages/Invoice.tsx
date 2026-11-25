// SB2.0 — website invoice: the site's own branded, printable invoice page
// (/invoice/:orderNumber and the secure /invoice/t/:token customer link).
// Layout per Pia's approved "Invoice Payment Portal" mockup (Nov 25): header
// band, invoice meta strip, order summary table, payment instructions +
// upload-proof panel, support footer. The GAS Google-Sheet invoice stays as
// the internal archive copy; customers and the admin open this page instead.
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Printer, FileText, Clock, CreditCard, Upload, Headphones, ShoppingCart, Landmark } from "lucide-react";

const fmt = (c: number) => `₱${((c || 0) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

export default function Invoice() {
  const [, params] = useRoute("/invoice/:orderNumber");
  const [, tparams] = useRoute("/invoice/t/:token");
  const accessToken = tparams?.token || "";
  const orderNumber = accessToken ? "" : (params?.orderNumber || "");
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const q = accessToken ? `token=${encodeURIComponent(accessToken)}` : `order_number=${encodeURIComponent(orderNumber)}`;
        const r = await fetch(`/api/track-order?${q}`);
        if (r.status === 410) { setExpired(true); return; }
        const d = await r.json();
        const o = Array.isArray(d) ? d[0] : d;
        if (!r.ok || !o || !o.order_number) throw new Error("not found");
        setOrder(o);
      } catch { setErr("Invoice not found — check the order number."); }
    })();
  }, [orderNumber, accessToken]);

  if (expired) return (
    <div className="min-h-screen bg-[#f6f6f5] flex items-center justify-center px-6">
      <div className="max-w-[420px] w-full bg-white rounded-3xl border border-[#ececea] p-8 text-center shadow-sm">
        <img src="/sb-logo.jpg" alt="SoleBlessing" className="w-14 h-14 rounded-full mx-auto mb-4 object-contain" />
        <p className="text-[13px] font-black uppercase tracking-[.12em] text-[#0a0a0a] mb-2">This invoice link has expired</p>
        <p className="text-[12px] text-[#6b6b68] font-semibold leading-relaxed mb-4">
          For your security, invoice links are valid for a limited time. Your order is safe —
          just message us on Facebook/Messenger and we'll send you a fresh link right away.
        </p>
        <a href="https://www.facebook.com/soleblessingofficial" className="block bg-[#0a0a0a] text-white py-3 rounded-xl text-[12px] font-black tracking-[.08em] uppercase">Message Us for a New Link</a>
      </div>
    </div>
  );
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
  const submitted = order.payment_status === "submitted";
  const reupload = order.payment_status === "reupload";
  const preorder = String(order.payment_method || "").toUpperCase() === "PRE-ORDER";
  const items = order.items || [];
  // Upload link AUTO-FILLS order reference, name and amount — the customer
  // never retypes them on the payment portal.
  const payUrl = `/upload-payment?order=${encodeURIComponent(order.order_number)}&name=${encodeURIComponent(order.customer_name || "")}&amount=${encodeURIComponent(String(Math.round((order.total || 0) / 100)))}`;
  const expiresAt = order.invoice_access?.expires_at;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="min-h-screen bg-[#f6f6f5] print:bg-white py-6 md:py-10 px-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } body { background: #fff } }`}</style>
      <div className="max-w-3xl mx-auto">
        {/* actions */}
        <div className="no-print flex justify-end mb-3">
          <button onClick={() => { try { window.print(); } catch {} }}
            className="flex items-center gap-2 bg-[#0a0a0a] text-white px-5 py-2.5 text-[11px] font-black tracking-[.1em] uppercase rounded-full hover:bg-[#262626]">
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl print:rounded-none border border-[#f0f0ef] print:border-0 overflow-hidden">
          {/* ── brand header band ── */}
          <div className="bg-[#0a0a0a] px-6 md:px-8 py-5 flex items-center gap-4">
            <img src="/sb-logo.jpg" alt="SoleBlessing" className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 object-contain flex-shrink-0" />
            <div className="border-l border-white/20 pl-4">
              <p className="text-white font-black text-[22px] md:text-[26px] leading-tight">SoleBlessing</p>
              <p className="text-white/60 text-[10px] md:text-[11px] font-bold tracking-[.28em] uppercase">Sneakers · Apparel · Lifestyle</p>
            </div>
          </div>

          <div className="px-5 md:px-8 py-6">
            {/* ── Invoice title + deadline pill ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="flex items-start gap-3">
                <FileText className="h-10 w-10 text-[#0a0a0a] mt-1" strokeWidth={1.8} />
                <div>
                  <h1 className="text-[30px] md:text-[34px] font-black text-[#0a0a0a] leading-none">Invoice</h1>
                  <p className="text-[12px] text-[#6b6b68] font-semibold mt-1.5">Please review your order and complete your payment.</p>
                </div>
              </div>
              {paid ? (
                <div className="flex items-center gap-2.5 bg-[#e8f5ee] rounded-xl px-4 py-3">
                  <span className="text-[#1a7f4e] text-[18px]">✓</span>
                  <p className="text-[13px] font-black text-[#1a7f4e]">Payment Received — Thank You!</p>
                </div>
              ) : cod ? (
                <div className="flex items-center gap-2.5 bg-[#f4f4f3] rounded-xl px-4 py-3">
                  <p className="text-[13px] font-black text-[#0a0a0a]">Cash on Delivery</p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-4 py-2.5">
                  <Clock className="h-6 w-6 text-[#EA580C]" strokeWidth={2} />
                  <div className="leading-tight">
                    <p className="text-[12.5px] font-black text-[#0a0a0a]">Pay &amp; Upload Proof Within</p>
                    <p className="text-[17px] font-black text-[#EA580C]">{daysLeft != null ? `${daysLeft} Day${daysLeft === 1 ? "" : "s"}` : "7 Days"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── meta strip ── */}
            <div className="bg-[#f6f6f5] rounded-xl px-4 py-3.5 grid grid-cols-2 md:grid-cols-4 gap-y-3 mb-6">
              {[
                ["Invoice No.", order.invoice_no || order.order_number, false],
                ["Order No.", order.order_number, false],
                ["Date Issued", fmtDate(order.created_at), false],
                expiresAt
                  ? ["Link Expires On", fmtDate(expiresAt), true]
                  : ["Status", paid ? "Paid" : submitted ? "Under Review" : reupload ? "New Proof Needed" : preorder ? "Awaiting Full Payment" : cod ? "COD" : "Awaiting Payment", true],
              ].map(([k, v, hot]: any, i) => (
                <div key={i} className={`px-2 ${i > 0 ? "md:border-l md:border-[#e4e4e2]" : ""}`}>
                  <p className="text-[10.5px] font-semibold text-[#8b8b88] mb-0.5">{k}</p>
                  <p className={`text-[14px] md:text-[15px] font-black break-all ${hot ? "text-[#EA580C]" : "text-[#0a0a0a]"}`}>{v}</p>
                </div>
              ))}
            </div>

            {/* ── order summary ── */}
            <div className="flex items-center gap-2.5 mb-3">
              <ShoppingCart className="h-5 w-5 text-[#EA580C]" strokeWidth={2.2} />
              <h2 className="text-[17px] font-black text-[#0a0a0a]">Order Summary</h2>
            </div>
            <div className="rounded-xl border border-[#f0f0ef] overflow-hidden mb-2">
              <div className="hidden md:grid grid-cols-[1fr_72px_56px_108px_108px] gap-2 bg-[#f6f6f5] px-4 py-2.5 text-[11px] font-black text-[#555]">
                <span>Item</span><span className="text-center">Size</span><span className="text-center">Qty</span><span className="text-right">Unit Price</span><span className="text-right">Amount</span>
              </div>
              {items.map((it: any, i: number) => (
                <div key={i} className="grid md:grid-cols-[1fr_72px_56px_108px_108px] grid-cols-[1fr_auto] gap-2 items-center px-4 py-3 border-t border-[#f6f6f5] first:border-t-0 md:border-t">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-[#f6f6f5] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="opacity-30">👟</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-black text-[#0a0a0a] leading-tight truncate">{it.name}</p>
                      <p className="text-[11px] text-[#9b9b98] font-semibold">{it.sku || ""}<span className="md:hidden">{it.size ? ` · ${it.size}` : ""} · ×{it.qty || 1}</span></p>
                    </div>
                  </div>
                  <span className="hidden md:block text-center text-[12.5px] font-bold text-[#0a0a0a]">{it.size || "—"}</span>
                  <span className="hidden md:block text-center text-[12.5px] font-bold text-[#0a0a0a]">{it.qty || 1}</span>
                  <span className="hidden md:block text-right text-[12.5px] font-bold text-[#0a0a0a]">{fmt(it.price)}</span>
                  <span className="text-right text-[13px] font-black text-[#0a0a0a]">{fmt((it.price || 0) * (it.qty || 1))}</span>
                </div>
              ))}
              {/* totals */}
              <div className="border-t border-[#f0f0ef] px-4 py-3">
                <div className="flex justify-end gap-10 text-[13px] font-semibold text-[#555] py-1">
                  <span>Subtotal</span>
                  <span className="w-28 text-right font-black text-[#0a0a0a]">{fmt(order.subtotal ?? items.reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0))}</span>
                </div>
                <div className="flex justify-end gap-10 text-[13px] font-semibold text-[#555] py-1">
                  <span>Shipping Fee</span>
                  <span className="w-28 text-right font-black text-[#0a0a0a]">{(order.shipping_fee || 0) === 0 ? <span className="text-[#1a7f4e]">FREE</span> : fmt(order.shipping_fee)}</span>
                </div>
                {(order.discount_amount || 0) > 0 && (
                  <div className="flex justify-end gap-10 text-[13px] font-black text-[#1a7f4e] py-1">
                    <span>Discount{order.promo_code ? ` (${order.promo_code})` : ""}</span>
                    <span className="w-28 text-right">−{fmt(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between md:justify-end md:gap-8 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-4 py-3 mt-2">
                  <span className="text-[15px] md:text-[17px] font-black text-[#0a0a0a]">Total Amount Due</span>
                  <span className="text-[22px] md:text-[26px] font-black text-[#0a0a0a]">{fmt(order.total)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11.5px] font-semibold text-[#8b8b88] mb-6 px-1">
              <span>Payment Method: <b className="text-[#0a0a0a] capitalize">{String(order.payment_method || "").replace(/_/g, " ")}</b></span>
              {order.payment_reference && <span>Reference No.: <b className="text-[#0a0a0a] font-mono">{order.payment_reference}</b></span>}
              {order.courier && order.tracking_reference && <span>Shipping: <b className="text-[#0a0a0a]">{order.courier} · <span className="font-mono">{order.tracking_reference}</span></b></span>}
            </div>

            {/* ── payment instructions + upload proof (never printed) ── */}
            {!cod && !paid && (
              <div className="no-print rounded-xl border border-[#f0f0ef] p-5 md:p-6 mb-2">
                {reupload ? (
                  <div className="rounded-xl border-2 border-[#fdba74] bg-[#fff7ed] p-5">
                    <p className="text-[12px] font-black uppercase tracking-[.1em] text-[#c2410c] mb-1">⚠ We need a new payment proof</p>
                    {order.reupload_reason && (
                      <p className="text-[12.5px] font-semibold text-[#7c2d12] mb-3">Reason from our team: <span className="font-black">“{order.reupload_reason}”</span></p>
                    )}
                    <a href={payUrl} className="block text-center bg-[#EA580C] text-white py-3.5 rounded-xl text-[12.5px] font-black tracking-[.06em] hover:opacity-90">
                      ⬆ Upload New Payment Proof
                    </a>
                  </div>
                ) : submitted ? (
                  <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-5 text-center">
                    <p className="text-[12.5px] font-black text-[#1d4ed8]">✓ Payment proof submitted — awaiting verification</p>
                    <p className="text-[11px] font-semibold text-[#3b6bc9] mt-1">Our team is reviewing it. You'll be contacted once the payment is confirmed.</p>
                    <a href={payUrl} className="inline-block mt-2 text-[11px] font-bold text-[#1d4ed8] underline">Submitted the wrong file? Upload a different proof</a>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6 md:divide-x md:divide-[#f0f0ef]">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <CreditCard className="h-5 w-5 text-[#EA580C]" strokeWidth={2.2} />
                        <h3 className="text-[15px] font-black text-[#0a0a0a]">Payment Instructions</h3>
                      </div>
                      <p className="text-[12px] font-semibold text-[#6b6b68] mb-3.5">You may pay via our available payment channels:</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 border border-[#e4e4e2] rounded-xl px-3.5 py-2 text-[12px] font-black text-[#0a0a0a]"><Landmark className="h-4 w-4" /> Bank Transfer</span>
                        <span className="flex items-center gap-1.5 border border-[#e4e4e2] rounded-xl px-3.5 py-2 text-[12px] font-black text-[#1a73e8]">GCash</span>
                        <span className="flex items-center gap-1.5 border border-[#e4e4e2] rounded-xl px-3.5 py-2 text-[12px] font-black text-[#0faf59]">Maya</span>
                      </div>
                      <p className="text-[10.5px] font-semibold text-[#9b9b98] mt-3">Account details and QR codes are on our secure payment portal.</p>
                    </div>
                    <div className="md:pl-6">
                      <div className="flex items-center gap-2.5 mb-2">
                        <Upload className="h-5 w-5 text-[#EA580C]" strokeWidth={2.2} />
                        <h3 className="text-[15px] font-black text-[#0a0a0a]">Upload Payment Proof</h3>
                      </div>
                      <p className="text-[12px] font-semibold text-[#6b6b68] mb-3.5">
                        {preorder ? "Full payment is required to confirm this pre-order. " : "After completing your payment, please "}
                        upload a clear photo or screenshot of your proof of payment (JPG, PNG or PDF, max 5 MB).
                      </p>
                      <a href={payUrl} className="flex items-center justify-center gap-2 bg-[#EA580C] text-white py-3.5 rounded-xl text-[13px] font-black tracking-[.03em] hover:opacity-90">
                        <Upload className="h-4 w-4" strokeWidth={2.5} /> Upload Payment Proof
                      </a>
                      <p className="text-[10px] font-semibold text-[#9b9b98] mt-2 text-center">Your order number and amount are filled in for you.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── support footer ── */}
            <div className="border-t border-[#f0f0ef] pt-5 mt-4 grid md:grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-3">
                <Headphones className="h-8 w-8 text-[#EA580C]" strokeWidth={1.8} />
                <div>
                  <p className="text-[15px] font-black text-[#0a0a0a]">Need Help?</p>
                  <p className="text-[11.5px] font-semibold text-[#8b8b88]">Contact our support team:</p>
                </div>
              </div>
              <div className="text-[12px] font-bold text-[#0a0a0a] space-y-1 md:text-right">
                <p>💬 <a href="https://m.me/SoleBlessingOfficial" className="hover:text-[#EA580C]">m.me/SoleBlessingOfficial</a></p>
                <p>✉️ <a href="mailto:soleblessing@gmail.com" className="hover:text-[#EA580C]">soleblessing@gmail.com</a></p>
                <p>📍 Amadeo, Cavite, Philippines 🇵🇭</p>
              </div>
            </div>
          </div>

          <div className="bg-[#f6f6f5] print:bg-white px-6 md:px-8 py-4 text-center">
            <p className="text-[10.5px] text-[#9b9b98] font-semibold">
              Salamat sa pag-shop, {String(order.customer_name || "").split(/\s+/)[0]}! 🙏 · soleblessingofficial.com · © {new Date().getFullYear()} TYG Services
            </p>
          </div>
        </div>

        {expiresAt && (
          <p className="no-print text-center text-[10.5px] font-semibold text-[#9b9b98] mt-3">
            🔒 Secure invoice link — valid until {new Date(expiresAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}. Need more time? Just message us.
          </p>
        )}
      </div>
    </div>
  );
}
