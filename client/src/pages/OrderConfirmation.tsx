// SB2.0 — order success: timeline status (per approved board), orange
// upload-payment CTA, email note. Data source (sessionStorage) unchanged.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Upload, Copy } from "lucide-react";

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem("sb_last_order");
      if (data) setOrder(JSON.parse(data));
      else setLocation("/products");
    } catch { setLocation("/products"); }
  }, []);

  const copyOrderNumber = () => {
    if (!order) return;
    try { navigator.clipboard.writeText(order.orderNumber); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!order) return null;
  const cod = order.paymentMethod === "cod";
  const firstName = String(order.customerName || "").trim().split(/\s+/)[0] || "friend";

  const timeline = [
    { label: "Order received", sub: "Confirmation emailed with your order details", state: "done" },
    cod
      ? { label: "Confirmation call", sub: `We'll contact ${order.contactNumber || "you"} to confirm delivery`, state: "now" }
      : { label: "Payment", sub: "Upload your proof so we can verify it", state: "now" },
    { label: "Packing", sub: "We prepare your pairs after verification", state: "" },
    { label: "Shipped", sub: "Tracking number emailed (J&T / LBC)", state: "" },
    { label: "Delivered", sub: "Enjoy! 🎉", state: "" },
  ];

  return (
    <div className="min-h-screen bg-white flex items-start justify-center pt-10 md:pt-14 px-4 pb-16">
      <div className="w-full max-w-lg">

        {/* Success header */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-[#e8f5ee] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-[#1a7f4e]" />
          </div>
          <h1 className="text-[28px] md:text-3xl font-black text-[#0a0a0a] mb-2 tracking-[-.01em]">Salamat, {firstName}! 🎉</h1>
          <p className="text-[#8b8b88] text-[13px] font-semibold leading-relaxed">
            Order placed — we emailed your confirmation with the details of your order.
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-[#0a0a0a] rounded-2xl p-5 mb-3 text-center">
          <p className="text-[9.5px] font-black tracking-[.2em] uppercase text-white/40 mb-2">Your Order Number</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-[22px] font-black text-white tracking-wider">{order.orderNumber}</span>
            <button onClick={copyOrderNumber} aria-label="Copy order number"
              className="text-white/40 hover:text-[#FF5A1F] transition-colors">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {copied && <p className="text-[#FF5A1F] text-xs mt-1 font-bold">Copied!</p>}
          <p className="text-white/35 text-[11px] mt-1.5">Save this number to track your order</p>
        </div>

        {/* Order Details */}
        <div className="bg-white border border-[#f0f0ef] rounded-2xl p-5 mb-3">
          <h2 className="text-[11px] font-black uppercase tracking-[.14em] text-[#0a0a0a] mb-4">Your Order</h2>
          <div className="space-y-2.5 mb-4">
            {(order.items || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-[#f6f6f5] overflow-hidden flex items-center justify-center flex-shrink-0">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="opacity-30">👟</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#0a0a0a] truncate">{item.name}</p>
                  <p className="text-[10.5px] text-[#9b9b98] font-semibold">Size {item.size} · ×{item.qty}</p>
                </div>
                <span className="text-[13px] font-black text-[#0a0a0a]">{fmt(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-[12px] font-bold text-[#1a7f4e] mb-1.5">
              <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span><span>−{fmt(order.discount)}</span>
            </div>
          )}
          <div className="border-t-2 border-[#0a0a0a] pt-3 flex justify-between items-baseline font-black text-[#0a0a0a]">
            <span>{cod ? "Total (pay on delivery)" : "Total"}</span>
            <span className="text-[20px]">{fmt(order.total)}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#f0f0ef] flex justify-between text-[12.5px] text-[#8b8b88] font-semibold">
            <span>Payment Method</span>
            <span className="font-black capitalize text-[#0a0a0a]">{order.paymentMethod?.replace("_", " ")}</span>
          </div>
        </div>

        {/* Upload CTA / COD note */}
        {!cod ? (
          <button
            onClick={() => setLocation(`/upload-payment?order=${encodeURIComponent(order.orderNumber)}&name=${encodeURIComponent(order.customerName || "")}`)}
            className="w-full bg-[#FF5A1F] text-white py-4 mb-3 text-xs font-black tracking-[.12em] uppercase rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Upload className="h-4 w-4" /> Upload Payment Proof — {fmt(order.total)}
          </button>
        ) : (
          <div className="bg-[#e8f5ee] rounded-2xl p-4 mb-3 text-center">
            <p className="text-[12.5px] text-[#1a7f4e] font-bold">💵 COD confirmed — pay {fmt(order.total)} cash when your order arrives.</p>
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-white border border-[#f0f0ef] rounded-2xl p-5 mb-5">
          <h3 className="text-[11px] font-black uppercase tracking-[.14em] text-[#0a0a0a] mb-4">Order Status</h3>
          <div className="relative pl-5">
            <div className="absolute left-[5px] top-1.5 bottom-3 w-[2px] bg-[#ececeb]" />
            {timeline.map((t, i) => (
              <div key={i} className="relative pb-4 last:pb-0">
                <span className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                  t.state === "done" ? "bg-[#1a7f4e]" : t.state === "now" ? "bg-[#FF5A1F]" : "bg-[#ececeb]"}`} />
                <p className={`text-[13px] font-black leading-tight ${t.state ? "text-[#0a0a0a]" : "text-[#b3b3b0]"}`}>{t.label}</p>
                <p className="text-[11px] text-[#9b9b98] font-semibold mt-0.5">{t.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setLocation("/")}
            className="flex-1 border-[1.5px] border-[#0a0a0a] text-[#0a0a0a] py-3.5 text-xs font-black uppercase tracking-[.08em] hover:bg-[#f6f6f5] transition-colors rounded-full">
            Back to Home
          </button>
          <button onClick={() => setLocation("/products")}
            className="flex-1 bg-[#0a0a0a] text-white py-3.5 text-xs font-black uppercase tracking-[.08em] hover:bg-[#262626] transition-colors rounded-full">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
