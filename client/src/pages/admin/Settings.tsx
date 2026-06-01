import { useState, useEffect, useRef } from "react";
import { sbAdmin as sb } from "@/lib/supabaseAdmin";
import { Save, Upload, Plus, Trash2, Eye, EyeOff, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://akualfrqzaierqsfcnkp.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `logos/logo-${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${filename}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed — check Supabase storage bucket permissions");
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;
}

type PaymentMethod = { id: string; label: string; detail: string; enabled: boolean; icon: string };
type Brand = { site_name: string; tagline: string; logo_url: string; primary_color: string; dark_color: string };
type Shipping = { free_threshold: number; flat_rate: number; couriers: string[] };
type Socials = { facebook: string; instagram: string; tiktok: string; messenger: string };

export default function AdminSettings() {
  const [tab, setTab] = useState<"brand" | "payment" | "shipping" | "socials">("brand");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const [brand, setBrand] = useState<Brand>({
    site_name: "SoleBlessing",
    tagline: "Legit. Fresh. Yours.",
    logo_url: "/soleblessing-logo.png",
    primary_color: "#C9A84C",
    dark_color: "#050f12",
  });
  const [payments, setPayments] = useState<PaymentMethod[]>([
    { id: "gcash", label: "GCash", detail: "Send to: 09XX-XXX-XXXX", enabled: true, icon: "📱" },
    { id: "maya",  label: "Maya",  detail: "Send to: 09XX-XXX-XXXX", enabled: true, icon: "💙" },
    { id: "bdo",   label: "BDO Bank Transfer", detail: "Acct: XXXX · Juan dela Cruz", enabled: true, icon: "🏦" },
    { id: "bpi",   label: "BPI Bank Transfer", detail: "Acct: XXXX · Juan dela Cruz", enabled: true, icon: "🏦" },
    { id: "cod",   label: "Cash on Delivery",  detail: "Pay when item arrives", enabled: true, icon: "💵" },
  ]);
  const [shipping, setShipping] = useState<Shipping>({
    free_threshold: 300000,
    flat_rate: 15000,
    couriers: ["J&T", "LBC", "Lalamove", "Grab Express"],
  });
  const [socials, setSocials] = useState<Socials>({
    facebook: "", instagram: "", tiktok: "", messenger: "",
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const rows = await sb.select("sb_settings", "select=key,value");
      // value column is text — parse JSON strings before setting state
      const parse = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
      rows.forEach((r: any) => {
        const v = parse(r.value);
        if (!v) return;
        if (r.key === "brand")           setBrand(v);
        if (r.key === "payment_methods") { if (Array.isArray(v)) setPayments(v); }
        if (r.key === "shipping")        setShipping(v);
        if (r.key === "socials")         setSocials(v);
      });
    } catch(e) { console.error("Settings load error:", e); }
  };

  const save = async (key: string, value: any) => {
    setSaving(true);
    try {
      await sb.update("sb_settings", `key=eq.${key}`, {
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      });
      setSaved(true);
      toast.success("Settings saved!");
      setTimeout(() => setSaved(false), 2500);
    } catch(e: any) {
      toast.error(e.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max file size is 2MB"); return; }
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      const updated = { ...brand, logo_url: url };
      setBrand(updated);
      await save("brand", updated);
      toast.success("Logo uploaded!");
    } catch(e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  const togglePayment = (id: string) =>
    setPayments(p => p.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));

  const updatePayment = (id: string, field: keyof PaymentMethod, val: string) =>
    setPayments(p => p.map(m => m.id === id ? { ...m, [field]: val } : m));

  const addPayment = () =>
    setPayments(p => [...p, {
      id: `custom_${Date.now()}`, label: "New Method",
      detail: "", enabled: true, icon: "💳",
    }]);

  const removePayment = (id: string) =>
    setPayments(p => p.filter(m => m.id !== id));

  const SaveBtn = ({ onSave }: { onSave: () => void }) => (
    <button onClick={onSave} disabled={saving}
      className="w-full bg-[#C9A84C] text-[#050f12] py-3 text-sm font-bold tracking-wide uppercase rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
      {saved
        ? <><CheckCircle className="h-4 w-4" /> Saved!</>
        : <><Save className="h-4 w-4" /> Save Changes</>}
    </button>
  );

  const TABS = [
    { id: "brand"    as const, label: "🎨 Brand & Logo"      },
    { id: "payment"  as const, label: "💳 Payment Methods"   },
    { id: "shipping" as const, label: "🚚 Shipping"          },
    { id: "socials"  as const, label: "📱 Social Media"      },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-white text-[#0d2430] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BRAND ── */}
      {tab === "brand" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide">Site Identity</h3>

            {/* Logo upload */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-3">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-[#050f12] rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                  {brand.logo_url
                    ? <img src={brand.logo_url} alt="logo" className="w-full h-full object-contain p-2" />
                    : <span className="text-2xl">🏷️</span>}
                </div>
                <div>
                  <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload} className="hidden" />
                  <button onClick={() => logoRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2.5 text-xs font-bold rounded-lg hover:bg-[#122d3a] disabled:opacity-50 mb-2">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading…" : "Upload Logo"}
                  </button>
                  <p className="text-[10px] text-gray-400">PNG / SVG / JPG · Max 2MB</p>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Or paste image URL</label>
                <input value={brand.logo_url}
                  onChange={e => setBrand(b => ({ ...b, logo_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
              </div>
            </div>

            {[
              { label: "Site Name",  key: "site_name",  placeholder: "SoleBlessing"        },
              { label: "Tagline",    key: "tagline",    placeholder: "Legit. Fresh. Yours." },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">{f.label}</label>
                <input value={(brand as any)[f.key]}
                  onChange={e => setBrand(b => ({ ...b, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Gold Accent Color",  key: "primary_color" },
                { label: "Dark Nav Color",     key: "dark_color"    },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={(brand as any)[f.key]}
                      onChange={e => setBrand(b => ({ ...b, [f.key]: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0" />
                    <input value={(brand as any)[f.key]}
                      onChange={e => setBrand(b => ({ ...b, [f.key]: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-[#0d2430]" />
                  </div>
                </div>
              ))}
            </div>

            <SaveBtn onSave={() => save("brand", brand)} />
          </div>

          {/* Live Preview */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide mb-4">Live Preview</h3>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: brand.dark_color }}>
                {brand.logo_url && (
                  <img src={brand.logo_url} alt="logo" className="h-8 w-8 object-contain rounded" />
                )}
                <span className="font-bold text-base tracking-widest uppercase text-white">
                  {brand.site_name || "SoleBlessing"}
                </span>
                <span className="w-2 h-2 rounded-full mb-3 -ml-1" style={{ background: brand.primary_color }} />
              </div>
              <div className="p-5 bg-[#F7F4EF]">
                <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: brand.primary_color }}>
                  Welcome
                </p>
                <p className="text-xl font-black text-[#0d2430]">
                  {brand.tagline || "Legit. Fresh. Yours."}
                </p>
              </div>
              <div className="px-5 py-3 bg-white flex gap-2">
                <button className="px-4 py-2 text-xs font-bold rounded text-white"
                  style={{ background: brand.dark_color }}>
                  Shop Now
                </button>
                <button className="px-4 py-2 text-xs font-bold rounded"
                  style={{ background: brand.primary_color, color: brand.dark_color }}>
                  Pay Now
                </button>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                <strong>Note:</strong> Color changes require a Vercel redeploy to take full effect on the live site.
                Logo changes are instant.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT METHODS ── */}
      {tab === "payment" && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide">Payment Methods</h3>
              <p className="text-xs text-gray-400 mt-0.5">These appear on the checkout page for customers</p>
            </div>
            <button onClick={addPayment}
              className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-[#122d3a]">
              <Plus className="h-3.5 w-3.5" /> Add Method
            </button>
          </div>

          <div className="space-y-4">
            {payments.map(m => (
              <div key={m.id}
                className={`border rounded-xl p-4 transition-all ${
                  m.enabled ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"
                }`}>
                <div className="flex items-start gap-4">
                  <div className="text-2xl mt-1">{m.icon}</div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Method Name
                      </label>
                      <input value={m.label}
                        onChange={e => updatePayment(m.id, "label", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0d2430]" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Account / Details
                      </label>
                      <input value={m.detail}
                        onChange={e => updatePayment(m.id, "detail", e.target.value)}
                        placeholder="e.g. 0917-XXX-XXXX · Juan dela Cruz"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0d2430]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Icon (emoji)
                      </label>
                      <input value={m.icon}
                        onChange={e => updatePayment(m.id, "icon", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center outline-none" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={() => togglePayment(m.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        m.enabled
                          ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                          : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                      }`}>
                      {m.enabled
                        ? <><Eye className="h-3 w-3" /> Active</>
                        : <><EyeOff className="h-3 w-3" /> Hidden</>}
                    </button>
                    <button onClick={() => removePayment(m.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <SaveBtn onSave={() => save("payment_methods", payments)} />
        </div>
      )}

      {/* ── SHIPPING ── */}
      {tab === "shipping" && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide">Shipping Settings</h3>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                Free Shipping Threshold (₱)
              </label>
              <input type="number"
                value={shipping.free_threshold / 100}
                onChange={e => setShipping(s => ({
                  ...s, free_threshold: Math.round(parseFloat(e.target.value || "0") * 100)
                }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
              <p className="text-[10px] text-gray-400 mt-1">Orders above this get free shipping</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                Flat Shipping Rate (₱)
              </label>
              <input type="number"
                value={shipping.flat_rate / 100}
                onChange={e => setShipping(s => ({
                  ...s, flat_rate: Math.round(parseFloat(e.target.value || "0") * 100)
                }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-3">Active Couriers</label>
            <div className="flex flex-wrap gap-2">
              {["J&T", "LBC", "Lalamove", "Grab Express", "Ninja Van", "Gogo Express"].map(c => (
                <button key={c}
                  onClick={() => setShipping(s => ({
                    ...s,
                    couriers: s.couriers.includes(c)
                      ? s.couriers.filter(x => x !== c)
                      : [...s.couriers, c],
                  }))}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                    shipping.couriers.includes(c)
                      ? "bg-[#0d2430] text-white border-[#0d2430]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}>
                  {shipping.couriers.includes(c) ? "✓ " : ""}{c}
                </button>
              ))}
            </div>
          </div>

          <SaveBtn onSave={() => save("shipping", shipping)} />
        </div>
      )}

      {/* ── SOCIALS ── */}
      {tab === "socials" && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide">Social Media Links</h3>
          {[
            { key: "facebook",  label: "Facebook Page URL",  placeholder: "https://facebook.com/soleblessing",  icon: "📘" },
            { key: "instagram", label: "Instagram URL",       placeholder: "https://instagram.com/soleblessing", icon: "📸" },
            { key: "tiktok",    label: "TikTok URL",          placeholder: "https://tiktok.com/@soleblessing",   icon: "🎵" },
            { key: "messenger", label: "Messenger Link",      placeholder: "https://m.me/soleblessing",          icon: "💬" },
          ].map(f => (
            <div key={f.key} className="flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">{f.label}</label>
                <input
                  value={(socials as any)[f.key]}
                  onChange={e => setSocials(s => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
              </div>
            </div>
          ))}
          <SaveBtn onSave={() => save("socials", socials)} />
        </div>
      )}
    </div>
  );
}
