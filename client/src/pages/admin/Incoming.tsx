// Incoming Orders — submissions from the native /order form (sb_order_requests).
// Minimal v1: list + detail + status + "Prepare order" bridge to Create Order.
// The original submission is read-only here (immutable record); encoding happens
// through the existing Create Order flow, and later the full encode editor.
import { useEffect, useState } from "react";
import { sbAdmin } from "@/lib/supabaseAdmin";

const peso = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;
const STATUS_COLORS: Record<string, string> = {
  new: "bg-orange-100 text-orange-700", in_review: "bg-blue-100 text-blue-700",
  invoiced: "bg-purple-100 text-purple-700", converted: "bg-green-100 text-green-700",
  rejected: "bg-gray-200 text-gray-500", expired: "bg-gray-100 text-gray-400",
};

export default function IncomingRequests({ onPrepare }: { onPrepare?: (r: any) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await sbAdmin.select("sb_order_requests", "select=*&order=created_at.desc&limit=100");
      setRows(Array.isArray(r) ? r : []);
      setMissing(false);
    } catch { if (!quiet) setMissing(true); }
    if (!quiet) setLoading(false);
  };
  useEffect(() => {
    load();
    // Auto-refresh: new form submissions appear without a manual Refresh.
    const t = setInterval(() => { if (!document.hidden) load(true); }, 45 * 1000);
    return () => clearInterval(t);
  }, []);

  const setStatus = async (req: any, status: string) => {
    await sbAdmin.update("sb_order_requests", `request_ref=eq.${encodeURIComponent(req.request_ref)}`, { status, reviewed_at: new Date().toISOString() });
    setSel((s: any) => s && s.request_ref === req.request_ref ? { ...s, status } : s);
    load();
  };

  if (missing) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] font-semibold text-amber-700 mb-4">
      Incoming Orders is ready in code, but the <code>sb_order_requests</code> migration hasn't been applied yet (see sql/order_requests_v1.sql — awaiting approval).
    </div>
  );

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[12px] font-black uppercase tracking-[.12em] text-[#0d2430]">📥 Incoming Orders (Order Form)</h3>
        <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{rows.filter(r => r.status === "new").length} new</span>
        <button onClick={load} className="ml-auto text-[11px] font-bold text-gray-400 hover:text-gray-600">↻ Refresh</button>
      </div>
      {loading ? <div className="text-xs text-gray-400 py-3">Loading…</div> : !rows.length ? (
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-5 text-[12px] text-gray-400">No form submissions yet. Share the link: <span className="font-bold text-gray-600">soleblessingofficial.com/order</span></div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[9.5px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="px-3 py-2.5">Ref</th><th className="px-2 py-2.5">Customer</th><th className="px-2 py-2.5">MOP</th>
              <th className="px-2 py-2.5 hidden md:table-cell">Region</th><th className="px-2 py-2.5">Status</th><th className="px-2 py-2.5"></th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.request_ref} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer" onClick={() => setSel(r)}>
                  <td className="px-3 py-2.5 font-mono font-bold text-[11px]">{r.request_ref}</td>
                  <td className="px-2 py-2.5 font-bold truncate max-w-[140px]">{r.receiver_name}</td>
                  <td className="px-2 py-2.5">{r.payment_method}{r.payment_method === "PRE-ORDER" && <span className="ml-1 text-[8px] font-black text-orange-600">⚠ FULL PAYMENT</span>}</td>
                  <td className="px-2 py-2.5 hidden md:table-cell text-gray-500 truncate max-w-[120px]">{r.region}</td>
                  <td className="px-2 py-2.5"><span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[r.status] || "bg-gray-100"}`}>{r.status.replace("_", " ")}</span></td>
                  <td className="px-2 py-2.5 text-right text-gray-300">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setSel(null)}>
          <div className="bg-white w-full sm:max-w-[520px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div><div className="font-mono font-black text-[14px]">{sel.request_ref}</div>
                <div className="text-[10.5px] text-gray-400 font-semibold">{new Date(sel.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</div></div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${STATUS_COLORS[sel.status] || "bg-gray-100"}`}>{sel.status.replace("_", " ")}</span>
            </div>
            {sel.payment_method === "PRE-ORDER" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-3.5 py-2.5 mb-3 text-[11.5px] font-bold text-orange-700">
                PRE-ORDER — awaiting full payment. Policy v{sel.preorder_policy_version} accepted {sel.preorder_accepted_at ? new Date(sel.preorder_accepted_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : ""}.
              </div>
            )}
            <div className="space-y-1.5 text-[12.5px]">
              {[["Email", sel.email], ["FB / IG", sel.fb_ig_name], ["VIP ID", sel.vip_id], ["Receiver", sel.receiver_name], ["Contact", sel.contact_number],
                ["Region", sel.region], ["City", sel.city], ["Address", sel.address], ["Notes", sel.special_request], ["MOP", sel.payment_method]].map(([k, v]) => v ? (
                <div key={k as string} className="flex gap-3"><span className="text-gray-400 font-semibold w-24 shrink-0">{k}</span><span className="font-bold break-words min-w-0">{v}</span></div>
              ) : null)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {sel.status === "new" && <button onClick={() => setStatus(sel, "in_review")} className="py-2.5 rounded-xl text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">Mark In Review</button>}
              <button onClick={() => { onPrepare?.(sel); setSel(null); }} className="py-2.5 rounded-xl text-[11px] font-black text-white col-span-1" style={{ background: "#0d2430" }}>🧾 Prepare Order →</button>
              {sel.status !== "rejected" && sel.status !== "converted" && <button onClick={() => setStatus(sel, "rejected")} className="py-2.5 rounded-xl text-[11px] font-black bg-gray-100 text-gray-500">Reject</button>}
              <button onClick={() => setSel(null)} className="py-2.5 rounded-xl text-[11px] font-black bg-gray-50 text-gray-400">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
