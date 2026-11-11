// Admin — Shoe Cleaner "Play & Win" campaign module (new Dashboard section).
// All actions go through /api/shoe-cleaner with the logged-in credential;
// MANAGER PINs get view + discount redemption, everything else is owner-only.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const getPw = () => { try { return localStorage.getItem("sb_admin_pw") || sessionStorage.getItem("sb_admin_pw") || ""; } catch { return ""; } };
async function api(op: string, extra: Record<string, any> = {}) {
  const r = await fetch("/api/shoe-cleaner", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, password: getPw(), ...extra }),
  });
  const out = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) throw new Error(out.error || "Not allowed");
  return out;
}
function csv(rows: Record<string, any>[], name: string) {
  if (!rows.length) { toast("Nothing to export"); return; }
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const text = [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
const fmtDT = (s?: string | null) => s ? new Date(s).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const ORANGE = "#F2762E";
const card = "bg-white/[.04] border border-white/[.08] rounded-lg";
const btn = "text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded border border-white/[.12] bg-white/[.05] text-white/60 hover:text-white";
const btnO = `text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded bg-[${ORANGE}] text-black hover:opacity-90`;
const inp = "bg-white/[.06] border border-white/[.12] rounded px-3 py-2 text-white text-xs outline-none focus:border-[#F2762E]";
const th = "text-left text-[9px] tracking-wider uppercase text-white/30 px-2 py-2 border-b border-white/[.08] whitespace-nowrap";
const td = "px-2 py-2 border-b border-white/[.04] text-xs text-white/60 whitespace-nowrap";

const ST_COLORS: Record<string, string> = {
  generated: "bg-white/10 text-white/60", distributed: "bg-amber-400/15 text-amber-300",
  registered: "bg-emerald-400/15 text-emerald-300", redeemed: "bg-[#F2762E]/20 text-[#F2762E]",
  expired: "bg-white/10 text-white/40", voided: "bg-red-400/15 text-red-300",
  unused: "bg-white/10 text-white/60", void: "bg-red-400/15 text-red-300",
};
const Pill = ({ s }: { s: string }) => (
  <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${ST_COLORS[s] || "bg-white/10 text-white/50"}`}>{s}</span>
);

export default function ShoeCleanerCampaign() {
  const [tab, setTab] = useState<"overview" | "vouchers" | "registrations" | "raffle" | "discounts" | "partners" | "content">("overview");
  const [k, setK] = useState<any>(null);
  const [camp, setCamp] = useState<any>(null);

  const loadK = () => api("kpis").then(o => { if (o.ok) { setK(o.k); setCamp(o.campaign); } }).catch(e => toast.error(String(e.message || e)));
  useEffect(() => { loadK(); }, []);

  const TABS: [typeof tab, string][] = [["overview", "Overview"], ["vouchers", "Vouchers"], ["registrations", "Registrations"], ["raffle", "Raffle"], ["discounts", "Discounts"], ["partners", "Partners"], ["content", "Content"]];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded ${tab === id ? "bg-[#F2762E] text-black" : "border border-white/[.12] bg-white/[.05] text-white/50"}`}>{label}</button>
        ))}
        {camp && <span className="ml-auto text-[10px] text-white/35 uppercase tracking-wider">
          {camp.dti_permit ? `DTI ${camp.dti_permit}` : "⚠ DTI permit not recorded — raffle locked"} · ends {camp.ends_on}</span>}
      </div>

      {tab === "overview" && <Overview k={k} />}
      {tab === "vouchers" && <Vouchers onChanged={loadK} />}
      {tab === "registrations" && <Registrations />}
      {tab === "raffle" && <Raffle onChanged={loadK} />}
      {tab === "discounts" && <Discounts onChanged={loadK} />}
      {tab === "partners" && <Partners />}
      {tab === "content" && <Content onChanged={loadK} />}
    </div>
  );
}

function Overview({ k }: { k: any }) {
  const items = k ? [
    ["Vouchers generated", k.vouchers_total], ["Awaiting distribution", k.generated], ["Distributed", k.distributed],
    ["Registrations", k.registrations], ["Raffle entries", k.raffle_entries], ["Winners", k.winners],
    ["Discounts issued", k.discounts_issued], ["Discounts redeemed", k.discounts_redeemed],
    ["Discounts still open", (k.discounts_issued ?? 0) - (k.discounts_redeemed ?? 0)], ["Voided", k.voided],
  ] : [];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {items.map(([l, n]) => (
        <div key={l as string} className={`${card} p-3`}>
          <div className="font-black text-2xl text-[#F2762E] tabular-nums">{n ?? "…"}</div>
          <div className="text-[9px] tracking-wider uppercase text-white/35 mt-1 leading-snug">{l}</div>
        </div>
      ))}
      {!k && <div className="text-white/40 text-xs col-span-full">Loading…</div>}
    </div>
  );
}

function Vouchers({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [status, setStatus] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [gen, setGen] = useState({ qty: 100, label: "", partner_id: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api("vouchers", { q, status }).then(o => o.ok && setRows(o.rows)).catch(e => toast.error(String(e.message || e)));
  useEffect(() => { load(); api("batches").then(o => o.ok && setBatches(o.rows)); api("partners").then(o => o.ok && setPartners(o.rows)); }, [q, status]);

  async function generate() {
    if (!gen.qty || gen.qty < 1) return toast.error("Quantity?");
    setBusy(true);
    const out = await api("gen_batch", { qty: gen.qty, label: gen.label || `Batch ${new Date().toISOString().slice(0, 10)}`, partner_id: gen.partner_id || null }).catch(e => ({ ok: false, error: String(e) }));
    setBusy(false);
    if (out.ok) { toast.success(`${gen.qty} vouchers generated`); load(); onChanged(); api("batches").then(o => o.ok && setBatches(o.rows)); }
    else toast.error(out.error || "Failed");
  }

  async function pdf(batch: any) {
    setBusy(true);
    try {
      const out = await api("voucher_codes", { batch_id: batch.id });
      if (!out.ok || !out.codes?.length) throw new Error("No codes in batch");
      const { jsPDF } = await import("jspdf");
      const QR = (await import("qrcode")).default;
      const url = "https://soleblessingofficial.com/shoe-cleaner/play-and-win";
      const qrData = await QR.toDataURL(url, { margin: 0, width: 480, errorCorrectionLevel: "M" });
      const tpl = await fetch("/shoe-cleaner/voucher-template.jpg").then(r => r.blob())
        .then(b => new Promise<string>(res => { const f = new FileReader(); f.onload = () => res(f.result as string); f.readAsDataURL(b); }));
      // A4 landscape, 4 vouchers per sheet (2x2), each 140 x 93.3 mm, crop marks
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
      const PW = 297, PH = 210, M = 4.5, CW = (PW - M * 2) / 2, CH = (PH - M * 2) / 2;
      const VW = 140, VH = VW * (1024 / 1536);
      out.codes.forEach((code: string, i: number) => {
        const slot = i % 4;
        if (i > 0 && slot === 0) doc.addPage();
        const x = M + (slot % 2) * CW + (CW - VW) / 2;
        const y = M + Math.floor(slot / 2) * CH + (CH - VH) / 2;
        doc.addImage(tpl, "JPEG", x, y, VW, VH, "sc_tpl");
        // real QR over the placeholder box (box: 12.24%..24.1% x, 71.1%..90.0% y)
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 0.1200 * VW, y + 0.7050 * VH, 0.1240 * VW, 0.1960 * VH, "F");
        const qs = 0.1070 * VW;
        doc.addImage(qrData, "PNG", x + 0.1285 * VW, y + 0.7215 * VH, qs, qs, "sc_qr");
        // voucher number over the pill, right of the divider
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 0.2730 * VW, y + 0.9030 * VH, 0.2060 * VW, 0.0470 * VH, "F");
        doc.setFont("courier", "bold"); doc.setFontSize(11); doc.setTextColor(10, 10, 10);
        doc.text(code, x + 0.3760 * VW, y + 0.9400 * VH, { align: "center" });
        // crop marks
        doc.setDrawColor(130, 130, 130); doc.setLineWidth(0.2);
        [[x, y], [x + VW, y], [x, y + VH], [x + VW, y + VH]].forEach(([cx, cy]) => {
          doc.line(cx - 3.2, cy, cx - 1.2, cy); doc.line(cx + 1.2, cy, cx + 3.2, cy);
          doc.line(cx, cy - 3.2, cx, cy - 1.2); doc.line(cx, cy + 1.2, cx, cy + 3.2);
        });
      });
      doc.save(`${(batch.label || "vouchers").replace(/\W+/g, "-")}.pdf`);
      toast.success(`PDF with ${out.codes.length} vouchers downloaded`);
    } catch (e: any) { toast.error(String(e.message || e)); }
    setBusy(false);
  }

  async function voidV(code: string) {
    const out = await api("void_voucher", { code, reason: "admin void" }).catch(e => ({ ok: false, error: String(e) }));
    if (out.ok) { toast.success(`${code} voided`); load(); onChanged(); } else toast.error(out.error || "Only unregistered vouchers can be voided");
  }

  return (
    <div className="space-y-3">
      <div className={`${card} p-3 flex flex-wrap items-end gap-2`}>
        <div><div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">Quantity</div>
          <input type="number" className={inp + " w-24"} value={gen.qty} onChange={e => setGen({ ...gen, qty: +e.target.value })} id="sc-gen-qty" /></div>
        <div className="flex-1 min-w-[140px]"><div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">Batch label</div>
          <input className={inp + " w-full"} placeholder="e.g. Tagaytay Open 2026" value={gen.label} onChange={e => setGen({ ...gen, label: e.target.value })} id="sc-gen-label" /></div>
        <div><div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">Assign to partner</div>
          <select className={inp} value={gen.partner_id} onChange={e => setGen({ ...gen, partner_id: e.target.value })} id="sc-gen-partner">
            <option value="">— none yet —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        <button className={btnO} onClick={generate} disabled={busy}>+ Generate batch</button>
      </div>

      {!!batches.length && (
        <div className={`${card} p-3`}>
          <div className="text-[9px] uppercase tracking-wider text-white/35 mb-2">Batches — print-ready PDF (4 per A4, crop marks, QR → landing page)</div>
          <div className="flex flex-wrap gap-2">
            {batches.map(b => (
              <button key={b.id} className={btn} onClick={() => pdf(b)} disabled={busy}>
                ⬇ {b.label} · {b.qty} pcs{b.partner?.name ? ` · ${b.partner.name}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <input className={inp + " flex-1 min-w-[160px]"} placeholder="Search voucher #…" value={q} onChange={e => setQ(e.target.value)} id="sc-v-q" />
        <select className={inp} value={status} onChange={e => setStatus(e.target.value)} id="sc-v-st">
          <option value="">All statuses</option>
          {["generated", "distributed", "registered", "redeemed", "expired", "voided"].map(s => <option key={s}>{s}</option>)}
        </select>
        <button className={btn} onClick={() => csv(rows.map(r => ({ code: r.code, status: r.status, batch: r.batch?.label, partner: r.partner?.name, registered_by: r.reg?.full_name, reg_ref: r.reg?.ref, reg_date: r.reg?.created_at, discount: r.reg?.discount?.status })), "vouchers.csv")}>Export CSV</button>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>Voucher #</th><th className={th}>Status</th><th className={th}>Batch</th><th className={th}>Partner</th><th className={th}>Registered by</th><th className={th}>Discount</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className={td}><b className="text-white font-mono">{r.code}</b></td>
                <td className={td}><Pill s={r.status} /></td>
                <td className={td}>{r.batch?.label || "—"}</td>
                <td className={td}>{r.partner?.name || "—"}</td>
                <td className={td}>{r.reg ? <>{r.reg.full_name} <span className="text-white/30">· {fmtDT(r.reg.created_at)}</span></> : "—"}</td>
                <td className={td}>{r.reg?.discount ? <Pill s={r.reg.discount.status} /> : "—"}</td>
                <td className={td}>{["generated", "distributed"].includes(r.status) && <button className={btn} onClick={() => voidV(r.code)}>Void</button>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className={td} colSpan={7}>No vouchers yet — generate a batch above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Registrations() {
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState("");
  useEffect(() => { api("registrations", { q }).then(o => o.ok && setRows(o.rows)).catch(e => toast.error(String(e.message || e))); }, [q]);
  async function dq(r: any) {
    const out = await api("disqualify", { registration_id: r.id, on: !r.disqualified, reason: "admin action" }).catch(e => ({ ok: false }));
    if (out.ok) setRows(rs => rs.map(x => x.id === r.id ? { ...x, disqualified: !r.disqualified } : x));
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <input className={inp + " flex-1 min-w-[180px]"} placeholder="Search name / ref / phone / email…" value={q} onChange={e => setQ(e.target.value)} id="sc-r-q" />
        <button className={btn} onClick={() => csv(rows.map(r => ({ ref: r.ref, name: r.full_name, email: r.email, phone: r.phone, profession: r.profession, voucher: r.voucher?.code, privacy_consent: r.privacy_consent_at, marketing: r.marketing_consent, discount: r.discount?.status, date: r.created_at })), "registrations.csv")}>Export CSV</button>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>Ref</th><th className={th}>Name</th><th className={th}>Contact</th><th className={th}>Profession</th><th className={th}>Voucher</th><th className={th}>Privacy ✓</th><th className={th}>Discount</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={r.disqualified ? "opacity-40" : ""}>
                <td className={td}><b className="text-white">{r.ref}</b></td>
                <td className={td}>{r.full_name}{r.disqualified && <span className="text-red-400 text-[9px] uppercase ml-1">DQ</span>}</td>
                <td className={td}>{r.phone}<div className="text-white/30">{r.email}</div></td>
                <td className={td}>{r.profession || "—"}</td>
                <td className={td}><span className="font-mono">{r.voucher?.code}</span></td>
                <td className={td + " text-emerald-300"}>✓ {fmtDT(r.privacy_consent_at)}</td>
                <td className={td}>{r.discount ? <Pill s={r.discount.status} /> : "—"}</td>
                <td className={td}><button className={btn} onClick={() => dq(r)}>{r.disqualified ? "Requalify" : "Disqualify"}</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td className={td} colSpan={8}>No registrations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Raffle({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<any[]>([]); const [dti, setDti] = useState("");
  const period = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7), []);
  const [drawPeriod, setDrawPeriod] = useState(period);
  const load = () => api("raffles").then(o => { if (o.ok) { setRows(o.rows); setDti(o.dti); } }).catch(e => toast.error(String(e.message || e)));
  useEffect(() => { load(); }, []);

  async function draw() {
    const out = await api("draw", { period: drawPeriod }).catch(e => ({ ok: false, error: String(e) }));
    if (out.ok) { toast.success("Winner drawn!"); load(); onChanged(); }
    else toast.error({ dti_locked: "Locked: record the DTI permit in Content first.", already_drawn: "This month is already drawn.", no_entries: "No eligible entries in that month." }[out.error as string] || out.error || "Failed");
  }
  async function setWin(w: any, status?: string, publish?: boolean) {
    const out = await api("winner_status", { winner_id: w.id, status, publish }).catch(e => ({ ok: false }));
    if (out.ok) { toast.success("Updated"); load(); } else toast.error("Failed");
  }
  async function redraw(p: string) {
    const reason = window.prompt ? "" : ""; // browsers in admin are fine; keep simple fixed reason
    const out = await api("redraw", { period: p, reason: "Winner disqualified / unreachable" }).catch(e => ({ ok: false }));
    if (out.ok) { toast.success("Reopened for redraw (audited)"); load(); } else toast.error("Failed");
  }

  const WSTATES = ["pending_verification", "verified", "notified", "claimed", "released"];
  return (
    <div className="space-y-3">
      {!dti && <div className="border border-amber-400/40 bg-amber-400/[.07] rounded-lg p-3 text-amber-300 text-xs">
        🔒 Draws are locked until the DTI permit number is recorded (Content tab). Registrations and discounts keep working.</div>}
      <div className={`${card} p-3 flex items-end gap-2 flex-wrap`}>
        <div><div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">Raffle month</div>
          <input className={inp} value={drawPeriod} onChange={e => setDrawPeriod(e.target.value)} placeholder="YYYY-MM" id="sc-draw-period" /></div>
        <button className={btnO} onClick={draw}>🎲 Draw winner</button>
        <span className="text-white/30 text-[10px]">Entries = registrations made in that month (Asia/Manila), excluding disqualified. Draw is random, snapshotted and audited.</span>
      </div>
      {rows.map(r => (
        <div key={r.id} className={`${card} p-3`}>
          <div className="flex items-center gap-3 flex-wrap">
            <b className="text-white text-sm">{r.period}</b>
            <Pill s={r.status === "drawn" ? "registered" : "generated"} />
            <span className="text-white/35 text-xs">eligible {r.eligible_count ?? "—"} · drawn {fmtDT(r.drawn_at)} by {r.drawn_by || "—"}</span>
            {r.status === "drawn" && <button className={btn + " ml-auto"} onClick={() => redraw(r.period)}>Redraw (audit)</button>}
          </div>
          {(r.winners || []).map((w: any) => (
            <div key={w.id} className={`mt-2 p-2 rounded border ${w.status === "disqualified" ? "border-red-400/30 opacity-50" : "border-[#F2762E]/40"} flex items-center gap-2 flex-wrap text-xs`}>
              <b className="text-white">{w.reg?.full_name}</b>
              <span className="font-mono text-white/40">{w.reg?.voucher?.code}</span>
              <span className="text-white/40">{w.reg?.phone} · {w.reg?.email}</span>
              <Pill s={w.status === "disqualified" ? "voided" : "redeemed"} />
              <span className="text-white/50 uppercase text-[9px] tracking-wider">{w.status.replace(/_/g, " ")}</span>
              {w.status !== "disqualified" && (
                <span className="ml-auto flex gap-1 flex-wrap">
                  <select className={inp} value={w.status} onChange={e => setWin(w, e.target.value)} id={`sc-win-${w.id}`}>
                    {WSTATES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                  <button className={btn} onClick={() => setWin(w, undefined, !w.published)}>{w.published ? "Unpublish" : "Publish on page"}</button>
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
      {!rows.length && <div className="text-white/40 text-xs">No draws yet.</div>}
    </div>
  );
}

function Discounts({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState("");
  const [code, setCode] = useState(""); const [orderRef, setOrderRef] = useState("");
  const [check, setCheck] = useState<any>(null);
  const load = () => api("discounts", { q }).then(o => o.ok && setRows(o.rows)).catch(e => toast.error(String(e.message || e)));
  useEffect(() => { load(); }, [q]);

  async function validate() {
    const out = await api("validate_discount", { code }).catch(e => ({ ok: false, error: String(e) }));
    setCheck(out);
    if (!out.ok) toast.error(out.error === "not_found" ? "Code not found" : out.error);
  }
  async function redeem() {
    const out = await api("redeem", { code, order_ref: orderRef }).catch(e => ({ ok: false, error: String(e) }));
    if (out.ok) { toast.success(`Redeemed — ${out.pct}% off for ${out.name}`); setCheck(null); setCode(""); setOrderRef(""); load(); onChanged(); }
    else toast.error({ already_redeemed: "Already redeemed.", not_found: "Code not found." }[out.error as string] || out.error || "Failed");
  }
  async function unredeem(c: string) {
    const out = await api("unredeem", { code: c, reason: "order cancelled" }).catch(e => ({ ok: false }));
    if (out.ok) { toast.success("Entitlement restored"); load(); onChanged(); } else toast.error("Failed");
  }

  return (
    <div className="space-y-3">
      <div className={`${card} p-3`}>
        <div className="text-[9px] uppercase tracking-wider text-white/35 mb-2">Redeem at counter — enter the customer's discount code (SCD-…) or registration ref (SC-…)</div>
        <div className="flex gap-2 flex-wrap">
          <input className={inp + " flex-1 min-w-[150px] font-mono uppercase"} placeholder="SCD-XXXXXXXX" value={code} onChange={e => { setCode(e.target.value); setCheck(null); }} id="sc-d-code" />
          <input className={inp + " flex-1 min-w-[130px]"} placeholder="Order ref (optional)" value={orderRef} onChange={e => setOrderRef(e.target.value)} id="sc-d-order" />
          <button className={btn} onClick={validate}>Validate</button>
          <button className={btnO} onClick={redeem} disabled={!check?.ok || check?.status !== "unused"}>Redeem 15%</button>
        </div>
        {check?.ok && (
          <div className="mt-2 text-xs text-white/60">
            {check.name} · {check.ref} · <Pill s={check.status} /> {check.status !== "unused" && <span className="text-red-300 ml-1">cannot redeem</span>}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <input className={inp + " flex-1 min-w-[160px]"} placeholder="Search code…" value={q} onChange={e => setQ(e.target.value)} id="sc-d-q" />
        <button className={btn} onClick={() => csv(rows.map(r => ({ code: r.code, pct: r.pct, status: r.status, name: r.reg?.full_name, ref: r.reg?.ref, voucher: r.reg?.voucher?.code, redeemed_at: r.redeemed_at, by: r.redeemed_by, order: r.order_ref })), "discounts.csv")}>Export CSV</button>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>Code</th><th className={th}>Participant</th><th className={th}>Voucher</th><th className={th}>Status</th><th className={th}>Redeemed</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.code}>
                <td className={td}><b className="text-white font-mono">{r.code}</b> <span className="text-white/30">{r.pct}%</span></td>
                <td className={td}>{r.reg?.full_name}<div className="text-white/30">{r.reg?.ref}</div></td>
                <td className={td}><span className="font-mono">{r.reg?.voucher?.code}</span></td>
                <td className={td}><Pill s={r.status} /></td>
                <td className={td}>{r.status === "redeemed" ? <>{fmtDT(r.redeemed_at)} · {r.redeemed_by}{r.order_ref ? ` · ${r.order_ref}` : ""}</> : "—"}</td>
                <td className={td}>{r.status === "redeemed" && <button className={btn} onClick={() => unredeem(r.code)}>Undo (cancelled order)</button>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className={td} colSpan={6}>No discounts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Partners() {
  const [rows, setRows] = useState<any[]>([]);
  const [p, setP] = useState<any>({ name: "", contact_person: "", contact_number: "", location: "", event_name: "" });
  const load = () => api("partners").then(o => o.ok && setRows(o.rows)).catch(e => toast.error(String(e.message || e)));
  useEffect(() => { load(); }, []);
  async function save() {
    if (!p.name) return toast.error("Club / venue name?");
    const out = await api("partner_save", { partner: p }).catch(e => ({ ok: false }));
    if (out.ok) { toast.success("Saved"); setP({ name: "", contact_person: "", contact_number: "", location: "", event_name: "" }); load(); }
    else toast.error("Failed");
  }
  return (
    <div className="space-y-3">
      <div className={`${card} p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end`}>
        {[["name", "Club / venue *"], ["contact_person", "Contact person"], ["contact_number", "Contact #"], ["location", "Location"], ["event_name", "Event"]].map(([k, l]) => (
          <div key={k} className="min-w-0"><div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">{l}</div>
            <input className={inp + " w-full"} value={p[k] || ""} onChange={e => setP({ ...p, [k]: e.target.value })} id={`sc-p-${k}`} /></div>
        ))}
        <button className={btnO + " col-span-2 sm:col-span-5 sm:w-max"} onClick={save}>+ Add partner</button>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>Club / event</th><th className={th}>Contact</th><th className={th}>Location</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className={td}><b className="text-white">{r.name}</b>{r.event_name && <div className="text-white/30">{r.event_name}</div>}</td>
                <td className={td}>{r.contact_person || "—"}<div className="text-white/30">{r.contact_number}</div></td>
                <td className={td}>{r.location || "—"}</td>
                <td className={td}><Pill s={r.status === "Active" ? "registered" : "generated"} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td className={td} colSpan={4}>No partners yet. Assign voucher batches to partners in the Vouchers tab.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-white/30 text-[10px] max-w-xl">Positioning reminder: use neutral language like “SoleBlessing Special Offer for Pickleball Players” — never “Official Partner/Sponsor” without written authorization.</p>
    </div>
  );
}

function Content({ onChanged }: { onChanged: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [dti, setDti] = useState(""); const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("content_get").then(o => { if (o.ok) { setVals(o.content); setDti(o.campaign?.dti_permit || ""); setEnds(o.campaign?.ends_on || ""); } })
      .catch(e => toast.error(String(e.message || e)));
  }, []);
  const FIELDS: [string, string, boolean][] = [
    ["headline", "Headline", false], ["subhead", "Supporting text", true],
    ["hero_img", "Hero image URL", false], ["video_url", "Video URL", false], ["video_poster", "Video poster URL", false],
    ["features_img", "Kit photo URL", false], ["before_after_img", "Before/after photo URL", false],
    ["features", "Kit features (separate with |)", true], ["terms", "Terms & conditions", true],
  ];
  async function save() {
    setBusy(true);
    const out = await api("content_set", { values: vals, dti_permit: dti, ends_on: ends || undefined }).catch(e => ({ ok: false }));
    setBusy(false);
    if (out.ok) { toast.success("Landing page updated — live immediately"); onChanged(); } else toast.error("Failed");
  }
  return (
    <div className="space-y-3 max-w-2xl">
      <div className={`${card} p-3 grid sm:grid-cols-2 gap-3`}>
        <div><div className="text-[9px] uppercase tracking-wider text-amber-300 mb-1">DTI permit no. (unlocks raffle draws)</div>
          <input className={inp + " w-full"} value={dti} onChange={e => setDti(e.target.value)} placeholder="DTI Fair Trade Permit No. …" id="sc-c-dti" /></div>
        <div><div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">Campaign end date</div>
          <input type="date" className={inp + " w-full"} value={ends} onChange={e => setEnds(e.target.value)} id="sc-c-ends" /></div>
      </div>
      {FIELDS.map(([k, label, long]) => (
        <div key={k}>
          <div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">{label}</div>
          {long
            ? <textarea className={inp + " w-full"} rows={3} value={vals[k] || ""} onChange={e => setVals({ ...vals, [k]: e.target.value })} id={`sc-c-${k}`} />
            : <input className={inp + " w-full"} value={vals[k] || ""} onChange={e => setVals({ ...vals, [k]: e.target.value })} id={`sc-c-${k}`} />}
        </div>
      ))}
      <button className={btnO} onClick={save} disabled={busy}>Save — updates landing page live</button>
    </div>
  );
}
