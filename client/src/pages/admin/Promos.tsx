import { useState, useEffect } from "react";
import { sb } from "@/lib/supabase";
import { Plus, Edit2, Trash2, X, Save, CheckCircle, Tag, TrendingUp, Users, Clock } from "lucide-react";
import { toast } from "sonner";

type Promo = {
  id: string; code: string; description: string;
  discount_type: "percent" | "fixed"; discount_value: number;
  min_order: number; max_uses: number | null; uses_count: number;
  active: boolean; expires_at: string | null; applies_to: string;
  created_at: string;
};

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Never";
const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;
const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

function PromoModal({ promo, onClose, onSave }: { promo?: Promo; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    code: promo?.code || "",
    description: promo?.description || "",
    discount_type: promo?.discount_type || "percent",
    discount_value: promo ? String(promo.discount_type === "fixed" ? promo.discount_value / 100 : promo.discount_value) : "",
    min_order: promo ? String(promo.min_order / 100) : "0",
    max_uses: promo?.max_uses ? String(promo.max_uses) : "",
    applies_to: promo?.applies_to || "all",
    active: promo?.active ?? true,
    expires_at: promo?.expires_at ? promo.expires_at.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    set("code", code);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) { setErr("Code and discount are required."); return; }
    setSaving(true); setErr("");
    try {
      const discVal = form.discount_type === "fixed"
        ? Math.round(parseFloat(form.discount_value) * 100)
        : parseInt(form.discount_value);
      if (form.discount_type === "percent" && (discVal < 1 || discVal > 100)) { setErr("Percent must be 1–100"); return; }

      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: discVal,
        min_order: Math.round(parseFloat(form.min_order || "0") * 100),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        applies_to: form.applies_to,
        active: form.active,
        expires_at: form.expires_at ? new Date(form.expires_at + "T23:59:59+08:00").toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (promo?.id) {
        await sb.update("sb_promos", `id=eq.${promo.id}`, payload);
        toast.success("Promo code updated!");
      } else {
        await sb.insert("sb_promos", payload);
        toast.success("Promo code created!");
      }
      onSave();
    } catch(e: any) {
      if (e.message?.includes("unique")) setErr("Code already exists. Try another.");
      else setErr(e.message || "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-black text-[#0d2430] text-lg">{promo ? "Edit Promo Code" : "Create Promo Code"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create discounts for your customers</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Code */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Promo Code *</label>
            <div className="flex gap-2">
              <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER20" maxLength={20}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold tracking-widest uppercase outline-none focus:border-[#0d2430] font-mono" />
              <button onClick={generateCode}
                className="px-4 py-3 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Description (shown to admin)</label>
            <input value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="e.g. Summer sale 20% off for all orders"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0d2430]" />
          </div>

          {/* Discount Type + Value */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Discount *</label>
            <div className="flex gap-2 mb-3">
              {[
                { val: "percent", label: "% Percent Off" },
                { val: "fixed", label: "₱ Fixed Amount" },
              ].map(t => (
                <button key={t.val} onClick={() => set("discount_type", t.val)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    form.discount_type === t.val ? "bg-[#0d2430] text-white border-[#0d2430]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                {form.discount_type === "percent" ? "%" : "₱"}
              </span>
              <input type="number" value={form.discount_value} onChange={e => set("discount_value", e.target.value)}
                placeholder={form.discount_type === "percent" ? "20" : "200"}
                min="0" max={form.discount_type === "percent" ? "100" : undefined}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm font-bold outline-none focus:border-[#0d2430]" />
            </div>
            {form.discount_value && (
              <p className="text-[11px] text-[#C9A84C] font-semibold mt-1.5 pl-1">
                {form.discount_type === "percent"
                  ? `${form.discount_value}% off every qualifying order`
                  : `₱${form.discount_value} off every qualifying order`}
              </p>
            )}
          </div>

          {/* Min Order + Max Uses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Min. Order (₱)</label>
              <input type="number" value={form.min_order} onChange={e => set("min_order", e.target.value)}
                placeholder="0 = no minimum"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0d2430]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Max Uses (blank = unlimited)</label>
              <input type="number" value={form.max_uses} onChange={e => set("max_uses", e.target.value)}
                placeholder="Unlimited"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0d2430]" />
            </div>
          </div>

          {/* Applies To + Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Applies To</label>
              <select value={form.applies_to} onChange={e => set("applies_to", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0d2430]">
                {["all","sneakers","perfume","gadgets","apparel"].map(o => (
                  <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Expiry Date</label>
              <input type="date" value={form.expires_at} onChange={e => set("expires_at", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0d2430]" />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div>
              <div className="text-sm font-semibold text-[#0d2430]">Active Status</div>
              <div className="text-xs text-gray-400">{form.active ? "Customers can use this code" : "Code is disabled"}</div>
            </div>
            <button onClick={() => set("active", !form.active)}
              className={`w-12 h-6 rounded-full transition-all relative ${form.active ? "bg-green-500" : "bg-gray-300"}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.active ? "left-6" : "left-0.5"}`} />
            </button>
          </div>

          {err && <p className="text-red-500 text-xs bg-red-50 px-4 py-2 rounded-lg">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#0d2430] text-white py-3 text-sm font-bold tracking-wide rounded-xl hover:bg-[#122d3a] disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? "Saving…" : <><Save className="h-4 w-4" /> {promo ? "Update Code" : "Create Code"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPromos() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; promo?: Promo }>({ open: false });
  const [usagePromo, setUsagePromo] = useState<string | null>(null);
  const [usage, setUsage] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try { setPromos(await sb.select("sb_promos", "order=created_at.desc")); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadUsage = async (promoId: string) => {
    try {
      const data = await sb.select("sb_promo_uses", `promo_id=eq.${promoId}&order=created_at.desc&limit=20`);
      setUsage(data);
    } catch(e) { setUsage([]); }
  };

  useEffect(() => { load(); }, []);

  const deletePromo = async (id: string, code: string) => {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return;
    await sb.delete("sb_promos", `id=eq.${id}`);
    toast.success("Promo code deleted");
    load();
  };

  const toggleActive = async (p: Promo) => {
    await sb.update("sb_promos", `id=eq.${p.id}`, { active: !p.active, updated_at: new Date().toISOString() });
    toast.success(p.active ? "Code deactivated" : "Code activated");
    load();
  };

  const stats = {
    total: promos.length,
    active: promos.filter(p => p.active && !isExpired(p.expires_at)).length,
    totalUses: promos.reduce((s, p) => s + p.uses_count, 0),
    expired: promos.filter(p => isExpired(p.expires_at)).length,
  };

  return (
    <div className="space-y-6">
      {modal.open && (
        <PromoModal promo={modal.promo} onClose={() => setModal({ open: false })}
          onSave={() => { setModal({ open: false }); load(); }} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Codes", value: stats.total, icon: Tag, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: stats.active, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Uses", value: stats.totalUses, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Expired", value: stats.expired, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-black text-[#0d2430]">{s.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Header + Create */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide">All Promo Codes</h3>
          <p className="text-xs text-gray-400 mt-0.5">Create and manage discount codes for your customers</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-5 py-2.5 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Create Promo Code
        </button>
      </div>

      {/* Promo cards */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl py-16 text-center">
          <div className="flex gap-2 justify-center">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>
        </div>
      ) : promos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl py-20 text-center">
          <Tag className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-semibold text-[#0d2430] mb-1">No promo codes yet</p>
          <p className="text-xs text-gray-400 mb-6">Create your first discount code to boost sales</p>
          <button onClick={() => setModal({ open: true })}
            className="bg-[#0d2430] text-white px-6 py-3 text-xs font-bold rounded-xl hover:bg-[#122d3a]">
            Create First Code
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(p => {
            const expired = isExpired(p.expires_at);
            const exhausted = p.max_uses !== null && p.uses_count >= p.max_uses;
            const live = p.active && !expired && !exhausted;

            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Code badge */}
                      <div className={`px-4 py-3 rounded-xl font-black font-mono text-lg tracking-widest flex-shrink-0 ${
                        live ? "bg-[#0d2430] text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {p.code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            live ? "bg-green-100 text-green-700" :
                            expired ? "bg-amber-100 text-amber-700" :
                            exhausted ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {live ? "✓ Active" : expired ? "Expired" : exhausted ? "Used Up" : "Inactive"}
                          </span>
                          <span className="text-[10px] text-gray-400 capitalize">{p.applies_to === "all" ? "All categories" : p.applies_to}</span>
                        </div>
                        <div className="text-xl font-black text-[#C9A84C] mb-0.5">
                          {p.discount_type === "percent" ? `${p.discount_value}% OFF` : `${fmt(p.discount_value)} OFF`}
                        </div>
                        {p.description && <p className="text-xs text-gray-500 mb-2">{p.description}</p>}
                        <div className="flex flex-wrap gap-3 text-[10px] text-gray-400">
                          {p.min_order > 0 && <span>Min order: {fmt(p.min_order)}</span>}
                          <span>Used: <strong className="text-[#0d2430]">{p.uses_count}</strong>{p.max_uses ? ` / ${p.max_uses}` : " times"}</span>
                          <span>Expires: <strong className={expired ? "text-red-500" : "text-[#0d2430]"}>{fmtDate(p.expires_at)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { setUsagePromo(usagePromo === p.id ? null : p.id); if (usagePromo !== p.id) loadUsage(p.id); }}
                        className="text-[11px] font-semibold text-[#C9A84C] hover:underline flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Usage
                      </button>
                      <button onClick={() => toggleActive(p)}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          p.active ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}>
                        {p.active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => setModal({ open: true, promo: p })}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deletePromo(p.id, p.code)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Usage drawer */}
                  {usagePromo === p.id && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Usage History</h4>
                      {usage.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No uses yet</p>
                      ) : (
                        <div className="space-y-2">
                          {usage.map(u => (
                            <div key={u.id} className="flex justify-between items-center text-xs text-gray-600 py-2 border-b border-gray-50">
                              <span><strong>{u.order_number}</strong> · {u.customer_name}</span>
                              <span className="text-green-600 font-semibold">Saved {fmt(u.discount_applied)}</span>
                              <span className="text-gray-400">{fmtDate(u.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
