import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { sb } from "@/lib/supabase";
import { CheckCircle, ChevronRight, Tag, X } from "lucide-react";
import { toast } from "sonner";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

type PaymentMethod = { id: string; label: string; detail: string; enabled: boolean; icon: string };

function genOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  return `SB-${ymd}-${Math.floor(Math.random()*9000+1000)}`;
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"info"|"payment"|"confirm">("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [freeThreshold, setFreeThreshold] = useState(300000);
  const [flatRate, setFlatRate] = useState(15000);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState("");

  const [form, setForm] = useState({
    customerName: "", customerEmail: "", contactNumber: "",
    shippingAddress: "", notes: "", paymentMethod: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Load payment methods + shipping from settings
  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.select("sb_settings", "select=key,value&key=in.(payment_methods,shipping)");
        // value column is text — parse JSON before using
        const parse = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
        rows.forEach((r: any) => {
          const v = parse(r.value);
          if (!v) return;
          if (r.key === "payment_methods" && Array.isArray(v)) {
            const enabled = v.filter((m: any) => m.enabled);
            setPaymentMethods(enabled);
            if (enabled.length > 0) setForm(f => ({ ...f, paymentMethod: enabled[0].id }));
          }
          if (r.key === "shipping" && v.free_threshold) {
            setFreeThreshold(v.free_threshold || 300000);
            setFlatRate(v.flat_rate || 15000);
          }
        });
      } catch(e) {
        // fallback defaults
        const defaults = [
          { id: "gcash", label: "GCash", detail: "Send to: 09XX-XXX-XXXX", enabled: true, icon: "📱" },
          { id: "maya", label: "Maya", detail: "Send to: 09XX-XXX-XXXX", enabled: true, icon: "💙" },
          { id: "cod", label: "Cash on Delivery", detail: "Pay when item arrives", enabled: true, icon: "💵" },
        ];
        setPaymentMethods(defaults);
        setForm(f => ({ ...f, paymentMethod: "gcash" }));
      }
    })();
  }, []);

  const shipping = total >= freeThreshold ? 0 : flatRate;
  const discount = promoApplied ? (() => {
    const p = promoApplied;
    if (p.discount_type === "percent") return Math.round(total * p.discount_value / 100);
    return Math.min(p.discount_value, total);
  })() : 0;
  const grandTotal = total + shipping - discount;

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoChecking(true); setPromoError("");
    try {
      const results = await sb.select("sb_promos",
        `code=eq.${promoCode.toUpperCase().trim()}&active=eq.true&select=*`);
      if (!results || results.length === 0) { setPromoError("Invalid or expired promo code."); return; }
      const p = results[0];
      const now = new Date();
      if (p.expires_at && new Date(p.expires_at) < now) { setPromoError("This promo code has expired."); return; }
      if (p.max_uses !== null && p.uses_count >= p.max_uses) { setPromoError("This promo code has reached its usage limit."); return; }
      if (p.min_order > 0 && total < p.min_order) {
        setPromoError(`Minimum order of ${fmt(p.min_order)} required for this code.`); return;
      }
      setPromoApplied(p);
      toast.success(`Promo applied! ${p.discount_type === "percent" ? `${p.discount_value}% off` : `${fmt(p.discount_value)} off`}`);
    } catch(e: any) { setPromoError("Failed to validate code. Try again."); }
    finally { setPromoChecking(false); }
  };

  const removePromo = () => { setPromoApplied(null); setPromoCode(""); setPromoError(""); };

  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      const orderNumber = genOrderNumber();
      const orderItems = items.map(i => ({
        id: i.id, sku: i.sku, name: i.name, brand: i.brand,
        size: i.size, price: i.price, qty: i.qty, imageUrl: i.imageUrl || "",
      }));

      const orderData: any = {
        order_number: orderNumber,
        customer_name: form.customerName,
        customer_email: form.customerEmail || null,
        contact_number: form.contactNumber,
        shipping_address: form.shippingAddress,
        items: orderItems,
        subtotal: total,
        shipping_fee: shipping,
        discount_amount: discount,
        total: grandTotal,
        payment_method: form.paymentMethod,
        notes: form.notes || null,
        status: "pending",
      };
      if (promoApplied) orderData.promo_code = promoApplied.code;

      const placeRes = await fetch("/api/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderData,
          promo: promoApplied ? {
            id: promoApplied.id, code: promoApplied.code,
            discount, customerName: form.customerName,
            orderNumber, uses_count: promoApplied.uses_count,
          } : null,
        }),
      });
      if (!placeRes.ok) throw new Error("place-order failed");

      clearCart();
      sessionStorage.setItem("sb_last_order", JSON.stringify({
        orderNumber, total: grandTotal, discount, promoCode: promoApplied?.code || null,
        paymentMethod: form.paymentMethod, customerName: form.customerName,
        contactNumber: form.contactNumber, items: orderItems,
      }));
      setLocation("/order-confirm");
    } catch(e: any) { setError("Failed to place order. Please try again."); }
    finally { setSubmitting(false); }
  };

  if (items.length === 0) { setLocation("/products"); return null; }

  const selectedPayment = paymentMethods.find(m => m.id === form.paymentMethod);

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-1">Checkout</p>
          <h1 className="text-4xl font-black text-[#0d2430] tracking-tight">Complete Your Order</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {(["info","payment","confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? "bg-[#0d2430] text-white" :
                (["info","payment","confirm"].indexOf(step) > i) ? "bg-[#C9A84C] text-[#050f12]" :
                "bg-gray-200 text-gray-500"
              }`}>{i + 1}</div>
              <span className="text-xs font-medium text-gray-500 capitalize hidden sm:block">
                {s === "info" ? "Your Info" : s === "payment" ? "Payment" : "Review"}
              </span>
              {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">

            {/* STEP 1 */}
            {step === "info" && (
              <div className="bg-white border border-gray-100 p-6 rounded-xl space-y-5">
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
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] transition-colors" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Complete Shipping Address *</label>
                  <textarea value={form.shippingAddress} onChange={e => set("shippingAddress", e.target.value)}
                    placeholder="House/Unit No., Street, Barangay, City, Province, ZIP" rows={3}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Order Notes (optional)</label>
                  <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                    placeholder="Special instructions, preferred delivery time..." rows={2}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none" />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button onClick={() => {
                  if (!form.customerName || !form.contactNumber || !form.shippingAddress) {
                    setError("Please fill in all required fields."); return;
                  }
                  setError(""); setStep("payment");
                }} className="w-full bg-[#0d2430] text-white py-3.5 text-sm font-bold tracking-[.1em] uppercase hover:bg-[#122d3a] transition-colors rounded-lg">
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === "payment" && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 p-6 rounded-xl space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Select Payment Method</h2>
                  <div className="space-y-2">
                    {paymentMethods.map(pm => (
                      <label key={pm.id}
                        className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                          form.paymentMethod === pm.id ? "border-[#0d2430] bg-[#0d2430]/[.03]" : "border-gray-200 hover:border-gray-300"
                        }`}>
                        <input type="radio" name="payment" value={pm.id}
                          checked={form.paymentMethod === pm.id}
                          onChange={() => set("paymentMethod", pm.id)}
                          className="accent-[#0d2430]" />
                        <span className="text-xl">{pm.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-[#0d2430]">{pm.label}</div>
                          {pm.detail && <div className="text-xs text-gray-400 mt-0.5">{pm.detail}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                  {form.paymentMethod !== "cod" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        After placing your order, you'll be directed to upload your payment screenshot.
                      </p>
                    </div>
                  )}
                </div>

                {/* Promo Code */}
                <div className="bg-white border border-gray-100 p-6 rounded-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d2430] mb-4 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[#C9A84C]" /> Promo Code
                  </h3>
                  {promoApplied ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-black text-green-700 tracking-wider font-mono">{promoApplied.code}</span>
                        </div>
                        <p className="text-xs text-green-600 mt-0.5">
                          {promoApplied.discount_type === "percent"
                            ? `${promoApplied.discount_value}% off applied`
                            : `${fmt(promoApplied.discount_value)} off applied`}
                          {" "}· You save <strong>{fmt(discount)}</strong>
                        </p>
                      </div>
                      <button onClick={removePromo} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                          onKeyDown={e => e.key === "Enter" && applyPromo()}
                          placeholder="Enter promo code"
                          className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest uppercase outline-none focus:border-[#C9A84C] transition-colors" />
                        <button onClick={applyPromo} disabled={promoChecking || !promoCode}
                          className="px-5 py-2.5 bg-[#C9A84C] text-[#050f12] text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-40 whitespace-nowrap">
                          {promoChecking ? "…" : "Apply"}
                        </button>
                      </div>
                      {promoError && <p className="text-red-500 text-xs mt-2">{promoError}</p>}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep("info")} className="flex-1 border border-gray-200 text-[#0d2430] py-3 text-sm font-semibold hover:bg-gray-50 rounded-lg">← Back</button>
                  <button onClick={() => setStep("confirm")} className="flex-1 bg-[#0d2430] text-white py-3 text-sm font-bold tracking-[.1em] uppercase hover:bg-[#122d3a] rounded-lg">Review Order →</button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === "confirm" && (
              <div className="bg-white border border-gray-100 p-6 rounded-xl space-y-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Review Your Order</h2>
                <div className="bg-[#F7F4EF] rounded-xl p-4 space-y-2 text-sm">
                  {[
                    ["Name", form.customerName],
                    ["Contact", form.contactNumber],
                    ["Payment", selectedPayment?.label || form.paymentMethod],
                    ["Address", form.shippingAddress],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold text-right max-w-[60%]">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {items.map(i => (
                    <div key={`${i.id}-${i.size}`} className="flex justify-between text-sm">
                      <span className="text-gray-600">{i.name} <span className="text-gray-400">× {i.qty} (Size {i.size})</span></span>
                      <span className="font-semibold">{fmt(i.price * i.qty)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(total)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{shipping === 0 ? "FREE" : fmt(shipping)}</span></div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Discount ({promoApplied?.code})</span>
                        <span>−{fmt(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-[#0d2430] pt-2 border-t border-gray-200">
                      <span>Total</span><span className="text-[#C9A84C]">{fmt(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-500 text-xs">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep("payment")} className="flex-1 border border-gray-200 text-[#0d2430] py-3 text-sm font-semibold hover:bg-gray-50 rounded-lg">← Back</button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 bg-[#C9A84C] text-[#050f12] py-3 text-sm font-black tracking-[.1em] uppercase hover:opacity-90 disabled:opacity-50 rounded-lg">
                    {submitting ? "Placing Order…" : "Place Order ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div>
            <div className="bg-white border border-gray-100 p-5 rounded-xl sticky top-24">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4">
                {items.map(i => (
                  <div key={`${i.id}-${i.size}`} className="flex gap-3">
                    <div className="w-12 h-12 bg-[#EDE9E3] flex-shrink-0 overflow-hidden rounded">
                      {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl opacity-30">👟</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#0d2430] truncate">{i.name}</p>
                      <p className="text-[10px] text-gray-400">Size {i.size} · ×{i.qty}</p>
                      <p className="text-xs font-bold text-[#0d2430]">{fmt(i.price * i.qty)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(total)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{shipping === 0 ? "FREE" : fmt(shipping)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600 font-semibold"><span>Discount</span><span>−{fmt(discount)}</span></div>}
                <div className="flex justify-between text-sm font-black text-[#0d2430] pt-1.5 border-t border-gray-100">
                  <span>Total</span><span className="text-[#C9A84C]">{fmt(grandTotal)}</span>
                </div>
              </div>
              {promoApplied && (
                <div className="mt-3 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Tag className="h-3 w-3 text-green-600" />
                  <span className="text-[10px] text-green-700 font-bold font-mono">{promoApplied.code} applied</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
