// Website Visitors analytics — admin module (owner/manager only).
// Reads sb_analytics_summary() through /api/admin op=analytics; raw tables stay RLS-locked.
import { useEffect, useMemo, useState } from "react";
import { sbAdmin } from "@/lib/supabaseAdmin";

const peso = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;

type Range = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";
const DAY = 86400000;

function rangeOf(r: Range, cFrom: string, cTo: string): [string, string] {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  switch (r) {
    case "today": return [startOfDay(now).toISOString(), now.toISOString()];
    case "yesterday": { const s = startOfDay(new Date(now.getTime() - DAY)); return [s.toISOString(), startOfDay(now).toISOString()]; }
    case "7d": return [new Date(now.getTime() - 7 * DAY).toISOString(), now.toISOString()];
    case "30d": return [new Date(now.getTime() - 30 * DAY).toISOString(), now.toISOString()];
    case "month": { const s = new Date(now.getFullYear(), now.getMonth(), 1); return [s.toISOString(), now.toISOString()]; }
    case "custom": {
      const f = cFrom ? new Date(cFrom + "T00:00:00") : new Date(now.getTime() - 7 * DAY);
      const t = cTo ? new Date(cTo + "T23:59:59") : now;
      return [f.toISOString(), t.toISOString()];
    }
  }
}

const delta = (cur: number, prev: number) => {
  if (!prev) return cur ? { txt: "new", up: true } : null;
  const p = Math.round(((cur - prev) / prev) * 100);
  return { txt: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}%`, up: p >= 0 };
};

const SRC_COLOR: Record<string, string> = { facebook: "#1877f2", instagram: "#d62976", google: "#34a853", tiktok: "#111", direct: "#C9A84C", referral: "#8b8b88" };

export default function AdminVisitors() {
  const [range, setRange] = useState<Range>("7d");
  const [cFrom, setCFrom] = useState(""); const [cTo, setCTo] = useState("");
  const [sum, setSum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [from, to] = rangeOf(range, cFrom, cTo);
      const out = await sbAdmin.analytics(from, to, true);
      setSum(out.summary || null);
    } catch { setErr("Couldn't load analytics."); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range]);

  const c = sum?.cards || {};
  const funnel = sum?.funnel || {};
  const daily: { d: string; v: number }[] = sum?.daily || [];
  const convRate = c.visitors ? ((c.orders / c.visitors) * 100) : 0;
  const convPrev = c.visitors_prev ? ((c.orders_prev / c.visitors_prev) * 100) : 0;

  const cards = [
    { label: "Unique Visitors", val: c.visitors, prev: c.visitors_prev },
    { label: "Sessions", val: c.sessions, prev: c.sessions_prev },
    { label: "Page Views", val: c.page_views, prev: c.page_views_prev },
    { label: "Product Views", val: c.product_views, prev: c.product_views_prev },
    { label: "Add to Carts", val: c.add_to_carts, prev: c.add_to_carts_prev },
    { label: "Checkout Starts", val: c.checkout_starts, prev: c.checkout_starts_prev },
    { label: "Orders", val: c.orders, prev: c.orders_prev },
    { label: "Conversion", val: null as any, custom: `${convRate.toFixed(1)}%`, prev: null, cDelta: delta(convRate, convPrev) },
  ];

  const chart = useMemo(() => {
    if (!daily.length) return null;
    const max = Math.max(...daily.map(x => x.v), 1);
    const W = 1000, H = 150;
    const pts = daily.map((x, i) => `${daily.length > 1 ? (i / (daily.length - 1)) * W : W / 2},${H - (x.v / max) * (H - 15)}`);
    return { pts: pts.join(" "), area: `0,${H} ${pts.join(" ")} ${W},${H}`, max };
  }, [daily]);

  const exportCsv = () => {
    const rows = [["metric", "value"],
      ...cards.filter(x => !x.custom).map(x => [x.label, String(x.val ?? 0)]),
      ["Conversion %", convRate.toFixed(2)], ["Revenue", String((c.revenue || 0) / 100)],
      [], ["date", "visitors"], ...daily.map(x => [x.d, String(x.v)]),
      [], ["top product", "views"], ...(sum?.top_products || []).map((p: any) => [`${p.name || p.item_code}`, String(p.views)]),
      [], ["search term", "count", "zero results"], ...(sum?.searches || []).map((s: any) => [s.q, String(s.n), String(s.zero_results)]),
      [], ["source", "sessions"], ...(sum?.sources || []).map((s: any) => [s.source, String(s.n)]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `soleblessing-visitors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const totalSessions = (sum?.sources || []).reduce((s: number, x: any) => s + x.n, 0) || 1;
  const totalDevices = (sum?.devices || []).reduce((s: number, x: any) => s + x.n, 0) || 1;
  const fMax = funnel.visitors || 1;

  return (
    <div className="mb-8">
      {/* header row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold text-gray-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {sum?.live_now ?? 0} browsing now
        </span>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {([["today", "Today"], ["yesterday", "Yesterday"], ["7d", "7 Days"], ["30d", "30 Days"], ["month", "This Month"], ["custom", "Custom"]] as [Range, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setRange(v)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border ${range === v ? "bg-[#C9A84C] text-[#0d2430] border-[#C9A84C]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>{l}</button>
          ))}
          <button onClick={exportCsv} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[#C9A84C]">⬇ CSV</button>
        </div>
      </div>
      {range === "custom" && (
        <div className="flex items-center gap-2 mb-4">
          <input type="date" value={cFrom} onChange={e => setCFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={cTo} onChange={e => setCTo(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
          <button onClick={load} className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#0d2430] text-white">Apply</button>
        </div>
      )}

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-4 py-3 mb-4">{err}</div>}
      {loading && <div className="text-xs text-gray-400 font-semibold mb-4">Loading analytics…</div>}

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {cards.map((k: any) => {
          const d = k.cDelta ?? delta(k.val || 0, k.prev || 0);
          return (
            <div key={k.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3.5">
              <div className="text-[9px] font-black uppercase tracking-[.12em] text-gray-400 mb-1.5">{k.label}</div>
              <div className="text-xl font-black text-[#0d2430]">{k.custom ?? (k.val ?? 0).toLocaleString()}</div>
              {d && <div className={`text-[10.5px] font-bold mt-0.5 ${d.up ? "text-green-600" : "text-red-500"}`}>{d.txt} vs prev</div>}
            </div>
          );
        })}
      </div>

      {/* chart + funnel */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-[10.5px] font-black uppercase tracking-[.12em] text-[#0d2430] mb-3">Daily Visitors</h3>
          {chart ? (
            <svg viewBox="0 0 1000 165" className="w-full" style={{ height: 165 }}>
              <polyline fill="rgba(201,168,76,.12)" stroke="none" points={chart.area} />
              <polyline fill="none" stroke="#C9A84C" strokeWidth="3" points={chart.pts} />
              <text x="0" y="162" fontSize="10" fill="#aaa" fontWeight="600">{daily[0]?.d}</text>
              <text x="1000" y="162" fontSize="10" fill="#aaa" fontWeight="600" textAnchor="end">{daily[daily.length - 1]?.d}</text>
            </svg>
          ) : <div className="text-xs text-gray-400 py-10 text-center">No visits in this range yet.</div>}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-[10.5px] font-black uppercase tracking-[.12em] text-[#0d2430] mb-3">Conversion Funnel</h3>
          {[["Visitors", funnel.visitors], ["Viewed a product", funnel.product_viewers], ["Added to cart", funnel.cart_adders], ["Started checkout", funnel.checkout_starters], ["Ordered", funnel.buyers]].map(([l, v]: any) => (
            <div key={l} className="mb-2.5">
              <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1"><span>{l}</span><span>{(v || 0).toLocaleString()} · {fMax ? Math.round(((v || 0) / fMax) * 100) : 0}%</span></div>
              <div className="h-2 bg-gray-50 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${fMax ? ((v || 0) / fMax) * 100 : 0}%` }} /></div>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs"><span className="text-gray-400 font-semibold">Revenue (tracked)</span><span className="font-black text-[#0d2430]">{peso(c.revenue || 0)}</span></div>
        </div>
      </div>

      {/* lists */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-[10.5px] font-black uppercase tracking-[.12em] text-[#0d2430] mb-3">🔥 Most Viewed Products</h3>
          {(sum?.top_products || []).length ? (sum.top_products as any[]).map(p => (
            <div key={p.item_code} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-gray-800 truncate">{p.name || p.item_code}</div>
                <div className="text-[10px] text-gray-400 font-semibold">{p.selling_price ? peso(p.selling_price) : "no price"}{p.in_stock === false ? " · out of stock" : ""}</div>
              </div>
              <div className="ml-auto text-right shrink-0"><div className="text-[13px] font-black text-[#0d2430]">{p.views}</div><div className="text-[8.5px] text-gray-300 font-bold uppercase">views</div></div>
            </div>
          )) : <div className="text-xs text-gray-400">No product views yet.</div>}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-[10.5px] font-black uppercase tracking-[.12em] text-[#0d2430] mb-3">🔎 Searches</h3>
          {(sum?.searches || []).length ? (sum.searches as any[]).map(s => (
            <div key={s.q} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-[12px] font-bold text-gray-700 truncate">{s.q}</span>
              {Number(s.zero_results) > 0 && <span className="text-[8.5px] font-black bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full uppercase shrink-0">no results</span>}
              <span className="ml-auto text-[12px] font-black text-[#0d2430]">{s.n}</span>
            </div>
          )) : <div className="text-xs text-gray-400">No searches yet.</div>}
          {(sum?.sizes || []).length > 0 && <>
            <h4 className="text-[9.5px] font-black uppercase tracking-[.12em] text-gray-400 mt-4 mb-2">Most-filtered sizes</h4>
            <div className="flex flex-wrap gap-1.5">{(sum.sizes as any[]).map(z => <span key={z.size} className="text-[10.5px] font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">{z.size} · {z.n}</span>)}</div>
          </>}
          {(sum?.brands || []).length > 0 && <>
            <h4 className="text-[9.5px] font-black uppercase tracking-[.12em] text-gray-400 mt-3 mb-2">Most-filtered brands</h4>
            <div className="flex flex-wrap gap-1.5">{(sum.brands as any[]).map(b => <span key={b.brand} className="text-[10.5px] font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">{b.brand} · {b.n}</span>)}</div>
          </>}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-[10.5px] font-black uppercase tracking-[.12em] text-[#0d2430] mb-3">Traffic Sources</h3>
          {(sum?.sources || []).length ? (sum.sources as any[]).map(s => (
            <div key={s.source} className="mb-2.5">
              <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1"><span className="capitalize">{s.source}</span><span>{Math.round((s.n / totalSessions) * 100)}%</span></div>
              <div className="h-2 bg-gray-50 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(s.n / totalSessions) * 100}%`, background: SRC_COLOR[s.source] || "#bbb" }} /></div>
            </div>
          )) : <div className="text-xs text-gray-400">No sessions yet.</div>}
          {(sum?.devices || []).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
              {(sum.devices as any[]).map(d => <span key={d.device} className="text-[10.5px] font-bold bg-[#fdf8ec] border border-[#f0e4c3] text-[#7a6520] rounded-lg px-2 py-1 capitalize">{d.device} {Math.round((d.n / totalDevices) * 100)}%</span>)}
            </div>
          )}
          {(sum?.landing_pages || []).length > 0 && <>
            <h4 className="text-[9.5px] font-black uppercase tracking-[.12em] text-gray-400 mt-4 mb-2">Top landing pages</h4>
            {(sum.landing_pages as any[]).map(l => (
              <div key={l.page} className="flex justify-between py-1 text-[11px] font-semibold text-gray-600 border-b border-gray-50 last:border-0"><span className="truncate">{l.page}</span><span className="font-black text-[#0d2430] ml-2">{l.n}</span></div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}
