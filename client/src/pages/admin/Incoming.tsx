// Order-form requests (sb_order_requests) — merged INTO the FB / Order Form
// orders table (per Pia, Nov 25: one list, no separate area).
// Exports: useOrderRequests() for the rows, RequestDetailModal for the detail
// (Request Details + Invoice & Payment with timeline, proof, confirm).
import { useEffect, useState } from "react";
import { sbAdmin, adminCred } from "@/lib/supabaseAdmin";
import { toast } from "sonner";

const peso = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;
const when = (d: string) => d ? new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
export const REQ_STATUS_COLORS: Record<string, string> = {
  new: "bg-orange-100 text-orange-700", in_review: "bg-blue-100 text-blue-700",
  invoiced: "bg-purple-100 text-purple-700", converted: "bg-green-100 text-green-700",
  rejected: "bg-gray-200 text-gray-500", expired: "bg-gray-100 text-gray-400",
};
const TL_ICON: Record<string, [string, string]> = {
  request_convert: ["🧾", "Converted to order"], create: ["🛒", "Order created"],
  invoice_generated: ["📄", "Invoice generated"], invoice_sent: ["✉️", "Invoice sent to customer"],
  payment_proof_submitted: ["💳", "Payment proof uploaded"], proof_reupload_requested: ["↻", "New proof requested"],
  update: ["✏️", "Updated"], request_update: ["✏️", "Request updated"],
};

/** Rows + silent 45s auto-refresh. `missing` = migration not applied. */
export function useOrderRequests() {
  const [rows, setRows] = useState<any[]>([]);
  const [missing, setMissing] = useState(false);
  const load = async (quiet = true) => {
    try {
      const r = await sbAdmin.select("sb_order_requests", "select=*&order=created_at.desc&limit=100");
      setRows(Array.isArray(r) ? r : []);
      setMissing(false);
    } catch { if (!quiet) setMissing(true); }
  };
  useEffect(() => {
    load(false);
    const t = setInterval(() => { if (!document.hidden) load(); }, 45 * 1000);
    return () => clearInterval(t);
  }, []);
  return { rows, missing, reload: load };
}

/** Request details, rendered in the SAME side panel as a selected order. */
export function RequestDetailCard({ sel, onClose, onPrepare, onChanged }:
  { sel: any; onClose: () => void; onPrepare?: (r: any) => void; onChanged?: () => void }) {
  const converted = (sel.status === "converted" || sel.status === "invoiced") && sel.converted_order_number && sel.converted_order_number !== "CONVERTING";
  const [tab, setTab] = useState<"request" | "payment">(converted ? "payment" : "request");
  const [order, setOrder] = useState<any>(null);
  const [subInfo, setSubInfo] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [reupOpen, setReupOpen] = useState(false);
  const [reupReason, setReupReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPayment = async () => {
    try {
      const [o] = await sbAdmin.select("sb_orders", `order_number=eq.${encodeURIComponent(sel.converted_order_number)}&select=*&limit=1`);
      setOrder(o || null);
      const logs = await sbAdmin.select("sb_order_log",
        `order_number=in.(${encodeURIComponent(sel.converted_order_number)},${encodeURIComponent(sel.request_ref)})&order=created_at.asc&limit=50&select=action,actor,new_value,created_at`);
      setTimeline(Array.isArray(logs) ? logs : []);
      const sub = [...(Array.isArray(logs) ? logs : [])].reverse().find((l: any) => l.action === "payment_proof_submitted");
      setSubInfo(sub || null);
    } catch { /* panel stays minimal */ }
  };
  useEffect(() => { if (converted) loadPayment(); }, []);

  const openProof = async (dl = false) => {
    let v = String(order?.payment_proof_url || "");
    if (!v) return;
    const legacy = v.match(/\/object\/public\/(payment-proofs\/.+)$/);
    if (legacy) v = legacy[1];
    else if (/^https?:\/\//.test(v)) { window.open(v, "_blank", "noopener"); return; }
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminCred(), op: "proof_url", path: v }) });
      const out = await r.json().catch(() => ({} as any));
      if (!r.ok || !out.url) throw new Error(out.error || "could not open proof");
      window.open(out.url + (dl ? "&download=" : ""), "_blank", "noopener");
    } catch (e: any) { toast.error(e.message || "Could not open proof"); }
  };

  const confirmPayment = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const got = await sbAdmin.update("sb_orders", `order_number=eq.${encodeURIComponent(order.order_number)}&payment_status=eq.submitted`,
        { payment_status: "verified", updated_at: new Date().toISOString() });
      if (!Array.isArray(got) || !got.length) toast.error("Nothing to confirm — no proof awaiting review (maybe already verified).");
      else toast.success(`${order.order_number} — payment VERIFIED`);
      await loadPayment(); onChanged?.();
    } catch (e: any) { toast.error(e.message || "Confirm failed"); }
    setBusy(false);
  };

  const requestNewProof = async () => {
    const reason = reupReason.trim();
    if (reason.length < 3) { toast.error("A reason is required — the customer will see it."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminCred(), op: "request_reupload", order_number: order.order_number, reason }) });
      const out = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(out.error || "request failed");
      toast.success("New proof requested — the customer sees your reason on their invoice page");
      setReupOpen(false); setReupReason(""); await loadPayment();
    } catch (e: any) { toast.error(e.message || "Request failed"); }
    setBusy(false);
  };

  const sendInvoice = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const r = await fetch("/api/send-invoice", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminCred(), order_number: order.order_number }) });
      const out = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(out.error || "send failed");
      toast.success("Invoice emailed to the customer");
      await loadPayment(); onChanged?.();
    } catch (e: any) { toast.error(e.message || "Send failed"); }
    setBusy(false);
  };

  const setStatus = async (status: string) => {
    try {
      await sbAdmin.update("sb_order_requests", `request_ref=eq.${encodeURIComponent(sel.request_ref)}`, { status, reviewed_at: new Date().toISOString() });
      toast.success(`${sel.request_ref} → ${status.replace("_", " ")}`);
      onChanged?.();
    } catch (e: any) { toast.error(e.message || "Update failed"); }
  };

  const isPre = order && String(order.payment_method || "").toUpperCase() === "PRE-ORDER";
  const payState = order?.payment_status;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
        {/* header — IDENTICAL structure to Selected Order */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="text-sm font-black text-[#0d2430]">Selected Request</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold bg-[#C9A84C] text-[#0d2430] px-2.5 py-1 rounded-lg">{sel.request_ref}</span>
          </div>
        </div>
        <div className="mb-3 -mt-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🧾 Order Form</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-1.5 uppercase ${REQ_STATUS_COLORS[sel.status] || "bg-gray-100 text-gray-500"}`}>{sel.status.replace("_", " ")}</span>
          {converted && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 ml-1.5">→ {sel.converted_order_number}</span>}
        </div>

        {converted && (
          <div className="flex gap-1 border-b border-gray-100 mb-3">
            {([["request", "Request Details"], ["payment", "Invoice & Payment"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-3 py-2 text-[11px] font-black border-b-2 -mb-px ${tab === v ? "border-[#C9A84C] text-[#0d2430]" : "border-transparent text-gray-400"}`}>{l}</button>
            ))}
          </div>
        )}

        {tab === "request" && (<>
          {/* customer / address — IDENTICAL row style to Selected Order */}
          <div className="space-y-2.5 text-xs border-t border-gray-100 pt-3 mb-3">
            <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Customer</span>
              <span className="text-[#0d2430]"><b>{sel.receiver_name}</b>{sel.fb_ig_name ? <span className="text-blue-500"> · FB: {sel.fb_ig_name}</span> : null}<br/>{sel.email || "no email"} · {sel.contact_number}</span></div>
            {sel.vip_id && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">VIP ID</span>
              <span className="text-[#0d2430] font-semibold">{sel.vip_id}</span></div>}
            <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Address</span>
              <span className="text-[#0d2430]">{sel.address}{sel.city ? `, ${sel.city}` : ""}{sel.region ? ` · ${sel.region}` : ""}</span></div>
            {sel.special_request && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Notes</span>
              <span className="text-[#0d2430]">{sel.special_request}</span></div>}
            <div className="flex gap-2 items-center flex-wrap"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Payment</span>
              <span className="text-[#0d2430] font-semibold">{sel.payment_method}</span>
              {sel.payment_method === "PRE-ORDER" && <span className="text-[10px] font-black text-orange-600">PRE-ORDER — full payment first</span>}
            </div>
            {sel.payment_method === "PRE-ORDER" && sel.preorder_policy_version && (
              <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Policy</span>
                <span className="text-[#0d2430]">v{sel.preorder_policy_version} accepted {when(sel.preorder_accepted_at)}</span></div>
            )}
            {converted && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Order</span>
              <span className="text-[#0d2430] font-bold">{sel.converted_order_number}{sel.reviewed_by ? <span className="text-gray-400 font-semibold"> · by {sel.reviewed_by}</span> : null}</span></div>}
          </div>
        </>)}

        {tab === "payment" && (
          !order ? <div className="text-xs text-gray-400 py-6 text-center">Loading order…</div> : (
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Invoice</p>
              <div className="flex items-center gap-2 flex-wrap">
                {order.invoice_url
                  ? <span className="text-[11px] font-black text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">✓ Invoice Generated</span>
                  : <span className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">Native invoice ready</span>}
                {order.invoice_sent_at && <span className="text-[10.5px] font-bold text-purple-700">✉️ sent {when(order.invoice_sent_at)}</span>}
                <a href={`/invoice/${encodeURIComponent(order.order_number)}`} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-[11px] font-bold border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">👁 Preview Invoice</a>
                {isPre
                  ? <span className="text-[10px] font-bold text-orange-600">manual delivery until email patch</span>
                  : <button onClick={sendInvoice} disabled={busy}
                      className="text-[11px] font-black bg-[#0d2430] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#122d3a] disabled:opacity-40">✈ Send Invoice to Customer</button>}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Payment</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] mb-2">
                <div className="flex gap-2"><span className="text-gray-400 font-semibold">Total</span><span className="font-black tabular-nums">{peso(order.total)}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 font-semibold">Method</span><span className="font-bold">{order.payment_method}</span></div>
                {order.payment_reference && <div className="flex gap-2"><span className="text-gray-400 font-semibold">Reference</span><span className="font-mono font-bold">{order.payment_reference}</span></div>}
                {subInfo && <div className="flex gap-2"><span className="text-gray-400 font-semibold">Submitted</span><span className="font-bold">{when(subInfo.created_at)}</span></div>}
                {subInfo?.new_value?.message && <div className="col-span-2 flex gap-2"><span className="text-gray-400 font-semibold">Message</span><span className="font-semibold">“{subInfo.new_value.message}”</span></div>}
              </div>
              {order.payment_proof_url ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => openProof(false)} className="text-[11px] font-bold bg-[#0d2430] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#122d3a]">👁 View</button>
                  <button onClick={() => openProof(true)} className="text-[11px] font-bold border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">⬇ Download</button>
                  {payState === "submitted" && (<>
                    <button onClick={confirmPayment} disabled={busy}
                      className="ml-auto text-[11px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40">✓ Confirm Payment</button>
                    <button onClick={() => setReupOpen(v => !v)}
                      className="text-[11px] font-bold text-orange-700 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50">↻ Request New Proof</button>
                  </>)}
                  {payState === "verified" && <span className="ml-auto text-[11px] font-black text-green-700">✓ Payment Verified</span>}
                  {payState === "reupload" && <span className="ml-auto text-[10.5px] font-bold text-orange-700">waiting for new proof from customer</span>}
                </div>
              ) : (
                <p className="text-[11px] font-semibold text-gray-400">
                  {payState === "awaiting_full_payment" || payState === "pending" ? "No proof uploaded yet — the customer uploads it from their invoice page." : "No proof on file."}
                </p>
              )}
              {reupOpen && (
                <div className="flex items-center gap-1.5 mt-2">
                  <input value={reupReason} onChange={e => setReupReason(e.target.value)} placeholder="Reason (required — customer will see this)"
                    className="flex-1 border border-orange-300 rounded-lg px-2.5 py-1.5 text-[11px] outline-none focus:border-orange-500" />
                  <button onClick={requestNewProof} disabled={busy || reupReason.trim().length < 3}
                    className="text-[11px] font-black bg-orange-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-40">Send</button>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Payment History / Activity</p>
              {!timeline.length ? <p className="text-[11px] text-gray-400">No activity yet.</p> : (
                <div className="space-y-1.5">
                  {timeline.map((l: any, i: number) => {
                    const [ic, label] = TL_ICON[l.action] || ["•", l.action];
                    return (
                      <div key={i} className="flex gap-2 text-[11.5px] items-start">
                        <span className="w-5 text-center">{ic}</span>
                        <div className="min-w-0">
                          <span className="font-bold text-[#0d2430]">{label}</span>
                          {l.action === "proof_reupload_requested" && l.new_value?.reason && <span className="text-orange-700 font-semibold"> — “{l.new_value.reason}”</span>}
                          <span className="text-gray-400 font-semibold"> · {when(l.created_at)}{l.actor ? ` · by ${l.actor === "customer" ? "Customer" : l.actor}` : ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="mt-3 flex items-center gap-1.5 flex-wrap border-t border-gray-100 pt-3">
          {(sel.status === "new" || sel.status === "in_review") &&
            <button onClick={() => { onPrepare?.(sel); onClose(); }} className="text-[11px] font-black bg-[#0d2430] text-white px-3 py-1.5 rounded-lg hover:bg-[#122d3a]">🧾 Prepare Order →</button>}
          {sel.status === "new" && <button onClick={() => setStatus("in_review")} className="text-[11px] font-bold text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50">Mark In Review</button>}
          {sel.status !== "rejected" && !converted && <button onClick={() => setStatus("rejected")} className="text-[11px] font-bold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">Reject</button>}
          <button onClick={onClose} className="ml-auto text-[11px] font-bold text-gray-400 px-3 py-1.5 hover:text-gray-600">Close</button>
        </div>
    </div>
  );
}
