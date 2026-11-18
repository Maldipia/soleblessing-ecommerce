// SB2.0 — order success: timeline status (per approved board) + INLINE
// payment-proof upload (no detour to the portal; order no., name & amount
// are already known). Data source (sessionStorage) unchanged.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Upload, Copy } from "lucide-react";
import { sb } from "@/lib/supabase";

const fmt = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;
type PayMethod = { id: string; label: string; detail: string; enabled: boolean; icon: string };

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedAcct, setCopiedAcct] = useState(false);
  // inline proof upload
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [refNo, setRefNo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [upErr, setUpErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem("sb_last_order");
      if (data) setOrder(JSON.parse(data));
      else setLocation("/products");
    } catch { setLocation("/products"); }
  }, []);

  // load payment accounts so the customer sees where to send the money
  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.select("sb_settings", "select=key,value&key=eq.payment_methods");
        const v = rows?.[0]?.value;
        const arr = typeof v === "string" ? JSON.parse(v) : v;
        if (Array.isArray(arr)) setMethods(arr.filter((m: any) => m.enabled));
      } catch {}
    })();
  }, []);

  const copyOrderNumber = () => {
    if (!order) return;
    try { navigator.clipboard.writeText(order.orderNumber); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitProof = async () => {
    if (!file || !order) { setUpErr("Attach your payment screenshot first."); return; }
    if (file.size > 10 * 1024 * 1024) { setUpErr("File too big — max 10MB."); return; }
    setBusy(true); setUpErr("");
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const rd = new FileReader();
        rd.onload = () => res(String(rd.result).split(",")[1] || "");
        rd.onerror = rej;
        rd.readAsDataURL(file);
      });
      const r = await fetch("/api/upload-proof", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderNumber, customerName: order.customerName || "",
          paymentMethod: order.paymentMethod || "", referenceNumber: refNo.trim(),
          fileBase64: base64, mimeType: file.type || "image/jpeg", fileName: file.name,
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || `Upload failed (${r.status})`);
      setUploaded(true);
    } catch (e: any) {
      setUpErr(e?.message || "Upload failed — please try again.");
    } finally { setBusy(false); }
  };

  if (!order) return null;
  const cod = order.paymentMethod === "cod";
  const firstName = String(order.customerName || "").trim().split(/\s+/)[0] || "friend";
  const method = methods.find(m => m.id === order.paymentMethod) || null;

  const timeline = [
    { label: "Order received", sub: "Confirmation emailed with your order details", state: "done" },
    cod
      ? { label: "Confirmation call", sub: `We'll contact ${order.contactNumber || "you"} to confirm delivery`, state: "now" }
      : uploaded
      ? { label: "Payment proof submitted", sub: "We're verifying it — confirmation email follows", state: "done" }
      : { label: "Payment", sub: "Send the amount below, then upload your proof", state: "now" },
    { label: "Packing", sub: "We prepare your pairs after verification", state: uploaded && !cod ? "now" : "" },
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

        {/* Inline payment + proof upload / COD note */}
        {!cod ? (
          uploaded ? (
            <div className="bg-[#e8f5ee] rounded-2xl p-5 mb-3 text-center">
              <CheckCircle className="h-6 w-6 text-[#1a7f4e] mx-auto mb-2" />
              <p className="text-[13.5px] text-[#1a7f4e] font-black mb-0.5">Payment proof submitted!</p>
              <p className="text-[11.5px] text-[#1a7f4e]/80 font-semibold">We'll verify it and email your confirmation. Salamat! 🙏</p>
            </div>
          ) : (
          <div className="bg-white border-[1.5px] border-[#FF5A1F] rounded-2xl p-5 mb-3">
            <h3 className="text-[11px] font-black uppercase tracking-[.14em] text-[#0a0a0a] mb-1 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-[#FF5A1F]" /> Pay & Upload Proof
            </h3>
            <p className="text-[12px] text-[#8b8b88] font-semibold mb-3">
              Send <b className="text-[#0a0a0a]">{fmt(order.total)}</b>{method ? <> via <b className="text-[#0a0a0a]">{method.label}</b></> : null}, then upload your screenshot here — done in one step, no retyping.
            </p>
            {method && (
              <div className="bg-[#f6f6f5] rounded-xl p-3 mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-black text-[#0a0a0a]">{method.icon} {method.label}</p>
                  <p className="text-[11.5px] text-[#555] font-semibold truncate">{method.detail}</p>
                </div>
                <button onClick={() => { try { navigator.clipboard.writeText(method.detail); } catch {} setCopiedAcct(true); setTimeout(()=>setCopiedAcct(false),2000); }}
                  className="text-[10px] font-black uppercase tracking-wide text-[#FF5A1F] border border-[#FF5A1F] px-2.5 py-1.5 rounded-full hover:bg-[#fff7f3] flex-shrink-0">
                  {copiedAcct ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
            <input value={refNo} onChange={e => setRefNo(e.target.value)}
              placeholder="Reference / transaction no. (optional)"
              className="w-full border border-[#e6e6e4] rounded-xl px-3.5 py-3 text-[13px] font-semibold outline-none focus:border-[#FF5A1F] mb-2.5" />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); setUpErr(""); }} />
            <button onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl py-5 mb-2.5 text-center ${file ? "border-[#1a7f4e] bg-[#e8f5ee]" : "border-[#e6e6e4] hover:border-[#FF5A1F]"}`}>
              {file
                ? <span className="text-[12.5px] font-bold text-[#1a7f4e]">📎 {file.name} — ready</span>
                : <span className="text-[12px] font-semibold text-[#8b8b88]">Tap to attach your payment screenshot<br/><span className="text-[10px]">JPG · PNG · PDF</span></span>}
            </button>
            {upErr && <p className="text-[11.5px] text-red-500 font-bold mb-2">{upErr}</p>}
            <button onClick={submitProof} disabled={busy}
              className="w-full bg-[#FF5A1F] text-white py-4 text-xs font-black tracking-[.12em] uppercase rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" /> {busy ? "Uploading…" : `Submit Proof — ${fmt(order.total)}`}
            </button>
          </div>
          )
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
