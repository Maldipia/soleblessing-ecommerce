// Website Visitors analytics — admin module (owner/manager only).
// Dark theme per Pia's reference (2026-11-24). Reads sb_analytics_summary()
// through /api/admin op=analytics; raw tables stay RLS-locked.
import { useEffect, useMemo, useState } from "react";
import { sbAdmin } from "@/lib/supabaseAdmin";

const peso = (c: number) => `₱${Math.round((c || 0) / 100).toLocaleString("en-PH")}`;
const ORANGE = "#FF8A00";

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
  if (!prev) return cur ? { txt: "↑ new", up: true } : null;
  const p = Math.round(((cur - prev) / prev) * 100);
  return { txt: `${p >= 0 ? "↑" : "↓"} ${Math.abs(p)}%`, up: p >= 0 };
};

const SRC_COLOR: Record<string, string> = {
  direct: "#c9b08c", facebook: "#3b82f6", instagram: "#c13584",
  google: "#22c55e", tiktok: "#e5e7eb", referral: "#8b8b92", unknown: "#55585e",
};

function Donut({ data, total, center }: { data: { k: string; n: number }[]; total: number; center: string }) {
  const R = 54, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" width="150" height="150">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#2a2d33" strokeWidth="20" />
        {data.map(s => {
          const frac = total ? s.n / total : 0;
          const el = (
            <circle key={s.k} cx="70" cy="70" r={R} fill="none"
              stroke={SRC_COLOR[s.k] || "#666"} strokeWidth="20"
              strokeDasharray={`${Math.max(frac * C - 2, 0.1)} ${C}`}
              strokeDashoffset={-off * C} transform="rotate(-90 70 70)" strokeLinecap="butt" />
          );
          off += frac;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="19" fontWeight="900" fill="#fff">{center}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#8b8f96">Visitors</text>
      </svg>
      <div className="space-y-1.5">
        {data.map(s => (
          <div key={s.k} className="flex items-center gap-2 text-[11.5px] font-bold text-gray-300">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SRC_COLOR[s.k] || "#666" }} />
            <span className="capitalize">{s.k}</span>
            <span className="text-gray-500 ml-1">{total ? Math.round((s.n / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    { icon: "🧑‍🤝‍🧑", label: "Visitors", val: c.visitors, prev: c.visitors_prev },
    { icon: "📄", label: "Page Views", val: c.page_views, prev: c.page_views_prev },
    { icon: "🧭", label: "Sessions", val: c.sessions, prev: c.sessions_prev },
    { icon: "📦", label: "Orders", val: c.orders, prev: c.orders_prev },
    { icon: "🛒", label: "Conversion Rate", custom: `${convRate.toFixed(2)}%`, cDelta: delta(convRate, convPrev) },
  ];

  const chart = useMemo(() => {
    if (!daily.length) return null;
    const max = Math.max(...daily.map(x => x.v), 1);
    const W = 1000, H = 150;
    const xy = daily.map((x, i) => [daily.length > 1 ? (i / (daily.length - 1)) * W : W / 2, H - (x.v / max) * (H - 20)]);
    const pts = xy.map(p => p.join(","));
    return { pts: pts.join(" "), area: `0,${H} ${pts.join(" ")} ${W},${H}`, xy };
  }, [daily]);

  const totalPv = (sum?.top_pages || []).reduce((s: number, x: any) => s + x.n, 0) || c.page_views || 1;
  const totalSessions = (sum?.sources || []).reduce((s: number, x: any) => s + x.n, 0) || 1;
  const totalDevices = (sum?.devices || []).reduce((s: number, x: any) => s + x.n, 0) || 1;
  const fMax = funnel.visitors || 1;

  const exportCsv = () => {
    const rows = [["metric", "value"],
      ...cards.filter(x => !x.custom).map(x => [x.label, String(x.val ?? 0)]),
      ["Conversion %", convRate.toFixed(2)], ["Revenue", String((c.revenue || 0) / 100)],
      [], ["date", "visitors"], ...daily.map(x => [x.d, String(x.v)]),
      [], ["top page", "views"], ...(sum?.top_pages || []).map((p: any) => [p.page, String(p.n)]),
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

  const panel = "bg-[#1b1d22] border border-[#2a2d33] rounded-2xl";

  return (
    <div className="mb-8 rounded-3xl p-5 md:p-6" style={{ background: "#121418" }}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-xl font-black text-white tracking-tight">Website Analytics</h2>
        <span className="inline-flex items-center gap-2 bg-[#1b1d22] border border-[#2a2d33] rounded-full px-3 py-1.5 text-[11px] font-bold text-gray-300">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {sum?.live_now ?? 0} browsing now
        </span>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {([["today", "Today"], ["yesterday", "Yesterday"], ["7d", "Last 7 Days"], ["30d", "30 Days"], ["month", "This Month"], ["custom", "Custom"]] as [Range, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setRange(v)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border ${range === v ? "text-[#121418] border-transparent" : "bg-[#1b1d22] text-gray-400 border-[#2a2d33] hover:border-[#3a3e45]"}`}
              style={range === v ? { background: ORANGE } : undefined}>{l}</button>
          ))}
          <button onClick={exportCsv} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#2a2d33] bg-[#1b1d22] text-gray-300 hover:border-[#3a3e45]">⬇ CSV</button>
        </div>
      </div>
      {range === "custom" && (
        <div className="flex items-center gap-2 mb-5">
          <input type="date" value={cFrom} onChange={e => setCFrom(e.target.value)} className="bg-[#1b1d22] border border-[#2a2d33] text-gray-200 rounded-lg px-2.5 py-1.5 text-xs [color-scheme:dark]" />
          <span className="text-xs text-gray-500">to</span>
          <input type="date" value={cTo} onChange={e => setCTo(e.target.value)} className="bg-[#1b1d22] border border-[#2a2d33] text-gray-200 rounded-lg px-2.5 py-1.5 text-xs [color-scheme:dark]" />
          <button onClick={load} className="px-3 py-1.5 text-[11px] font-black rounded-lg text-[#121418]" style={{ background: ORANGE }}>Apply</button>
        </div>
      )}

      {err && <div className="bg-red-950/40 border border-red-900 text-red-300 text-xs font-semibold rounded-lg px-4 py-3 mb-4">{err}</div>}
      {loading && <div className="text-xs text-gray-500 font-semibold mb-4">Loading analytics…</div>}

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {cards.map((k: any) => {
          const d = k.cDelta ?? delta(k.val || 0, k.prev || 0);
          return (
            <div key={k.label} className={`${panel} px-4 py-3.5`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px]" style={{ color: ORANGE }}>{k.icon}</span>
                <span className="text-[10.5px] font-bold text-gray-400">{k.label}</span>
              </div>
              <div className="text-[22px] leading-none font-black text-white">{k.custom ?? (k.val ?? 0).toLocaleString()}</div>
              {d && <div className={`text-[10.5px] font-bold mt-1.5 ${d.up ? "text-green-400" : "text-red-400"}`}>{d.txt}</div>}
            </div>
          );
        })}
      </div>

      {/* chart + donut */}
      <div className="grid lg:grid-cols-5 gap-4 mb-4">
        <div className={`lg:col-span-3 ${panel} p-5`}>
          <h3 className="text-[13px] font-black text-white mb-3">Visitors Over Time</h3>
          {chart ? (
            <svg viewBox="0 0 1000 170" className="w-full" style={{ height: 180 }}>
              <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity=".35" /><stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
              </linearGradient></defs>
              {[0.25, 0.5, 0.75].map(y => <line key={y} x1="0" x2="1000" y1={150 * y} y2={150 * y} stroke="#2a2d33" strokeWidth="1" />)}
              <polyline fill="url(#vg)" stroke="none" points={chart.area} />
              <polyline fill="none" stroke={ORANGE} strokeWidth="3.5" points={chart.pts} strokeLinejoin="round" />
              {chart.xy.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4.5" fill={ORANGE} stroke="#121418" strokeWidth="2" />)}
              <text x="0" y="167" fontSize="10.5" fill="#8b8f96" fontWeight="600">{daily[0]?.d?.slice(5)}</text>
              <text x="1000" y="167" fontSize="10.5" fill="#8b8f96" fontWeight="600" textAnchor="end">{daily[daily.length - 1]?.d?.slice(5)}</text>
            </svg>
          ) : <div className="text-xs text-gray-500 py-12 text-center">No visits in this range yet.</div>}
        </div>
        <div className={`lg:col-span-2 ${panel} p-5`}>
          <h3 className="text-[13px] font-black text-white mb-3">Traffic Source</h3>
          {(sum?.sources || []).length
            ? <Donut data={(sum.sources as any[]).map(s => ({ k: s.source, n: s.n }))} total={totalSessions} center={(c.visitors ?? 0).toLocaleString()} />
            : <div className="text-xs text-gray-500 py-10 text-center">No sessions yet.</div>}
        </div>
      </div>

      {/* top pages / top products / device + funnel */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className={`${panel} p-5`}>
          <h3 className="text-[13px] font-black text-white mb-3">Top Pages</h3>
          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-[#2a2d33]"><span>Page</span><span>Views · %</span></div>
          {(sum?.top_pages || []).length ? (sum.top_pages as any[]).map(p => (
            <div key={p.page} className="flex justify-between items-center py-2 border-b border-[#23252b] last:border-0">
              <span className="text-[12px] font-bold text-gray-200 truncate pr-2">{p.page}</span>
              <span className="text-[11.5px] font-black text-white shrink-0">{p.n.toLocaleString()} <span className="text-gray-500 font-bold">· {Math.round((p.n / totalPv) * 100)}%</span></span>
            </div>
          )) : <div className="text-xs text-gray-500 py-4">No page views yet.</div>}
        </div>
        <div className={`${panel} p-5`}>
          <h3 className="text-[13px] font-black text-white mb-3">Top Products (Viewed)</h3>
          {(sum?.top_products || []).length ? (sum.top_products as any[]).slice(0, 6).map(p => (
            <div key={p.item_code} className="flex items-center gap-3 py-2 border-b border-[#23252b] last:border-0">
              <div className="w-11 h-11 rounded-lg bg-[#24262c] overflow-hidden shrink-0 flex items-center justify-center">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <span className="text-base opacity-40">👟</span>}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-gray-100 truncate">{p.name || p.item_code}</div>
                <div className="text-[10.5px] text-gray-500 font-semibold">{p.views.toLocaleString()} views{p.selling_price ? ` · ${peso(p.selling_price)}` : ""}{p.in_stock === false ? " · out of stock" : ""}</div>
              </div>
            </div>
          )) : <div className="text-xs text-gray-500 py-4">No product views yet.</div>}
        </div>
        <div className={`${panel} p-5`}>
          <h3 className="text-[13px] font-black text-white mb-3">Device</h3>
          {(sum?.devices || []).length ? (sum.devices as any[]).map(d => (
            <div key={d.device} className="mb-3">
              <div className="flex justify-between text-[11.5px] font-bold text-gray-300 mb-1.5"><span className="capitalize">{d.device}</span><span>{Math.round((d.n / totalDevices) * 100)}%</span></div>
              <div className="h-2 bg-[#2a2d33] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(d.n / totalDevices) * 100}%`, background: ORANGE }} /></div>
            </div>
          )) : <div className="text-xs text-gray-500 py-4">No sessions yet.</div>}
          <h3 className="text-[13px] font-black text-white mt-5 mb-3">Conversion Funnel</h3>
          {[["Visitors", funnel.visitors], ["Viewed product", funnel.product_viewers], ["Added to cart", funnel.cart_adders], ["Checkout", funnel.checkout_starters], ["Ordered", funnel.buyers]].map(([l, v]: any) => (
            <div key={l} className="mb-2">
              <div className="flex justify-between text-[10.5px] font-bold text-gray-400 mb-1"><span>{l}</span><span className="text-gray-200">{(v || 0).toLocaleString()} · {fMax ? Math.round(((v || 0) / fMax) * 100) : 0}%</span></div>
              <div className="h-1.5 bg-[#2a2d33] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${fMax ? ((v || 0) / fMax) * 100 : 0}%`, background: ORANGE }} /></div>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-[#2a2d33] flex justify-between text-xs"><span className="text-gray-500 font-semibold">Revenue (tracked)</span><span className="font-black text-white">{peso(c.revenue || 0)}</span></div>
        </div>
      </div>

      {/* searches */}
      <div className={`${panel} p-5`}>
        <h3 className="text-[13px] font-black text-white mb-3">🔎 Searches & Filters</h3>
        <div className="grid md:grid-cols-3 gap-5">
          <div>
            {(sum?.searches || []).length ? (sum.searches as any[]).map(s => (
              <div key={s.q} className="flex items-center gap-2 py-1.5 border-b border-[#23252b] last:border-0">
                <span className="text-[12px] font-bold text-gray-200 truncate">{s.q}</span>
                {Number(s.zero_results) > 0 && <span className="text-[8.5px] font-black bg-red-950/50 text-red-400 border border-red-900 px-1.5 py-0.5 rounded-full uppercase shrink-0">no results</span>}
                <span className="ml-auto text-[12px] font-black text-white">{s.n}</span>
              </div>
            )) : <div className="text-xs text-gray-500">No searches yet.</div>}
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">Most-filtered sizes</h4>
            <div className="flex flex-wrap gap-1.5">
              {(sum?.sizes || []).length ? (sum.sizes as any[]).map(z => <span key={z.size} className="text-[11px] font-bold bg-[#24262c] border border-[#2f3238] text-gray-200 rounded-lg px-2.5 py-1">{z.size} · {z.n}</span>) : <span className="text-xs text-gray-500">None yet.</span>}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">Most-filtered brands</h4>
            <div className="flex flex-wrap gap-1.5">
              {(sum?.brands || []).length ? (sum.brands as any[]).map(b => <span key={b.brand} className="text-[11px] font-bold bg-[#24262c] border border-[#2f3238] text-gray-200 rounded-lg px-2.5 py-1">{b.brand} · {b.n}</span>) : <span className="text-xs text-gray-500">None yet.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
