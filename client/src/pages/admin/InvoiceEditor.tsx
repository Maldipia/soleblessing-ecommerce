// Generate Invoice — the admin's own invoice editor (replaces the Google
// Drive invoice flow). Opens from the existing Generate Invoice action,
// prefills customer data from the order (never retyped), admin encodes
// items, auto-calculates totals, and issues the secure 7-day customer link.
// Saving EDITS THE ORDER ITSELF (the native /invoice page renders from it) —
// one invoice engine, no duplicates. Saves go through the audited admin API.
import { useEffect, useMemo, useState } from "react";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { sbAdmin as sb, adminCred } from "@/lib/supabaseAdmin";
import { toast } from "sonner";

const peso = (c: number) => `₱${((c || 0) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DEFAULT_SHIP = 25000; // ₱250 default — EDITABLE, never forced (confirm with Pia)

type Line = { orig?: any; code: string; name: string; size: string; qty: number; price: string; found: boolean; imageUrl?: string };

export default function InvoiceEditor({ order, inventory, onClose, onSaved }:
  { order: any; inventory: any[]; onClose: () => void; onSaved: () => void }) {
  const lookup = (code: string) => (inventory || []).find((p: any) => (p.itemCode || "").toUpperCase() === code.trim().toUpperCase());

  const [lines, setLines] = useState<Line[]>(() => {
    const its = Array.isArray(order.items) ? order.items : [];
    if (!its.length) return [{ code: "", name: "", size: "", qty: 1, price: "", found: false }];
    return its.map((it: any) => ({ orig: it, code: it.preorder_item_code || (it.id === "PO" ? "" : it.id) || "", name: it.name || "",
      size: it.size || "", qty: it.qty || 1, price: String(((it.price || 0) / 100) || ""), found: false, imageUrl: it.imageUrl }));
  });
  const [discVal, setDiscVal] = useState(order.discount_amount ? String(order.discount_amount / 100) : "0");
  const [discPct, setDiscPct] = useState(false);
  const [ship, setShip] = useState(String(((order.shipping_fee || (order.total ? 0 : DEFAULT_SHIP)) || DEFAULT_SHIP) / 100));
  const [invNo, setInvNo] = useState(order.invoice_no || order.order_number);
  const hasInvNoCol = Object.prototype.hasOwnProperty.call(order, "invoice_no");
  const [days, setDays] = useState(7);
  const [linkState, setLinkState] = useState<any>(null); // {active, expires_at}
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => { try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminCred(), op: "invoice_link", action: "status", order_number: order.order_number }) });
      const out = await r.json().catch(() => ({} as any));
      if (!dead && r.ok) setLinkState(out.link && out.link.active ? out.link : null);
    } catch {} })();
    return () => { dead = true; };
  }, []);

  const subtotal = lines.reduce((s, l) => s + (Math.round(Number(l.price) * 100) || 0) * (l.qty || 1), 0);
  const discount = discPct ? Math.round(subtotal * (Number(discVal) || 0) / 100) : Math.round((Number(discVal) || 0) * 100);
  const shipC = Math.round((Number(ship) || 0) * 100);
  const total = Math.max(0, subtotal - discount + shipC);
  const expiryPreview = useMemo(() => new Date(Date.now() + days * 86400000)
    .toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }), [days]);

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  const onCode = (i: number, code: string) => {
    const f = lookup(code);
    if (f) setLine(i, { code, found: true, name: f.name || "", size: f.size || "", imageUrl: f.imageUrl,
      price: f.sellingPrice ? String(f.sellingPrice / 100) : "" });
    else setLine(i, { code, found: false });
  };
  const addFromSearch = (p: any) => {
    setLines(ls => [...ls.filter(l => l.name.trim() || l.code.trim()), { code: p.itemCode || "", name: p.name || "", size: p.size || "",
      qty: 1, price: p.sellingPrice ? String(p.sellingPrice / 100) : "", found: true, imageUrl: p.imageUrl }]);
    setSearch("");
  };
  const results = search.trim().length >= 2
    ? (inventory || []).filter((p: any) => [p.itemCode, p.sku, p.name].some(v => String(v || "").toLowerCase().includes(search.trim().toLowerCase()))).slice(0, 6)
    : [];

  const isPreorder = String(order.payment_method || "").toUpperCase() === "PRE-ORDER";
  const buildPayload = () => {
    const items = lines.filter(l => l.name.trim() && Number(l.price) > 0).map(l => {
      const base = l.orig ? { ...l.orig } : {};
      const f = lookup(l.code);
      // Canonical code casing from inventory when it matches; else as typed.
      const realCode = f ? f.itemCode : l.code.trim().toUpperCase();
      // PRE-ORDER rule (approved Phase 2): id stays 'PO' so nothing associates
      // with live stock, and the REAL code is retained in preorder_item_code —
      // never discarded. Same when the admin typed no code at all.
      const keepPO = isPreorder || (l.orig && l.orig.id === "PO") || !realCode || realCode === "PO";
      return { ...base, id: keepPO ? "PO" : realCode,
        ...(keepPO && realCode && realCode !== "PO" ? { preorder_item_code: realCode } : {}),
        name: l.name.trim(), sku: (f && f.sku) || base.sku || "", size: l.size.trim(),
        price: Math.round(Number(l.price) * 100), qty: l.qty || 1, imageUrl: l.imageUrl || base.imageUrl || "" };
    });
    const p: any = { items, subtotal, discount_amount: discount, shipping_fee: shipC, total };
    if (hasInvNoCol && invNo.trim()) p.invoice_no = invNo.trim();
    return p;
  };

  const saveDraft = async (silent = false) => {
    const p = buildPayload();
    if (!p.items.length) { toast.error("Add at least one item with a name and price"); return false; }
    setBusy("save");
    try {
      await sb.update("sb_orders", `id=eq.${order.id}`, { ...p, updated_at: new Date().toISOString() });
      if (!silent) toast.success("Draft saved — no link sent yet");
      onSaved(); return true;
    } catch (e: any) { toast.error("Save failed: " + (e?.message || "").slice(0, 120)); return false; }
    finally { setBusy(""); }
  };

  const generateAndSend = async () => {
    if (!(await saveDraft(true))) return;
    setBusy("gen");
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminCred(), op: "invoice_link", action: "issue", order_number: order.order_number, days }) });
      const out = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(out.error || "could not issue link");
      setLinkState({ active: true, expires_at: out.expires_at });
      try { await navigator.clipboard.writeText(out.url); } catch {}
      // Email the confidential "invoice ready" notification (no order details,
      // just the secure link). Gated server-side until the GAS email patch is
      // applied — link is already on the clipboard either way.
      let emailed = false, emailNote = "";
      if (order.customer_email) {
        try {
          const er = await fetch("/api/send-order-email", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...adminCred(), order_number: order.order_number, type: "invoice_ready" }) });
          const eo = await er.json().catch(() => ({} as any));
          if (er.ok) emailed = true; else emailNote = eo.error || "";
        } catch {}
      } else emailNote = "no email on this order";
      if (emailed) toast.success(`Invoice sent to ${order.customer_email} — link also copied (valid ${days} days).`);
      else toast.success(`Invoice ready — customer link COPIED (valid ${days} days). Paste it in Messenger.${emailNote ? ` (Email not sent: ${emailNote})` : ""}`, { duration: 8000 });
      onSaved();
    } catch (e: any) { toast.error(e.message || "Link failed"); }
    finally { setBusy(""); }
  };

  const inp = "border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-[#C9A84C] bg-white";
  const Row = ({ k, v }: { k: string; v: any }) => (
    <div className="flex gap-2 text-[12px] py-1"><span className="text-gray-400 font-semibold w-16 shrink-0">{k}</span>
      <span className="font-bold text-[#0d2430] break-words min-w-0">{v || "—"}</span></div>);

  return (
    <div className="fixed inset-0 z-50 bg-[#f3f2ee] overflow-y-auto">
      {/* header — same bar language as the mock */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a] text-white px-5 py-3 flex items-center gap-3">
        <img src="/sb-logo.jpg" alt="" className="w-9 h-9 rounded-full object-contain" />
        <div><p className="text-[13px] font-black leading-tight">Generate Invoice</p>
          <p className="text-[10.5px] text-white/50 font-semibold">Create an online invoice for this order</p></div>
        <span className="ml-auto text-[11px] font-bold bg-[#C9A84C] text-[#0d2430] px-3 py-1.5 rounded-lg">Order: {order.order_number}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
      </div>

      <div className="max-w-[1340px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-[260px_1fr_248px] gap-4 items-start">
        {/* left — prefilled from the order (never retyped) */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[11px] font-black text-[#0d2430] mb-2">📄 Order Information</p>
            <Row k="Order No." v={order.order_number} />
            <Row k="Source" v={(order.source || "website") === "website" ? "🌐 Website" : "📋 FB Form"} />
            <Row k="MOP" v={<>{order.payment_method}{String(order.payment_method).toUpperCase() === "PRE-ORDER" && <span className="text-[9px] font-black text-orange-600 ml-1">FULL PAYMENT FIRST</span>}</>} />
            <Row k="Date" v={new Date(order.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[11px] font-black text-[#0d2430] mb-2">👤 Customer Details</p>
            <Row k="Name" v={order.customer_name} />
            <Row k="Email" v={order.customer_email} />
            <Row k="Mobile" v={order.contact_number} />
            <Row k="Address" v={order.shipping_address} />
          </div>
          {order.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-[11px] font-black text-[#0d2430] mb-2">💬 Customer Request / Notes</p>
              <p className="text-[12px] font-semibold text-[#4a4a46] bg-gray-50 rounded-xl px-3 py-2.5">{order.notes}</p>
            </div>
          )}
        </div>

        {/* middle — items + totals */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <p className="text-[12px] font-black text-[#0d2430]">🛒 Invoice Items</p>
            <div className="relative ml-auto w-full sm:w-[300px]">
              <input className={`${inp} w-full`} placeholder="Search by item code, product, or name…" value={search} onChange={e => setSearch(e.target.value)} />
              {results.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {results.map((p: any) => (
                    <button key={p.itemCode} onClick={() => addFromSearch(p)} className="w-full text-left px-3 py-2 hover:bg-[#C9A84C]/10 flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-gray-500">{p.itemCode}</span>
                      <span className="text-[11.5px] font-bold text-[#0d2430] truncate">{p.name}</span>
                      <span className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">{p.size} · {peso(p.sellingPrice || 0)}</span>
                    </button>))}
                </div>)}
            </div>
          </div>
          <div className="hidden md:grid grid-cols-[84px_minmax(150px,1fr)_70px_84px_92px_84px_24px] gap-2 text-[9.5px] font-black uppercase tracking-wider text-gray-400 px-1 mb-1">
            <span>Item code</span><span>Product / Item</span><span>Size</span><span>Qty</span><span>Unit price ₱</span><span className="text-right">Amount</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid md:grid-cols-[84px_minmax(150px,1fr)_70px_84px_92px_84px_24px] grid-cols-2 gap-2 items-center mb-2">
              <input className={`${inp} ${l.found ? "bg-green-50" : ""}`} placeholder="Code / PO" value={l.code} onChange={e => onCode(i, e.target.value)} />
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#F7F4EF] overflow-hidden items-center justify-center hidden md:flex flex-shrink-0">
                  {l.imageUrl ? <img src={l.imageUrl} className="w-full h-full object-cover" /> : <span className="opacity-40 text-[13px]">👟</span>}
                </div>
                <input className={`${inp} flex-1 min-w-0`} placeholder="Product name" value={l.name} onChange={e => setLine(i, { name: e.target.value })} />
              </div>
              <input className={inp} placeholder="Size" value={l.size} onChange={e => setLine(i, { size: e.target.value })} />
              <div className="flex items-center gap-1">
                <button onClick={() => setLine(i, { qty: Math.max(1, l.qty - 1) })} className="w-6 h-6 rounded-md border border-gray-200 text-gray-500 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                <span className="w-7 text-center text-[12px] font-black">{l.qty}</span>
                <button onClick={() => setLine(i, { qty: l.qty + 1 })} className="w-6 h-6 rounded-md border border-gray-200 text-gray-500 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
              </div>
              <input className={inp} inputMode="decimal" placeholder="0.00" value={l.price} onChange={e => setLine(i, { price: e.target.value })} />
              <span className="text-[12px] font-black text-[#0d2430] text-right tabular-nums">{peso((Math.round(Number(l.price) * 100) || 0) * l.qty)}</span>
              <button onClick={() => setLines(ls => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={() => setLines(ls => [...ls, { code: "", name: "", size: "", qty: 1, price: "", found: false }])}
            className="border-2 border-dashed border-[#C9A84C]/60 text-[#8a6d25] text-[11.5px] font-black px-4 py-2 rounded-xl hover:bg-[#C9A84C]/10 mb-4">+ Add Item</button>

          <div className="max-w-[380px] ml-auto space-y-2 text-[12.5px]">
            <div className="flex justify-between"><span className="font-semibold text-gray-500">Subtotal</span><span className="font-black tabular-nums">{peso(subtotal)}</span></div>
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-gray-500">Discount</span>
              <span className="flex items-center gap-1.5">
                <select className={inp} value={discPct ? "%" : "₱"} onChange={e => setDiscPct(e.target.value === "%")}><option>₱</option><option>%</option></select>
                <input className={`${inp} w-20 text-right`} inputMode="decimal" value={discVal} onChange={e => setDiscVal(e.target.value)} />
                <span className="font-black text-red-500 tabular-nums w-20 text-right">−{peso(discount)}</span>
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-gray-500">Shipping Fee ✏️</span>
              <span className="flex items-center gap-1.5">
                <input className={`${inp} w-24 text-right`} inputMode="decimal" value={ship} onChange={e => setShip(e.target.value)} />
                <span className="font-black tabular-nums w-20 text-right">{peso(shipC)}</span>
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#fdf6e3] border border-[#C9A84C]/40 rounded-xl px-4 py-3 mt-1">
              <span className="text-[13px] font-black text-[#0d2430]">Total Amount Due</span>
              <span className="text-[20px] font-black text-[#0d2430] tabular-nums">{peso(total)}</span>
            </div>
          </div>
        </div>

        {/* right — invoice settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-[11px] font-black text-[#0d2430]">⚙️ Invoice Settings</p>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice No.</p>
            {hasInvNoCol
              ? <input className={`${inp} w-full font-mono`} value={invNo} onChange={e => setInvNo(e.target.value)} />
              : <div className={`${inp} w-full font-mono bg-gray-50 text-gray-600`}>{order.order_number}</div>}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Link Access</p>
            <select className={`${inp} w-full`} value={days} onChange={e => setDays(parseInt(e.target.value))}>
              <option value={7}>7 Days (Default)</option><option value={14}>14 Days</option><option value={30}>30 Days</option>
            </select>
          </div>
          <div className="bg-[#fdf6e3] border border-[#C9A84C]/40 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#6b5a1e]">
            📅 Customer can view this invoice and submit payment proof until <b>{expiryPreview}</b>.
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-[12px] font-bold text-gray-500">Invoice Status</span>
            {linkState?.active
              ? <span className="text-[10.5px] font-black bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Link Active</span>
              : <span className="text-[10.5px] font-black bg-[#C9A84C]/20 text-[#8a6d25] px-2.5 py-1 rounded-full">Draft</span>}
          </div>
          {linkState?.active && <p className="text-[10px] font-semibold text-gray-400">current link valid until {new Date(linkState.expires_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} — generating again reissues (old link dies)</p>}
        </div>
      </div>

      {/* footer actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex items-center gap-2 flex-wrap">
        <button onClick={onClose} className="text-[12px] font-bold text-gray-500 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50">← Back to Orders</button>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={() => saveDraft()} disabled={!!busy} className="text-[12px] font-bold text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:border-[#C9A84C] disabled:opacity-50">
            {busy === "save" ? "Saving…" : "💾 Save Draft"}</button>
          <a href={`/invoice/${encodeURIComponent(order.order_number)}`} target="_blank" rel="noopener noreferrer"
            className="text-[12px] font-bold text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:border-[#C9A84C]">👁 Preview Invoice</a>
          <button onClick={generateAndSend} disabled={!!busy} className="text-[12px] font-black bg-[#C9A84C] text-[#0d2430] px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50">
            {busy === "gen" ? "Generating…" : "✈ Generate Invoice & Send Link"}</button>
        </div>
      </div>
    </div>
  );
}
