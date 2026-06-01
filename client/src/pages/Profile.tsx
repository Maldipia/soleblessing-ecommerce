import { useState } from "react";
import { sb } from "@/lib/supabase";
import { Search, Package, MapPin, Phone, CreditCard, ChevronDown, ChevronUp, Copy, CheckCircle, Clock, Truck, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed", paid: "Payment Confirmed", processing: "Being Packed",
  shipped: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function Profile() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showItems, setShowItems] = useState(true);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true); setError(""); setOrder(null);
    try {
      const r = await fetch(`/api/track-order?order_number=${encodeURIComponent(trimmed)}`);
      const results = r.ok ? await r.json() : [];
      if (!results || results.length === 0) {
        setError("Order not found. Please check your order number and try again.");
      } else {
        setOrder(results[0]);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const copyOrderNumber = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      {/* Hero */}
      <div className="bg-[#050f12] px-6 py-16 text-center">
        <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-3">SoleBlessing</p>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">Track Your Order</h1>
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Enter your order number to see real-time status, items, and delivery details.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Search form */}
        <form onSubmit={handleSearch} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <label className="text-xs font-bold tracking-[.12em] uppercase text-gray-500 block mb-3">
            Order Number
          </label>
          <div className="flex gap-3">
            <input
              value={query}
              onChange={e => { setQuery(e.target.value.toUpperCase()); setError(""); }}
              placeholder="SB-20260513-1234"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase outline-none focus:border-[#0d2430] transition-colors"
              autoFocus
            />
            <button type="submit" disabled={loading || !query.trim()}
              className="bg-[#0d2430] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#122d3a] disabled:opacity-40 transition-all flex items-center gap-2">
              <Search className="h-4 w-4" />
              {loading ? "…" : "Track"}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            Your order number was sent in your order confirmation. Format: <span className="font-mono text-gray-500">SB-YYYYMMDD-XXXX</span>
          </p>
        </form>

        {/* Order result */}
        {order && (
          <div className="space-y-4">
            {/* Header card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-black text-[#0d2430] font-mono tracking-wider">{order.order_number}</span>
                    <button onClick={copyOrderNumber} className="text-gray-300 hover:text-[#C9A84C] transition-colors">
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">{fmtDate(order.created_at)}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              {/* Progress bar */}
              {!isCancelled && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step} className="flex flex-col items-center flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          i <= stepIndex
                            ? "bg-[#0d2430] border-[#0d2430] text-white"
                            : "bg-white border-gray-200 text-gray-300"
                        }`}>
                          {i < stepIndex ? "✓" : i + 1}
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className="absolute">
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* connector line */}
                  <div className="relative h-1 bg-gray-100 rounded-full mx-3 -mt-4 mb-4">
                    <div
                      className="absolute h-full bg-[#0d2430] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, (stepIndex / (STATUS_STEPS.length - 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between px-1">
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step} className={`text-[9px] font-semibold text-center flex-1 leading-tight ${i <= stepIndex ? "text-[#0d2430]" : "text-gray-300"}`}>
                        {STATUS_LABELS[step]}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isCancelled && (
                <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">
                  This order has been cancelled.
                </div>
              )}
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="h-4 w-4 text-[#C9A84C]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact</span>
                </div>
                <p className="text-sm font-semibold text-[#0d2430]">{order.customer_name}</p>
                <p className="text-xs text-gray-400">{order.contact_number}</p>
                {order.customer_email && <p className="text-xs text-gray-400">{order.customer_email}</p>}
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-[#C9A84C]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Payment</span>
                </div>
                <p className="text-sm font-semibold text-[#0d2430] capitalize">{order.payment_method?.replace("_", " ")}</p>
                <p className="text-lg font-black text-[#0d2430]">{fmt(order.total)}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-[#C9A84C]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Delivery Address</span>
              </div>
              <p className="text-sm text-[#0d2430] leading-relaxed">{order.shipping_address}</p>
            </div>

            {/* Items */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <button onClick={() => setShowItems(s => !s)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#C9A84C]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Items Ordered ({(order.items || []).length})
                  </span>
                </div>
                {showItems ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {showItems && (
                <div className="divide-y divide-gray-50 px-5 pb-4">
                  {(order.items || []).map((item: any, i: number) => (
                    <div key={i} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                          : <div className="w-12 h-12 bg-[#EDE9E3] rounded-lg flex items-center justify-center text-xl flex-shrink-0">👟</div>}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0d2430] truncate">{item.name}</p>
                          <p className="text-[11px] text-gray-400">Size {item.size} · ×{item.qty}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#0d2430] flex-shrink-0">{fmt(item.price * item.qty)}</span>
                    </div>
                  ))}
                  <div className="pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{order.shipping_fee === 0 ? "FREE" : fmt(order.shipping_fee)}</span></div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Discount {order.promo_code ? `(${order.promo_code})` : ""}</span>
                        <span>−{fmt(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-[#0d2430] pt-2 border-t border-gray-100 text-base">
                      <span>Total</span><span className="text-[#C9A84C]">{fmt(order.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upload proof CTA if pending */}
            {order.status === "pending" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-amber-800 mb-2">📤 Upload Your Payment Proof</h3>
                <p className="text-xs text-amber-700 mb-4 leading-relaxed">
                  Your order is pending payment confirmation. Please send your payment via {order.payment_method?.replace("_", " ")} and upload your screenshot.
                </p>
                <button onClick={() => setLocation(`/upload-payment?orderId=${order.order_number}`)}
                  className="w-full bg-[#C9A84C] text-[#050f12] py-3 text-sm font-black tracking-wide uppercase rounded-xl hover:opacity-90 transition-opacity">
                  Upload Payment Screenshot
                </button>
              </div>
            )}

            {order.status === "shipped" && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-purple-800">Your order is on its way!</h3>
                </div>
                <p className="text-xs text-purple-700">Our rider or courier is en route. Please ensure someone is available to receive the package.</p>
              </div>
            )}

            {order.status === "delivered" && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <h3 className="text-sm font-bold text-green-800">Order Delivered!</h3>
                <p className="text-xs text-green-700 mt-1">Thank you for shopping with SoleBlessing. Enjoy your new kicks!</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!order && !loading && !error && (
          <div className="text-center py-10 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter your order number above to track your package.</p>
          </div>
        )}
      </div>
    </div>
  );
}
