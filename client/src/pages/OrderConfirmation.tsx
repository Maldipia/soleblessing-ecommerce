import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Upload, Copy, Package } from "lucide-react";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

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
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!order) return null;

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-start justify-center pt-16 px-6">
      <div className="w-full max-w-lg">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-[#0d2430] mb-2">Order Placed! 🎉</h1>
          <p className="text-gray-500 text-sm">
            Thank you, <strong>{order.customerName}</strong>! Your order has been received.
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-[#050f12] rounded-xl p-5 mb-4 text-center">
          <p className="text-[10px] font-bold tracking-[.16em] uppercase text-white/40 mb-2">Your Order Number</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-black text-[#C9A84C] tracking-wider">{order.orderNumber}</span>
            <button onClick={copyOrderNumber}
              className="text-white/30 hover:text-[#C9A84C] transition-colors">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {copied && <p className="text-green-400 text-xs mt-1">Copied!</p>}
          <p className="text-white/30 text-xs mt-2">Save this number to track your order</p>
        </div>

        {/* Order Details */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">Order Details</h2>
          <div className="space-y-2 mb-4">
            {(order.items || []).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name}
                  <span className="text-gray-400 text-xs"> · Size {item.size} · ×{item.qty}</span>
                </span>
                <span className="font-semibold">{fmt(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-[#0d2430]">
            <span>Total Paid</span>
            <span className="text-lg text-[#C9A84C]">{fmt(order.total)}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Payment Method</span>
              <span className="font-semibold capitalize text-[#0d2430]">{order.paymentMethod?.replace("_"," ")}</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {order.paymentMethod !== "cod" ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-bold text-amber-800 mb-2">📤 Next Step: Upload Payment Proof</h3>
            <p className="text-xs text-amber-700 leading-relaxed mb-4">
              Please send your payment ({fmt(order.total)}) via <strong className="capitalize">{order.paymentMethod}</strong>,
              then upload your screenshot below. Your order will be processed once payment is verified.
            </p>
            <button
              onClick={() => setLocation(`/upload-payment?orderId=${order.orderNumber}`)}
              className="w-full bg-[#C9A84C] text-[#050f12] py-3.5 text-sm font-black tracking-[.1em] uppercase hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" /> Upload Payment Proof
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-bold text-green-800 mb-2">✅ COD Order Confirmed</h3>
            <p className="text-xs text-green-700 leading-relaxed">
              Your COD order has been placed! Our team will contact you at <strong>{order.contactNumber || "your number"}</strong> to confirm the delivery schedule.
              Payment is collected upon delivery.
            </p>
          </div>
        )}

        {/* Order flow steps */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">What Happens Next</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: order.paymentMethod === "cod" ? "Our team confirms your order via call/SMS" : "Upload your payment screenshot", done: false },
              { step: "2", text: "We verify payment and prepare your item", done: false },
              { step: "3", text: "Item packed and handed to courier (J&T / LBC)", done: false },
              { step: "4", text: "Tracking number sent to you", done: false },
              { step: "5", text: "Delivered to your door 🎉", done: false },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0d2430]/10 text-[#0d2430] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {s.step}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setLocation("/")}
            className="flex-1 border border-gray-200 text-[#0d2430] py-3 text-xs font-semibold uppercase tracking-wide hover:bg-gray-50 transition-colors rounded">
            Back to Home
          </button>
          <button onClick={() => setLocation("/products")}
            className="flex-1 bg-[#0d2430] text-white py-3 text-xs font-semibold uppercase tracking-wide hover:bg-[#122d3a] transition-colors rounded">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
