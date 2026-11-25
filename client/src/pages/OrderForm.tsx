// SoleBlessing Native Online Order Form — information-only (customers never
// pick products; admin encodes items + invoice after submission).
// Design: approved reference (black/white/orange, circular logo, 4-step progress).
import { useMemo, useRef, useState } from "react";
import { track } from "@/lib/track";

const ORANGE = "#F97316";
const MOPS = [
  { id: "STRAIGHT PAYMENT", label: "Straight Payment", desc: "Full payment upon confirmation", pts: 100 },
  { id: "COD", label: "Cash on Delivery (COD)", desc: "Shipping fee paid in advance · balance collected on delivery", pts: 50 },
  { id: "COP", label: "Cash on Pickup (COP)", desc: "Pay upon pick-up at our location", pts: 50 },
  { id: "LAY AWAY", label: "Lay Away", desc: "Reserve now, pay in installments", pts: 25 },
  { id: "WALK-IN", label: "Walk-In", desc: "Order and pay in store", pts: 75 },
  { id: "PRE-ORDER", label: "Pre-Order", desc: "100% full payment required · ETA 7–14 days", pts: 0, isNew: true },
];
const REGIONS = [
  "NCR — National Capital Region", "CAR — Cordillera", "Region I — Ilocos", "Region II — Cagayan Valley",
  "Region III — Central Luzon", "CALABARZON", "MIMAROPA", "Region V — Bicol", "Region VI — Western Visayas",
  "Region VII — Central Visayas", "Region VIII — Eastern Visayas", "Region IX — Zamboanga Peninsula",
  "Region X — Northern Mindanao", "Region XI — Davao", "Region XII — SOCCSKSARGEN", "Region XIII — Caraga", "BARMM",
];
const PREORDER_POLICY = [
  ["1. Full Payment Required", "Pre-orders require 100% payment upfront. Partial payments, Cash on Delivery (COD), and installment arrangements are not accepted. A pre-order will only be confirmed once full payment has been received and verified by SoleBlessing."],
  ["2. Estimated Arrival", "Pre-order items have an estimated arrival period of 7–14 days from payment confirmation. This is an estimate and not a guaranteed delivery date."],
  ["3. Possible Delays", "Delays may occur due to international shipping, customs inspections or clearance, supplier availability, logistics interruptions, holidays, government restrictions, or other circumstances beyond SoleBlessing's reasonable control."],
  ["4. Cancellation and Refund Policy", "Once the pre-order has been confirmed and committed with the supplier, it cannot be cancelled at the customer's request, and payments are non-refundable, except where a refund or other remedy is required under applicable law or where the failure is attributable to SoleBlessing."],
  ["5. Circumstances Beyond Our Control", "Delays caused by customs, shipping providers, suppliers, government restrictions, or other external circumstances do not, by themselves, constitute grounds for cancellation or refund."],
  ["6. Order Updates", "SoleBlessing will provide reasonable updates regarding significant changes to the estimated arrival period."],
];
const STEPS = ["Customer Info", "Delivery Info", "Payment Method", "Review & Submit"];

const rid = () => { try { return crypto.randomUUID(); } catch { return "s" + Math.random().toString(36).slice(2) + Date.now(); } };

export default function OrderForm() {
  const [screen, setScreen] = useState<"welcome" | 1 | 2 | 3 | 4 | "done">("welcome");
  const [f, setF] = useState({
    email: "", fbIgName: "", vipId: "", receiverName: "", contactNumber: "",
    region: "", city: "", address: "", specialRequest: "",
    paymentMethod: "", privacyAccepted: false, preorderAccepted: false,
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [ref, setRef] = useState("");
  const submissionId = useRef(rid());
  const set = (k: string, v: any) => { setF(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: "" })); };

  const isPreorder = f.paymentMethod === "PRE-ORDER";
  const mop = useMemo(() => MOPS.find(m => m.id === f.paymentMethod), [f.paymentMethod]);

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email address";
      if (!f.fbIgName.trim()) e.fbIgName = "Facebook / IG name is required";
      if (!f.receiverName.trim()) e.receiverName = "Receiver full name is required";
      if (!/^(09\d{9}|\+?639\d{9})$/.test(f.contactNumber.replace(/[\s-]/g, ""))) e.contactNumber = "Enter a valid PH mobile number (09XX XXX XXXX)";
    }
    if (s === 2) {
      if (!f.region) e.region = "Select your region";
      if (!f.city.trim()) e.city = "City / Municipality is required";
      if (f.address.trim().length < 10) e.address = "Enter your complete delivery address";
    }
    if (s === 3) {
      if (!f.paymentMethod) e.paymentMethod = "Choose your mode of payment";
      if (isPreorder && !f.preorderAccepted) e.preorderAccepted = "Please read and accept the Pre-Order Policy to continue";
    }
    if (s === 4 && !f.privacyAccepted) e.privacyAccepted = "Please accept the Privacy Policy and Terms & Conditions";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (busy) return;
    if (!validateStep(4)) return;
    setBusy(true); setServerError("");
    try {
      const r = await fetch("/api/submit-order-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, submissionId: submissionId.current, website: "" }),
      });
      const out = await r.json().catch(() => null);
      if (r.ok && out?.ok) { setRef(out.ref); setScreen("done"); track("order_form_submit" as any, { d: { mop: f.paymentMethod } }); }
      else if (r.status === 422 && out?.fields) { setErrs(out.fields); setServerError("Please review the highlighted fields."); }
      else setServerError(out?.error || "Something went wrong — please try again.");
    } catch { setServerError("Connection problem — please try again."); }
    setBusy(false);
  };

  const Logo = ({ size = 72 }: { size?: number }) => (
    <img src="/sb-logo.jpg" alt="SoleBlessing" width={size} height={size}
      className="rounded-full shadow-lg" style={{ border: "2px solid #1f1f1f" }} />
  );

  const Progress = ({ at }: { at: number }) => (
    <div className="flex items-start justify-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const n = i + 1, done = n < at, cur = n === at;
        return (
          <div key={s} className="flex items-start">
            {i > 0 && <div className="h-[2.5px] w-7 sm:w-12 mt-[13px]" style={{ background: n <= at ? ORANGE : "#e5e5e3" }} />}
            <div className="flex flex-col items-center w-[64px] sm:w-[76px]">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black"
                style={done || cur ? { background: ORANGE, color: "#fff" } : { background: "#eceae7", color: "#9a9a97" }}>
                {done ? "✓" : n}
              </div>
              <span className={`mt-1.5 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wide text-center leading-tight ${cur ? "text-[#0a0a0a]" : "text-[#9a9a97]"}`}>{s}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const field = (label: string, key: string, props: any = {}, required = true, hint?: string) => (
    <div>
      <label className="text-[10.5px] font-black tracking-[.06em] uppercase text-[#5c5c58] block mb-1.5">
        {label} {required ? <span style={{ color: ORANGE }}>*</span> : <span className="text-[#b5b5b1] normal-case font-bold">(Optional)</span>}
      </label>
      <input value={(f as any)[key]} onChange={e => set(key, e.target.value)} {...props}
        className={`w-full border-[1.5px] rounded-xl px-4 py-3 text-[14px] outline-none transition-colors bg-white ${errs[key] ? "border-red-400" : "border-[#e4e2df] focus:border-[#0a0a0a]"}`} />
      {hint && !errs[key] && <p className="text-[10.5px] text-[#9a9a97] mt-1">{hint}</p>}
      {errs[key] && <p className="text-[11px] font-bold text-red-500 mt-1" role="alert">{errs[key]}</p>}
    </div>
  );

  const NextBtn = ({ label, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3.5 rounded-xl text-[13px] font-black uppercase tracking-[.08em] text-white transition-all disabled:opacity-50 active:scale-[.99]"
      style={{ background: ORANGE }}>{label}</button>
  );
  const BackBtn = ({ to }: { to: 1 | 2 | 3 }) => (
    <button onClick={() => setScreen(to)} className="w-full py-3 rounded-xl text-[12px] font-black uppercase tracking-[.08em] text-[#5c5c58] bg-[#f1efec] hover:bg-[#eae8e4]">← Back</button>
  );

  const review = (title: string, rows: [string, string][], editTo: 1 | 2 | 3) => (
    <div className="border border-[#eceae7] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[11px] font-black uppercase tracking-[.1em] text-[#0a0a0a]">{title}</h3>
        <button onClick={() => setScreen(editTo)} className="text-[11px] font-black" style={{ color: ORANGE }}>✎ Edit</button>
      </div>
      {rows.map(([k, v]) => v ? (
        <div key={k} className="flex gap-3 py-1 text-[12.5px]">
          <span className="text-[#9a9a97] font-semibold w-28 shrink-0">{k}</span>
          <span className="font-bold text-[#1a1a1a] break-words min-w-0">{v}</span>
        </div>
      ) : null)}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <div className="max-w-[560px] mx-auto px-4 py-6 sm:py-10">
        {/* brand header */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <Logo size={screen === "welcome" ? 0 : 46} />
          {screen !== "welcome" && <div className="text-white font-black tracking-[.14em] text-[15px]">SOLEBLESSING<span style={{ color: ORANGE }}>®</span></div>}
        </div>

        <div className="bg-[#faf9f7] rounded-3xl overflow-hidden shadow-2xl">
          {/* ───── WELCOME ───── */}
          {screen === "welcome" && (
            <div className="px-6 py-10 text-center">
              <div className="flex justify-center mb-5"><Logo size={110} /></div>
              <h1 className="text-[26px] font-black text-[#0a0a0a] tracking-tight mb-2">Place Your Order</h1>
              <p className="text-[13px] text-[#6b6b68] leading-relaxed max-w-[380px] mx-auto mb-6">
                Fill out the form below to process your order with SoleBlessing. Our team will prepare your items and send your official invoice by email.
              </p>
              <div className="space-y-3 text-left max-w-[380px] mx-auto mb-7">
                {[["🛡️", "Secure & Confidential", "Your information is protected."],
                  ["⚡", "Fast & Easy", "Complete in a few simple steps."],
                  ["⭐", "Earn Loyalty Points", "Get points with your purchase (except Pre-Order)."]].map(([i, t, d]) => (
                  <div key={t} className="flex items-center gap-3 bg-white border border-[#eceae7] rounded-2xl px-4 py-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-[16px]" style={{ background: "#fff3e8" }}>{i}</span>
                    <div><div className="text-[12.5px] font-black text-[#0a0a0a]">{t}</div><div className="text-[11px] text-[#8a8a86]">{d}</div></div>
                  </div>
                ))}
              </div>
              <NextBtn label="Start Order →" onClick={() => setScreen(1)} />
            </div>
          )}

          {/* ───── SCREEN 1: CUSTOMER INFO ───── */}
          {screen === 1 && (
            <div className="px-5 sm:px-7 py-7">
              <Progress at={1} />
              <h2 className="text-[17px] font-black text-[#0a0a0a] mb-4">👤 Customer Information</h2>
              <div className="space-y-4">
                {field("Email Address", "email", { type: "email", placeholder: "juan@example.com", inputMode: "email", autoComplete: "email" })}
                {field("Facebook / IG Name", "fbIgName", { placeholder: "Juan Dela Cruz" })}
                {field("VIP Member ID", "vipId", { placeholder: "SB12345" }, false, "Enter your VIP ID to earn loyalty points on this order.")}
                {field("Receiver Full Name", "receiverName", { placeholder: "Juan Dela Cruz", autoComplete: "name" })}
                {field("Contact Number", "contactNumber", { type: "tel", placeholder: "0917 123 4567", inputMode: "tel", autoComplete: "tel" })}
              </div>
              <div className="mt-6"><NextBtn label="Next: Delivery Info →" onClick={() => { if (validateStep(1)) setScreen(2); }} /></div>
            </div>
          )}

          {/* ───── SCREEN 2: DELIVERY ───── */}
          {screen === 2 && (
            <div className="px-5 sm:px-7 py-7">
              <Progress at={2} />
              <h2 className="text-[17px] font-black text-[#0a0a0a] mb-4">📍 Delivery Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10.5px] font-black tracking-[.06em] uppercase text-[#5c5c58] block mb-1.5">Region <span style={{ color: ORANGE }}>*</span></label>
                  <select value={f.region} onChange={e => set("region", e.target.value)}
                    className={`w-full border-[1.5px] rounded-xl px-4 py-3 text-[14px] outline-none bg-white ${errs.region ? "border-red-400" : "border-[#e4e2df] focus:border-[#0a0a0a]"}`}>
                    <option value="">Select Region</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {errs.region && <p className="text-[11px] font-bold text-red-500 mt-1" role="alert">{errs.region}</p>}
                </div>
                {field("City / Municipality", "city", { placeholder: "e.g. Tagaytay City" })}
                <div>
                  <label className="text-[10.5px] font-black tracking-[.06em] uppercase text-[#5c5c58] block mb-1.5">Complete Delivery Address <span style={{ color: ORANGE }}>*</span></label>
                  <textarea value={f.address} onChange={e => set("address", e.target.value)} rows={3}
                    placeholder="House/Unit No., Street, Barangay, Subdivision/Building, Landmarks (e.g. near school, church, mall, etc.)"
                    className={`w-full border-[1.5px] rounded-xl px-4 py-3 text-[14px] outline-none resize-none bg-white ${errs.address ? "border-red-400" : "border-[#e4e2df] focus:border-[#0a0a0a]"}`} />
                  {errs.address && <p className="text-[11px] font-bold text-red-500 mt-1" role="alert">{errs.address}</p>}
                </div>
                <div>
                  <label className="text-[10.5px] font-black tracking-[.06em] uppercase text-[#5c5c58] block mb-1.5">Special Request / Notes <span className="text-[#b5b5b1] normal-case font-bold">(Optional)</span></label>
                  <textarea value={f.specialRequest} onChange={e => set("specialRequest", e.target.value)} rows={2}
                    placeholder="Add any special request or additional instructions (e.g. packaging, preferred courier, etc.)"
                    className="w-full border-[1.5px] border-[#e4e2df] rounded-xl px-4 py-3 text-[14px] outline-none resize-none bg-white focus:border-[#0a0a0a]" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-[1fr_2fr] gap-3"><BackBtn to={1} /><NextBtn label="Next: Payment →" onClick={() => { if (validateStep(2)) setScreen(3); }} /></div>
            </div>
          )}

          {/* ───── SCREEN 3: PAYMENT METHOD ───── */}
          {screen === 3 && (
            <div className="px-5 sm:px-7 py-7">
              <Progress at={3} />
              <h2 className="text-[17px] font-black text-[#0a0a0a] mb-1.5">💳 Payment Method (MOP)</h2>
              <p className="text-[12px] text-[#8a8a86] mb-4">Choose your preferred mode of payment.</p>
              <div className="space-y-2.5">
                {MOPS.map(m => {
                  const on = f.paymentMethod === m.id;
                  return (
                    <div key={m.id}>
                    <label className={`flex items-center gap-3 border-[1.5px] rounded-2xl px-4 py-3 cursor-pointer transition-all bg-white ${on ? "shadow-sm" : "border-[#e4e2df] hover:border-[#cfcdc9]"}`}
                      style={on ? { borderColor: ORANGE, background: "#fff9f4" } : undefined}>
                      <input type="radio" name="mop" checked={on} onChange={() => { set("paymentMethod", m.id); if (m.id !== "PRE-ORDER") set("preorderAccepted", false); }}
                        className="w-4 h-4 shrink-0" style={{ accentColor: ORANGE }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-black text-[#0a0a0a]">
                          {m.label} {m.isNew && <span className="ml-1 text-[8.5px] font-black text-white px-1.5 py-0.5 rounded-full align-middle" style={{ background: ORANGE }}>NEW</span>}
                        </div>
                        <div className="text-[11px] text-[#8a8a86]">{m.desc}</div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-1 rounded-lg shrink-0" style={{ background: "#fff3e8", color: "#b45309" }}>{m.pts} pts</span>
                    </label>
                    {/* COD shipping notice (Pia-approved mock): short, informational, no checkbox */}
                    {m.id === "COD" && on && (
                      <div className="mt-3 border-[1.5px] rounded-2xl px-4 py-3" style={{ borderColor: "#F8C89B", background: "#FFF9F4" }}>
                        <div className="text-[11.5px] font-black tracking-wide mb-1.5" style={{ color: "#b45309" }}>🚚 COD SHIPPING NOTICE</div>
                        <p className="text-[11.5px] text-[#4a4a46] leading-relaxed">
                          For COD orders, the <b>shipping fee is paid in advance</b> before dispatch — we pay the courier upfront to
                          secure your shipment. The exact amount will be shown on your invoice. Once the shipping fee is confirmed,
                          we dispatch your order, and the <b>remaining product balance is collected by the courier upon delivery</b>.
                          Thank you for your understanding! 🙏
                        </p>
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
              {errs.paymentMethod && <p className="text-[11px] font-bold text-red-500 mt-2" role="alert">{errs.paymentMethod}</p>}

              {isPreorder && (
                <div className="mt-4 border-[1.5px] rounded-2xl overflow-hidden" style={{ borderColor: ORANGE }}>
                  <div className="px-4 py-3 text-[12px] font-black text-white uppercase tracking-wide" style={{ background: ORANGE }}>
                    ⚠ Pre-Order Policy — Full Payment Required
                  </div>
                  <div className="bg-[#fffaf5] px-4 py-3 max-h-56 overflow-y-auto space-y-2.5">
                    <p className="text-[11.5px] text-[#4a4a46] leading-relaxed">By selecting PRE-ORDER, the customer acknowledges and agrees to the following:</p>
                    {PREORDER_POLICY.map(([t, b]) => (
                      <div key={t}><div className="text-[11.5px] font-black text-[#0a0a0a]">{t}</div><p className="text-[11.5px] text-[#4a4a46] leading-relaxed">{b}</p></div>
                    ))}
                    <p className="text-[11.5px] text-[#4a4a46] leading-relaxed font-semibold">By submitting a PRE-ORDER, the customer confirms that they have read, understood, and agreed to these conditions.</p>
                  </div>
                  <label className="flex items-start gap-2.5 px-4 py-3 bg-white border-t border-[#f3e8dc] cursor-pointer">
                    <input type="checkbox" checked={f.preorderAccepted} onChange={e => set("preorderAccepted", e.target.checked)}
                      className="w-4 h-4 mt-0.5 shrink-0" style={{ accentColor: ORANGE }} />
                    <span className="text-[12px] font-bold text-[#1a1a1a]">I have read and agree to the <span style={{ color: ORANGE }}>Pre-Order Policy</span>.</span>
                  </label>
                  {errs.preorderAccepted && <p className="text-[11px] font-bold text-red-500 px-4 pb-3" role="alert">{errs.preorderAccepted}</p>}
                </div>
              )}
              <div className="mt-6 grid grid-cols-[1fr_2fr] gap-3"><BackBtn to={2} /><NextBtn label="Next: Review →" onClick={() => { if (validateStep(3)) setScreen(4); }} /></div>
            </div>
          )}

          {/* ───── SCREEN 4: REVIEW & SUBMIT ───── */}
          {screen === 4 && (
            <div className="px-5 sm:px-7 py-7">
              <Progress at={4} />
              <h2 className="text-[17px] font-black text-[#0a0a0a] mb-1.5">📋 Review Your Order</h2>
              <p className="text-[12px] text-[#8a8a86] mb-4">Please review your information before submitting your order.</p>
              <div className="space-y-3">
                {review("👤 Customer Details", [["Email", f.email], ["FB / IG Name", f.fbIgName], ["VIP Member ID", f.vipId], ["Receiver Name", f.receiverName], ["Contact Number", f.contactNumber]], 1)}
                {review("📍 Delivery Details", [["Region", f.region], ["City", f.city], ["Address", f.address], ["Notes", f.specialRequest]], 2)}
                {review("💳 Payment Method", [["Selected MOP", mop ? mop.label : ""], ["Conditions", isPreorder ? "Full payment required · ETA 7–14 days from payment confirmation" : (mop?.desc || "")], ["Pre-Order Policy", isPreorder ? "Accepted ✓" : ""]], 3)}
              </div>
              <label className={`mt-4 flex items-start gap-2.5 border-[1.5px] rounded-2xl px-4 py-3 cursor-pointer bg-white ${errs.privacyAccepted ? "border-red-400" : "border-[#e4e2df]"}`}>
                <input type="checkbox" checked={f.privacyAccepted} onChange={e => set("privacyAccepted", e.target.checked)}
                  className="w-4 h-4 mt-0.5 shrink-0" style={{ accentColor: ORANGE }} />
                <span className="text-[12px] font-bold text-[#1a1a1a]">
                  I have read and agree to the <a href="/privacy-policy" target="_blank" className="underline" style={{ color: ORANGE }}>Privacy Policy</a> and <a href="/terms" target="_blank" className="underline" style={{ color: ORANGE }}>Terms &amp; Conditions</a>{isPreorder ? <> and the <span style={{ color: ORANGE }}>Pre-Order Policy</span></> : null}.
                </span>
              </label>
              {errs.privacyAccepted && <p className="text-[11px] font-bold text-red-500 mt-1.5" role="alert">{errs.privacyAccepted}</p>}
              {serverError && <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-[12px] font-bold rounded-xl px-4 py-3">{serverError}</div>}
              <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
                <BackBtn to={3} />
                <NextBtn label={busy ? "Submitting…" : "Submit Order ✓"} onClick={submit} disabled={busy} />
              </div>
            </div>
          )}

          {/* ───── SUCCESS ───── */}
          {screen === "done" && (
            <div className="px-6 py-10 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-[28px] text-white" style={{ background: "#16a34a" }}>✓</div>
              <h1 className="text-[22px] font-black text-[#0a0a0a] mb-1">Order Submitted Successfully!</h1>
              <p className="text-[13px] text-[#6b6b68] mb-5">Thank you for placing your order with SoleBlessing.</p>
              <div className="bg-[#0d0d0d] rounded-2xl px-5 py-4 mb-4">
                <div className="text-[9.5px] font-black uppercase tracking-[.16em] text-[#8a8a86] mb-1">Your Order Reference</div>
                <div className="text-[22px] font-black text-white tracking-wider">{ref}</div>
              </div>
              <div className="text-left bg-white border border-[#eceae7] rounded-2xl px-4 py-3 mb-4 space-y-1">
                <div className="flex gap-3 text-[12.5px]"><span className="text-[#9a9a97] font-semibold w-28 shrink-0">Customer</span><span className="font-bold">{f.receiverName}</span></div>
                <div className="flex gap-3 text-[12.5px]"><span className="text-[#9a9a97] font-semibold w-28 shrink-0">Payment</span><span className="font-bold">{mop?.label}</span></div>
                <div className="flex gap-3 text-[12.5px]"><span className="text-[#9a9a97] font-semibold w-28 shrink-0">Status</span><span className="font-bold">{isPreorder ? "PRE-ORDER — Awaiting Full Payment" : "Received — Awaiting Review"}</span></div>
              </div>
              <p className="text-[12.5px] text-[#4a4a46] leading-relaxed mb-3">
                Your order details have been received and are now awaiting review by our team. Our staff will prepare your order and send your official invoice and payment instructions through your registered email address.
              </p>
              <div className="text-left flex gap-3 items-start rounded-xl px-4 py-3 mb-3 border" style={{ background: "#fffaf3", borderColor: "#ffd9ad" }}>
                <span className="text-[18px] leading-none mt-0.5">📧</span>
                <div>
                  <div className="text-[12.5px] font-black text-[#0a0a0a]">Please wait for your invoice</div>
                  <div className="text-[12px] text-[#6b6b68] leading-relaxed">We will send your official invoice to <span className="font-bold text-[#0a0a0a]">{f.email}</span>. No need to message us — kindly check your inbox (and spam folder) within 24 hours.</div>
                </div>
              </div>
              {isPreorder && (
                <p className="text-[12px] font-bold leading-relaxed rounded-xl px-4 py-3" style={{ background: "#fff3e8", color: "#b45309" }}>
                  Your pre-order requires full payment. Your order will only be confirmed after payment has been received and verified. Estimated arrival is 7–14 days from payment confirmation.
                </p>
              )}
              <a href="/" className="inline-block mt-5 text-[12px] font-black uppercase tracking-wide" style={{ color: ORANGE }}>← Back to SoleBlessing</a>
            </div>
          )}
        </div>

        <p className="text-center text-[10.5px] text-[#6b6b68] mt-5">🛡️ Secure &amp; Private — your information is handled safely and confidentially.</p>
      </div>
    </div>
  );
}
