import { sb } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Shield, ChevronRight, Lock, LogOut, Zap, ExternalLink,
  Search, RefreshCw, AlertTriangle, TrendingUp, Plus,
  Edit2, Trash2, X, Save, QrCode, Eye, Settings,
  Tag, Upload, ToggleLeft, ToggleRight, CreditCard,
  CheckCircle, Copy, Percent, DollarSign, Calendar,
  Image as ImageIcon, Globe, Bell, Phone, Mail
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Section = "overview"|"inventory"|"products"|"orders"|"promos"|"settings"|"analytics";

const ADMIN_KEY = "sb_admin_v1";
const fmt = (c: number) => `₱${(c/100).toLocaleString("en-PH")}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});

const STATUS_COLOR: Record<string,string> = {
  pending:"bg-amber-100 text-amber-800", paid:"bg-blue-100 text-blue-800",
  processing:"bg-indigo-100 text-indigo-800", shipped:"bg-purple-100 text-purple-800",
  delivered:"bg-green-100 text-green-800", cancelled:"bg-red-100 text-red-600",
};

function useAdminAuth() {
  const [isAdmin] = useState(() => { try { return localStorage.getItem(ADMIN_KEY)==="true"; } catch { return false; } });
  const logout = () => { localStorage.removeItem(ADMIN_KEY); window.location.reload(); };
  return { isAdmin, logout };
}

// ─── Product Modal ────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave }: { product?:any; onClose:()=>void; onSave:()=>void }) {
  const [form, setForm] = useState({
    name: product?.name||"", brand: product?.brand||"", category: product?.category||"Sneakers",
    description: product?.description||"", price: product ? String(product.price/100) : "",
    sale_price: product?.sale_price ? String(product.sale_price/100) : "",
    sku: product?.sku||"", stock: product ? String(product.stock) : "1",
    featured: product?.featured||false, status: product?.status||"active",
    sizes: product?.sizes ? JSON.stringify(product.sizes) : '{"US 7":0,"US 8":0,"US 9":0,"US 10":0}',
    images: product?.images?.join("\n")||"",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.name||!form.brand||!form.price) { setErr("Name, brand and price are required."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        name:form.name, brand:form.brand, category:form.category,
        description:form.description||null,
        price:Math.round(parseFloat(form.price)*100),
        sale_price:form.sale_price?Math.round(parseFloat(form.sale_price)*100):null,
        sku:form.sku||null, stock:parseInt(form.stock)||0,
        featured:form.featured, status:form.status,
        sizes:(()=>{try{return JSON.parse(form.sizes);}catch{return{};}})(),
        images:form.images.split("\n").map((s:string)=>s.trim()).filter(Boolean),
        updated_at:new Date().toISOString(),
      };
      if (product?.id) await sb.update("sb_products",`id=eq.${product.id}`,payload);
      else await sb.insert("sb_products",payload);
      onSave();
    } catch(e:any) { setErr(e.message||"Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-black text-[#0d2430] text-lg">{product?"Edit Product":"Add New Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Product Name *</label>
              <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Adidas Samba OG Classic"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Brand *</label>
              <input value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder="e.g. Adidas"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category</label>
              <select value={form.category} onChange={e=>set("category",e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]">
                {["Sneakers","Perfume","Gadgets","Apparel","Accessories"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Price (₱) *</label>
              <input type="number" value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0.00"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Sale Price (₱)</label>
              <input type="number" value={form.sale_price} onChange={e=>set("sale_price",e.target.value)} placeholder="optional"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">SKU</label>
              <input value={form.sku} onChange={e=>set("sku",e.target.value)} placeholder="SB-ADI-SAMBA-001"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Stock</label>
              <input type="number" value={form.stock} onChange={e=>set("stock",e.target.value)} placeholder="1"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Status</label>
              <select value={form.status} onChange={e=>set("status",e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
              <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={2}
                placeholder="Product description..."
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Sizes & Stock (JSON)</label>
              <textarea value={form.sizes} onChange={e=>set("sizes",e.target.value)} rows={3}
                placeholder={'{"US 7":2,"US 8":5,"US 9":3}'}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono outline-none focus:border-[#0d2430] resize-none"/>
              <p className="text-[10px] text-gray-400 mt-1">Format: size → quantity. 0 = sold out.</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Image URLs (one per line)</label>
              <textarea value={form.images} onChange={e=>set("images",e.target.value)} rows={3}
                placeholder="https://example.com/image.jpg"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none"/>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="feat" checked={form.featured} onChange={e=>set("featured",e.target.checked)} className="accent-[#0d2430]"/>
              <label htmlFor="feat" className="text-sm text-gray-600 cursor-pointer">Featured on homepage</label>
            </div>
          </div>
          {err&&<p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#0d2430] text-white py-3 text-sm font-bold uppercase hover:bg-[#122d3a] disabled:opacity-50 rounded flex items-center justify-center gap-2">
              <Save className="h-4 w-4"/>{saving?"Saving…":product?"Update":"Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Promo Modal ──────────────────────────────────────────────────────────
function PromoModal({ promo, onClose, onSave }: { promo?:any; onClose:()=>void; onSave:()=>void }) {
  const [form, setForm] = useState({
    code: promo?.code||"",
    type: promo?.type||"percent",
    value: promo ? String(promo.type==="fixed"?promo.value/100:promo.value) : "",
    min_order: promo ? String(promo.min_order/100) : "0",
    max_uses: promo ? String(promo.max_uses) : "0",
    expires_at: promo?.expires_at ? promo.expires_at.split("T")[0] : "",
    description: promo?.description||"",
    active: promo?.active??true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const genCode = () => {
    const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
    const code = Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
    set("code", code);
  };

  const handleSave = async () => {
    if (!form.code||!form.value) { setErr("Code and value required."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: form.type==="fixed" ? Math.round(parseFloat(form.value)*100) : parseInt(form.value),
        min_order: Math.round(parseFloat(form.min_order||"0")*100),
        max_uses: parseInt(form.max_uses||"0"),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        description: form.description||null,
        active: form.active,
        updated_at: new Date().toISOString(),
      };
      if (promo?.id) await sb.update("sb_promos",`id=eq.${promo.id}`,payload);
      else await sb.insert("sb_promos",payload);
      onSave();
    } catch(e:any) { setErr(e.message||"Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-black text-[#0d2430] text-lg">{promo?"Edit Promo":"Create Promo Code"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Code */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Promo Code *</label>
            <div className="flex gap-2">
              <input value={form.code} onChange={e=>set("code",e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER20"
                className="flex-1 border border-gray-200 rounded px-3 py-2.5 text-sm font-mono font-bold outline-none focus:border-[#0d2430] uppercase tracking-widest"/>
              <button onClick={genCode} className="border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Discount Type</label>
              <div className="flex gap-2">
                <button onClick={()=>set("type","percent")}
                  className={`flex-1 py-2.5 text-xs font-bold border rounded flex items-center justify-center gap-1.5 transition-all ${form.type==="percent"?"bg-[#0d2430] text-white border-[#0d2430]":"border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                  <Percent className="h-3.5 w-3.5"/> Percent
                </button>
                <button onClick={()=>set("type","fixed")}
                  className={`flex-1 py-2.5 text-xs font-bold border rounded flex items-center justify-center gap-1.5 transition-all ${form.type==="fixed"?"bg-[#0d2430] text-white border-[#0d2430]":"border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                  <DollarSign className="h-3.5 w-3.5"/> Fixed
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                {form.type==="percent"?"Discount %" : "Discount Amount (₱)"} *
              </label>
              <div className="relative">
                <input type="number" value={form.value} onChange={e=>set("value",e.target.value)}
                  placeholder={form.type==="percent"?"20":"100"}
                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                  {form.type==="percent"?"%":"₱"}
                </span>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Minimum Order (₱)</label>
              <input type="number" value={form.min_order} onChange={e=>set("min_order",e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
              <p className="text-[10px] text-gray-400 mt-1">0 = no minimum</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Max Uses</label>
              <input type="number" value={form.max_uses} onChange={e=>set("max_uses",e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
              <p className="text-[10px] text-gray-400 mt-1">0 = unlimited</p>
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              <Calendar className="h-3 w-3 inline mr-1"/>Expiry Date (optional)
            </label>
            <input type="date" value={form.expires_at} onChange={e=>set("expires_at",e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description / Note</label>
            <input value={form.description} onChange={e=>set("description",e.target.value)}
              placeholder="e.g. Summer sale promo for Facebook followers"
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]"/>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-[#0d2430]">Active</div>
              <div className="text-[10px] text-gray-400">Customers can use this code at checkout</div>
            </div>
            <button onClick={()=>set("active",!form.active)}>
              {form.active
                ? <ToggleRight className="h-8 w-8 text-[#0d2430]"/>
                : <ToggleLeft className="h-8 w-8 text-gray-300"/>}
            </button>
          </div>

          {/* Preview */}
          {form.code && form.value && (
            <div className="bg-[#050f12] rounded-lg p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Preview</div>
                <div className="font-black text-[#C9A84C] text-xl tracking-widest">{form.code.toUpperCase()}</div>
                <div className="text-xs text-white/50 mt-0.5">
                  {form.type==="percent" ? `${form.value}% off` : `₱${form.value} off`}
                  {parseFloat(form.min_order)>0 ? ` on orders ₱${form.min_order}+` : ""}
                  {form.expires_at ? ` · expires ${new Date(form.expires_at).toLocaleDateString("en-PH",{month:"short",day:"numeric"})}` : ""}
                </div>
              </div>
              <Tag className="h-8 w-8 text-[#C9A84C]/30"/>
            </div>
          )}

          {err&&<p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-sm font-semibold rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#C9A84C] text-[#050f12] py-3 text-sm font-black uppercase hover:opacity-90 disabled:opacity-50 rounded flex items-center justify-center gap-2">
              <Tag className="h-4 w-4"/>{saving?"Saving…":promo?"Update Code":"Create Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Section ─────────────────────────────────────────────────────
function SettingsSection() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string|null>(null);
  const [saved, setSaved] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await sb.select("sb_settings","order=key.asc");
        const map: Record<string,string> = {};
        rows.forEach((r:any) => map[r.key] = r.value||"");
        setSettings(map);
      } finally { setLoading(false); }
    })();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    await sb.update("sb_settings",`key=eq.${key}`,{ value, updated_at: new Date().toISOString() });
    setSettings(s=>({...s,[key]:value}));
    setSaving(null); setSaved(key);
    setTimeout(()=>setSaved(null),2000);
  };

  const toggle = async (key: string) => {
    const newVal = settings[key]==="true" ? "false" : "true";
    await saveSetting(key, newVal);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex gap-2">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>
    </div>
  );

  const Field = ({ k, label, placeholder="", type="text" }: { k:string; label:string; placeholder?:string; type?:string }) => {
    const [val, setVal] = useState(settings[k]||"");
    useEffect(()=>setVal(settings[k]||""),[settings[k]]);
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-50">
        <label className="text-sm text-gray-600 w-52 flex-shrink-0">{label}</label>
        <input type={type} value={val} onChange={e=>setVal(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-[#0d2430] transition-colors"/>
        <button onClick={()=>saveSetting(k,val)} disabled={saving===k}
          className={`px-4 py-2 text-xs font-bold rounded transition-all ${saved===k?"bg-green-500 text-white":"bg-[#0d2430] text-white hover:bg-[#122d3a]"}`}>
          {saved===k?"Saved ✓":saving===k?"…":"Save"}
        </button>
      </div>
    );
  };

  const Toggle = ({ k, label, desc }: { k:string; label:string; desc:string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50">
      <div>
        <div className="text-sm font-medium text-[#0d2430]">{label}</div>
        <div className="text-[11px] text-gray-400">{desc}</div>
      </div>
      <button onClick={()=>toggle(k)} className="flex-shrink-0">
        {settings[k]==="true"
          ? <ToggleRight className="h-8 w-8 text-[#0d2430]"/>
          : <ToggleLeft className="h-8 w-8 text-gray-300"/>}
      </button>
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Brand */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-4 w-4 text-[#C9A84C]"/>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Brand & Site</h3>
        </div>

        {/* Logo uploader */}
        <div className="flex items-start gap-4 mb-5 pb-5 border-b border-gray-50">
          <div className="w-20 h-20 bg-[#EDE9E3] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
            {settings.site_logo_url
              ? <img src={settings.site_logo_url} alt="Logo" className="w-full h-full object-cover"/>
              : <ImageIcon className="h-8 w-8 text-gray-300"/>}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#0d2430] mb-1">Site Logo</div>
            <div className="text-[11px] text-gray-400 mb-3">Paste a direct image URL (JPG, PNG, SVG). Recommended: 200×200px square.</div>
            <div className="flex gap-2">
              <input value={settings.site_logo_url||""} onChange={e=>setSettings(s=>({...s,site_logo_url:e.target.value}))}
                placeholder="https://example.com/logo.png"
                className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-[#0d2430]"/>
              <button onClick={()=>saveSetting("site_logo_url",settings.site_logo_url||"")}
                className={`px-4 py-2 text-xs font-bold rounded ${saved==="site_logo_url"?"bg-green-500 text-white":"bg-[#0d2430] text-white hover:bg-[#122d3a]"}`}>
                {saved==="site_logo_url"?"Saved ✓":"Save"}
              </button>
            </div>
          </div>
        </div>

        <Field k="site_name" label="Site Name" placeholder="SoleBlessing"/>
        <Field k="site_tagline" label="Tagline" placeholder="Legit. Fresh. Yours."/>
        <Field k="announcement_text" label="Announcement Bar" placeholder="Free Shipping on ₱3,000+ Orders"/>
        <Toggle k="announcement_active" label="Show Announcement Bar" desc="The gold banner at the top of every page"/>
        <Field k="facebook_url" label="Facebook URL" placeholder="https://facebook.com/soleblessing"/>
        <Field k="instagram_url" label="Instagram URL" placeholder="https://instagram.com/soleblessing"/>
        <Field k="contact_number" label="Contact Number" placeholder="09XX-XXX-XXXX"/>
        <Field k="contact_email" label="Contact Email" placeholder="soleblessing@gmail.com"/>
      </div>

      {/* Shipping */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="h-4 w-4 text-[#C9A84C]"/>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Shipping</h3>
        </div>
        <Field k="shipping_free_min" label="Free Shipping Minimum (₱)" placeholder="3000" type="number"/>
        <Field k="shipping_flat_rate" label="Flat Shipping Rate (₱)" placeholder="150" type="number"/>
      </div>

      {/* Payments */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <CreditCard className="h-4 w-4 text-[#C9A84C]"/>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Payment Methods</h3>
        </div>

        {/* GCash */}
        <div className="mb-6 pb-6 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-black">G</div>
              <span className="text-sm font-bold text-[#0d2430]">GCash</span>
            </div>
            <button onClick={()=>toggle("gcash_active")}>
              {settings.gcash_active==="true"
                ? <ToggleRight className="h-7 w-7 text-[#0d2430]"/>
                : <ToggleLeft className="h-7 w-7 text-gray-300"/>}
            </button>
          </div>
          <Field k="gcash_number" label="GCash Number" placeholder="09XX-XXX-XXXX"/>
          <Field k="gcash_name" label="Account Name" placeholder="Juan dela Cruz"/>
        </div>

        {/* Maya */}
        <div className="mb-6 pb-6 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-500 rounded flex items-center justify-center text-white text-xs font-black">M</div>
              <span className="text-sm font-bold text-[#0d2430]">Maya</span>
            </div>
            <button onClick={()=>toggle("maya_active")}>
              {settings.maya_active==="true"
                ? <ToggleRight className="h-7 w-7 text-[#0d2430]"/>
                : <ToggleLeft className="h-7 w-7 text-gray-300"/>}
            </button>
          </div>
          <Field k="maya_number" label="Maya Number" placeholder="09XX-XXX-XXXX"/>
          <Field k="maya_name" label="Account Name" placeholder="Juan dela Cruz"/>
        </div>

        {/* BDO */}
        <div className="mb-6 pb-6 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-700 rounded flex items-center justify-center text-white text-[9px] font-black">BDO</div>
              <span className="text-sm font-bold text-[#0d2430]">BDO Bank Transfer</span>
            </div>
            <button onClick={()=>toggle("bdo_active")}>
              {settings.bdo_active==="true"
                ? <ToggleRight className="h-7 w-7 text-[#0d2430]"/>
                : <ToggleLeft className="h-7 w-7 text-gray-300"/>}
            </button>
          </div>
          <Field k="bdo_account" label="Account Number" placeholder="0000-0000-0000"/>
          <Field k="bdo_name" label="Account Name" placeholder="Juan dela Cruz"/>
        </div>

        {/* BPI */}
        <div className="mb-6 pb-6 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center text-white text-[9px] font-black">BPI</div>
              <span className="text-sm font-bold text-[#0d2430]">BPI Bank Transfer</span>
            </div>
            <button onClick={()=>toggle("bpi_active")}>
              {settings.bpi_active==="true"
                ? <ToggleRight className="h-7 w-7 text-[#0d2430]"/>
                : <ToggleLeft className="h-7 w-7 text-gray-300"/>}
            </button>
          </div>
          <Field k="bpi_account" label="Account Number" placeholder="0000-0000"/>
          <Field k="bpi_name" label="Account Name" placeholder="Juan dela Cruz"/>
        </div>

        {/* COD */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500 rounded flex items-center justify-center text-white text-[9px] font-black">COD</div>
              <span className="text-sm font-bold text-[#0d2430]">Cash on Delivery</span>
            </div>
            <button onClick={()=>toggle("cod_active")}>
              {settings.cod_active==="true"
                ? <ToggleRight className="h-7 w-7 text-[#0d2430]"/>
                : <ToggleLeft className="h-7 w-7 text-gray-300"/>}
            </button>
          </div>
          <Field k="cod_note" label="COD Note" placeholder="Pay when item arrives"/>
        </div>
      </div>

    </div>
  );
}

// ─── Promos Section ───────────────────────────────────────────────────────
function PromosSection() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{open:boolean;promo?:any}>({open:false});
  const [copied, setCopied] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    try { setPromos(await sb.select("sb_promos","order=created_at.desc")); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  const toggleActive = async (p:any) => {
    await sb.update("sb_promos",`id=eq.${p.id}`,{active:!p.active,updated_at:new Date().toISOString()});
    load();
  };

  const deletePromo = async (id:string) => {
    if (!confirm("Delete this promo code?")) return;
    await sb.delete("sb_promos",`id=eq.${id}`);
    load();
  };

  const copyCode = (code:string) => {
    navigator.clipboard.writeText(code);
    setCopied(code); setTimeout(()=>setCopied(null),2000);
  };

  const isExpired = (p:any) => p.expires_at && new Date(p.expires_at) < new Date();
  const isMaxed = (p:any) => p.max_uses > 0 && p.uses_count >= p.max_uses;

  return (
    <div>
      {modal.open && (
        <PromoModal promo={modal.promo} onClose={()=>setModal({open:false})}
          onSave={()=>{setModal({open:false});load();}}/>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400">Create discount codes for customers to use at checkout.</p>
        </div>
        <button onClick={()=>setModal({open:true})}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2.5 text-xs font-black uppercase rounded-lg hover:opacity-90">
          <Plus className="h-3.5 w-3.5"/> Create Promo Code
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {label:"Total Codes", value:promos.length, color:"text-blue-600", bg:"bg-blue-50"},
          {label:"Active", value:promos.filter(p=>p.active&&!isExpired(p)&&!isMaxed(p)).length, color:"text-green-600", bg:"bg-green-50"},
          {label:"Expired/Maxed", value:promos.filter(p=>isExpired(p)||isMaxed(p)).length, color:"text-amber-600", bg:"bg-amber-50"},
          {label:"Total Uses", value:promos.reduce((s,p)=>s+p.uses_count,0), color:"text-purple-600", bg:"bg-purple-50"},
        ].map(s=>(
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className={`text-2xl font-black ${s.color} mb-0.5`}>{s.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Promos list */}
      <div className="space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="flex gap-2">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>
          </div>
        )}
        {!loading && promos.length===0 && (
          <div className="bg-white border border-gray-100 rounded-xl py-16 text-center">
            <Tag className="h-10 w-10 text-gray-200 mx-auto mb-3"/>
            <p className="text-sm font-semibold text-gray-400">No promo codes yet</p>
            <p className="text-xs text-gray-300 mt-1">Click "Create Promo Code" to get started</p>
          </div>
        )}
        {promos.map(p=>{
          const expired = isExpired(p);
          const maxed = isMaxed(p);
          const usable = p.active && !expired && !maxed;
          return (
            <div key={p.id} className={`bg-white border rounded-xl p-5 transition-opacity ${!usable?"opacity-60":""}`}
              style={{borderColor: usable?"#e5e7eb":"#fca5a5"}}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Code badge */}
                  <div className="bg-[#050f12] rounded-lg px-4 py-3 flex-shrink-0">
                    <div className="font-black text-[#C9A84C] text-lg tracking-widest leading-none">{p.code}</div>
                    <div className="text-[9px] text-white/30 uppercase tracking-wider mt-1">
                      {p.type==="percent"?`${p.value}% OFF`:`₱${p.value/100} OFF`}
                    </div>
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        expired?"bg-red-100 text-red-600":
                        maxed?"bg-orange-100 text-orange-600":
                        p.active?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"
                      }`}>
                        {expired?"Expired":maxed?"Max Uses Reached":p.active?"Active":"Paused"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {p.type==="percent"?`${p.value}% discount`:`₱${p.value/100} fixed discount`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                      {p.min_order>0&&<span>Min order: ₱{p.min_order/100}</span>}
                      <span>Uses: <strong className="text-[#0d2430]">{p.uses_count}</strong>{p.max_uses>0?` / ${p.max_uses}`:""}</span>
                      {p.expires_at&&<span>Expires: {new Date(p.expires_at).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}</span>}
                      {p.description&&<span className="text-gray-400 italic">{p.description}</span>}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>copyCode(p.code)} title="Copy code"
                    className="w-8 h-8 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50 transition-colors">
                    {copied===p.code
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500"/>
                      : <Copy className="h-3.5 w-3.5 text-gray-400"/>}
                  </button>
                  <button onClick={()=>toggleActive(p)} title={p.active?"Pause":"Activate"}
                    className="w-8 h-8 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50 transition-colors">
                    {p.active
                      ? <ToggleRight className="h-4 w-4 text-[#0d2430]"/>
                      : <ToggleLeft className="h-4 w-4 text-gray-300"/>}
                  </button>
                  <button onClick={()=>setModal({open:true,promo:p})} title="Edit"
                    className="w-8 h-8 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Edit2 className="h-3.5 w-3.5 text-gray-400"/>
                  </button>
                  <button onClick={()=>deletePromo(p.id)} title="Delete"
                    className="w-8 h-8 border border-gray-200 rounded flex items-center justify-center hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-red-400"/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAdmin, logout } = useAdminAuth();
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [productModal, setProductModal] = useState<{open:boolean;product?:any}>({open:false});
  const [sbProducts, setSbProducts] = useState<any[]>([]);
  const [sbOrders, setSbOrders] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");

  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = trpc.inventory.list.useQuery(undefined,{enabled:isAdmin});
  const syncMutation = trpc.inventory.refresh.useMutation({
    onSuccess:()=>{refetchInv();setSyncing(false);},
    onError:()=>setSyncing(false),
  });

  const loadProducts = async () => {
    setLoadingProducts(true);
    try { setSbProducts(await sb.select("sb_products","order=created_at.desc")); }
    finally { setLoadingProducts(false); }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try { setSbOrders(await sb.select("sb_orders","order=created_at.desc")); }
    finally { setLoadingOrders(false); }
  };

  useEffect(()=>{ if(isAdmin){loadProducts();loadOrders();} },[isAdmin]);

  const inventoryGrouped = useMemo(()=>{
    if(!inventory) return [];
    const map = new Map<string,any>();
    inventory.forEach(item=>{
      if(!map.has(item.sku)) map.set(item.sku,{...item,sizes:[item.size],totalStock:item.status==="AVAILABLE"?1:0});
      else { const g=map.get(item.sku); if(item.size&&!g.sizes.includes(item.size)) g.sizes.push(item.size); if(item.status==="AVAILABLE") g.totalStock++; }
    });
    return Array.from(map.values());
  },[inventory]);

  const filteredInv = useMemo(()=>
    !search?inventoryGrouped:inventoryGrouped.filter(p=>
      p.name?.toLowerCase().includes(search.toLowerCase())||p.sku?.toLowerCase().includes(search.toLowerCase())),
    [inventoryGrouped,search]);

  const filteredOrders = useMemo(()=>
    orderFilter==="all"?sbOrders:sbOrders.filter(o=>o.status===orderFilter),
    [sbOrders,orderFilter]);

  const stats = useMemo(()=>({
    total:inventoryGrouped.length,
    inStock:inventoryGrouped.filter(p=>p.totalStock>0).length,
    lowStock:inventoryGrouped.filter(p=>p.totalStock<=1&&p.totalStock>0).length,
    outStock:inventoryGrouped.filter(p=>p.totalStock===0).length,
    totalOrders:sbOrders.length,
    pendingOrders:sbOrders.filter(o=>o.status==="pending").length,
    revenue:sbOrders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+o.total,0),
  }),[inventoryGrouped,sbOrders]);

  const deleteProduct = async (id:string)=>{ if(!confirm("Delete?")) return; await sb.delete("sb_products",`id=eq.${id}`); loadProducts(); };
  const updateOrderStatus = async (id:string,status:string)=>{ await sb.update("sb_orders",`id=eq.${id}`,{status,updated_at:new Date().toISOString()}); loadOrders(); };

  const NAV = [
    {id:"overview"  as Section, icon:LayoutDashboard, label:"Overview"},
    {id:"inventory" as Section, icon:Package,         label:"Inventory"},
    {id:"products"  as Section, icon:Plus,            label:"Products"},
    {id:"orders"    as Section, icon:ShoppingCart,    label:"Orders"},
    {id:"promos"    as Section, icon:Tag,             label:"Promo Codes"},
    {id:"settings"  as Section, icon:Settings,        label:"Settings"},
    {id:"analytics" as Section, icon:BarChart3,       label:"Analytics"},
  ];

  // ─── Login ────────────────────────────────────────────────────────────
  if (!isAdmin) return (
    <div className="min-h-screen bg-[#050f12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-[#C9A84C]"/>
          </div>
          <div className="font-black text-2xl tracking-[.14em] text-white uppercase mb-1">SoleBlessing</div>
          <div className="text-xs text-white/30 tracking-widest uppercase">Admin Access</div>
        </div>
        <form onSubmit={e=>{
          e.preventDefault();
          const correct = import.meta.env.VITE_ADMIN_PW||"SoleBlessing2026!";
          if(password===correct){localStorage.setItem(ADMIN_KEY,"true");window.location.reload();}
          else setLoginError("Wrong password. Try again.");
        }} className="space-y-4">
          <div>
            <label className="text-xs font-semibold tracking-[.1em] uppercase text-white/40 block mb-2">Admin Password</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setLoginError("");}}
              placeholder="Enter admin password" autoFocus
              className="w-full bg-white/[.06] border border-white/[.1] px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] rounded placeholder-white/20"/>
            {loginError&&<p className="text-red-400 text-xs mt-2">{loginError}</p>}
          </div>
          <button type="submit" disabled={!password}
            className="w-full bg-[#C9A84C] text-[#050f12] font-bold tracking-[.12em] uppercase py-3 text-sm hover:opacity-90 disabled:opacity-40">
            Enter Dashboard
          </button>
        </form>
        <p className="text-center text-[10px] text-white/20 mt-6 leading-relaxed">
          Vercel → Environment Variables → <span className="font-mono text-white/35">VITE_ADMIN_PW</span>
        </p>
      </div>
    </div>
  );

  // ─── Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F4EF] flex">
      {productModal.open&&(
        <ProductModal product={productModal.product} onClose={()=>setProductModal({open:false})}
          onSave={()=>{setProductModal({open:false});loadProducts();}}/>
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen?"w-52":"w-14"} flex-shrink-0 bg-[#050f12] flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-y-auto`}>
        <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[.06]">
          <Shield className="h-5 w-5 text-[#C9A84C] flex-shrink-0"/>
          {sidebarOpen&&<span className="font-black text-sm tracking-[.1em] text-white uppercase">SoleBlessing</span>}
        </div>
        <nav className="flex-1 py-4 px-2">
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${section===n.id?"bg-[#C9A84C]/20 text-[#C9A84C]":"text-white/40 hover:text-white hover:bg-white/[.06]"}`}>
              <n.icon className="h-4 w-4 flex-shrink-0"/>
              {sidebarOpen&&<span className="text-xs font-medium tracking-wide">{n.label}</span>}
            </button>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-white/[.06] space-y-1">
          <button onClick={()=>setLocation("/")} className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-white transition-colors">
            <Eye className="h-4 w-4"/>{sidebarOpen&&<span className="text-xs">View Site</span>}
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4"/>{sidebarOpen&&<span className="text-xs">Log Out</span>}
          </button>
          <button onClick={()=>setSidebarOpen(s=>!s)} className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-white transition-colors">
            <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen?"rotate-180":""}`}/>
            {sidebarOpen&&<span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-black text-[#0d2430] tracking-tight">
            {section==="overview"?"Dashboard":section==="products"?"Product Management":section==="promos"?"Promo Codes":section==="settings"?"Settings":section.charAt(0).toUpperCase()+section.slice(1)}
          </h1>
          <div className="flex items-center gap-3">
            {section==="products"&&(
              <button onClick={()=>setProductModal({open:true})}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-black rounded-lg hover:opacity-90">
                <Plus className="h-3.5 w-3.5"/> Add Product
              </button>
            )}
            <button onClick={()=>{setSyncing(true);syncMutation.mutate();}} disabled={syncing}
              className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`}/> Sync Sheets
            </button>
            <button onClick={()=>setLocation("/upload-payment")}
              className="flex items-center gap-2 border border-gray-200 text-[#0d2430] px-4 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
              <Zap className="h-3.5 w-3.5"/> Payments
            </button>
          </div>
        </div>

        <div className="p-8">

          {/* OVERVIEW */}
          {section==="overview"&&(
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {label:"Sheet Inventory",value:stats.total,       icon:Package,      color:"text-blue-600",  bg:"bg-blue-50"},
                  {label:"Low/Out Stock",  value:stats.lowStock+stats.outStock,icon:AlertTriangle,color:"text-amber-600",bg:"bg-amber-50"},
                  {label:"Total Orders",  value:stats.totalOrders,  icon:ShoppingCart, color:"text-purple-600",bg:"bg-purple-50"},
                  {label:"Revenue",       value:fmt(stats.revenue), icon:TrendingUp,   color:"text-green-600", bg:"bg-green-50"},
                ].map(s=>(
                  <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                      <s.icon className={`h-4 w-4 ${s.color}`}/>
                    </div>
                    <div className="text-2xl font-black text-[#0d2430] mb-0.5">{s.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">⚠ Low Stock</h2>
                    <button onClick={()=>setSection("inventory")} className="text-xs text-[#C9A84C] font-semibold">View All →</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {inventoryGrouped.filter(p=>p.totalStock<=1).slice(0,6).map(p=>(
                      <div key={p.sku} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-[#0d2430] leading-tight">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{p.sku}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.totalStock===0?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                          {p.totalStock===0?"Out":"Last Unit"}
                        </span>
                      </div>
                    ))}
                    {inventoryGrouped.filter(p=>p.totalStock<=1).length===0&&<div className="py-6 text-center text-sm text-gray-400">All items stocked ✓</div>}
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">Recent Orders</h2>
                    <button onClick={()=>setSection("orders")} className="text-xs text-[#C9A84C] font-semibold">View All →</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sbOrders.slice(0,5).map(o=>(
                      <div key={o.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-[#0d2430]">{o.order_number}</div>
                          <div className="text-[10px] text-gray-400">{o.customer_name} · {fmtDate(o.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[#0d2430]">{fmt(o.total)}</div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status]||"bg-gray-100 text-gray-600"}`}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                    {sbOrders.length===0&&<div className="py-6 text-center text-sm text-gray-400">No orders yet</div>}
                  </div>
                </div>
              </div>
              <div className="bg-[#050f12] rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Quick Access</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {label:"Inventory Sheet",href:"https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit",icon:"📊"},
                    {label:"SB ORDER Sheet", href:"https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit",icon:"📋"},
                    {label:"Payment Proofs", href:"https://drive.google.com/drive/folders/1MMLgawQE5KKQQqufa2Leoka5zdXV6qIY",icon:"💾"},
                    {label:"Supabase DB",    href:"https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp",icon:"🗄️"},
                    {label:"Vercel Deploy",  href:"https://vercel.com/maldipias-projects/soleblessing-ecommerce",icon:"▲"},
                    {label:"Payment Portal", href:"/upload-payment",icon:"💳"},
                  ].map(l=>(
                    <a key={l.label} href={l.href} target={l.href.startsWith("http")?"_blank":"_self"} rel="noopener noreferrer"
                      className="bg-white/[.05] border border-white/[.07] rounded-lg p-4 hover:bg-white/[.09] transition-colors flex items-start gap-3">
                      <span className="text-xl">{l.icon}</span>
                      <span className="text-xs text-white/60 font-medium">{l.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {section==="inventory"&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                  <input placeholder="Search name or SKU…" value={search} onChange={e=>setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-[#0d2430]"/>
                </div>
                <span className="text-xs text-gray-400">{filteredInv.length} products</span>
                <button onClick={()=>{setSyncing(true);syncMutation.mutate();}} disabled={syncing}
                  className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 ml-auto">
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`}/> Sync
                </button>
                <a href="https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-3 py-2 text-xs font-semibold rounded-lg hover:opacity-90">
                  <ExternalLink className="h-3.5 w-3.5"/> Edit in Sheets
                </a>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-[#F7F4EF] text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="text-left px-5 py-3">Product</th>
                    <th className="text-left px-4 py-3">SKU</th>
                    <th className="text-left px-4 py-3">Price</th>
                    <th className="text-left px-4 py-3">Sizes</th>
                    <th className="text-left px-4 py-3">Stock</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredInv.map(p=>(
                      <tr key={p.sku} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {p.imageUrl?<img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded flex-shrink-0"/>
                              :<div className="w-10 h-10 bg-[#EDE9E3] rounded flex items-center justify-center text-lg flex-shrink-0">👟</div>}
                            <div>
                              <div className="font-medium text-[#0d2430] text-xs leading-tight max-w-[200px] truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{p.itemCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{p.sku}</td>
                        <td className="px-4 py-3 text-xs font-bold text-[#0d2430]">{p.sellingPrice>0?fmt(p.sellingPrice):fmt(p.srp)}</td>
                        <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                          {(p.sizes||[]).slice(0,3).map((s:string)=><span key={s} className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">{s}</span>)}
                          {(p.sizes||[]).length>3&&<span className="text-[9px] text-gray-400">+{p.sizes.length-3}</span>}
                        </div></td>
                        <td className="px-4 py-3 text-xs font-bold" style={{color:p.totalStock===0?"#ef4444":p.totalStock<=1?"#f59e0b":"#22c55e"}}>{p.totalStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredInv.length===0&&<div className="text-center py-12 text-sm text-gray-400">{invLoading?"Loading…":"No products found"}</div>}
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {section==="products"&&(
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs text-gray-400">Products stored in Supabase — editable without code.</p>
                <button onClick={loadProducts} className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingProducts?"animate-spin":""}`}/> Refresh
                </button>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sbProducts.map(p=>(
                  <div key={p.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-[#EDE9E3] flex items-center justify-center overflow-hidden relative">
                      {p.images?.[0]?<img src={p.images[0]} alt={p.name} className="w-full h-full object-cover"/>:<span className="text-5xl opacity-20">👟</span>}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {p.featured&&<span className="bg-[#C9A84C] text-[#050f12] text-[9px] font-bold px-2 py-0.5">Featured</span>}
                        {p.status!=="active"&&<span className="bg-gray-800 text-white text-[9px] font-bold px-2 py-0.5 capitalize">{p.status}</span>}
                        {p.sale_price&&<span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5">Sale</span>}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={()=>setProductModal({open:true,product:p})} className="w-7 h-7 bg-white/90 rounded flex items-center justify-center shadow">
                          <Edit2 className="h-3.5 w-3.5 text-gray-600"/>
                        </button>
                        <button onClick={()=>deleteProduct(p.id)} className="w-7 h-7 bg-white/90 rounded flex items-center justify-center shadow hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5 text-red-400"/>
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[9px] font-bold tracking-[.1em] uppercase text-[#C9A84C] mb-0.5">{p.brand} · {p.category}</p>
                      <p className="text-sm font-semibold text-[#0d2430] leading-tight mb-2">{p.name}</p>
                      <div className="flex items-baseline gap-2">
                        {p.sale_price
                          ?<><span className="text-base font-black text-red-500">{fmt(p.sale_price)}</span><span className="text-xs text-gray-400 line-through">{fmt(p.price)}</span></>
                          :<span className="text-base font-black text-[#0d2430]">{fmt(p.price)}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock>0?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                          {p.stock>0?`${p.stock} in stock`:"Out of stock"}
                        </span>
                        {p.sku&&<span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div onClick={()=>setProductModal({open:true})}
                  className="bg-white border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#C9A84C] hover:bg-[#C9A84C]/[.02] transition-all min-h-[280px] group">
                  <div className="text-center">
                    <Plus className="h-8 w-8 text-gray-300 group-hover:text-[#C9A84C] mx-auto mb-2 transition-colors"/>
                    <p className="text-sm font-semibold text-gray-400 group-hover:text-[#C9A84C] transition-colors">Add New Product</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {section==="orders"&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-44 bg-white border-gray-200 text-sm h-10"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {["all","pending","paid","processing","shipped","delivered","cancelled"].map(s=>(
                      <SelectItem key={s} value={s}>{s==="all"?"All Orders":s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-400">{filteredOrders.length} orders</span>
                <button onClick={loadOrders} className="ml-auto flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders?"animate-spin":""}`}/> Refresh
                </button>
                <a href="https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#0d2430] text-white px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a]">
                  <ExternalLink className="h-3.5 w-3.5"/> Sheets Orders
                </a>
              </div>
              <div className="space-y-3">
                {filteredOrders.map(o=>(
                  <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[#0d2430]">{o.order_number}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status]||"bg-gray-100 text-gray-600"}`}>{o.status}</span>
                          {o.promo_code&&<span className="text-[10px] font-bold px-2 py-0.5 bg-[#C9A84C]/10 text-[#8a6a1a] rounded-full">🏷 {o.promo_code}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{o.customer_name} · {o.contact_number} · {fmtDate(o.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#0d2430]">{fmt(o.total)}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{o.payment_method?.replace("_"," ")}</div>
                      </div>
                    </div>
                    <div className="bg-[#F7F4EF] rounded p-3 mb-3 text-xs text-gray-600 space-y-1">
                      {(o.items||[]).slice(0,3).map((item:any,i:number)=>(
                        <div key={i} className="flex justify-between">
                          <span>{item.name} · Size {item.size} × {item.qty}</span>
                          <span className="font-semibold">{fmt(item.price*item.qty)}</span>
                        </div>
                      ))}
                      {(o.items||[]).length>3&&<div className="text-gray-400">+{o.items.length-3} more items</div>}
                    </div>
                    <div className="text-xs text-gray-500 mb-3"><strong>Ship to:</strong> {o.shipping_address}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-medium">Update:</span>
                      <Select value={o.status} onValueChange={(val)=>updateOrderStatus(o.id,val)}>
                        <SelectTrigger className="w-36 h-8 text-xs border-gray-200"><SelectValue/></SelectTrigger>
                        <SelectContent>{["pending","paid","processing","shipped","delivered","cancelled"].map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                      </Select>
                      {o.payment_proof_url&&(
                        <a href={o.payment_proof_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#C9A84C] font-semibold hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3"/> View Proof
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {filteredOrders.length===0&&<div className="bg-white border border-gray-100 rounded-xl py-16 text-center text-sm text-gray-400">No orders found</div>}
              </div>
            </div>
          )}

          {/* PROMO CODES */}
          {section==="promos"&&<PromosSection/>}

          {/* SETTINGS */}
          {section==="settings"&&<SettingsSection/>}

          {/* ANALYTICS */}
          {section==="analytics"&&(
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-5">Inventory Health</h3>
                {[
                  {label:"Total SKUs",  value:stats.total,    pct:100,                                            color:"bg-blue-500"},
                  {label:"In Stock",    value:stats.inStock,  pct:stats.total?(stats.inStock/stats.total)*100:0,  color:"bg-green-500"},
                  {label:"Low Stock",   value:stats.lowStock, pct:stats.total?(stats.lowStock/stats.total)*100:0, color:"bg-amber-500"},
                  {label:"Out of Stock",value:stats.outStock, pct:stats.total?(stats.outStock/stats.total)*100:0, color:"bg-red-500"},
                ].map(s=>(
                  <div key={s.label} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${s.color}`}/><span className="text-xs text-gray-600">{s.label}</span></div>
                      <span className="text-sm font-bold text-[#0d2430]">{s.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{width:`${s.pct}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-5">Order Status</h3>
                {["pending","paid","processing","shipped","delivered","cancelled"].map(s=>{
                  const count=sbOrders.filter(o=>o.status===s).length;
                  return(
                    <div key={s} className="flex items-center gap-3 mb-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full w-20 text-center ${STATUS_COLOR[s]||"bg-gray-100 text-gray-600"}`}>{s}</span>
                      <div className="flex-1 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C9A84C] rounded-full" style={{width:`${Math.min(100,(count/(sbOrders.length||1))*100)}%`}}/>
                      </div>
                      <span className="text-sm font-bold text-[#0d2430] w-6 text-right">{count}</span>
                    </div>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-400">Total Revenue</span>
                  <span className="font-black text-[#0d2430]">{fmt(stats.revenue)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
