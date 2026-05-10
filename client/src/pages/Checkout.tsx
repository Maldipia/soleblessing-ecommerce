import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { CheckCircle, ChevronRight } from "lucide-react";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

const PAYMENT_METHODS = [
  { id: "gcash",    label: "GCash",         detail: "0917-XXX-XXXX" },
  { id: "maya",     label: "Maya",          detail: "0917-XXX-XXXX" },
  { id: "cod",      label: "Cash on Delivery", detail: "Pay when item arrives" },
  { id: "bdo",      label: "BDO Transfer",  detail: "Account: XXXX-XXXX" },
  { id: "bpi",      label: "BPI Transfer",  detail: "Account: XXXX-XXXX" },
];

function genOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `SB-${ymd}-${rand}`;
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const shipping = total >= 300000 ? 0 : 15000;
  const grandTotal = total + shipping;

  const [step, setStep] = useState<"info" | "payment" | "confirm">("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customerName: "", customerEmail: "", contactNumber: "",
    shippingAddress: "", notes: "", paymentMethod: "gcash",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (items.length === 0) {
    setLocation("/products");
    return null;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const orderNumber = genOrderNumber();
      const orderItems = items.map(i => ({
        id: i.id, sku: i.sku, name: i.name, brand: i.brand,
        size: i.size, price: i.price, qty: i.qty,
        imageUrl: i.imageUrl || "",
      }));

      await sb.insert("sb_orders", {
        order_number: orderNumber,
        customer_name: form.customerName,
        customer_email: form.customerEmail || null,
        contact_number: form.contactNumber,
        shipping_address: form.shippingAddress,
        items: orderItems,
        subtotal: total,
        shipping_fee: shipping,
        total: grandTotal,
        payment_method: form.paymentMethod,
        notes: form.notes || null,
        status: "pending",
      });

      clearCart();
      // Store order number for confirmation page
      sessionStorage.setItem("sb_last_order", JSON.stringify({
        orderNumber, total: grandTotal, paymentMethod: form.paymentMethod,
        customerName: form.customerName, items: orderItems,
      }));
      setLocation("/order-confirm");
    } catch (e: any) {
      setError("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-1">Checkout</p>
          <h1 className="text-4xl font-black text-[#0d2430] tracking-tight">Complete Your Order</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {["info","payment","confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? "bg-[#0d2430] text-white" :
                ["info","payment","confirm"].indexOf(step) > i ? "bg-[#C9A84C] text-[#050f12]" :
                "bg-gray-200 text-gray-500"
              }`}>{i + 1}</div>
              <span className="text-xs font-medium text-gray-500 capitalize hidden sm:block">{s === "info" ? "Your Info" : s === "payment" ? "Payment" : "Review"}</span>
              {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">

            {/* STEP 1: INFO */}
            {step === "info" && (
              <div className="bg-white border border-gray-100 p-6 space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Delivery Information</h2>
                {[
                  { label: "Full Name *", key: "customerName", placeholder: "Juan dela Cruz", type: "text" },
                  { label: "Contact Number *", key: "contactNumber", placeholder: "09XX-XXX-XXXX", type: "tel" },
                  { label: "Email (optional)", key: "customerEmail", placeholder: "email@example.com", type: "email" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">{f.label}</label>
                    <input type={f.type} value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] transition-colors rounded" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Complete Shipping Address *</label>
                  <textarea value={form.shippingAddress} onChange={e => set("shippingAddress", e.target.value)}
                    placeholder="House/Unit No., Street, Barangay, City, Province, ZIP"
                    rows={3}
                    className="w-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] transition-colors rounded resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Order Notes (optional)</label>
                  <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                    placeholder="Special instructions, preferred delivery time, etc."
                    rows={2}
                    className="w-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] transition-colors rounded resize-none" />
                </div>
                <button
                  onClick={() => {
                    if (!form.customerName || !form.contactNumber || !form.shippingAddress) {
                      setError("Please fill in all required fields."); return;
                    }
                    setError(""); setStep("payment");
                  }}
                  className="w-full bg-[#0d2430] text-white py-3.5 text-sm font-bold tracking-[.1em] uppercase hover:bg-[#122d3a] transition-colors">
                  Continue to Payment →
                </button>
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
              </div>
            )}

            {/* STEP 2: PAYMENT */}
            {step === "payment" && (
              <div className="bg-white border border-gray-100 p-6 space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Select Payment Method</h2>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(pm => (
                    <label key={pm.id}
                      className={`flex items-center gap-4 p-4 border rounded cursor-pointer transition-all ${
                        form.paymentMethod === pm.id
                          ? "border-[#0d2430] bg-[#0d2430]/[.03]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}>
                      <input type="radio" name="payment" value={pm.id}
                        checked={form.paymentMethod === pm.id}
                        onChange={() => set("paymentMethod", pm.id)}
                        className="accent-[#0d2430]" />
                      <div>
                        <div className="text-sm font-semibold text-[#0d2430]">{pm.label}</div>
                        <div className="text-[11px] text-gray-400">{pm.detail}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {form.paymentMethod !== "cod" && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-4">
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      After placing your order, you'll be directed to upload your payment proof (screenshot of GCash/Maya/bank transfer).
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep("info")}
                    className="flex-1 border border-gray-200 text-[#0d2430] py-3 text-sm font-semibold hover:bg-gray-50 transition-colors">
                    ← Back
                  </button>
                  <button onClick={() => { setError(""); setStep("confirm"); }}
                    className="flex-1 bg-[#0d2430] text-white py-3 text-sm font-bold tracking-[.1em] uppercase hover:bg-[#122d3a] transition-colors">
                    Review Order →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONFIRM */}
            {step === "confirm" && (
              <div className="bg-white border border-gray-100 p-6 space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Review Your Order</h2>
                <div className="bg-[#F7F4EF] rounded p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-semibold">{form.customerName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Contact</span><span className="font-semibold">{form.contactNumber}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-semibold capitalize">{form.paymentMethod.replace("_"," ")}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="font-semibold text-right max-w-[60%]">{form.shippingAddress}</span></div>
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  {items.map(i => (
                    <div key={`${i.id}-${i.size}`} className="flex justify-between text-sm">
                      <span className="text-gray-600">{i.name} <span className="text-gray-400">× {i.qty} (Size {i.size})</span></span>
                      <span className="font-semibold">{fmt(i.price * i.qty)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-gray-50">
                    <span>Shipping</span><span>{shipping === 0 ? "FREE" : fmt(shipping)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-[#0d2430] pt-2 border-t border-gray-200">
                    <span>Total</span><span>{fmt(grandTotal)}</span>
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep("payment")}
                    className="flex-1 border border-gray-200 text-[#0d2430] py-3 text-sm font-semibold hover:bg-gray-50 transition-colors">
                    ← Back
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 bg-[#C9A84C] text-[#050f12] py-3 text-sm font-black tracking-[.1em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50">
                    {submitting ? "Placing Order…" : "Place Order ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary sidebar */}
          <div>
            <div className="bg-white border border-gray-100 p-5 sticky top-24">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4">
                {items.map(i => (
                  <div key={`${i.id}-${i.size}`} className="flex gap-3">
                    <div className="w-12 h-12 bg-[#EDE9E3] flex-shrink-0 overflow-hidden">
                      {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" /> : <span className="text-xl flex items-center justify-center h-full w-full opacity-30">👟</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#0d2430] truncate">{i.name}</p>
                      <p className="text-[10px] text-gray-400">Size {i.size} · qty {i.qty}</p>
                      <p className="text-xs font-bold text-[#0d2430]">{fmt(i.price * i.qty)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(total)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>Shipping</span><span>{shipping===0?"FREE":fmt(shipping)}</span></div>
                <div className="flex justify-between text-sm font-black text-[#0d2430] pt-1 border-t border-gray-100"><span>Total</span><span>{fmt(grandTotal)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
