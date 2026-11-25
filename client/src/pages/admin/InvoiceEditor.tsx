// Generate Invoice — the admin's own invoice editor (replaces the Google
// Drive invoice flow). Layout per Pia's "Layaway Invoice Dashboard" mockup:
// Customer / Delivery / Settings cards, spreadsheet-style item rows
// (DATE·QTY·CODE·DETAILS·SKU·SIZE·PRICE·PAID·AMOUNT) with a Layaway Mode
// toggle, Payment/Layaway notes, and Total Paid / Remaining Balance.
// Saving EDITS THE ORDER ITSELF (the native /invoice page renders from it) —
// one invoice engine, no duplicates. Saves go through the audited admin API.
// Recording a PAID amount is bookkeeping only: it NEVER flips payment_status —
// verification stays in the existing proof-review flow.
import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Send } from "lucide-react";
import { sbAdmin as sb, adminCred } from "@/lib/supabaseAdmin";
import { toast } from "sonner";

const peso = (c: number) => `₱${((c || 0) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DEFAULT_SHIP = 25000; // ₱250 standard shipping — confirmed by Pia; EDITABLE, never forced
const MOPS = ["STRAIGHT PAYMENT", "COD", "COP", "LAY AWAY", "WALK-IN", "PRE-ORDER"];

type Line = { orig?: any; date: string; code: string; name: string; sku: string; size: string; qty: number; price: string; paid: string; found: boolean; imageUrl?: string };
const newLine = (): Line => ({ date: "", code: "", name: "", sku: "", size: "", qty: 1, price: "", paid: "", found: false });

export default function InvoiceEditor({ order, inventory, onClose, onSaved }:
  { order: any; inventory: any[]; onClose: () => void; onSaved: () => void }) {
  const lookup = (code: string) => (inventory || []).find((p: any) => (p.itemCode || "").toUpperCase() === code.trim().toUpperCase());

  const [lines, setLines] = useState<Line[]>(() => {
    const its = Array.isArray(order.items) ? order.items : [];
    if (!its.length) return [newLine()];
    return its.map((it: any) => ({ orig: it, date: it.date || "", code: it.preorder_item_code || (it.id === "PO" ? "" : it.id) || "",
      name: it.name || "", sku: it.sku || "", size: it.size || "", qty: it.qty || 1,
      price: it.price ? String(it.price / 100) : "", paid: it.paid ? String(it.paid / 100) : "", found: false, imageUrl: it.imageUrl }));
  });
  const [discVal, setDiscVal] = useState(order.discount_amount ? String(order.discount_amount / 100) : "0");
  const [discPct, setDiscPct] = useState(false);
  const [ship, setShip] = useState(String(((order.shipping_fee || (order.total ? 0 : DEFAULT_SHIP)) || DEFAULT_SHIP) / 100));
  const [invNo, setInvNo] = useState(order.invoice_no || order.order_number);
  const [mop, setMop] = useState(String(order.payment_method || "").toUpperCase());
  const [payNotes, setPayNotes] = useState(order.payment_notes || "");
  const [days, setDays] = useState(7);
  const [layaway, setLayaway] = useState(() => String(order.payment_method || "").toUpperCase().includes("LAY")
    || (Array.isArray(order.items) && order.items.some((it: any) => it.paid || it.date)));
  const [linkState, setLinkState] = useState<any>(null);
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

  const toC = (v: string) => Math.round((Number(v) || 0) * 100);
  const subtotal = lines.reduce((s, l) => s + (toC(l.price)) * (l.qty || 1), 0);
  const discount = discPct ? Math.round(subtotal * (Number(discVal) || 0) / 100) : toC(discVal);
  const shipC = toC(ship);
  const total = Math.max(0, subtotal - discount + shipC);
  const totalPaid = lines.reduce((s, l) => s + toC(l.paid), 0);
  const remaining = Math.max(0, total - totalPaid);
  const isPreorder = mop === "PRE-ORDER";
  const sent = !!order.invoice_sent_at;
  const expiryPreview = useMemo(() => new Date(Date.now() + days * 86400000)
    .toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }), [days]);

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  const onCode = (i: number, code: string) => {
    const f = lookup(code);
    if (f) setLine(i, { code, found: true, name: f.name || "", sku: f.sku || "", size: f.size || "", imageUrl: f.imageUrl,
      price: f.sellingPrice ? String(f.sellingPrice / 100) : "" });
    else setLine(i, { code, found: false });
  };
  const addFromSearch = (p: any) => {
    setLines(ls => [...ls.filter(l => l.name.trim() || l.code.trim()), { ...newLine(), code: p.itemCode || "", name: p.name || "",
      sku: p.sku || "", size: p.size || "", price: p.sellingPrice ? String(p.sellingPrice / 100) : "", found: true, imageUrl: p.imageUrl }]);
    setSearch("");
  };
  const results = search.trim().length >= 2
    ? (inventory || []).filter((p: any) => [p.itemCode, p.sku, p.name].some(v => String(v || "").toLowerCase().includes(search.trim().toLowerCase()))).slice(0, 6)
    : [];

  const buildPayload = () => {
    const items = lines.filter(l => l.name.trim() && Number(l.price) > 0).map(l => {
      const base = l.orig ? { ...l.orig } : {};
      const f = lookup(l.code);
      const realCode = f ? f.itemCode : l.code.trim().toUpperCase();
      // PRE-ORDER rule (approved Phase 2): id stays 'PO' so nothing associates
      // with live stock; the REAL code is retained in preorder_item_code.
      const keepPO = isPreorder || (l.orig && l.orig.id === "PO") || !realCode || realCode === "PO";
      return { ...base, id: keepPO ? "PO" : realCode,
        ...(keepPO && realCode && realCode !== "PO" ? { preorder_item_code: realCode } : {}),
        name: l.name.trim(), sku: l.sku.trim() || (f && f.sku) || base.sku || "", size: l.size.trim(),
        price: toC(l.price), qty: l.qty || 1, imageUrl: l.imageUrl || base.imageUrl || "",
        ...(l.date ? { date: l.date } : {}), ...(toC(l.paid) > 0 ? { paid: toC(l.paid) } : {}) };
    });
    const p: any = { items, subtotal, discount_amount: discount, shipping_fee: shipC, total,
      payment_notes: payNotes.trim() || null };
    if (invNo.trim()) p.invoice_no = invNo.trim();
    if (mop && mop !== String(order.payment_method || "").toUpperCase()) p.payment_method = mop;
    return p;
  };

  const saveDraft = async (silent = false) => {
    const p = buildPayload();
    if (!p.items.length) { toast.error("Add at least one item with a name and price"); return false; }
    setBusy("save");
    try {
      await sb.update("sb_orders", `id=eq.${order.id}`, { ...p, updated_at: new Date().toISOString() });
      if (!silent) toast.success("Draft saved — nothing sent yet");
      onSaved(); return true;
    } catch (e: any) { toast.error("Save failed: " + (e?.message || "").slice(0, 120)); return false; }
    finally { setBusy(""); }
  };

  // Send Invoice = save → issue/refresh the secure link → email the
  // confidential notification. The green "Sent" state comes from
  // invoice_sent_at, which the server stamps ONLY on a confirmed send.
  const sendInvoice = async () => {
    if (!(await saveDraft(true))) return;
    setBusy("send");
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminCred(), op: "invoice_link", action: "issue", order_number: order.order_number, days }) });
      const out = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(out.error || "could not issue link");
      setLinkState({ active: true, expires_at: out.expires_at });
      try { await navigator.clipboard.writeText(out.url); } catch {}
      let emailed = false, emailNote = "";
      if (order.customer_email) {
        try {
          const er = await fetch("/api/send-order-email", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...adminCred(), order_number: order.order_number, type: "invoice_ready" }) });
          const eo = await er.json().catch(() => ({} as any));
          if (er.ok) emailed = true; else emailNote = eo.error || "";
        } catch (e: any) { emailNote = String(e?.message || e); }
      } else emailNote = "no email on this order";
      if (emailed) toast.success(`✅ Invoice SENT to ${order.customer_email} — link valid ${days} days (also copied).`);
      else toast.warning(`Link ready & COPIED (valid ${days} days) — email NOT sent: ${emailNote}. Paste the link in Messenger, or retry after fixing.`, { duration: 9000 });
      onSaved();
    } catch (e: any) { toast.error(e.message || "Send failed"); }
    finally { setBusy(""); }
  };

  const inp = "border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#C9A84C] bg-white w-full";
  const card = "bg-white rounded-2xl border border-gray-100 p-4";
  const label = "text-[10px] font-bold text-gray-400 uppercase tracking-wider";
  const Row = ({ k, v }: { k: string; v: any }) => (
    <div className="flex gap-2 text-[12px] py-1"><span className="text-gray-400 font-semibold w-16 shrink-0">{k}</span>
      <span className="font-bold text-[#0d2430] break-words min-w-0">{v || "—"}</span></div>);
  const gridCols = layaway
    ? "md:grid-cols-[30px_118px_58px_92px_minmax(140px,1fr)_110px_72px_92px_92px_100px_24px]"
    : "md:grid-cols-[30px_58px_92px_minmax(170px,1.3fr)_120px_80px_100px_110px_24px]";

  return (
    <div className="fixed inset-0 z-50 bg-[#f3f2ee] overflow-y-auto">
      {/* header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a] text-white px-5 py-3 flex items-center gap-3">
        <img src="/sb-logo.jpg" alt="" className="w-9 h-9 rounded-full object-contain" />
        <div className="leading-tight mr-2"><p className="text-[13px] font-black">SoleBlessing</p><p className="text-[9.5px] text-white/50 font-bold tracking-widest">ADMIN</p></div>
        <div className="border-l border-white/20 pl-3">
          <p className="text-[14px] font-black leading-tight">📄 Generate Invoice</p>
          <p className="text-[10px] text-white/50 font-semibold">Create an online invoice for this order</p>
        </div>
        <span className="ml-auto text-[11px] font-bold bg-[#C9A84C] text-[#0d2430] px-3 py-1.5 rounded-lg whitespace-nowrap">Order: {order.order_number}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        {/* ── top cards: customer / delivery / settings ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className={card}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <p className="text-[12px] font-black text-[#0d2430]">👤 Customer Details</p>
              <span className="text-[9px] font-black bg-[#fdf6e3] text-[#8a6d25] border border-[#C9A84C]/40 px-2 py-0.5 rounded-full">Auto from Order Form</span>
            </div>
            <Row k="Name" v={order.customer_name} />
            <Row k="Contact" v={order.contact_number} />
            <Row k="Email" v={order.customer_email} />
          </div>
          <div className={card}>
            <p className="text-[12px] font-black text-[#0d2430] mb-2">🚚 Delivery Information</p>
            <Row k="Address" v={order.shipping_address} />
            <Row k="Notes" v={order.notes} />
          </div>
          <div className={card}>
            <p className="text-[12px] font-black text-[#0d2430] mb-2">📄 Invoice Settings</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <div><p className={label}>Invoice No.</p>
                <input className={`${inp} font-mono mt-0.5`} value={invNo} onChange={e => setInvNo(e.target.value)} /></div>
              <div><p className={label}>Payment Type</p>
                <select className={`${inp} mt-0.5`} value={mop} onChange={e => { setMop(e.target.value); if (e.target.value.includes("LAY")) setLayaway(true); }}>
                  {!MOPS.includes(mop) && mop && <option value={mop}>{mop}</option>}
                  {MOPS.map(m => <option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><p className={label}>Order No.</p><p className="text-[12px] font-black text-[#0d2430] mt-1 break-all">{order.order_number}</p></div>
              <div><p className={label}>Link Access</p>
                <select className={`${inp} mt-0.5`} value={days} onChange={e => setDays(parseInt(e.target.value))}>
                  <option value={7}>7 Days (Default)</option><option value={14}>14 Days</option><option value={30}>30 Days</option>
                </select></div>
              <div><p className={label}>Invoice Date</p>
                <p className="text-[12px] font-black text-[#0d2430] mt-1">📅 {new Date(order.created_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" })}</p></div>
              <div><p className={label}>Invoice Status</p>
                <p className="mt-1">{sent
                  ? <span className="text-[10.5px] font-black bg-green-100 text-green-700 px-2.5 py-1 rounded-lg">✓ Invoice Sent</span>
                  : linkState?.active
                  ? <span className="text-[10.5px] font-black bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg">Link Active</span>
                  : <span className="text-[10.5px] font-black bg-[#fdf6e3] text-[#8a6d25] px-2.5 py-1 rounded-lg">Draft</span>}</p></div>
            </div>
            <p className="text-[10px] font-semibold text-[#8a6d25] bg-[#fdf6e3] border border-[#C9A84C]/30 rounded-lg px-2.5 py-1.5 mt-2.5">
              📅 Customer can view & upload proof until <b>{expiryPreview}</b>{linkState?.active ? " · re-sending reissues (old link dies)" : ""}.</p>
          </div>
        </div>

        {/* ── invoice items ── */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <p className="text-[13px] font-black text-[#0d2430]">🛒 Invoice Items</p>
            <label className="flex items-center gap-2 ml-2 cursor-pointer select-none">
              <span className="text-[11px] font-bold text-gray-500">Layaway Mode <span className="text-gray-400 font-semibold">(Show Date &amp; Paid)</span></span>
              <button type="button" onClick={() => setLayaway(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative ${layaway ? "bg-[#C9A84C]" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${layaway ? "left-[18px]" : "left-0.5"}`} /></button>
            </label>
            <div className="relative ml-auto w-full sm:w-[260px]">
              <input className={inp} placeholder="Search item code / product…" value={search} onChange={e => setSearch(e.target.value)} />
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
            <button onClick={() => setLines(ls => [...ls, newLine()])}
              className="border-[1.5px] border-[#C9A84C] text-[#8a6d25] text-[11.5px] font-black px-3.5 py-1.5 rounded-xl hover:bg-[#C9A84C]/10 whitespace-nowrap">+ Add Row</button>
          </div>

          {/* table head */}
          <div className={`hidden md:grid ${gridCols} gap-1.5 bg-[#0d2430] text-white rounded-lg px-2 py-2 text-[9.5px] font-black uppercase tracking-wider mb-1.5`}>
            <span>#</span>{layaway && <span>Date</span>}<span className="text-center">Qty</span><span>Code</span><span>Details</span><span>SKU</span><span>Size</span><span className="text-right">Price</span>{layaway && <span className="text-right">Paid</span>}<span className="text-right">Amount</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className={`grid ${gridCols} grid-cols-2 gap-1.5 items-center mb-1.5`}>
              <span className="hidden md:block text-[11px] font-black text-gray-400 pl-1">{i + 1}</span>
              {layaway && <input type="date" className={inp} value={l.date} onChange={e => setLine(i, { date: e.target.value })} />}
              <input className={`${inp} text-center`} inputMode="numeric" value={l.qty}
                onChange={e => setLine(i, { qty: Math.max(1, parseInt(e.target.value) || 1) })} />
              <input className={`${inp} font-mono ${l.found ? "bg-green-50" : ""}`} placeholder="Code" value={l.code} onChange={e => onCode(i, e.target.value)} />
              <input className={inp} placeholder="Product description" value={l.name} onChange={e => setLine(i, { name: e.target.value })} />
              <input className={`${inp} font-mono`} placeholder="SKU" value={l.sku} onChange={e => setLine(i, { sku: e.target.value })} />
              <input className={inp} placeholder="Size" value={l.size} onChange={e => setLine(i, { size: e.target.value })} />
              <input className={`${inp} text-right`} inputMode="decimal" placeholder="0.00" value={l.price} onChange={e => setLine(i, { price: e.target.value })} />
              {layaway && <input className={`${inp} text-right`} inputMode="decimal" placeholder="0.00" value={l.paid} onChange={e => setLine(i, { paid: e.target.value })} />}
              <span className="text-[12px] font-black text-[#0d2430] text-right tabular-nums bg-[#fdf6e3] rounded-lg px-2 py-1.5">{peso(toC(l.price) * (l.qty || 1))}</span>
              <button onClick={() => setLines(ls => ls.length > 1 ? ls.filter((_, j) => j !== i) : [newLine()])} className="text-gray-300 hover:text-red-500 justify-self-center"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>

        {/* ── notes + totals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px_300px] gap-4 items-start">
          <div className={card}>
            <p className="text-[12px] font-black text-[#0d2430] mb-2">📝 Payment / Layaway Notes <span className="text-gray-400 font-semibold">(Optional)</span></p>
            <textarea className={`${inp} min-h-[76px] resize-y`} placeholder="e.g. Layaway: ₱100.00 per item. Next payment due: …"
              value={payNotes} onChange={e => setPayNotes(e.target.value)} />
            <p className="text-[9.5px] font-semibold text-gray-400 mt-1.5">Recording a paid amount here or per line is bookkeeping only — payment verification still goes through the proof-review flow.</p>
          </div>
          <div className={`${card} space-y-2 text-[12.5px]`}>
            <div className="flex justify-between"><span className="font-semibold text-gray-500">Subtotal</span><span className="font-black tabular-nums">{peso(subtotal)}</span></div>
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-gray-500">Discount ✏️</span>
              <span className="flex items-center gap-1.5">
                <select className="border border-gray-200 rounded-lg px-1.5 py-1 text-[12px] bg-white" value={discPct ? "%" : "₱"} onChange={e => setDiscPct(e.target.value === "%")}><option>₱</option><option>%</option></select>
                <input className={`${inp} !w-20 text-right`} inputMode="decimal" value={discVal} onChange={e => setDiscVal(e.target.value)} />
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-gray-500">Shipping Fee ✏️</span>
              <input className={`${inp} !w-24 text-right`} inputMode="decimal" value={ship} onChange={e => setShip(e.target.value)} />
            </div>
            <div className="bg-[#fdf6e3] border border-[#C9A84C]/40 rounded-xl px-4 py-3 text-center">
              <p className="text-[12px] font-black text-[#0d2430]">Total Amount Due</p>
              <p className="text-[24px] font-black text-[#0d2430] tabular-nums leading-tight">{peso(total)}</p>
            </div>
          </div>
          <div className={`${card} space-y-2.5`}>
            <div className="flex justify-between items-baseline">
              <span className="text-[12px] font-bold text-gray-500">Total Paid {layaway ? "(Layaway)" : ""}</span>
              <span className="text-[16px] font-black text-green-600 tabular-nums">{peso(totalPaid)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-gray-100 pt-2.5">
              <span className="text-[12px] font-bold text-gray-500">Remaining Balance</span>
              <span className="text-[18px] font-black text-red-500 tabular-nums">{peso(remaining)}</span>
            </div>
            <p className="text-[9.5px] font-semibold text-gray-400">Paid entries come from the PAID column (Layaway Mode).</p>
          </div>
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
          <button onClick={sendInvoice} disabled={!!busy} className="flex items-center gap-2 text-[12.5px] font-black bg-[#C9A84C] text-[#0d2430] px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50">
            <Send className="h-4 w-4" /> {busy === "send" ? "Sending…" : "Send Invoice"}</button>
        </div>
      </div>
    </div>
  );
}
