import { trpc } from "@/lib/trpc";
import { sbAdmin as sb, adminCred } from "@/lib/supabaseAdmin";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";

/** Infinite scroll sentinel — loads the next chunk when scrolled near, no button clicks. */
function AutoLoader({ onMore, remaining }: { onMore: () => void; remaining: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) onMore(); }, { rootMargin: "700px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onMore]);
  return <div ref={ref} className="py-3 text-center text-[11px] text-gray-400">Loading more… ({remaining} left)</div>;
}
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Shield, ChevronRight, Lock, LogOut, Zap, ExternalLink,
  Search, RefreshCw, AlertTriangle, TrendingUp, Plus,
  Edit2, Trash2, X, Save, Eye, Settings, Tag,
  Download, QrCode, Copy, Database, History, Truck, DollarSign, CheckCircle, Users,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminSettings from "./Settings";
import AdminVisitors from "./Visitors";
import IncomingRequests from "./Incoming";
import { useInventory, refreshInventory } from "@/hooks/useInventory";
import AdminPromos from "./Promos";
import ShoeCleanerCampaign from "./ShoeCleanerCampaign";

type Section = "overview"|"products"|"orders"|"customers"|"intake"|"reports"|"promos"|"campaign"|"settings"|"analytics"|"system";

const ADMIN_KEY = "sb_admin_v1";
const fmt = (c: number) => `₱${(c/100).toLocaleString("en-PH")}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});
const fmtDT = (d: string) => { const x=new Date(d); return `${x.toLocaleDateString("en-PH",{month:"short",day:"numeric"})} · ${x.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit"})}`; };
// MOP buckets: straight = paid-in-full (straight payment / GCash / Maya / bank / CC),
// cod = cash on delivery, other = lay away / walk in / COP / blank
const mopOf = (o:any):"straight"|"cod"|"other" => {
  const m = String(o?.payment_method||"").toLowerCase();
  if (!m) return "other";
  if (/\bcod\b|cash on delivery/.test(m)) return "cod";
  if (m.includes("straight")||m.includes("gcash")||m.includes("maya")||m.includes("bank")||m.includes("union")||m.includes("cc payment")||m.includes("card")) return "straight";
  return "other";
};
const STATUS_COLOR: Record<string,string> = {
  pending:"bg-amber-100 text-amber-800", paid:"bg-blue-100 text-blue-800",
  processing:"bg-indigo-100 text-indigo-800", shipped:"bg-purple-100 text-purple-800",
  delivered:"bg-green-100 text-green-800", cancelled:"bg-red-100 text-red-600",
};


// ─── QR Code Modal ──────────────────────────────────────────────────────────
function QRModal({ itemCode, name, onClose }: { itemCode: string; name: string; onClose: () => void }) {
  const url = `https://soleblessingofficial.com/inventory/${itemCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=050f12&margin=10`;

  const download = async () => {
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SB-QR-${itemCode}.png`;
    a.click();
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-[#050f12] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[.15em] uppercase text-[#C9A84C]">Product QR Code</p>
            <p className="text-sm font-black text-white truncate max-w-[220px]">{name}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5"/>
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="bg-white border-4 border-[#050f12] rounded-2xl p-3">
            <img src={qrUrl} alt="QR Code" className="w-52 h-52" />
          </div>
          {/* Item code */}
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Code</p>
            <p className="text-lg font-black text-[#0d2430] font-mono">{itemCode}</p>
          </div>
          {/* URL */}
          <div className="w-full bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <p className="text-[11px] text-gray-500 truncate flex-1 font-mono">{url}</p>
            <button onClick={copy} className="text-[#C9A84C] hover:opacity-70 flex-shrink-0">
              <Copy className="h-4 w-4"/>
            </button>
          </div>
          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button onClick={download}
              className="flex-1 bg-[#0d2430] text-white py-3 text-xs font-bold tracking-wide rounded-xl hover:bg-[#122d3a] flex items-center justify-center gap-2">
              <Download className="h-4 w-4"/> Download PNG
            </button>
            <button onClick={() => window.open(url, "_blank")}
              className="flex-1 border border-gray-200 text-[#0d2430] py-3 text-xs font-semibold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4"/> Open Link
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            Print or share this QR code. Customers scan it to go directly to this product page.
          </p>
        </div>
      </div>
    </div>
  );
}

// sessionStorage key holding the admin password (set by sbAdmin.authenticate).
const PW_KEY = "sb_admin_pw";

function useAdminAuth() {
  const [isAdmin] = useState<boolean>(() => {
    try {
      const flagged = localStorage.getItem(ADMIN_KEY)==="true";
      // The "logged in" flag lives in localStorage (survives tab close) but the actual
      // credential lives in sessionStorage (does NOT). When they drift apart the panel
      // looks logged in while every privileged write returns {"error":"unauthorized"}.
      // Force a clean re-login instead of letting saves fail silently.
      const hasPw = !!(localStorage.getItem("sb_admin_token") || sessionStorage.getItem("sb_admin_token") || localStorage.getItem(PW_KEY) || sessionStorage.getItem(PW_KEY));
      if (flagged && !hasPw) { localStorage.removeItem(ADMIN_KEY); return false; }
      return flagged;
    } catch { return false; }
  });
  const logout = () => {
    try { localStorage.removeItem(ADMIN_KEY); for (const st of [localStorage, sessionStorage]) { st.removeItem(PW_KEY); st.removeItem("sb_admin_token"); st.removeItem("sb_admin_role"); st.removeItem("sb_admin_color"); } } catch {}
    window.location.reload();
  };
  return { isAdmin, logout };
}

// ─── Product Form Modal ─────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave }: { product?: any; onClose:()=>void; onSave:()=>void }) {
  // Parse sizes into editable rows [{size, qty}]
  const parseSizeRows = (sizesObj: any): {size: string; qty: number}[] => {
    if (!sizesObj) return [{size:"US 7",qty:0},{size:"US 8",qty:0},{size:"US 9",qty:0},{size:"US 10",qty:0}];
    try {
      const obj = typeof sizesObj === "string" ? JSON.parse(sizesObj) : sizesObj;
      return Object.entries(obj).map(([size, qty]) => ({size, qty: Number(qty)}));
    } catch { return [{size:"US 7",qty:0},{size:"US 8",qty:0}]; }
  };
  const [sizeRows, setSizeRows] = useState<{size:string;qty:number}[]>(() => parseSizeRows(product?.sizes));
  const [form, setForm] = useState({
    name: product?.name||"", brand: product?.brand||"", category: product?.category||"Sneakers",
    description: product?.description||"", price: product ? String(product.price/100):"",
    sale_price: product?.sale_price ? String(product.sale_price/100):"",
    sku: product?.sku||"", stock: product ? String(product.stock):"1",
    featured: product?.featured||false, status: product?.status||"active",
    images: product?.images?.join("\n")||"",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const s = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.name||!form.brand||!form.price){setErr("Name, brand and price required.");return;}
    setSaving(true); setErr("");
    try {
      const payload = {
        name:form.name, brand:form.brand, category:form.category,
        description:form.description||null,
        price:Math.round(parseFloat(form.price)*100),
        sale_price:form.sale_price?Math.round(parseFloat(form.sale_price)*100):null,
        sku:form.sku||null, stock:parseInt(form.stock)||0,
        featured:form.featured, status:form.status,
        sizes: Object.fromEntries(sizeRows.filter(r=>r.size.trim()).map(r=>[r.size.trim(), r.qty])),
        images:form.images.split("\n").map((s:string)=>s.trim()).filter(Boolean),
        updated_at:new Date().toISOString(),
      };
      if (product?.id) await sb.update("sb_products",`id=eq.${product.id}`,payload);
      else await sb.insert("sb_products",payload);
      toast.success(product?"Product updated!":"Product added!");
      onSave();
    } catch(e:any){setErr(e.message||"Save failed");}
    finally{setSaving(false);}
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-black text-[#0d2430] text-lg">{product?"Edit Product":"Add New Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Product Name *</label>
              <input value={form.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. Adidas Samba OG Classic"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Brand *</label>
                <input value={form.brand} onChange={e=>s("brand",e.target.value)} placeholder="e.g. Adidas"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]"/></div>
              <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Category</label>
                <select value={form.category} onChange={e=>s("category",e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]">
                  {["Sneakers","Perfume","Gadgets","Apparel","Accessories"].map(c=><option key={c}>{c}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Price (₱) *</label>
                <input type="number" value={form.price} onChange={e=>s("price",e.target.value)} placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]"/></div>
              <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Sale Price (₱)</label>
                <input type="number" value={form.sale_price} onChange={e=>s("sale_price",e.target.value)} placeholder="Optional"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]"/></div>
              <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Stock</label>
                <input type="number" value={form.stock} onChange={e=>s("stock",e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]"/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">SKU</label>
                <input value={form.sku} onChange={e=>s("sku",e.target.value)} placeholder="SB-ADI-001"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-[#0d2430]"/></div>
              <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Status</label>
                <select value={form.status} onChange={e=>s("status",e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]">
                  <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
                </select></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
              <textarea value={form.description} onChange={e=>s("description",e.target.value)} rows={2}
                placeholder="Product description, materials, fit notes..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none"/></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500">Sizes & Stock</label>
                <button type="button" onClick={()=>setSizeRows(r=>[...r,{size:"",qty:0}])}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#C9A84C] hover:opacity-70 transition-opacity">
                  <Plus className="h-3 w-3"/> Add Size
                </button>
              </div>
              <div className="space-y-2">
                {sizeRows.map((row,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={row.size}
                      onChange={e=>setSizeRows(rows=>rows.map((r,idx)=>idx===i?{...r,size:e.target.value}:r))}
                      placeholder="e.g. US 9"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0d2430]"
                    />
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button type="button"
                        onClick={()=>setSizeRows(rows=>rows.map((r,idx)=>idx===i?{...r,qty:Math.max(0,r.qty-1)}:r))}
                        className="w-8 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 font-bold">−</button>
                      <input type="number" min="0"
                        value={row.qty}
                        onChange={e=>setSizeRows(rows=>rows.map((r,idx)=>idx===i?{...r,qty:Math.max(0,parseInt(e.target.value)||0)}:r))}
                        className="w-14 h-9 text-center text-sm font-semibold outline-none border-x border-gray-200"
                      />
                      <button type="button"
                        onClick={()=>setSizeRows(rows=>rows.map((r,idx)=>idx===i?{...r,qty:r.qty+1}:r))}
                        className="w-8 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 font-bold">+</button>
                    </div>
                    <span className={`text-[10px] font-bold w-16 text-center px-2 py-1 rounded-full ${row.qty===0?"bg-red-100 text-red-500":"bg-green-100 text-green-700"}`}>
                      {row.qty===0?"Sold out":"In stock"}
                    </span>
                    <button type="button"
                      onClick={()=>setSizeRows(rows=>rows.filter((_,idx)=>idx!==i))}
                      className="text-gray-300 hover:text-red-400 transition-colors w-6 h-6 flex items-center justify-center flex-shrink-0">
                      <X className="h-4 w-4"/>
                    </button>
                  </div>
                ))}
                {sizeRows.length===0&&(
                  <button type="button" onClick={()=>setSizeRows([{size:"US 7",qty:0},{size:"US 8",qty:0},{size:"US 9",qty:0},{size:"US 10",qty:0}])}
                    className="w-full py-2 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors">
                    + Add sizes
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["US 6","US 6.5","US 7","US 7.5","US 8","US 8.5","US 9","US 9.5","US 10","US 10.5","US 11","US 12"].map(sz=>(
                  !sizeRows.some(r=>r.size===sz) && (
                    <button key={sz} type="button"
                      onClick={()=>setSizeRows(r=>[...r,{size:sz,qty:1}])}
                      className="text-[10px] px-2 py-1 border border-dashed border-gray-200 rounded-full text-gray-400 hover:border-[#0d2430] hover:text-[#0d2430] transition-colors">
                      + {sz}
                    </button>
                  )
                ))}
              </div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Image URLs (one per line)</label>
              <textarea value={form.images} onChange={e=>s("images",e.target.value)} rows={2}
                placeholder="https://example.com/image.jpg"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none"/></div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e=>s("featured",e.target.checked)} className="accent-[#0d2430] w-4 h-4"/>
              <span className="text-sm text-gray-600">Featured product (shows on homepage)</span>
            </label>
          </div>
          {err&&<p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-sm font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#0d2430] text-white py-3 text-sm font-bold rounded-xl hover:bg-[#122d3a] disabled:opacity-50 flex items-center justify-center gap-2">
              <Save className="h-4 w-4"/>{saving?"Saving…":product?"Update Product":"Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SVG area chart (daily sales) ───────────────────────────────────────
function AreaChart({data,labels}:{data:number[];labels:string[]}){
  const W=640,H=210,P=44;
  const safe = data.length>=2?data:[...data,...data,0].slice(0,2);
  const max=Math.max(...safe,1);
  const pts=safe.map((v,i)=>[P+i*(W-P-12)/Math.max(safe.length-1,1), H-26-(v/max)*(H-56)] as [number,number]);
  const line=pts.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const area=line+`L${pts[pts.length-1][0].toFixed(1)},${H-26}L${pts[0][0].toFixed(1)},${H-26}Z`;
  const step=Math.max(1,Math.ceil(labels.length/8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0,.5,1].map(f=>(<g key={f}>
        <line x1={P} x2={W-12} y1={H-26-f*(H-56)} y2={H-26-f*(H-56)} stroke="#f0f0f0"/>
        <text x={P-6} y={H-23-f*(H-56)} textAnchor="end" fontSize="9" fill="#9ca3af">₱{Math.round(max*f/100).toLocaleString("en-PH")}</text>
      </g>))}
      <defs><linearGradient id="sbag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b7cf6" stopOpacity=".32"/><stop offset="100%" stopColor="#8b7cf6" stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill="url(#sbag)"/>
      <path d={line} fill="none" stroke="#8b7cf6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=>safe[i]>0?<circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke="#8b7cf6" strokeWidth="2"/>:null)}
      {labels.map((l,i)=>i%step===0&&pts[i]?<text key={i} x={pts[i][0]} y={H-9} textAnchor="middle" fontSize="9" fill="#9ca3af">{l}</text>:null)}
    </svg>
  );
}

// ─── SVG donut (orders by channel) ──────────────────────────────────────
function Donut({segs}:{segs:{label:string;value:number;color:string}[]}){
  const total=segs.reduce((s,x)=>s+x.value,0);
  const C=2*Math.PI*54; let acc=0;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg viewBox="0 0 140 140" className="w-36 h-36 flex-shrink-0">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#f1f1f1" strokeWidth="17"/>
        {segs.map((s,i)=>{const len=total?s.value/total*C:0;
          const el=<circle key={i} cx="70" cy="70" r="54" fill="none" stroke={s.color} strokeWidth="17"
            strokeDasharray={`${len} ${C-len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" strokeLinecap="butt"/>;
          acc+=len; return el;})}
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="900" fill="#0d2430">{total}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#9ca3af">Orders</text>
      </svg>
      <div className="space-y-2">
        {segs.map(s=>(
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:s.color}}/>
            <span className="text-gray-500">{s.label}</span>
            <span className="font-bold text-[#0d2430]">{s.value}</span>
            <span className="text-gray-400">({total?Math.round(s.value/total*100):0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Create Order (Manual) with item-code autofill ──────────────────────
type OrderLine = {code:string;name:string;sku:string;size:string;price:string;qty:string;cost:number|null;found:boolean};
const BLANK_LINE: OrderLine = {code:"",name:"",sku:"",size:"",price:"",qty:"1",cost:null,found:false};
const GAS_MOPS = ["STRAIGHT PAYMENT","COD","COP","LAY AWAY","WALK-IN","PRE-ORDER"] as const;

// ── Customers tab — profiles derived live from sb_orders (grouped by phone),
// merged with manually added people + notes in sb_customers. No mock data. ──
const AV_COLORS=["bg-[#0d2430] text-[#C9A84C]","bg-blue-100 text-blue-700","bg-purple-100 text-purple-700","bg-emerald-100 text-emerald-700","bg-rose-100 text-rose-600","bg-amber-100 text-amber-700"];
const fmtC=(c:number)=>`₱${(Math.round(c)/100).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
function AdminCustomers({orders,onOpenOrder}:{orders:any[];onOpenOrder:(orderNumber:string,source:string)=>void}){
  const [manual,setManual]=useState<any[]>([]);
  const [q,setQ]=useState("");
  const [fTag,setFTag]=useState("all");
  const [fOrders,setFOrders]=useState("any");
  const [fJoin,setFJoin]=useState("all");
  const [fStatus,setFStatus]=useState("all");
  const [sortKey,setSortKey]=useState<"name"|"orders"|"spend"|"last">("last");
  const [sortDir,setSortDir]=useState<1|-1>(-1);
  const [page,setPage]=useState(0);
  const [per,setPer]=useState(10);
  const [selKeys,setSelKeys]=useState<Set<string>>(new Set());
  const [profileKey,setProfileKey]=useState<string|null>(null);
  const [addOpen,setAddOpen]=useState(false);
  const [addF,setAddF]=useState({name:"",phone:"",email:"",address:"",notes:""});
  const [noteDraft,setNoteDraft]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  const loadManual=async()=>{try{setManual(await sb.select("sb_customers","order=created_at.desc"));}catch{}};
  useEffect(()=>{loadManual();},[]);
  useEffect(()=>{setPage(0);},[q,fTag,fOrders,fJoin,fStatus]);

  const digits=(s:any)=>String(s||"").replace(/\D/g,"").replace(/^63/,"0");
  const now=Date.now(), D30=30*864e5, D180=180*864e5;

  const buildAt=(cutoff:number)=>{ // snapshot of customer aggregates using orders before `cutoff`
    const m=new Map<string,any>();
    for(const o of orders){
      const t=new Date(o.created_at).getTime();
      if(t>=cutoff) continue;
      const key=digits(o.contact_number)||String(o.customer_email||"").toLowerCase()||`${o.facebook_name||o.customer_name||"?"}`.toLowerCase();
      if(!key||key==="?") continue;
      let c=m.get(key);
      if(!c){c={key,name:o.customer_name,email:o.customer_email,fb:o.facebook_name,phone:digits(o.contact_number),address:o.shipping_address,orders:[],spend:0,live:0,first:t,last:t};m.set(key,c);}
      c.orders.push(o);
      if(t>c.last){c.last=t;c.name=o.customer_name||c.name;c.address=o.shipping_address||c.address;c.fb=o.facebook_name||c.fb;}
      if(t<c.first)c.first=t;
      if(!c.email&&o.customer_email)c.email=o.customer_email;
      if(o.status!=="cancelled"){c.spend+=o.total||0;c.live++;}
    }
    return m;
  };
  const tagOf=(c:any)=> (c.spend>=2000000||c.live>=5)?"vip":c.live>=2?"repeat":"new";
  const statusOf=(c:any)=> c.live===0&&c.orders.length===0?"active":(now-c.last<=D180?"active":"dormant");

  const custMap=buildAt(now+1);
  // merge manual customers (and notes/overrides) by phone
  for(const mc of manual){
    const key=digits(mc.phone);
    if(!key) continue;
    const ex=custMap.get(key);
    if(ex){ex.notes=mc.notes;ex.manualRow=mc; if(mc.email&&!ex.email)ex.email=mc.email;}
    else custMap.set(key,{key,name:mc.name,email:mc.email,fb:mc.fb_name,phone:key,address:mc.address,orders:[],spend:0,live:0,first:new Date(mc.created_at).getTime(),last:0,notes:mc.notes,manualRow:mc});
  }
  const all=[...custMap.values()];
  const prevMap=buildAt(now-D30);
  // honest deltas: snapshot now vs 30 days ago
  const cnt=(m:Map<string,any>,f:(c:any)=>boolean)=>{let n=0;m.forEach(c=>{if(f(c))n++;});return n;};
  const totalNow=all.length, totalPrev=prevMap.size;
  const newNow=cnt(custMap,c=>now-c.first<=D30&&c.orders.length>0);
  const newPrev=cnt(custMap,c=>{const a=now-c.first;return a>D30&&a<=2*D30&&c.orders.length>0;});
  const repNow=cnt(custMap,c=>c.live>=2), repPrev=cnt(prevMap,c=>c.live>=2);
  const vipNow=cnt(custMap,c=>tagOf(c)==="vip"), vipPrev=cnt(prevMap,c=>(c.spend>=2000000||c.live>=5));
  const pct=(a:number,b:number)=>b===0?(a>0?100:0):Math.round((a-b)/b*100);
  const dEl=(d:number,label:string)=><span className={`text-[10px] font-bold ${d>=0?"text-emerald-600":"text-red-500"}`}>{d>=0?"↑":"↓"} {Math.abs(d)}% {label}</span>;

  const filtered=all.filter(c=>{
    if(fTag!=="all"&&tagOf(c)!==fTag) return false;
    if(fStatus!=="all"&&statusOf(c)!==fStatus) return false;
    if(fOrders==="1"&&c.live!==1) return false;
    if(fOrders==="2"&&c.live<2) return false;
    if(fOrders==="5"&&c.live<5) return false;
    if(fJoin==="30"&&now-c.first>D30) return false;
    if(fJoin==="90"&&now-c.first>90*864e5) return false;
    if(fJoin==="year"&&new Date(c.first).getFullYear()!==new Date().getFullYear()) return false;
    const s=q.trim().toLowerCase();
    if(!s) return true;
    return [c.name,c.email,c.phone,c.fb].filter(Boolean).join(" ").toLowerCase().includes(s);
  }).sort((a,b)=>{
    const v=sortKey==="name"?String(a.name||"").localeCompare(String(b.name||""))
      :sortKey==="orders"?a.live-b.live
      :sortKey==="spend"?a.spend-b.spend
      :a.last-b.last;
    return v*sortDir;
  });
  const pages=Math.max(1,Math.ceil(filtered.length/per));
  const pg=Math.min(page,pages-1);
  const rows=filtered.slice(pg*per,(pg+1)*per);
  const prof=profileKey?custMap.get(profileKey):null;

  const initials=(n:string)=>String(n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
  const avCls=(k:string)=>AV_COLORS[(k.split("").reduce((s,ch)=>s+ch.charCodeAt(0),0))%AV_COLORS.length];
  const sortBtn=(k:typeof sortKey,label:string,right=false)=>(
    <button onClick={()=>{if(sortKey===k)setSortDir(d=>d===1?-1:1);else{setSortKey(k);setSortDir(k==="name"?1:-1);}}}
      className={`flex items-center gap-1 uppercase ${right?"ml-auto":""}`}>{label}{sortKey===k&&<span>{sortDir===1?"↑":"↓"}</span>}</button>);

  const exportCSV=()=>{
    const list=selKeys.size?filtered.filter(c=>selKeys.has(c.key)):filtered;
    const esc=(v:any)=>`"${String(v??"").replace(/"/g,'""')}"`;
    const csv=["Name,Email,Phone,FB,Orders,Lifetime Spend (PHP),Last Order,Joined,Tag,Status,Address",
      ...list.map(c=>[esc(c.name),esc(c.email),esc(c.phone),esc(c.fb),c.live,(c.spend/100).toFixed(2),
        c.last?new Date(c.last).toISOString().slice(0,10):"",new Date(c.first).toISOString().slice(0,10),
        tagOf(c).toUpperCase(),statusOf(c),esc(c.address)].join(","))].join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`soleblessing-customers-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    toast.success(`Exported ${list.length} customers`);
  };
  const saveCustomerRow=async(payload:any,phoneKey:string)=>{
    setBusy(true);
    try{
      await sb.upsert("sb_customers","on_conflict=phone",{phone:phoneKey,...payload,updated_at:new Date().toISOString()});
      toast.success("Saved"); setAddOpen(false); setAddF({name:"",phone:"",email:"",address:"",notes:""}); loadManual();
    }catch(e:any){toast.error("Save failed: "+(e?.message||String(e)).slice(0,100));}
    finally{setBusy(false);}
  };

  const TAG_EL:Record<string,any>={
    vip:<span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#fdf3d7] text-[#8a6414] border border-[#e6cf8a]">👑 VIP</span>,
    repeat:<span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">🔁 Repeat</span>,
    new:<span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">✨ New</span>,
  };
  const ST_EL:Record<string,any>={
    active:<span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Active</span>,
    dormant:<span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Dormant</span>,
  };

  return (
    <div>
      {/* header */}
      <div className="flex items-start gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-[21px] font-black text-[#0d2430] flex items-center gap-2"><Users className="h-5 w-5"/> Customers</h2>
          <p className="text-[11.5px] text-gray-400 font-semibold">Manage customer profiles, order history and loyalty.</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-gray-200 bg-white text-[#0d2430] px-3.5 py-2 text-xs font-bold rounded-lg hover:bg-gray-50"><Download className="h-3.5 w-3.5"/> Export{selKeys.size?` (${selKeys.size})`:""}</button>
          <button onClick={()=>setAddOpen(true)} className="flex items-center gap-1.5 bg-[#C9A84C] text-[#0d2430] px-4 py-2 text-xs font-black rounded-lg hover:opacity-90"><Plus className="h-3.5 w-3.5"/> Add Customer</button>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {[
          {icon:"👥",bg:"bg-blue-50",l:"Total Customers",v:totalNow,d:dEl(pct(totalNow,totalPrev),"vs. 30 days ago")},
          {icon:"✨",bg:"bg-emerald-50",l:"New This Month",v:newNow,d:dEl(pct(newNow,newPrev),"vs. last month")},
          {icon:"🔁",bg:"bg-orange-50",l:"Repeat Customers",v:repNow,d:dEl(pct(repNow,repPrev),"vs. 30 days ago")},
          {icon:"👑",bg:"bg-[#fdf3d7]",l:"VIP Customers",v:vipNow,d:dEl(pct(vipNow,vipPrev),"vs. 30 days ago")},
        ].map((c,i)=>(
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <span className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center text-lg flex-shrink-0`}>{c.icon}</span>
            <div><div className="text-[11px] font-semibold text-gray-500">{c.l}</div>
              <div className="text-[22px] font-black text-[#0d2430] leading-tight tabular-nums">{c.v.toLocaleString()}</div>{c.d}</div>
          </div>
        ))}
      </div>

      {/* search + filters */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search customer name, email, or phone…"
            className="h-10 w-80 max-w-full pl-9 pr-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A84C]"/>
        </div>
        {[["Customer Tag",fTag,setFTag,[["all","All"],["vip","👑 VIP"],["repeat","🔁 Repeat"],["new","✨ New"]]],
          ["Order Count",fOrders,setFOrders,[["any","Any"],["1","1 order"],["2","2+"],["5","5+"]]],
          ["Date Joined",fJoin,setFJoin,[["all","All time"],["30","Last 30 days"],["90","Last 90 days"],["year","This year"]]],
          ["Status",fStatus,setFStatus,[["all","All"],["active","Active"],["dormant","Dormant"]]]].map(([lab,val,set,opts]:any)=>(
          <label key={lab} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 h-10 text-[11px] font-bold text-gray-500">
            {lab}:
            <select value={val} onChange={e=>set(e.target.value)} className="outline-none text-[#0d2430] font-bold bg-transparent">
              {opts.map(([v,l]:any)=><option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        ))}
        <button onClick={()=>{setQ("");setFTag("all");setFOrders("any");setFJoin("all");setFStatus("all");}}
          className="text-[11px] font-bold text-[#8a6d25] underline">Reset</button>
      </div>

      {/* table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[9.5px] font-bold uppercase tracking-wider text-gray-400 bg-[#fbfaf7]">
                <th className="pl-4 pr-1 py-3 w-8"><input type="checkbox" checked={rows.length>0&&rows.every(c=>selKeys.has(c.key))}
                  onChange={e=>{const s=new Set(selKeys); rows.forEach(c=>e.target.checked?s.add(c.key):s.delete(c.key)); setSelKeys(s);}}/></th>
                <th className="px-1.5 py-3">{sortBtn("name","Customer")}</th>
                <th className="px-1.5 py-3">Email</th>
                <th className="px-1.5 py-3">Phone</th>
                <th className="px-1.5 py-3 text-right">{sortBtn("orders","Orders",true)}</th>
                <th className="px-1.5 py-3 text-right">{sortBtn("spend","Lifetime Spend",true)}</th>
                <th className="px-1.5 py-3">{sortBtn("last","Last Order")}</th>
                <th className="px-1.5 py-3">Tag</th>
                <th className="px-1.5 py-3">Status</th>
                <th className="pr-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c=>(
                <tr key={c.key} onClick={()=>{setProfileKey(c.key);setNoteDraft(null);}}
                  className={`border-b border-gray-50 cursor-pointer text-[12px] ${profileKey===c.key?"bg-[#C9A84C]/10":"hover:bg-gray-50/70"}`}>
                  <td className="pl-4 pr-1 py-2.5" onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selKeys.has(c.key)}
                      onChange={e=>{const s=new Set(selKeys); e.target.checked?s.add(c.key):s.delete(c.key); setSelKeys(s);}}/></td>
                  <td className="px-1.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${avCls(c.key)}`}>{initials(c.name)}</span>
                      <span className="font-bold text-[#0d2430] whitespace-nowrap max-w-[150px] truncate">{c.name||"—"}</span>
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5 text-gray-500 max-w-[160px] truncate">{c.email||<span className="text-gray-300">—</span>}</td>
                  <td className="px-1.5 py-2.5 text-gray-500 whitespace-nowrap">{c.phone||<span className="text-gray-300">—</span>}</td>
                  <td className="px-1.5 py-2.5 text-right font-bold tabular-nums">{c.live}</td>
                  <td className="px-1.5 py-2.5 text-right font-black text-[#0d2430] tabular-nums whitespace-nowrap">{fmtC(c.spend)}</td>
                  <td className="px-1.5 py-2.5 text-gray-500 whitespace-nowrap">{c.last?fmtDate(new Date(c.last).toISOString()):<span className="text-gray-300">—</span>}</td>
                  <td className="px-1.5 py-2.5">{TAG_EL[tagOf(c)]}</td>
                  <td className="px-1.5 py-2.5">{ST_EL[statusOf(c)]}</td>
                  <td className="pr-4 py-2.5 text-gray-300 font-black tracking-widest">⋯</td>
                </tr>
              ))}
              {rows.length===0&&<tr><td colSpan={10} className="py-16 text-center text-sm text-gray-400">No customers found</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 flex-wrap">
          <span className="text-[11px] text-gray-400">Showing {filtered.length===0?0:pg*per+1}–{Math.min((pg+1)*per,filtered.length)} of {filtered.length} customers</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={pg===0} className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 disabled:opacity-30">‹</button>
            {Array.from({length:pages},(_,i)=>i).filter(i=>i===0||i===pages-1||Math.abs(i-pg)<=2).map((i,idx,arr)=>(
              <span key={i} className="flex items-center gap-1">
                {idx>0&&arr[idx-1]!==i-1&&<span className="text-gray-300 text-xs px-0.5">…</span>}
                <button onClick={()=>setPage(i)} className={`w-8 h-8 rounded-lg text-xs font-bold ${i===pg?"bg-[#C9A84C] text-[#0d2430]":"border border-gray-200 text-gray-500"}`}>{i+1}</button>
              </span>))}
            <button onClick={()=>setPage(p=>Math.min(pages-1,p+1))} disabled={pg>=pages-1} className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 disabled:opacity-30">›</button>
          </div>
          <span className="text-[11px] text-gray-400">Rows: <select value={per} onChange={e=>{setPer(Number(e.target.value));setPage(0);}} className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs font-bold text-[#0d2430]">{[10,25,50].map(n=><option key={n}>{n}</option>)}</select></span>
        </div>
      </div>

      {/* profile drawer */}
      {prof&&(
        <div className="fixed inset-0 z-[70]" onClick={()=>setProfileKey(null)}>
          <div className="absolute inset-0 bg-black/40"/>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto p-5" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <span className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black ${avCls(prof.key)}`}>{initials(prof.name)}</span>
              <div className="min-w-0">
                <p className="text-[15px] font-black text-[#0d2430] truncate">{prof.name}</p>
                <p className="text-[10.5px] text-gray-400 font-semibold">Joined {fmtDate(new Date(prof.first).toISOString())} · {TAG_EL[tagOf(prof)]} {ST_EL[statusOf(prof)]}</p>
              </div>
              <button onClick={()=>setProfileKey(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X className="h-4.5 w-4.5"/></button>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-gray-300 mt-4 mb-2">Contact</p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex gap-2"><span className="text-gray-400 w-16 font-semibold flex-shrink-0">Email</span><span>{prof.email||"—"}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-16 font-semibold flex-shrink-0">Mobile</span><span>{prof.phone||"—"}</span></div>
              {prof.fb&&<div className="flex gap-2"><span className="text-gray-400 w-16 font-semibold flex-shrink-0">FB</span><span className="text-blue-500">{prof.fb}</span></div>}
              <div className="flex gap-2"><span className="text-gray-400 w-16 font-semibold flex-shrink-0">Address</span><span>{prof.address||"—"}</span></div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-gray-300 mt-4 mb-2">Statistics</p>
            <div className="grid grid-cols-2 gap-2">
              {[["Total Orders",String(prof.live)],["Lifetime Spend",fmtC(prof.spend)],
                ["Avg Order",prof.live?fmtC(prof.spend/prof.live):"—"],
                ["Last Order",prof.last?fmtDate(new Date(prof.last).toISOString()):"—"]].map(([l,v])=>(
                <div key={l} className="bg-[#fbfaf7] border border-gray-100 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">{l}</p>
                  <p className="text-[14px] font-black text-[#0d2430] tabular-nums">{v}</p>
                </div>))}
            </div>
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-gray-300 mt-4 mb-2">Order History ({prof.orders.length})</p>
            <div className="space-y-1.5">
              {[...prof.orders].sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map((o:any)=>(
                <button key={o.id} onClick={()=>{setProfileKey(null);onOpenOrder(o.order_number,o.source||"website");}}
                  className="w-full flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2 text-left hover:border-[#C9A84C]">
                  <span className="text-[11px] font-black text-[#8a6d25]">{o.order_number}</span>
                  <span className="text-[10px] text-gray-400">{fmtDate(o.created_at)} · {(o.items||[]).length} item{(o.items||[]).length!==1?"s":""}</span>
                  <span className="ml-auto text-[11px] font-black tabular-nums">{fmt(o.total)}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status]||"bg-gray-100 text-gray-600"}`}>{o.status}</span>
                </button>))}
              {prof.orders.length===0&&<p className="text-[11px] text-gray-400">No orders yet — added manually.</p>}
            </div>
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-gray-300 mt-4 mb-2">Notes</p>
            {prof.phone
              ? <>
                  <textarea value={noteDraft??prof.notes??""} onChange={e=>setNoteDraft(e.target.value)} rows={3}
                    placeholder="Courier preference, sizing notes, anything…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C]"/>
                  <button disabled={busy||noteDraft===null} onClick={()=>saveCustomerRow({name:prof.name||"Customer",email:prof.email||null,fb_name:prof.fb||null,address:prof.address||null,notes:noteDraft,manual:!!prof.manualRow?.manual&&prof.orders.length===0},prof.phone)}
                    className="mt-1.5 text-[11px] font-black bg-[#0d2430] text-white px-4 py-2 rounded-lg disabled:opacity-40">{busy?"Saving…":"Save note"}</button>
                </>
              : <p className="text-[11px] text-gray-400">Notes need a phone number on the customer.</p>}
          </div>
        </div>
      )}

      {/* add customer modal */}
      {addOpen&&(
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={()=>setAddOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-[#0d2430]">Add Customer</h3>
              <button onClick={()=>setAddOpen(false)} className="text-gray-400"><X className="h-4 w-4"/></button>
            </div>
            {[["Name *","name"],["Mobile *","phone"],["Email","email"],["Address","address"],["Notes","notes"]].map(([l,k])=>(
              <div key={k} className="mb-2.5">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">{l}</span>
                <input value={(addF as any)[k]} onChange={e=>setAddF({...addF,[k]:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[#C9A84C]"/>
              </div>))}
            <button disabled={busy||!addF.name.trim()||digits(addF.phone).length<10}
              onClick={()=>saveCustomerRow({name:addF.name.trim(),email:addF.email.trim()||null,address:addF.address.trim()||null,notes:addF.notes.trim()||null,manual:true},digits(addF.phone))}
              className="w-full bg-[#C9A84C] text-[#0d2430] py-2.5 text-xs font-black rounded-lg disabled:opacity-40">{busy?"Saving…":"Save Customer"}</button>
            {addF.phone&&digits(addF.phone).length<10&&<p className="text-[10px] text-red-500 font-bold mt-1.5">Enter a valid PH mobile number</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Orders 2.0: edit the whole order (customer, items, amounts) ──
function OrderEditModal({order,onClose,onSave}:{order:any;onClose:()=>void;onSave:(id:string,payload:any)=>void}){
  const [f,setF]=useState({
    customer_name:order.customer_name||"", facebook_name:order.facebook_name||"",
    customer_email:order.customer_email||"", contact_number:order.contact_number||"",
    shipping_address:order.shipping_address||"", notes:order.notes||"",
    payment_method:order.payment_method||"",
  });
  const [items,setItems]=useState<any[]>((order.items||[]).map((i:any)=>({...i})));
  const [shipP,setShipP]=useState(String((order.shipping_fee||0)/100));
  const [discP,setDiscP]=useState(String((order.discount_amount||0)/100));
  const peso=(s:string)=>Math.max(0,Math.round((parseFloat(s)||0)*100));
  const subtotal=items.reduce((s,i)=>s+(Math.round((parseFloat(String(i._priceP??i.price/100))||0)*100))*(parseInt(String(i.qty))||1),0);
  const total=Math.max(0,subtotal+peso(shipP)-peso(discP));
  const setItem=(idx:number,k:string,v:string)=>setItems(prev=>prev.map((it,i)=>i===idx?{...it,[k]:v}:it));
  const removeItem=(idx:number)=>setItems(prev=>prev.filter((_,i)=>i!==idx));
  const save=()=>{
    const cleanItems=items.map(({_priceP,...it})=>({...it,
      qty:parseInt(String(it.qty))||1,
      price:Math.round((parseFloat(String(_priceP??it.price/100))||0)*100)}));
    onSave(order.id,{...f,
      facebook_name:f.facebook_name||null, customer_email:f.customer_email||null, notes:f.notes||null,
      items:cleanItems, subtotal, shipping_fee:peso(shipP), discount_amount:peso(discP), total});
  };
  const inp="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[#C9A84C]";
  const lbl="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 mb-1 block";
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start md:items-center justify-center p-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg my-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-[#0d2430]">Edit Order <span className="text-[#8a6d25]">{order.order_number}</span></h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4"/></button>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <div><span className={lbl}>Customer name</span><input className={inp} value={f.customer_name} onChange={e=>setF({...f,customer_name:e.target.value})}/></div>
          <div><span className={lbl}>FB name</span><input className={inp} value={f.facebook_name} onChange={e=>setF({...f,facebook_name:e.target.value})}/></div>
          <div><span className={lbl}>Email</span><input className={inp} value={f.customer_email} onChange={e=>setF({...f,customer_email:e.target.value})}/></div>
          <div><span className={lbl}>Contact</span><input className={inp} value={f.contact_number} onChange={e=>setF({...f,contact_number:e.target.value})}/></div>
        </div>
        <div className="mb-2.5"><span className={lbl}>Shipping address</span>
          <textarea className={inp} rows={2} value={f.shipping_address} onChange={e=>setF({...f,shipping_address:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div><span className={lbl}>Payment method</span><input className={inp} value={f.payment_method} onChange={e=>setF({...f,payment_method:e.target.value})}/></div>
          <div><span className={lbl}>Notes</span><input className={inp} value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></div>
        </div>
        <span className={lbl}>Items — name · size · qty · price ₱</span>
        <div className="space-y-1.5 mb-3">
          {items.map((it,i)=>(
            <div key={i} className="flex items-center gap-1.5">
              <input className={inp} style={{flex:3}} value={it.name||""} onChange={e=>setItem(i,"name",e.target.value)}/>
              <input className={inp} style={{flex:1}} value={it.size||""} onChange={e=>setItem(i,"size",e.target.value)} placeholder="Size"/>
              <input className={inp} style={{flex:1}} type="number" min="1" value={it.qty??1} onChange={e=>setItem(i,"qty",e.target.value)}/>
              <input className={inp} style={{flex:1.5}} type="number" step="0.01" value={it._priceP??String((it.price||0)/100)} onChange={e=>setItem(i,"_priceP",e.target.value)}/>
              <button onClick={()=>removeItem(i)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 className="h-3.5 w-3.5"/></button>
            </div>
          ))}
          {items.length===0&&<p className="text-[11px] text-gray-400">No items on this order.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div><span className={lbl}>Shipping fee ₱</span><input className={inp} type="number" step="0.01" value={shipP} onChange={e=>setShipP(e.target.value)}/></div>
          <div><span className={lbl}>Discount ₱</span><input className={inp} type="number" step="0.01" value={discP} onChange={e=>setDiscP(e.target.value)}/></div>
        </div>
        <div className="flex justify-between items-baseline border-t-2 border-[#0d2430] pt-2.5 mb-4">
          <span className="text-xs font-bold text-gray-500">Subtotal {fmt(subtotal)} · New total</span>
          <span className="text-lg font-black text-[#0d2430]">{fmt(total)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 text-xs font-bold rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} className="flex-1 bg-[#C9A84C] text-[#0d2430] py-2.5 text-xs font-black rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5"><Save className="h-3.5 w-3.5"/> Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function CreateOrderModal({inventory,costMap,onClose,onPlaced,prefill}:{inventory:any[];costMap:Record<string,number>;onClose:()=>void;onPlaced:()=>void;prefill?:{requestRef:string;cust:any;pm:string}|null}){
  // Convert mode: preparing an order for a native order-form request. A draft
  // is kept per request (browser storage) so encoding work survives closing
  // the modal WITHOUT creating any order, stock move, or loyalty points.
  const DRAFT_KEY = prefill ? `sb_req_draft_${prefill.requestRef}` : "";
  const draft = (()=>{ if(!DRAFT_KEY) return null; try{ return JSON.parse(localStorage.getItem(DRAFT_KEY)||"null"); }catch{ return null; } })();
  const [cust,setCust]=useState(draft?.cust || prefill?.cust || {name:"",fbName:"",contact:"",email:"",address:"",region:"",city:"",notes:""});
  const [pm,setPm]=useState(draft?.pm || prefill?.pm || "cod");
  const [shipFee,setShipFee]=useState(draft?.shipFee || "");
  const [discount,setDiscount]=useState(draft?.discount || "");
  const [lines,setLines]=useState<OrderLine[]>(draft?.lines?.length ? draft.lines : [{...BLANK_LINE}]);
  const [placing,setPlacing]=useState(false);
  const [draftSavedAt,setDraftSavedAt]=useState<string|null>(null);
  const saveDraft=()=>{
    if(!DRAFT_KEY) return;
    try{ localStorage.setItem(DRAFT_KEY, JSON.stringify({cust,pm,shipFee,discount,lines,savedAt:new Date().toISOString()})); setDraftSavedAt(new Date().toLocaleTimeString("en-PH",{timeZone:"Asia/Manila"})); toast.success("Draft saved — no order created, no stock touched"); }
    catch{ toast.error("Draft save failed"); }
  };

  const lookup=(code:string)=> (inventory||[]).find((p:any)=>(p.itemCode||"").toUpperCase()===code.trim().toUpperCase());
  const setLine=(i:number,patch:Partial<OrderLine>)=>setLines(ls=>ls.map((l,j)=>j===i?{...l,...patch}:l));
  const onCode=(i:number,raw:string)=>{
    const code=raw.toUpperCase();
    const hit=code&&code!=="PO"?lookup(code):null;
    if(hit) setLine(i,{code,name:hit.name,sku:hit.sku||"",size:hit.size||"",
      price:String(Math.round((hit.sellingPrice||hit.srp||0)/100)),cost:costMap[hit.itemCode]||null,found:true});
    else setLine(i,{code,found:false,cost:null});
  };
  const subtotal=lines.reduce((s,l)=>s+((Math.round(Number(l.price)*100)||0)*(parseInt(l.qty)||1)),0);
  const fee=Math.round(Number(shipFee||0)*100)||0;
  const disc=Math.round(Number(discount||0)*100)||0;
  const total=Math.max(0,subtotal+fee-disc);

  const place=async()=>{
    const items=lines.filter(l=>l.name.trim()&&Number(l.price)>0).map(l=>({
      id:l.found?l.code:(l.code.trim().toUpperCase()==="PO"?"PO":l.code.trim()),
      name:l.name.trim(),sku:l.sku.trim(),size:l.size.trim(),
      price:Math.round(Number(l.price)*100),qty:parseInt(l.qty)||1,brand:"",imageUrl:"",
    }));
    if(!cust.name.trim()){toast.error("Customer name is required");return;}
    if(!items.length){toast.error("Add at least one item with a name and price");return;}
    setPlacing(true);
    try{
      const base:any={
        customer_name:cust.name.trim(),facebook_name:cust.fbName.trim()||null,customer_email:cust.email.trim(),
        contact_number:cust.contact.trim(),shipping_address:cust.address.trim(),
        region:cust.region.trim(),city:cust.city.trim(),notes:cust.notes.trim(),
        items,subtotal,shipping_fee:fee,discount_amount:disc,total,
        payment_method:pm,source:"manual",
      };
      if(prefill){
        // Convert the order-form request — server does the atomic claim, order
        // creation (PRE-ORDER: direct, no GAS, no points), linkage and audit.
        const r=await fetch("/api/prepare-order",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({...adminCred(),request_ref:prefill.requestRef,orderData:base})});
        const out=await r.json().catch(()=>({} as any));
        if(r.status===409&&out.error==="out_of_stock") throw new Error(`Out of stock: ${out.item_code} was just sold`);
        if(!r.ok) throw new Error(out.error||"Conversion failed");
        try{ if(DRAFT_KEY) localStorage.removeItem(DRAFT_KEY); }catch{}
        toast.success(`${prefill.requestRef} → Order ${out.order_number} created${out.preorder?" (PRE-ORDER — awaiting full payment)":""}`);
        onPlaced(); onClose(); return;
      }
      const orderData:any={order_number:`SB-${String(Math.floor(1e9+Math.random()*9e9))}`,...base};
      const r=await fetch("/api/place-order",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({orderData})});
      const out=await r.json().catch(()=>({} as any));
      if(r.status===409&&out.error==="out_of_stock") throw new Error(`Out of stock: ${out.item_code} was just sold`);
      if(!r.ok) throw new Error(out.error||"Order failed");
      toast.success(`Order ${orderData.order_number} created`);
      onPlaced(); onClose();
    }catch(e:any){toast.error(e.message||"Order failed");}
    finally{setPlacing(false);}
  };

  const inp="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C9A84C]";
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-[#050f12] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-[.15em] uppercase text-[#C9A84C]">{prefill?"Prepare Order — from Order Form":"Create Order — Manual"}</p>
            <p className="text-sm font-black text-white">{prefill?<>Converting <span className="text-[#C9A84C] font-mono">{prefill.requestRef}</span> — encode the products below</>:"FB / Walk-in / Phone order → same system as website"}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto">
          {prefill&&(
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[11.5px] font-semibold text-amber-800 flex items-center gap-2 flex-wrap">
              <span>Customer info came from the request — review it, encode products, then convert. Nothing is created until you click the button below.</span>
              {pm==="PRE-ORDER"&&<span className="font-black text-orange-700">PRE-ORDER: awaiting full payment · zero points · no stock deduction.</span>}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input className={inp} placeholder="Customer name *" value={cust.name} onChange={e=>setCust({...cust,name:e.target.value})}/>
            <input className={inp} placeholder="Facebook name" value={cust.fbName} onChange={e=>setCust({...cust,fbName:e.target.value})}/>
            <input className={inp} placeholder="Contact number" value={cust.contact} onChange={e=>setCust({...cust,contact:e.target.value})}/>
            <input className={inp} placeholder="Email (optional)" value={cust.email} onChange={e=>setCust({...cust,email:e.target.value})}/>
            <input className={`${inp} col-span-2`} placeholder="Delivery address" value={cust.address} onChange={e=>setCust({...cust,address:e.target.value})}/>
            <select className={inp} value={pm} onChange={e=>setPm(e.target.value)}>
              {prefill
                ? GAS_MOPS.map(m=><option key={m} value={m}>{m}{m==="PRE-ORDER"?" — full payment required":""}</option>)
                : <><option value="cod">COD</option><option value="gcash">GCash</option><option value="maya">Maya</option>
                  <option value="bdo">BDO</option><option value="bpi">BPI</option><option value="bank">Bank Transfer</option></>}
            </select>
            <input className={inp} placeholder="Region" value={cust.region} onChange={e=>setCust({...cust,region:e.target.value})}/>
            <input className={inp} placeholder="City" value={cust.city} onChange={e=>setCust({...cust,city:e.target.value})}/>
            <input className={inp} placeholder="Notes / special request" value={cust.notes} onChange={e=>setCust({...cust,notes:e.target.value})}/>
          </div>

          <div>
            <div className="grid grid-cols-[110px_1fr_80px_56px_48px_84px] gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 px-0.5">
              <span>Item code</span><span>Model</span><span>SKU</span><span>Size</span><span>Qty</span><span>Price ₱</span>
            </div>
            {lines.map((l,i)=>(
              <div key={i} className="mb-2">
                <div className="grid grid-cols-[110px_1fr_80px_56px_48px_84px_28px] gap-2 items-center">
                  <input className={`${inp} font-mono font-bold ${l.found?"border-green-400 bg-green-50":""}`} placeholder="Code / PO"
                    value={l.code} onChange={e=>onCode(i,e.target.value)}/>
                  <input className={`${inp} ${l.found?"bg-green-50":""}`} placeholder="Model name" value={l.name} onChange={e=>setLine(i,{name:e.target.value})}/>
                  <input className={`${inp} ${l.found?"bg-green-50":""}`} placeholder="SKU" value={l.sku} onChange={e=>setLine(i,{sku:e.target.value})}/>
                  <input className={`${inp} ${l.found?"bg-green-50":""}`} placeholder="—" value={l.size} onChange={e=>setLine(i,{size:e.target.value})}/>
                  <input className={inp} placeholder="1" inputMode="numeric" value={l.qty??"1"} onChange={e=>setLine(i,{qty:e.target.value})}/>
                  <input className={inp} placeholder="0" inputMode="decimal" value={l.price} onChange={e=>setLine(i,{price:e.target.value})}/>
                  <button onClick={()=>setLines(ls=>ls.length>1?ls.filter((_,j)=>j!==i):ls)} className="text-gray-300 hover:text-red-500"><X className="h-4 w-4"/></button>
                </div>
                <p className={`text-[10px] mt-0.5 font-semibold ${l.found?"text-green-600":l.code&&l.code!=="PO"?"text-amber-600":"text-gray-300"}`}>
                  {l.found?`✓ Found in inventory — auto-filled${l.cost?` · cost ${fmt(l.cost)} snapshots to this order`:""}`
                   :l.code.trim().toUpperCase()==="PO"?"⏳ Pre-order — type details manually, no stock deducted"
                   :l.code?"Code not in available stock — treated as pre-order/manual line":""}
                </p>
              </div>
            ))}
            <button onClick={()=>setLines(ls=>[...ls,{...BLANK_LINE}])} className="text-xs font-bold text-[#C9A84C] hover:opacity-70">+ Add item</button>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-gray-500">Shipping ₱</span>
              <input className={inp} style={{width:96,flex:"0 0 auto"}} placeholder="0" inputMode="decimal" value={shipFee} onChange={e=>setShipFee(e.target.value)}/>
              <span className="text-gray-500">Discount ₱</span>
              <input className={inp} style={{width:96,flex:"0 0 auto"}} placeholder="0" inputMode="decimal" value={discount} onChange={e=>setDiscount(e.target.value)}/>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Subtotal {fmt(subtotal)}{disc>0?` − ${fmt(disc)}`:""} · Total</p>
              <p className="text-2xl font-black text-[#0d2430]">{fmt(total)}</p>
            </div>
          </div>
          {prefill&&(
            <button onClick={saveDraft} className="w-full border-2 border-dashed border-gray-300 text-gray-600 py-2.5 text-xs font-black rounded-xl hover:border-[#C9A84C] hover:text-[#8a6d25]">
              💾 Save Draft — keep this encoding, create nothing{draftSavedAt?` (saved ${draftSavedAt})`:draft?.savedAt?` (draft loaded)`:""}
            </button>
          )}
          <button onClick={place} disabled={placing}
            className="w-full bg-[#0d2430] text-white py-3.5 text-sm font-bold rounded-xl hover:bg-[#122d3a] disabled:opacity-50">
            {placing?(prefill?"Converting…":"Placing order…")
              :prefill?(pm==="PRE-ORDER"?`Convert ${prefill.requestRef} → PRE-ORDER (no stock, no points, awaiting payment)`:`Convert ${prefill.requestRef} → Order (deduct stock & mirror to Sheet)`)
              :"Place Order — deduct stock & mirror to Google Sheet"}
          </button>
          <p className="text-[10px] text-gray-400 text-center">{prefill
            ?"Conversion is duplicate-protected: this request can only ever become one order. Generate & send the invoice from the Orders tab after reviewing."
            :"Atomic: stock is reserved instantly, the order mirrors to the ORDER sheet, and you can generate the invoice from the Orders tab."}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Shoebox Scanner — intake (approved design Nov 9 2026) ──────────────
// Reads barcode (native BarcodeDetector, free) + label text (tesseract.js,
// on-device, no API credits) and parses brand/model/SKU/sizes/SRP by PATTERN,
// never by layout. Item code is manual-first; nothing saves without confirm.
type Intake = { code:string; brand:string; model:string; sku:string; usSize:string; eurSize:string; cmSize:string;
  barcode:string; srp:string; cond:string; unitCost:string; selling:string };
const BLANK_INTAKE: Intake = { code:"", brand:"", model:"", sku:"", usSize:"", eurSize:"", cmSize:"", barcode:"", srp:"", cond:"Good", unitCost:"", selling:"" };
const CONDS = ["Good","Stained","Missing pair","Unknown"];
const normSBCode = (v:string)=>v.replace(/\s+/g,"").toUpperCase();
// Accountability colors — who added each record (SA pins are server-verified)
const BY_COLORS:Record<string,string>={SA01:"#e11d48",SA02:"#2563eb",SA03:"#059669",SA04:"#7c3aed",OWNER:"#C9A84C"};
const getRole=()=>{try{return localStorage.getItem("sb_admin_role")||sessionStorage.getItem("sb_admin_role")||"OWNER"}catch{return "OWNER"}};
const getRoleColor=()=>{try{return localStorage.getItem("sb_admin_color")||sessionStorage.getItem("sb_admin_color")||"#C9A84C"}catch{return "#C9A84C"}};

function parseLabel(raw:string, fxRate:number){
  const text = raw.replace(/[|]/g," ");
  // OCR confuses O↔0 and I↔1 inside code-like tokens — build a normalized copy
  // for SKU/barcode hunting (JI0457 read as "JIO4S7" still resolves).
  const U = text.toUpperCase();
  const UC = U.replace(/\b([A-Z]{1,2})([A-Z0-9]{4,6})\b/g, (m,p,t)=>p+t.replace(/O/g,"0").replace(/I/g,"1").replace(/S/g,"5"));
  const out:any = {};
  // Barcode digits are PRINTED under the bars — read them when the camera API can't
  const bcd = U.replace(/[^0-9\n ]/g," ").match(/\b(\d[\d ]{10,15}\d)\b/g);
  if (bcd){
    const clean = bcd.map(s=>s.replace(/\s/g,"")).filter(s=>s.length===12||s.length===13);
    if (clean.length) out.barcode = clean[clean.length-1];
  }
  // Brand + SKU patterns (pattern beats position — layouts differ per brand).
  // EAN/PO#/UPC lines are factory order numbers, never SKUs — drop them first
  // ("EAN PO# 129446096" otherwise reads as an old Nike style code).
  const U2  = U.split(/\n/).filter(l=>!/EAN|PO\s?#|UPC|BARCODE/.test(l)).join("\n");
  const UC2 = UC.split(/\n/).filter(l=>!/EAN|PO\s?#|UPC|BARCODE/.test(l)).join("\n");
  const nikeSkuOld = U2.match(/\b(\d{6})[-\s]?(\d{3})\b/);                // 831217-011
  const nikeSkuNew = UC2.match(/\b([A-Z]{2}\d{4})[-\s](\d{3})\b/);        // DX4401 164, CJ0882 001
  const adiSku  = UC2.match(/\b([A-Z]{1,2}[0-9]{4,5})\b/);                // CQ2964, B37571, HQ4540
  const asicsSku= U2.match(/\b(\d{4}[A-Z]\d{3})(?:[-\s]?(\d{3}))?\b/);
  const nbSku   = U2.match(/\b([MUW][A-Z]?\d{3,4}[A-Z]{0,4})\b/);
  if (/JORDAN/.test(U)) out.brand="Jordan";
  else if (/YEEZY|YZY|MADE BY ADIDAS/.test(U)) out.brand="Adidas";
  else if (/NIKE|WMNS/.test(U) || nikeSkuOld) out.brand="Nike";
  else if (/ADIDAS|ORIGINALS/.test(U)) out.brand="Adidas";
  else if (/ASICS/.test(U) || asicsSku) out.brand="ASICS";
  else if (/NEW BALANCE/.test(U)) out.brand="New Balance";
  else if (/CONVERSE/.test(U)) out.brand="Converse";
  else if (/VANS/.test(U)) out.brand="Vans";
  else if (/PUMA/.test(U)) out.brand="Puma";
  if (asicsSku && /ASICS|GEL|\d{4}[A-Z]\d{3}/.test(U)) out.sku = asicsSku[0].replace(/\s/g,"");
  else if (nikeSkuNew && (out.brand==="Nike"||out.brand==="Jordan")) out.sku = `${nikeSkuNew[1]}-${nikeSkuNew[2]}`; // modern Nike/Jordan style codes
  else if (nikeSkuOld && out.brand!=="Adidas") out.sku = `${nikeSkuOld[1]}-${nikeSkuOld[2]}`;
  else if (adiSku && out.brand==="Adidas") out.sku = adiSku[1];
  else if (nbSku && out.brand==="New Balance") out.sku = nbSku[1];
  else if (nikeSkuNew) out.sku = `${nikeSkuNew[1]}-${nikeSkuNew[2]}`;
  else if (adiSku) out.sku = adiSku[1];
  // No brand word readable? The SKU shape still tells us the brand.
  if (!out.brand && out.sku){
    if (nikeSkuOld||nikeSkuNew) out.brand = "Nike";
    else if (asicsSku) out.brand = "ASICS";
    else if (nbSku) out.brand = "New Balance";
    else if (adiSku) out.brand = "Adidas";
  }
  // SoleBlessing's own yellow intake sticker carries the item code — formats
  // seen on real boxes: "8732", "AB 2915", "NC 45", "0036", "5108".
  // A code is a WHOLE line of optional 1-3 letter prefix + 2-5 digits. Lines that
  // are really the SKU repeated on the sticker (B37571, HQ4540) are excluded.
  // Sticker layout runs date → SKU → code, so lines AFTER the SOLE/date line win.
  {
    const NOTPFX = new Set(["US","UK","EU","EUR","CM","BR","CHN","F","D","J","JP","PHP","SZ","QTY","PO","EAN","UPC","V"]);
    const skuFlat = String(out.sku||"").replace(/[^A-Z0-9]/g,"");
    const lines0 = U.split(/\n+/).map(s=>s.trim());
    const cands:any[] = [];
    lines0.forEach((l,i)=>{
      const m = l.match(/^([A-Z]{1,3})[ .]{0,2}(\d{2,5})$/) || l.match(/^(\d{3,5})$/);
      if(!m) return;
      const pfx = m.length===3 ? m[1] : "";
      const digits = m.length===3 ? m[2] : m[1];
      if (pfx && NOTPFX.has(pfx)) return;
      if (!pfx && !(digits.length>=3&&digits.length<=5)) return;
      const code = pfx+digits;
      const ocrN=(s:string)=>s.replace(/O/g,"0").replace(/I/g,"1").replace(/S/g,"5");
      if (skuFlat && ocrN(code)===ocrN(skuFlat)) return; // that's the SKU (even OCR-garbled), not her code
      cands.push({code, idx:i});
    });
    if (cands.length){
      let ctxIdx = lines0.findIndex(l=>/SOLE|BLESS/.test(l));
      if (ctxIdx<0) ctxIdx = lines0.findIndex(l=>/\d{2}[- .\/]\d{2}[- .\/]\d{4}/.test(l));
      const cost=(c:any)=>{ if(ctxIdx<0) return 99; const d=Math.abs(c.idx-ctxIdx); return c.idx>=ctxIdx?d:d+1.5; };
      cands.sort((a,b)=>cost(a)-cost(b) || ((b.code.match(/^[A-Z]/)?1:0)-(a.code.match(/^[A-Z]/)?1:0)));
      out.code = cands[0].code;
    }
  }
  // Model: best line that isn't codes/sizes/colorways/origin boilerplate.
  // Colorway lines (FTWWHT/FTWWHT, BLACK / LAVA GLOW) lose to slash-free lines.
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  // SOLE sticker content (date, buyer name, town) is never product data — the
  // factory label never prints the model right after a SOLE header (Pia:
  // "if u read name dont count it")
  const stickerZone = new Set<number>();
  lines.forEach((l,i)=>{ if(/SOLE/i.test(l)){ for(let k=1;k<=3;k++) stickerZone.add(i+k); } });
  const candidates = lines.filter(l=>{
    const u=l.toUpperCase();
    if (stickerZone.has(lines.indexOf(l))) return false;
    if (u.length<4||u.length>40) return false;
    if (/MADE IN|MADE BY|FABRIQU|HECHO|INDONESIA|VIETNAM|CHINA|UPC|EAN|PRICE|PHP|SOLARSOFT|CUSHION|UNISEX|SOLE|BLESS|\.COM|WWW\.|\d{2}[- .\/]\d{2}[- .\/]\d{4}|\bPO\b|\bUS\b|\bUK\b|EUR|\bCM\b|\d{6,}/.test(u)) return false;
    // brand taglines aren't models — also when OCR doubles them ("ORIGINALS ORIGINALS")
    const tag=/^(ORIGINALS?|SPORTSWEAR|PERFORMANCE|EQUIPMENT|AUTHENTICS?|CLASSICS?|NIKE|ADIDAS|ASICS|PUMA|VANS|CONVERSE|NEW|BALANCE|JORDAN)$/;
    if (u.split(/\s+/).every(w=>tag.test(w))) return false;
    // mostly-digits lines ("F460 11 101 tra602") are code soup, never a model
    const letters=(l.match(/[A-Za-z]/g)||[]).length, digits=(l.match(/\d/g)||[]).length;
    if (digits >= letters) return false;
    return /[A-Z]{3,}/i.test(u) && !/^\d/.test(l);
  });
  // digits in a "model" line are usually a neighboring box's codes — penalize hard.
  // The REAL model prints beside the SKU on the factory label, so lines containing
  // or near the SKU outrank buyer stickers (customer names, towns) and stray text.
  const skuFlatM=String(out.sku||"").replace(/[^A-Z0-9]/gi,"").toUpperCase();
  const skuLineIdx = skuFlatM ? lines.findIndex(l=>l.toUpperCase().replace(/[^A-Z0-9]/g,"").includes(skuFlatM)) : -1;
  const score=(l:string)=>{
    let s=((l.match(/\//g)||[]).length?0:100)+(l.match(/[A-Za-z]/g)||[]).length-3*(l.match(/\d/g)||[]).length;
    if(skuFlatM){
      if(l.toUpperCase().replace(/[^A-Z0-9]/g,"").includes(skuFlatM)) s+=60;
      else if(skuLineIdx>=0) s+=Math.max(0, 30-8*Math.abs(lines.indexOf(l)-skuLineIdx));
    }
    return s;
  };
  let modelRaw = candidates.sort((a,b)=>score(b)-score(a))[0] || "";
  // the SKU printed on the same line is not part of the model name
  if(skuFlatM) modelRaw=modelRaw.replace(new RegExp(skuFlatM.split("").join("[^A-Za-z0-9]?"),"i"),"").trim();
  // Strip OCR junk: [5k]-style brackets, stray symbols, duplicated trailing letters
  const modelLine = modelRaw.replace(/\[[^\]]*\]/g," ").replace(/[^A-Za-z0-9 .'\/_-]/g," ").replace(/\s{2,}/g," ").trim();
  out.model = modelLine;
  // Gender / youth markers — the model line itself counts ("X_PLR J" = junior, "SPEZIAL C" = children)
  const MU = modelLine.toUpperCase();
  const isW = /WMNS|WOMEN/.test(U) || /\sW$/.test(MU.trim()) || /^W\s/.test(MU.trim()); // adidas end " W" (BRYONY W); Nike start "W " (W NIKE DUNK LOW)
  const isY = /\bGS\b|\bPS\b|\bTD\b|\(J\)|JUNIOR|YOUTH|INFANT/.test(U) || /\bJ$|\bJR$|\bC$|\bK$/.test(MU.trim());
  // Sizes — accept fractions and decimals. Dual-row Nike/Jordan labels print
  // "11 MENS … / 12.5 WMNS …" for the SAME shoe: the MENS row is the size.
  const frac=(s:string)=>s.replace(/\s*1\/2|½/,".5").replace(/\s*2\/3|⅔/,".7").replace(/\s*1\/3|⅓/,".3").replace(",",".");
  // OCR splits superscript halves: "6 5 UK" is 6.5 — join digit-space-5 before a size word
  const US2 = U.replace(/\b(\d{1,2}) 5(\s+(?:UK|EUR|F|CM|MENS|WMNS))/g, "$1.5$2");
  const mens = US2.match(/\b(\d{1,2}(?:[.,]5|\s?1\/2|½)?)\s*\.?\s*MENS\b/);
  const wmns = US2.match(/\b(\d{1,2}(?:[.,]5|\s?1\/2|½)?)\s*\.?\s*WMNS\b/);
  // Dual-row labels print the shoe's size on the TOP row and the conversion
  // below (Pia: "always use the size above"). Women's boxes print WMNS first,
  // men's print MENS first — text order follows the label top-down.
  let primary = mens, primaryIsW = false;
  if (mens && wmns && (wmns.index??0) < (mens.index??0)) { primary = wmns; primaryIsW = true; }
  else if (!mens && wmns) { primary = wmns; primaryIsW = true; }
  const us = primary
    || US2.match(/\bUS\D{0,3}(\d{1,2}(?:[.,]5|\s?1\/2|½)?)/)
    || US2.match(/\b(\d{1,2}(?:[.,]5|\s?1\/2|½)?)\s*(?:US|M\b|W\b)/)
    // bare "6.5  UK 4" layout — only when UK is followed by ITS OWN number on
    // the same line ("9 UK" alone is a UK size, not US)
    || US2.match(/(?:^|\s)(\d{1,2}(?:[.,]5|\s?1\/2|½)?)\s+(?:UK[ \t]{0,2}\d|EUR[ \t]{0,2}\d|F[ \t]{0,2}\d)/m);
  const usIsMens = !!primary && !primaryIsW, usIsWmns = !!primary && primaryIsW;
  const eur = U.match(/\b(?:EUR?|F)\W{0,2}(\d{2}(?:[.,]\d|\s?[12]\/3|⅔|½|\s?1\/2)?)/);
  const cm = U.match(/\b(\d{2}(?:[.,]5)?)\s?CM\b/) || U.match(/\bCM\W{0,2}(\d{2}(?:[.,]5)?)/) || U.match(/\bJP\W{0,2}(\d{2}(?:[.,]5)?)/);
  // Adidas/Asian boxes print J / CHN in MILLIMETERS: "J 220" = 22cm; some
  // Yeezy restock labels print mondo alone as "265 (2.5)"
  const jmm = U.match(/\b(?:J|JP|CHN)\W{0,2}([12]\d{2})\b/) || U.match(/\b(2\d{2})\s*\(/);
  if (!cm && jmm) out.cmSize = String(parseInt(jmm[1],10)/10);
  const uk = US2.match(/\bUK[ \t]{0,2}(\d{1,2}(?:[.,]5|\s?1\/2|½)?)\b/)
    || US2.match(/\b(\d{1,2}(?:[.,]5|\s?1\/2|½)?)[ \t]{0,2}UK\b(?![ \t]{0,2}\d)/); // "9 UK" layout
  if (uk) out.ukSize = frac(uk[1]);
  if (us) out.usSize = frac(us[1]) + (usIsMens?"M":usIsWmns?"W":isY?"Y":isW?"W":"M");
  if (eur) out.eurSize = frac(eur[1]);
  if (cm) out.cmSize = frac(cm[1]);
  // Google-OCR table mode: adidas size grids flatten in SEVERAL shapes —
  // stacked ("US","UK", junk, "62", "5"), interleaved ("US","6 1/2","UK","5"),
  // or glued ("US UK", "6½ 5"). Reconstruct the columns from any of them.
  {
    const L = U.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    const num=(s:string)=>parseFloat(s.replace(",","."));
    // one numeric token: 38 · 6,5 · 6 1/2 · 6½ · 42 2/3
    const numv=(s:string)=>{
      const m=(s||"").trim().replace(/½/," 1/2").replace(/⅔/," 2/3").replace(/\s+/g," ")
        .match(/^(\d{1,3})(?:[.,](\d))?(?:\s?([12])\/([23]))?$/);
      if(!m) return null;
      return m[1]+(m[2]?"."+m[2]:m[3]?(m[4]==="2"?".5":m[3]==="1"?".3":".7"):"");
    };
    // a line that is ONLY numbers → its tokens ("38 5" → [38,5])
    const twoNum=(s:string)=>{
      const parts=(s||"").trim().replace(/½/g," 1/2").replace(/⅔/g," 2/3").split(/\s+/);
      const res:string[]=[]; let i=0;
      while(i<parts.length){
        const pair=i+1<parts.length?numv(parts[i]+" "+parts[i+1]):null; // "6 1/2"
        if(pair&&/\//.test(parts[i+1])){res.push(pair);i+=2;continue;}
        const one=numv(parts[i]); if(!one) return res.length?res:null;
        res.push(one);i++;
      }
      return res.length?res:null;
    };
    const colPair=(h1:RegExp,h2:RegExp)=>{
      for(let i=0;i<L.length;i++){
        if(!h1.test(L[i])) continue;
        // interleaved: HDR value HDR value
        const a=numv(L[i+1]||"");
        if(a&&h2.test(L[i+2]||"")) return [a,numv(L[i+3]||"")||""].filter(Boolean);
        // stacked: HDR then HDR within 2 lines, values further down (junk between allowed)
        if(h2.test(L[i+1]||"")||h2.test(L[i+2]||"")){
          const vals:string[]=[];
          for(let k=i+2;k<Math.min(i+10,L.length)&&vals.length<2;k++){
            const t=twoNum(L[k]); if(t) for(const x of t){if(vals.length<2)vals.push(x);}
          }
          if(vals.length) return vals;
        }
        return null;
      }
      return null;
    };
    if(!out.usSize){
      const v=colPair(/^US$/,/^UK$/)||(()=>{ // glued headers "US UK" then "6½ 5"
        const i=L.findIndex(s=>/^US\s+UK$/.test(s));
        return i>=0?(twoNum(L[i+1]||"")||twoNum(L[i+2]||"")):null;})();
      if(v&&v[0]){
        let s=v[0];
        // "½" OCR-reads as "2" glued on ("6½"→"62", kids "1½"→"12"). Repair when
        // the raw value is impossible OR the UK column disagrees with it but
        // agrees with the repaired value (US runs 0.5–1.5 above UK on every brand).
        const rep=s.match(/^(1?\d)2$/), ukv=v[1]?num(v[1]):NaN;
        if(rep){
          const raw=num(s), fixed=num(rep[1])+0.5;
          const rawFitsUk=!isNaN(ukv)&&(raw-ukv>=0.4&&raw-ukv<=1.6);
          const fixFitsUk=!isNaN(ukv)&&(fixed-ukv>=0.4&&fixed-ukv<=1.6);
          if((raw>16&&fixed<=16)||(!rawFitsUk&&fixFitsUk)) s=rep[1]+".5";
        }
        if(num(s)>=1&&num(s)<=16) out.usSize=s+(isY?"Y":isW?"W":"M");
        if(v[1]&&!out.ukSize&&num(v[1])>=1&&num(v[1])<=15) out.ukSize=v[1];
      }
    }
    if(!out.eurSize){
      const v=colPair(/^F$/,/^D$/)||(()=>{
        const i=L.findIndex(s=>/^F\s+D$/.test(s));
        return i>=0?(twoNum(L[i+1]||"")||twoNum(L[i+2]||"")):null;})();
      if(v&&v[0]&&num(v[0])>=15&&num(v[0])<=50){
        out.eurSize=v[0];
        if(v[1]&&!out.ukSize&&num(v[1])>=1&&num(v[1])<=15) out.ukSize=v[1];
      }
    }
  }
  // Sanity: a warehouse frame often catches NEIGHBORING boxes, so impossible
  // or mutually inconsistent sizes get dropped (derivation refills from what's
  // trustworthy). Kids sizes skip the cross-check (different scale).
  {
    const n=(s:any)=>parseFloat(String(s||"").replace(/[MWY]$/,""));
    if(out.usSize&&!(n(out.usSize)>=1&&n(out.usSize)<=16)) delete out.usSize;
    if(out.cmSize&&!(parseFloat(out.cmSize)>=15&&parseFloat(out.cmSize)<=34)) delete out.cmSize;
    if(out.eurSize&&!(parseFloat(out.eurSize)>=15&&parseFloat(out.eurSize)<=50)) delete out.eurSize;
    if(out.ukSize&&!(parseFloat(out.ukSize)>=1&&parseFloat(out.ukSize)<=15)) delete out.ukSize;
    const usN=n(out.usSize);
    // kids pictograms can't be OCR'd, but the numbers can: a tiny US size with a
    // small EUR/CM is a kids pair even without a C/K/Y marker on the model
    if(out.usSize&&!/Y$/.test(String(out.usSize))&&usN<=3.5){
      const eN=parseFloat(out.eurSize||""), cN=parseFloat(out.cmSize||"");
      if((eN&&eN<=36)||(cN&&cN<=22.5)) out.usSize=String(usN)+"Y";
    }
    if(!isNaN(usN)&&out.usSize&&!/Y$/.test(String(out.usSize))){
      if(out.eurSize&&Math.abs(parseFloat(out.eurSize)-(4/3*usN+30.5))>2.6) delete out.eurSize;
      if(out.cmSize&&Math.abs(parseFloat(out.cmSize)-(usN+17))>2.8) delete out.cmSize;
    }
  }
  // SRP from price sticker — any sign; ₱ as-is, $/€ converted, bare large number
  // near PRICE. OCR mangles separators ("5,000.00" → "5 000 00"), so: keep the
  // digit run, drop trailing cents when a cents pattern ended the amount.
  const money = (s:string)=>{
    let d = s.trim();
    const cents = /[.,]\s?\d{2}\s*$/.test(d);
    d = d.replace(/[^\d]/g,"");
    if (cents && d.length>2) d = d.slice(0,-2);
    return parseInt(d||"0",10);
  };
  const php = text.match(/(?:₱|PHP)[:\t ]*([\d][\d.,\t ]{0,12}\d|\d)/i);
  const usd = text.match(/(?:\$|USD)[:\t ]*([\d][\d.,\t ]{0,12}\d|\d)/i);
  const near = text.match(/PRICE[^\d\n]{0,12}([\d][\d.,\t ]{0,12}\d)/i);
  if (php && money(php[1])>0) out.srp = String(money(php[1]));
  else if (usd && money(usd[1])>0) out.srp = String(Math.round(money(usd[1])*fxRate));
  else if (near && money(near[1])>100) out.srp = String(money(near[1]));

  // ── Size derivation from brand charts (researched + anchored on real boxes) ──
  // J/CHN = CM (mondopoint) · F = EUR · D(adidas) = UK. Within a brand the
  // scales are linear in US: EUR = 4/3·US + c, CM = US + k, US = UK + u.
  // Anchors: Adidas US4→F36/J220, US5.5→F38/J235, UK9→EUR43⅓ · Nike US9→42.5/27cm,
  // US11→45/29cm · ASICS US11→45/28.5. Estimates fill ONLY missing fields.
  {
    // Calibrated against the official adidas + Nike charts Pia supplied (Nov 9):
    // adidas US4→UK3.5/EU36/22cm, US5.5→EU38/23.5cm, women = men +1;
    // Nike US9→UK8/EU42.5/27.5cm, women = men +1.5. w = women's US offset.
    const CH:any = {
      "Nike":{c:30.5,k:18.5,u:1,w:1.5}, "Jordan":{c:30.5,k:18.5,u:1,w:1.5}, "ASICS":{c:30.33,k:17.5,u:1,w:1.5},
      "Adidas":{c:30.67,k:18,u:0.5,w:1}, "New Balance":{c:30.83,k:18,u:0.5,w:1.5},
      "Converse":{c:30.33,k:17.5,u:1,w:1.5}, "Vans":{c:30.33,k:18,u:1,w:1.5}, "Puma":{c:30,k:17,u:1,w:1.5},
    };
    const ch = CH[out.brand||""] || {c:30.5,k:18,u:1,w:1.5};
    const sfx = (out.usSize||"").match(/[MWY]$/)?.[0] || "M";
    let usN = parseFloat(out.usSize||"");
    const est:string[] = [];
    if (sfx!=="Y"){ // kids scales are their own world — never estimated
      const wAdj = sfx==="W" ? ch.w : 0; // women's US offset over the men's last, per brand
      if (isNaN(usN) && out.ukSize){ usN = Math.round((parseFloat(out.ukSize)+ch.u+wAdj)*2)/2;
        if(!isNaN(usN)){ out.usSize = String(usN)+sfx; est.push("US (from UK "+out.ukSize+")"); } }
      if (!isNaN(usN)){
        const usM = usN - wAdj; // charts are men's-lasted
        if (!out.eurSize){ out.eurSize = String(Math.round(((4/3)*usM+ch.c)*10)/10); est.push("EUR"); }
        if (!out.cmSize){ out.cmSize = String(Math.round((usM+ch.k)*2)/2); est.push("CM"); }
      }
    }
    if (est.length) out.estimated = est;
  }
  return out;
}

// Fix wrong input on a scanned pair WITHOUT leaving the scan log (Pia, Nov 9:
// "do not incorporate or attached to any sheets this is new. Let me edit if
// theres wrong input"). Upsert keeps the row in tab=SCAN; staff edits restamp
// added_by server-side, so the last editor is always on record.
function ScanEditModal({row,onClose,onSaved}:{row:any;onClose:()=>void;onSaved:()=>void}){
  const peso=(c:any)=>c?String(Math.round(c/100)):"";
  const [f,setF]=useState<any>({code:row.item_code||"",name:row.name||"",brand:row.brand||"",sku:row.sku||"",size:row.size||"",
    eur:row.size_eur||"",cm:row.size_cm||"",barcode:row.barcode||"",srp:peso(row.srp),selling:peso(row.selling_price),unitCost:peso(row.unit_cost),
    cond:(row.condition&&row.condition!=="New")?row.condition:"Good",status:row.status||"Available"});
  const [busy,setBusy]=useState(false);
  const I="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm";
  const L="text-[9px] font-bold uppercase tracking-wider text-gray-400";
  const save=async()=>{
    const newCode=String(f.code||"").replace(/\s+/g,"").toUpperCase();
    if(!newCode){toast.error("Code is required");return;}
    if(!/^[A-Z0-9_-]{1,32}$/.test(newCode)){toast.error(`Code "${newCode}" — letters and numbers only (e.g. AB3413)`);return;}
    if(!f.name.trim()){toast.error("Name is required");return;}
    const usN=parseFloat(f.size),eN=parseFloat(f.eur),cN=parseFloat(f.cm);
    if(f.size.trim()&&!(usN>=1&&usN<=16)){toast.error(`US ${f.size} can't be right — US sizes run 1–16`);return;}
    if(f.eur.trim()&&!(eN>=15&&eN<=50)){toast.error(`EUR ${f.eur} looks like the UK number — the EUR/F size on the box has 2 digits (e.g. 38)`);return;}
    if(f.cm.trim()&&!(cN>=10&&cN<=34)){toast.error(`CM ${f.cm} can't be right — J/CHN prints millimeters, 235 means 23.5 cm`);return;}
    for(const [lbl,val] of [["SRP",f.srp],["Selling price",f.selling],["Unit cost",f.unitCost]] as const){
      const n=Number(String(val||"").replace(/[,\s]/g,""));
      if(val&&String(val).trim()&&!(n>=0&&n<=500000)){toast.error(`${lbl} ₱${val} can't be right — check the number (max ₱500,000)`);return;}
    }
    setBusy(true);
    try{
      if(newCode!==row.item_code){
        // renaming the box code — make sure the new one isn't already a different pair
        const clash=await sb.select("sb_inventory",`select=item_code&item_code=eq.${encodeURIComponent(newCode)}`);
        if(clash&&clash.length){toast.error(`${newCode} already exists — that's another pair`);setBusy(false);return;}
      }
      let srpE=f.srp?Math.round(Number(f.srp)||0)*100:null;
      let selE=f.selling?Math.round(Number(f.selling)||0)*100:null;
      if(srpE&&Math.round(srpE/100)%100===99&&!selE){selE=srpE;srpE=null;toast(`₱${Math.round(selE/100)} ends in 99 — saved as selling price, not SRP`);}
      await sb.update("sb_inventory",`item_code=eq.${encodeURIComponent(row.item_code)}`,{
        item_code:newCode, name:f.name.trim(), brand:f.brand.trim()||null, sku:f.sku.trim()||null,
        size:f.size.replace(/\s+/g,"").toUpperCase()||null, size_eur:f.eur.trim()||null, size_cm:f.cm.trim()||null, barcode:f.barcode.trim()||null,
        srp:srpE, selling_price:selE,
        unit_cost:Math.round(Number(String(f.unitCost||"").replace(/[,\s]/g,""))||0)*100, // blank = no record = 0 (never shown on the website)
        condition:f.cond, status:f.status, updated_at:new Date().toISOString(),
      });
      toast.success(newCode!==row.item_code?`${row.item_code} → ${newCode} saved`:`${newCode} updated`); onSaved();
    }catch(e:any){toast.error("Save failed: "+(e.message||e));}
    finally{setBusy(false);}
  };
  return(
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="bg-[#050f12] px-4 py-3 flex items-center justify-between sticky top-0">
          <p className="text-xs font-bold text-white">✏️ Edit <span className="text-[#C9A84C] font-mono">{row.item_code}</span> — stays in the scan file</p>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="p-4 space-y-2.5">
          <div><label className={L}>Code (box sticker — fix a wrong code here)</label><input className={`${I} font-mono font-bold`} value={f.code} onChange={e=>setF({...f,code:e.target.value})}/></div>
          <div><label className={L}>Name (brand + model)</label><input className={I} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={L}>Brand</label><input className={I} value={f.brand} onChange={e=>setF({...f,brand:e.target.value})}/></div>
            <div><label className={L}>SKU</label><input className={I} value={f.sku} onChange={e=>setF({...f,sku:e.target.value})}/></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={L}>Size US</label><input className={I} value={f.size} onChange={e=>setF({...f,size:e.target.value})}/></div>
            <div><label className={L}>EUR</label><input className={I} inputMode="decimal" value={f.eur} onChange={e=>setF({...f,eur:e.target.value})}/></div>
            <div><label className={L}>CM</label><input className={I} inputMode="decimal" value={f.cm} onChange={e=>setF({...f,cm:e.target.value})}/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={L}>Barcode</label><input className={I} inputMode="numeric" value={f.barcode} onChange={e=>setF({...f,barcode:e.target.value})}/></div>
            <div><label className={L}>SRP ₱</label><input className={I} inputMode="numeric" value={f.srp} onChange={e=>setF({...f,srp:e.target.value})}/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={L}>Selling price ₱ (website price)</label><input className={I} inputMode="numeric" value={f.selling} onChange={e=>setF({...f,selling:e.target.value})}/></div>
            <div><label className={L}>Unit cost ₱ (internal — never on website)</label><input className={I} inputMode="numeric" value={f.unitCost} onChange={e=>setF({...f,unitCost:e.target.value})}/></div>
          </div>
          <div>
            <label className={L}>Condition</label>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {["Good","Stained","Missing pair","Unknown"].map(c=>(
                <button key={c} onClick={()=>setF({...f,cond:c})}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${f.cond===c?(c==="Good"?"bg-green-500 border-green-500 text-white":"bg-[#0d2430] border-[#0d2430] text-white"):"border-gray-200 text-gray-500"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={L}>Status</label>
            <select className={I} value={f.status} onChange={e=>setF({...f,status:e.target.value})}>
              {["Available","Reserved","Sold","Returned","Damaged","Archived"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 rounded-xl text-xs font-semibold text-gray-500">Cancel</button>
            <button onClick={save} disabled={busy} className="flex-[2] bg-[#0d2430] text-white py-3 rounded-xl font-black text-sm disabled:opacity-50">{busy?"Saving…":"💾 SAVE CHANGES"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanBoxModal({existingCodes,allRows,nextCode,onClose,onSaved}:{existingCodes:Set<string>;allRows:any[];nextCode:string;onClose:()=>void;onSaved:()=>void}){
  const [f,setF]=useState<Intake>({...BLANK_INTAKE});
  const [fx,setFx]=useState(()=>{try{return Number(localStorage.getItem("sb_fx"))||56}catch{return 56}});
  const [phase,setPhase]=useState<"cam"|"form">("cam");
  const [busy,setBusy]=useState("");
  const [saving,setSaving]=useState(false);
  const [photo,setPhoto]=useState<string|null>(null); // dataURL for upload
  const [lastOcr,setLastOcr]=useState(""); // raw engine output — debugging bad reads
  const [showPrice,setShowPrice]=useState(false);
  const videoRef=(window as any).__sbVid||={current:null as HTMLVideoElement|null};
  const streamRef=(window as any).__sbStream||={current:null as MediaStream|null};
  const scanTimer=(window as any).__sbTimer||={current:0};

  const stopCam=()=>{try{streamRef.current?.getTracks().forEach((t:any)=>t.stop());}catch{} streamRef.current=null;
    if(scanTimer.current){clearInterval(scanTimer.current);scanTimer.current=0;}};
  const startCam=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1920},height:{ideal:1080}},audio:false});
      streamRef.current=s;
      const v=document.getElementById("sb-scan-video") as HTMLVideoElement|null;
      if(v){v.srcObject=s;await v.play();}
      // live barcode loop (free, native)
      const BD=(window as any).BarcodeDetector;
      if(BD){
        const det=new BD({formats:["ean_13","upc_a","upc_e","ean_8","code_128"]});
        scanTimer.current=window.setInterval(async()=>{
          const v2=document.getElementById("sb-scan-video") as HTMLVideoElement|null;
          if(!v2||v2.readyState<2)return;
          try{const codes=await det.detect(v2);
            if(codes?.length){setF(p=>p.barcode?p:{...p,barcode:codes[0].rawValue});}}catch{}
        },700);
      }
    }catch(e:any){toast.error("Camera blocked — allow camera access, or type the fields manually");setPhase("form");}
  };
  useEffect(()=>{ if(phase==="cam") startCam(); return stopCam; // eslint-disable-line
  },[phase]);

  const capture=async()=>{
    const v=document.getElementById("sb-scan-video") as HTMLVideoElement|null;
    if(!v||v.readyState<2){setPhase("form");return;}
    // Crop to roughly what's inside the gold guide — shelves hold many boxes and
    // OCR must only see the ONE label being aimed at. The preview is object-cover
    // 4:3, so first take the visible center rect, then trim to the guide.
    const vw=v.videoWidth, vh=v.videoHeight, ar=4/3;
    let cw=vw, ch=vh;
    if(vw/vh>ar) cw=Math.round(vh*ar); else ch=Math.round(vw/ar);
    const gx=Math.round((vw-cw)/2+cw*0.06), gy=Math.round((vh-ch)/2+ch*0.10);
    const gw=Math.round(cw*0.88), gh=Math.round(ch*0.80);
    const c=document.createElement("canvas");
    c.width=gw;c.height=gh;
    c.getContext("2d")!.drawImage(v,gx,gy,gw,gh,0,0,gw,gh);
    const shotUrl=c.toDataURL("image/jpeg",0.85);
    setPhoto(shotUrl);
    stopCam();setPhase("form");
    setBusy("Reading label…");
    try{
      const BD=(window as any).BarcodeDetector;
      if(BD){try{const det=new BD({formats:["ean_13","upc_a","upc_e","ean_8","code_128"]});
        const codes=await det.detect(c);
        if(codes?.length)setF(p=>p.barcode?p:{...p,barcode:codes[0].rawValue});}catch{}}
      // 1st choice: Google OCR through NSB SYSTEM (reads warehouse photos the
      // browser engine can't). Falls back to on-device OCR if unavailable.
      let gasText="",gasWhy="";
      
      for(let att=0;att<2&&!gasText;att++){ // GAS cold starts throw one-off errors — retry once
        try{
          const gr=await fetch("/api/ocr-label",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({...adminCred(),base64:shotUrl.split(",")[1],mimeType:"image/jpeg"})});
          const go=await gr.json().catch(()=>({} as any));
          if(gr.ok&&go.text&&String(go.text).trim().length>8) gasText=String(go.text);
          else gasWhy=`HTTP ${gr.status}${go&&go.error?" · "+String(go.error).slice(0,80):""}`;
        }catch(e:any){gasWhy=String(e?.message||e).slice(0,80);}
      }
      if(!gasText) toast.info(`Google OCR unavailable (${gasWhy||"no response"}) — using phone OCR`);
      if(gasText){
        setLastOcr("— Google OCR —\n"+gasText.trim());
        const got=parseLabel(gasText,fx);
        setF(p=>({...p,
          code:p.code||got.code||"",
          brand:p.brand||got.brand||"", model:p.model||got.model||"", sku:p.sku||got.sku||"",
          usSize:p.usSize||got.usSize||"", eurSize:p.eurSize||got.eurSize||"", cmSize:p.cmSize||got.cmSize||"",
          barcode:p.barcode||got.barcode||"",
          srp:p.srp||got.srp||"",
        }));
        if (got.estimated&&got.estimated.length) toast.success(`Label read (Google OCR) — ${got.estimated.join(", ")} estimated from the ${got.brand||"brand"} size chart`);
        else toast.success("Label read (Google OCR) — check the green fields");
        setBusy("");return;
      }
      // OCR engine from CDN at runtime (audited live) — the bundled dynamic chunk
      // didn't expose createWorker in production, so the script-tag path is the
      // deterministic one. Cached by the browser after first load.
      const T:any = await new Promise((ok,err)=>{
        const w=window as any;
        if(w.Tesseract) return ok(w.Tesseract);
        const s=document.createElement("script");
        s.src="https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js";
        s.onload=()=>ok((window as any).Tesseract);
        s.onerror=()=>err(new Error("OCR engine failed to load — check internet"));
        document.head.appendChild(s);
      });
      const worker=await T.createWorker("eng");
      // Preprocess for OCR: upscale + grayscale + contrast (phone photos of
      // glossy labels read far better this way)
      const p=document.createElement("canvas");
      const sc=Math.min(2, 2600/Math.max(c.width,1));
      p.width=Math.round(c.width*sc); p.height=Math.round(c.height*sc);
      const pg=p.getContext("2d")!;
      (pg as any).filter="grayscale(1) contrast(1.6) brightness(1.05)";
      pg.imageSmoothingEnabled=true; pg.drawImage(c,0,0,p.width,p.height);
      const {data}=await worker.recognize(p);
      await worker.terminate();
      setLastOcr("— phone OCR —\n"+String(data.text||"").trim());
      const got=parseLabel(data.text||"",fx);
      setF(p=>({...p,
        code:p.code||got.code||"",
        brand:p.brand||got.brand||"", model:p.model||got.model||"", sku:p.sku||got.sku||"",
        usSize:p.usSize||got.usSize||"", eurSize:p.eurSize||got.eurSize||"", cmSize:p.cmSize||got.cmSize||"",
        barcode:p.barcode||got.barcode||"",
        srp:p.srp||got.srp||"",
      }));
      if (got.estimated&&got.estimated.length) toast.success(`Label read — ${got.estimated.join(", ")} estimated from the ${got.brand||"brand"} size chart, check before save`);
      else toast.success("Label read — check the green fields");
    }catch(e:any){toast.info("Couldn't read text ("+(e.message||e)+") — fill fields manually");}
    finally{setBusy("");}
  };

  const codeNorm=normSBCode(f.code);
  // Scanning builds the NEW inventory file (tab=SCAN). Rules (Pia, Nov 9):
  //  - code already SCANNED → hard block (true duplicate in the new file)
  //  - code only in the OLD sheet-imported data → CLAIM: saving updates that
  //    record in place and pulls it into the scan log (treated as new inventory)
  const scanCodes=useMemo(()=>new Set((allRows||[]).filter((r:any)=>r.tab==="SCAN").map((r:any)=>normSBCode(String(r.item_code||"")))),[allRows]);
  const legacyRow=useMemo(()=>codeNorm?(allRows||[]).find((r:any)=>r.tab!=="SCAN"&&normSBCode(String(r.item_code||""))===codeNorm):null,[allRows,codeNorm]);
  const dup=codeNorm!==""&&scanCodes.has(codeNorm);
  const claim=!dup&&!!legacyRow;
  // "Already in the file?" — checks the SCAN file only: same barcode or SKU+size
  // flags a possible re-scan. Warning, not block (identical pairs = separate codes).
  const dupHits=useMemo(()=>{
    const hits:string[]=[];
    const bc=f.barcode.trim(); const sku=f.sku.trim().toUpperCase(); const sz=f.usSize.trim().toUpperCase();
    (allRows||[]).forEach((r:any)=>{
      if(r.tab!=="SCAN")return;
      if(bc&&String(r.barcode||"")===bc) hits.push(`${r.item_code} (same barcode)`);
      else if(sku&&sz&&String(r.sku||"").toUpperCase()===sku&&String(r.size||"").toUpperCase()===sz) hits.push(`${r.item_code} (same SKU + size)`);
    });
    return hits.slice(0,4);
  },[f.barcode,f.sku,f.usSize,allRows]);

  const save=async()=>{
    if(!codeNorm){toast.error("Item code is required");return;}
    if(dup){toast.error(`Code ${codeNorm} is already in the scan file — pick another`);return;}
    if(!f.model.trim()&&!f.sku.trim()){toast.error("Give it at least a model or SKU");return;}
    // Typed-size guard: the box's small UK/D number keeps landing in the wrong field
    {
      const usN=parseFloat(f.usSize); const eurN=parseFloat(f.eurSize); const cmN=parseFloat(f.cmSize);
      if(f.usSize.trim()&&!(usN>=1&&usN<=16)){toast.error(`US ${f.usSize} can't be right — US sizes run 1–16`);return;}
      if(f.eurSize.trim()&&!(eurN>=15&&eurN<=50)){toast.error(`EUR ${f.eurSize} looks like the UK number — the EUR/F size on the box has 2 digits (e.g. 38)`);return;}
      if(f.cmSize.trim()&&!(cmN>=10&&cmN<=34)){toast.error(`CM ${f.cmSize} can't be right — J/CHN prints millimeters, 235 means 23.5 cm`);return;}
      // Price guard: a typo like 55000044 overflows the database integer and the
      // save dies with a cryptic error. No pair costs more than ₱500,000.
      const P_MAX=500000;
      for(const [lbl,val] of [["SRP",f.srp],["Selling price",f.selling],["Unit cost",f.unitCost]] as const){
        const n=Number(String(val||"").replace(/[,\s]/g,""));
        if(val&&String(val).trim()&&!(n>=0&&n<=P_MAX)){toast.error(`${lbl} ₱${val} can't be right — check the number (max ₱500,000)`);return;}
      }
    }
    setSaving(true);
    try{
      // LIVE duplicate check — with 2–3 admins scanning at once, the list loaded
      // at page-open can't see their newest saves, and a merge-save would silently
      // overwrite a teammate's pair. Ask the database at the moment of saving.
      try{
        const liveRows=await sb.select("sb_inventory",`select=item_code,tab,added_by&item_code=eq.${encodeURIComponent(codeNorm)}`);
        const live=Array.isArray(liveRows)?liveRows[0]:null;
        if(live&&live.tab==="SCAN"){
          toast.error(`${codeNorm} was just scanned by ${live.added_by||"another admin"} — use a different code`);
          setSaving(false);return;
        }
      }catch{} // check is best-effort; the unique index still backstops below
      const name=[f.brand&&!f.model.toUpperCase().includes(f.brand.toUpperCase())?f.brand:"",f.model].filter(Boolean).join(" ").trim()||f.sku;
      // Upsert (merge): new code = insert; claiming an old-sheet code = that row
      // is updated in place and joins the scan log. Empty/zero fields are OMITTED
      // so a claim never wipes an existing cost or price with a blank.
      const payload:any={
        item_code:codeNorm, name, sku:f.sku.trim(), size:f.usSize.replace(/\s+/g,"").toUpperCase(),
        condition:f.cond, category:"Sneakers",
        status:"Available", stock:1, tab:"SCAN", added_by:getRole(),
        date_acquired:new Date().toISOString().slice(0,10),
        updated_at:new Date().toISOString(),
      };
      // a claimed legacy row is NEW inventory — resurface it at the top of the
      // scan log instead of leaving it buried at its old import date
      if(claim) payload.created_at=new Date().toISOString();
      if(f.eurSize.trim())payload.size_eur=f.eurSize.trim();
      if(f.cmSize.trim())payload.size_cm=f.cmSize.trim();
      if(f.barcode.trim())payload.barcode=f.barcode.trim();
      if(f.brand.trim())payload.brand=f.brand.trim();
      // Pia's rule: the only real SRP is the one on the box. A claim must not
      // inherit the old sheet's SRP — no price read/typed = no SRP.
      let srpC=Math.round(Number(f.srp)||0)*100;
      let selC=Math.round(Number(f.selling)||0)*100;
      // Pia's rule: a price ending in 99 (1999, 4399, 6499…) is OUR tag price, never
      // the box SRP — boxes print round numbers. Auto-route it to selling price.
      if(srpC>0&&Math.round(srpC/100)%100===99&&!(selC>0)){selC=srpC;srpC=0;toast(`₱${Math.round(selC/100)} ends in 99 — saved as selling price, not SRP`);}
      if(srpC>0)payload.srp=srpC; else if(claim)payload.srp=null;
      if(selC>0)payload.selling_price=selC;
      const ucC=Math.round(Number(f.unitCost)||0)*100; if(ucC>0)payload.unit_cost=ucC;
      await sb.upsert("sb_inventory","on_conflict=item_code",payload);
      // photo upload is best-effort
      if(photo){
        try{
          
          await fetch("/api/upload-image",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({...adminCred(),item_code:codeNorm,sku:f.sku.trim(),content_type:"image/jpeg",base64:photo.split(",")[1]})});
        }catch{}
      }
      toast.success(claim?`${codeNorm} claimed from old inventory — now in the scan file`:`${codeNorm} saved — ${name}`);
      onSaved();
      // batch mode: straight back to camera for the next box
      setF({...BLANK_INTAKE});setPhoto(null);setPhase("cam");
    }catch(e:any){
      const msg=String(e?.message||e);
      if(/duplicate key|uq_sb_inventory_norm_code/i.test(msg))
        toast.error(`${codeNorm} already exists (maybe spelled with a space) — use a different code`);
      else if(/out of range|22003/i.test(msg))
        toast.error("A price looks way too big — check SRP / selling price for extra digits");
      else toast.error("Save failed: "+msg);
    }
    finally{setSaving(false);}
  };

  const printQR=()=>{
    const url=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent("https://soleblessingofficial.com/inventory/"+codeNorm)}`;
    const w=window.open("","_blank","width=320,height=420");
    if(!w)return;
    w.document.write(`<div style="font-family:sans-serif;text-align:center;padding:10px"><img src="${url}" onload="setTimeout(()=>window.print(),300)"/><div style="font-weight:800;font-size:18px;font-family:monospace">${codeNorm}</div><div style="font-size:12px">${f.brand} ${f.model}</div><div style="font-size:12px">${f.usSize}${f.eurSize?" · EU "+f.eurSize:""}</div></div>`);
  };

  const inp="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-[#C9A84C]";
  const auto="bg-green-50 border-green-300";
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start md:items-center justify-center p-2 md:p-4 overflow-y-auto"
      onClick={e=>{if(e.target===e.currentTarget){stopCam();onClose();}}}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-2">
        <div className="bg-[#050f12] px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[.15em] uppercase text-[#C9A84C]">📦 Scan Shoebox</p>
            <p className="text-xs font-bold text-white">{phase==="cam"?"Point at the box label":"Check & save — green = read from box"} <span className="opacity-50 font-normal">· v26</span></p>
          </div>
          <button onClick={()=>{stopCam();onClose();}} className="text-white/40 hover:text-white"><X className="h-5 w-5"/></button>
        </div>

        {phase==="cam"&&(
          <div className="p-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video id="sb-scan-video" playsInline muted className="w-full h-full object-cover"/>
              <div className="absolute inset-6 border-2 border-dashed border-[#C9A84C]/80 rounded-lg pointer-events-none"/>
              <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none"><span className="bg-black/60 text-[#C9A84C] text-[10px] font-bold px-2 py-1 rounded">fit ONE box label in the frame — fill it</span></div>
              {f.barcode&&<div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded">✓ barcode {f.barcode}</div>}
            </div>
            <button onClick={capture} className="mt-3 w-full bg-[#C9A84C] text-[#050f12] py-3.5 rounded-xl font-black text-sm">📸 CAPTURE LABEL</button>
            <button onClick={()=>{stopCam();setPhase("form");}} className="mt-2 w-full border border-gray-200 py-2.5 rounded-xl text-xs font-semibold text-gray-500">Skip camera — type manually</button>
          </div>
        )}

        {phase==="form"&&(
          <div className="p-4 space-y-2.5">
            {busy&&<div className="text-xs font-bold text-amber-600 bg-amber-50 rounded-lg px-3 py-2 animate-pulse">{busy}</div>}
            {lastOcr&&<details className="text-[10px] text-gray-400">
              <summary className="cursor-pointer select-none">🔎 what the camera read</summary>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap bg-gray-50 rounded-lg p-2 font-mono text-[9px] leading-tight">{lastOcr}</pre>
            </details>}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-amber-600">🟠 Item code — you enter</label>
              <div className="flex gap-2">
                <input className={`${inp} font-mono font-black text-lg ${dup?"border-red-400 bg-red-50":"border-amber-400 bg-amber-50"}`}
                  value={f.code} onChange={e=>setF({...f,code:e.target.value})} placeholder={nextCode} autoFocus/>
                <button onClick={()=>setF({...f,code:nextCode})} className="text-[10px] font-bold text-[#8a6d25] border border-[#C9A84C] rounded-lg px-2 whitespace-nowrap">use {nextCode}</button>
              </div>
              <p className={`text-[10px] font-semibold ${dup?"text-red-500":claim?"text-blue-600":codeNorm?"text-green-600":"text-gray-400"}`}>
                {dup?`✗ ${codeNorm} already scanned — this is a duplicate in the new file`
                 :claim?`↻ ${codeNorm} exists in OLD inventory (${String((legacyRow as any)?.name||"").slice(0,28)}) — saving claims it as new inventory`
                 :codeNorm?`✓ ${codeNorm} is free`:"type the code on the box / your series"}</p>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase text-gray-400">Brand — tap or type</label>
              <div className="flex gap-1 overflow-x-auto pb-1 mb-1">
                {["Nike","Jordan","Adidas","New Balance","ASICS","Converse","Vans","Puma"].map(b=>(
                  <button key={b} onClick={()=>setF({...f,brand:f.brand===b?"":b})}
                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 border ${f.brand===b?"bg-[#0d2430] text-white border-[#0d2430]":"border-gray-200 text-gray-500"}`}>{b}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[9px] font-bold uppercase text-gray-400">Brand</label>
                <input className={`${inp} ${f.brand?auto:""}`} value={f.brand} onChange={e=>setF({...f,brand:e.target.value})} placeholder="or type other"/></div>
              <div><label className="text-[9px] font-bold uppercase text-gray-400">SKU</label>
                <input className={`${inp} ${f.sku?auto:""}`} value={f.sku} onChange={e=>setF({...f,sku:e.target.value})}/></div>
            </div>
            <div><label className="text-[9px] font-bold uppercase text-gray-400">Model</label>
              <input className={`${inp} ${f.model?auto:""}`} value={f.model} onChange={e=>setF({...f,model:e.target.value})}/></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[9px] font-bold uppercase text-gray-400">Size US</label>
                <input className={`${inp} ${f.usSize?auto:""}`} value={f.usSize} onChange={e=>setF({...f,usSize:e.target.value})} placeholder="—"/></div>
              <div><label className="text-[9px] font-bold uppercase text-gray-400">EUR</label>
                <input className={`${inp} ${f.eurSize?auto:""}`} value={f.eurSize} onChange={e=>setF({...f,eurSize:e.target.value})}/></div>
              <div><label className="text-[9px] font-bold uppercase text-gray-400">CM</label>
                <input className={`${inp} ${f.cmSize?auto:""}`} value={f.cmSize} onChange={e=>setF({...f,cmSize:e.target.value})}/></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[9px] font-bold uppercase text-gray-400">Barcode</label>
                <input className={`${inp} font-mono text-xs ${f.barcode?auto:""}`} value={f.barcode} onChange={e=>setF({...f,barcode:e.target.value})}/></div>
              <div><label className="text-[9px] font-bold uppercase text-gray-400">SRP ₱ {f.srp&&<button onClick={()=>setF({...f,srp:""})} className="text-red-400 font-bold">✕ clear</button>}</label>
                <input className={`${inp} ${f.srp?auto:""}`} inputMode="numeric" value={f.srp} onChange={e=>setF({...f,srp:e.target.value})} placeholder="from sticker"/></div>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase text-amber-600">🟠 Status</label>
              <div className="grid grid-cols-4 gap-1.5">
                {CONDS.map(c=>(
                  <button key={c} onClick={()=>setF({...f,cond:c})}
                    className={`py-2 rounded-lg text-[10px] font-bold border ${f.cond===c
                      ?(c==="Good"?"bg-green-500 text-white border-green-500":c==="Stained"?"bg-amber-500 text-white border-amber-500":"bg-red-500 text-white border-red-500")
                      :"border-gray-200 text-gray-500"}`}>{c}</button>
                ))}
              </div>
              {(f.cond==="Missing pair"||f.cond==="Unknown")&&<p className="text-[10px] text-red-500 font-semibold mt-1">⛔ held off the website until resolved</p>}
            </div>
            {dupHits.length>0&&(
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                <p className="text-[11px] font-bold text-amber-700">⚠️ Possibly already in the file:</p>
                <p className="text-[10px] text-amber-700 font-mono">{dupHits.join(" · ")}</p>
                <p className="text-[9px] text-amber-600">OK if this is a second identical pair — just make sure you're not re-scanning the same box.</p>
              </div>
            )}
            <button onClick={()=>setShowPrice(s=>!s)} className="text-[11px] font-bold text-gray-400">{showPrice?"▾":"▸"} Pricing (optional — no price = hidden from store)</button>
            {showPrice&&(
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[9px] font-bold uppercase text-gray-400">Cost ₱ — what we paid, NOT the box price</label>
                  <input className={inp} inputMode="numeric" value={f.unitCost} onChange={e=>setF({...f,unitCost:e.target.value})}/></div>
                <div><label className="text-[9px] font-bold uppercase text-gray-400">Selling ₱</label>
                  <input className={inp} inputMode="numeric" value={f.selling} onChange={e=>setF({...f,selling:e.target.value})}/></div>
                <div><label className="text-[9px] font-bold uppercase text-gray-400">$→₱ rate</label>
                  <input className={inp} inputMode="numeric" value={fx} onChange={e=>{const v=Number(e.target.value)||0;setFx(v);try{localStorage.setItem("sb_fx",String(v))}catch{}}}/></div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={()=>{setF({...BLANK_INTAKE});setPhoto(null);setPhase("cam");}}
                className="border border-gray-200 text-gray-500 rounded-xl px-3 text-xs font-bold">↺ rescan</button>
              <button onClick={save} disabled={saving||dup}
                className="flex-1 bg-[#0d2430] text-white py-3 rounded-xl font-black text-sm disabled:opacity-40">
                {saving?"Saving…":"💾 SAVE PAIR & SCAN NEXT"}</button>
              {codeNorm&&!dup&&<button onClick={printQR} className="border border-[#C9A84C] text-[#8a6d25] rounded-xl px-3 text-xs font-bold">🖨️ QR</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [,setLocation] = useLocation();
  const {isAdmin, logout} = useAdminAuth();
  const ROLE=getRole(); const isStaff=ROLE.startsWith("SA");
  const [section, setSection] = useState<Section>(()=>getRole().startsWith("SA")?"intake":"overview");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [productModal, setProductModal] = useState<{open:boolean;product?:any}>({open:false});
  const [qrModal, setQrModal] = useState<{open:boolean;itemCode:string;name:string}|null>(null);
  const [tabFilter, setTabFilter] = useState<'all'|'2025'|'2024'>('all');
  const [imageFilter, setImageFilter] = useState<'all'|'has'|'none'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [editedOnly, setEditedOnly] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [editingRow, setEditingRow] = useState<string|null>(null);
  const [editValues, setEditValues] = useState<Record<string,any>>({});
  const [savingRow, setSavingRow] = useState<string|null>(null);
  const [sbProducts, setSbProducts] = useState<any[]>([]);
  const [sbOrders, setSbOrders] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [productCategory, setProductCategory] = useState("All");
  const [expandedSizeId, setExpandedSizeId] = useState<string|null>(null);

  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = useInventory() as any;
  const [sysRaw,setSysRaw]=useState<any[]|null>(null);
  const [sysLog,setSysLog]=useState<any[]>([]);
  const [sysLoading,setSysLoading]=useState(false);
  const [sysCounts,setSysCounts]=useState<any>({});
  const loadSystem = async () => {
    setSysLoading(true);
    try{
      // sb_inventory is >1000 rows; PostgREST caps each response at 1000, so page.
      const fetchAllInv = async () => {
        const all:any[]=[];
        for(let off=0;off<20000;off+=1000){
          const page=await sb.select("sb_inventory",`select=item_code,name,sku,size,srp,selling_price,unit_cost,status,stock,tab,updated_at&order=item_code.asc&limit=1000&offset=${off}`);
          if(!Array.isArray(page)||!page.length) break;
          all.push(...page);
          if(page.length<1000) break;
        }
        return all;
      };
      const [raw,log,loy,promos,reviews,wl,settings] = await Promise.all([
        fetchAllInv(),
        sb.select("sync_log","select=created_at,synced,total,notes&order=created_at.desc&limit=5"),
        sb.select("sb_loyalty","select=id"), sb.select("sb_promos","select=id"),
        sb.select("sb_reviews","select=id"), sb.select("sb_wishlist_log","select=id"),
        sb.select("sb_settings","select=key"),
      ]);
      setSysRaw(Array.isArray(raw)?raw:[]);
      setSysLog(Array.isArray(log)?log:[]);
      setSysCounts({loyalty:(loy||[]).length,promos:(promos||[]).length,reviews:(reviews||[]).length,
        wishlist:(wl||[]).length,settings:(settings||[]).length});
    }catch(e:any){toast.error("System load failed: "+(e.message||e));}
    finally{setSysLoading(false);}
  };
  useEffect(()=>{ if(section==="system") loadSystem(); },[section]);
  const sysStats = useMemo(()=>{
    const raw = sysRaw||[];
    const isSold=(st:string)=>{const u=(st||"").toUpperCase();return u.includes("SOLD")||u==="MISSING";};
    const hiddenNoPrice = raw.filter(r=>!isSold(r.status)&&!(r.selling_price||r.srp)).length;
    const blankStatus = raw.filter(r=>!(r.status||"").trim()).length;
    const liveList = inventory||[];
    const missingPhoto = liveList.filter((p:any)=>!p.imageUrl).length;
    const coverage = liveList.length?Math.round(((liveList.length-missingPhoto)/liveList.length)*100):0;
    return { totalRows:raw.length, live:liveList.length, missingPhoto, coverage, hiddenNoPrice, blankStatus };
  },[sysRaw,inventory]);
  const backupCSV = () => {
    const raw = sysRaw||[];
    if(!raw.length){toast.error("Load system data first");return;}
    const cols=["item_code","name","sku","size","srp","selling_price","unit_cost","status","stock","tab","updated_at"];
    const esc=(v:any)=>{const t=String(v??"");return /[",\n]/.test(t)?('"'+t.replace(/"/g,'""')+'"'):t;};
    const csv=[cols.join(","),...raw.map((r:any)=>cols.map(c=>esc(r[c])).join(","))].join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`sb_inventory_backup_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success(`Backup downloaded — ${raw.length} rows`);
  };

  const syncInventory = async () => {
    setSyncing(true);
    try {
      // Pull NEW rows from Google Sheets into the DB (existing DB rows are never overwritten)
      const imp = await fetch("/api/import-sheets", { method: "POST" });
      const info = await imp.json().catch(() => ({}));
      const { refreshInventory } = await import("@/hooks/useInventory");
      const result = await refreshInventory();
      refetchInv();
      setSyncing(false);
      if (imp.ok) toast.success(`Imported ${info.imported ?? 0} new from Sheets · ${result.count} products live`);
      else if (imp.status === 429) toast.info("Sheets import ran recently — showing latest DB data");
      else toast.error(info.error || "Import failed");
    } catch(e: any) {
      setSyncing(false);
      toast.error("Sync failed: " + e.message);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try{setSbProducts(await sb.select("sb_products","order=created_at.desc"));}
    catch(e){console.error(e);}
    finally{setLoadingProducts(false);}
  };
  const loadOrders = async () => {
    try{setSbOrders(await sb.select("sb_orders","order=created_at.desc"));}
    catch(e){console.error(e);}
  };

  // Unit costs come ONLY through the authenticated admin channel — the public
  // /api/inventory never carries them (Pia: "unit cost should never be on website").
  const [costMap,setCostMap]=useState<Record<string,number>>({});
  const loadCosts=async()=>{
    try{
      const m:Record<string,number>={};
      for(let off=0;off<20000;off+=1000){
        const page=await sb.select("sb_inventory",`select=item_code,unit_cost&limit=1000&offset=${off}`);
        (page||[]).forEach((r:any)=>{if(r.unit_cost>0)m[r.item_code]=r.unit_cost;});
        if(!Array.isArray(page)||page.length<1000)break;
      }
      setCostMap(m);
    }catch(e){console.error(e);}
  };

  useEffect(()=>{if(isAdmin&&!isStaff){loadProducts();loadOrders();loadCosts();}}, [isAdmin]); // staff: scanner only — no order/product reads

  // Close size dropdown on outside click
  useEffect(()=>{
    const handler = ()=>setExpandedSizeId(null);
    document.addEventListener("click", handler);
    return ()=>document.removeEventListener("click", handler);
  },[]);

  const inventoryGrouped = useMemo(()=>{
    if(!inventory) return [];
    const map = new Map<string,any>();
    inventory.forEach((item: any)=>{
      if(!map.has(item.sku)) map.set(item.sku,{...item,sizes:[item.size],totalStock:item.status==="AVAILABLE"?1:0});
      else{const g=map.get(item.sku);if(item.size&&!g.sizes.includes(item.size))g.sizes.push(item.size);if(item.status==="AVAILABLE")g.totalStock++;}
    });
    return Array.from(map.values());
  },[inventory]);

  const filteredInv = useMemo(()=>{
    const base = Array.isArray(inventory) ? inventory : inventoryGrouped;
    return base.filter((p:any)=>{
      if((p as any).tab==='SCAN') return false; // scanned pairs are the NEW file — they live in Latest Inventory, never in the sheet views
      if(tabFilter!=='all' && (p as any).tab!==tabFilter) return false;
      if(brandFilter!=='All' && ((p as any).brand||'')!==brandFilter) return false;
      if(imageFilter==='has' && !p.imageUrl) return false;
      if(imageFilter==='none' && p.imageUrl) return false;
      if(editedOnly && !p.edited) return false;
      if(!search) return true;
      return p.name?.toLowerCase().includes(search.toLowerCase())||
        p.sku?.toLowerCase().includes(search.toLowerCase())||
        p.itemCode?.toLowerCase().includes(search.toLowerCase())||
        ((p as any).brand||'').toLowerCase().includes(search.toLowerCase());
    });
  },[inventory,inventoryGrouped,search,tabFilter,brandFilter,imageFilter,editedOnly]);

  // Pagination — render one page at a time so toggles/edits don't re-render 880 rows
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  // Reset to first page whenever the filtered set changes
  useEffect(()=>{ setPage(1); },[search,tabFilter,brandFilter,imageFilter,editedOnly]);
  const pageCount = Math.max(1, Math.ceil(filteredInv.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedInv = useMemo(
    ()=> filteredInv.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE),
    [filteredInv, safePage]
  );

  // Brands present in current inventory (for the brand toggle row)
  const brandOptions = useMemo(()=>{
    const base = Array.isArray(inventory) ? inventory : inventoryGrouped;
    const s = new Set<string>();
    base.forEach((p:any)=>{ if(p.brand) s.add(p.brand); });
    return ['All', ...Array.from(s).sort()];
  },[inventory,inventoryGrouped]);

  // Color tokens for navigating the DB (single source of truth for chips + legend)
  const BRAND_COLOR: Record<string,string> = {
    "Nike":"bg-black text-white","Jordan":"bg-red-600 text-white","Adidas":"bg-blue-600 text-white",
    "VEJA":"bg-green-600 text-white","On Running":"bg-gray-700 text-white",
  };

  const filteredProducts = useMemo(()=>
    sbProducts.filter((p:any)=>{
      const matchCat = productCategory==="All" || p.category===productCategory;
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    }),
    [sbProducts, productCategory, search]);

  const [channelFilter,setChannelFilter]=useState<"all"|"website"|"sheet_import">("website");
  const [orderSearch,setOrderSearch]=useState("");
  const [ordersShown,setOrdersShown]=useState(25);
  // Orders 2.0 dashboard layout (table + side panel)
  const [selOrderId,setSelOrderId]=useState<string|null>(null);
  const [ordPage,setOrdPage]=useState(0);
  const [ordPer,setOrdPer]=useState(10);
  const [editOrder,setEditOrder]=useState<any>(null);
  const [delArm,setDelArm]=useState(false);
  // MOP (mode of payment) filter: straight = paid-in-full digital/CC, cod, other = lay away / walk in / COP / blank
  const [mopFilter,setMopFilter]=useState<"all"|"straight"|"cod"|"other">("all");
  const [orderScan,setOrderScan]=useState<any>(null); // per-order receipt scan result
  const [orderLog,setOrderLog]=useState<any[]>([]);   // P1 audit trail for the selected order
  useEffect(()=>{setOrdPage(0);},[orderFilter,channelFilter,orderSearch,mopFilter]);
  useEffect(()=>{setDelArm(false);setOrderScan(null);setOrderLog([]);
    if(!selOrderId) return;
    const o=sbOrders.find(x=>String(x.id)===selOrderId);
    if(!o) return;
    sb.select("sb_order_log",`order_number=eq.${encodeURIComponent(o.order_number)}&order=created_at.desc&limit=15`)
      .then(rows=>setOrderLog(Array.isArray(rows)?rows:[])).catch(()=>{});
  },[selOrderId]);
  useEffect(()=>{setOrdersShown(25);},[orderFilter,channelFilter,orderSearch]);
  const filteredOrders = useMemo(()=>{
    const q=orderSearch.trim().toLowerCase();
    return sbOrders.filter(o=>{
      if(orderFilter!=="all"&&o.status!==orderFilter) return false;
      if(channelFilter!=="all"&&(o.source||"website")!==channelFilter) return false;
      if(mopFilter!=="all"&&mopOf(o)!==mopFilter) return false;
      if(!q) return true;
      const hay=[o.order_number,o.customer_name,o.facebook_name,o.contact_number,o.customer_email,
        o.tracking_reference,o.shipping_address,...(o.items||[]).map((i:any)=>`${i.name} ${i.id} ${i.sku}`)]
        .filter(Boolean).join(" ").toLowerCase();
      return q.split(/\s+/).every(w=>hay.includes(w));
    });
  },[sbOrders,orderFilter,channelFilter,orderSearch,mopFilter]);

  const stats = useMemo(()=>{
    // Raw inventory items (each row = 1 unit in stock)
    const rawItems = Array.isArray(inventory) ? inventory : [];
    // Total Assets = sum of UNIT COST (what you paid) — your actual inventory investment
    const totalAssets = rawItems.reduce((s:number, item:any) =>
      s + (costMap[item.itemCode] || 0), 0);
    // Retail value = sum of selling prices
    const retailValue = rawItems.reduce((s:number, item:any) =>
      s + (item.sellingPrice > 0 ? item.sellingPrice : (item.srp || 0)), 0);
    // Potential profit = retail - cost
    const totalUnits = rawItems.length;
    const srpTotal = rawItems.reduce((s:number, item:any) => s + (item.srp || 0), 0);
    const potentialProfit = retailValue > totalAssets ? retailValue - totalAssets : 0;
    return {
      total: inventoryGrouped.length,
      totalUnits,
      totalAssets,    // unit cost total — your investment
      retailValue,    // selling price total — potential revenue
      srpTotal,
      potentialProfit,
      lowStock: inventoryGrouped.filter(p=>p.totalStock<=1&&p.totalStock>0).length,
      outStock: inventoryGrouped.filter(p=>p.totalStock===0).length,
      totalOrders: sbOrders.length,
      pendingOrders: sbOrders.filter(o=>o.status==="pending").length,
      revenue: sbOrders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+o.total,0),
    };
  },[inventory,inventoryGrouped,sbOrders,costMap]);

  // ── Shoebox intake / Latest Inventory ──
  const [scanBox,setScanBox]=useState(false);
  const [editScan,setEditScan]=useState<any|null>(null);
  const [intakeRows,setIntakeRows]=useState<any[]>([]);
  const [intakeLoading,setIntakeLoading]=useState(false);
  const [intakeSearch,setIntakeSearch]=useState("");
  const [intakeCond,setIntakeCond]=useState("All");
  const [intakeTab,setIntakeTab]=useState<"all"|"today"|"mine"|"unpriced">("all");
  const intakeAll=false; // Latest Inventory is the scan log ONLY — full stock lives in Products & Inventory
  const [intakeShown,setIntakeShown]=useState(50);
  const loadIntake=async()=>{
    setIntakeLoading(true);
    try{
      // Supabase caps each request at 1000 rows — page until done (scan file is past 1,000 pairs)
      const all:any[]=[];
      for(let off=0;off<20000;off+=1000){
        const page=await sb.select("sb_inventory",`select=item_code,name,brand,sku,size,size_eur,size_cm,barcode,srp,selling_price,unit_cost,status,condition,tab,added_by,created_at,notes&order=created_at.desc&limit=1000&offset=${off}`);
        all.push(...page);
        if(!Array.isArray(page)||page.length<1000)break;
      }
      setIntakeRows(all);
    }
    catch(e:any){toast.error("Inventory load failed: "+(e.message||e));}
    finally{setIntakeLoading(false);}
  };
  useEffect(()=>{ if(section==="intake"&&!intakeRows.length) loadIntake(); },[section]); // eslint-disable-line
  const existingCodes=useMemo(()=>new Set(intakeRows.map((r:any)=>normSBCode(String(r.item_code||"")))),[intakeRows]);
  const nextCode=useMemo(()=>{
    let m=0; intakeRows.forEach((r:any)=>{const c=String(r.item_code||"");if(/^\d+$/.test(c))m=Math.max(m,parseInt(c,10));});
    return m?String(m+1).padStart(4,"0"):"0001";
  },[intakeRows]);
  const imgByCode=useMemo(()=>{const m=new Map<string,string>();(inventory||[]).forEach((p:any)=>{if(p.imageUrl)m.set(p.itemCode,p.imageUrl);});return m;},[inventory]);
  const scannedCount=useMemo(()=>intakeRows.filter((r:any)=>r.tab==="SCAN").length,[intakeRows]);
  const isTodayRow=(r:any)=>{const d=new Date(r.created_at||0);const n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate();};
  const filteredIntake=useMemo(()=>intakeRows.filter((r:any)=>{
    if(!intakeAll&&r.tab!=="SCAN")return false; // intake log = scanned pairs only by default
    if(intakeTab==="today"&&!isTodayRow(r))return false;
    if(intakeTab==="mine"&&r.added_by!==getRole())return false;
    if(intakeTab==="unpriced"&&(r.srp||r.selling_price))return false;
    if(intakeCond!=="All"&&(r.condition||"Good")!==intakeCond&&!(intakeCond==="Good"&&(r.condition||"")==="New"))return false;
    if(!intakeSearch)return true;
    const q=intakeSearch.toLowerCase();
    // notes included so corrected/merged identifiers (old SKUs, duplicate links) stay findable
    return [r.item_code,r.name,r.brand,r.sku,r.size,r.size_eur,r.size_cm,r.barcode,r.notes].some(v=>String(v||"").toLowerCase().includes(q));
  }),[intakeRows,intakeSearch,intakeCond,intakeAll,intakeTab]);
  const intakeTabCounts=useMemo(()=>{const s=intakeRows.filter((r:any)=>r.tab==="SCAN");return {
    all:s.length,
    today:s.filter(isTodayRow).length,
    mine:s.filter((r:any)=>r.added_by===getRole()).length,
    unpriced:s.filter((r:any)=>!r.srp&&!r.selling_price).length,
  };},[intakeRows]);
  // Totals over the SCAN file only — what's been scanned so far, never the old sheets
  const scanTotals=useMemo(()=>{
    const s=intakeRows.filter((r:any)=>r.tab==="SCAN");
    const priced=s.filter((r:any)=>r.srp>0);
    const costed=s.filter((r:any)=>r.unit_cost>0);
    return {pairs:s.length, priced:priced.length, costed:costed.length,
      srp:priced.reduce((t:number,r:any)=>t+(Number(r.srp)||0),0)/100,
      cost:costed.reduce((t:number,r:any)=>t+(Number(r.unit_cost)||0),0)/100};
  },[intakeRows]);

  // Click-to-edit for SRP / Sale / Cost right in the scan table (Pia: "let me edit these 3")
  const [cellEdit,setCellEdit]=useState<{code:string;field:"srp"|"selling_price"|"unit_cost";val:string}|null>(null);
  const saveCell=async(ce:{code:string;field:string;val:string}|null)=>{
    if(!ce)return;
    const cents=Math.round(Number(String(ce.val).replace(/[^0-9.]/g,""))||0)*100;
    const row=(intakeRows as any[]).find((r:any)=>r.item_code===ce.code);
    setCellEdit(null);
    if(row&&Number(row[ce.field]||0)===cents)return; // unchanged
    try{
      await sb.update("sb_inventory",`item_code=eq.${encodeURIComponent(ce.code)}`,{[ce.field]:cents,updated_at:new Date().toISOString()});
      setIntakeRows((rows:any[])=>rows.map((r:any)=>r.item_code===ce.code?{...r,[ce.field]:cents}:r));
      toast.success("Saved ₱"+(cents/100).toLocaleString("en-PH"));
    }catch(e){console.error(e);toast.error("Save failed — try again");}
  };
  // rendered as a plain function (not a component) so the input keeps focus across re-renders
  const priceCell=(r:any,field:"srp"|"selling_price"|"unit_cost",cls:string,display:any)=>{
    const ed=cellEdit&&cellEdit.code===r.item_code&&cellEdit.field===field;
    return (
      <td className={cls+" cursor-pointer"} title="Click to edit"
        onClick={()=>{if(!ed)setCellEdit({code:r.item_code,field,val:r[field]?String(Math.round(r[field]/100)):""});}}>
        {ed?<input autoFocus inputMode="numeric"
            className="w-16 px-1 py-0.5 text-xs font-bold border-2 border-[#C9A84C] rounded outline-none bg-white text-[#0d2430]"
            value={cellEdit!.val}
            onChange={e=>setCellEdit({code:r.item_code,field,val:e.target.value})}
            onKeyDown={e=>{const el=e.currentTarget as HTMLInputElement;
              if(e.key==="Enter")el.blur();
              if(e.key==="Escape"){el.dataset.cancel="1";el.blur();}}}
            onBlur={e=>{if((e.currentTarget as HTMLInputElement).dataset.cancel){setCellEdit(null);return;}saveCell(cellEdit);}}/>
          :display}
      </td>
    );
  };
  useEffect(()=>{setIntakeShown(50);},[intakeSearch,intakeCond,intakeAll,intakeTab]);
  const intakeCSV=()=>{
    const cols=["item_code","brand","name","sku","size","size_eur","size_cm","barcode","srp","selling_price","unit_cost","status","condition","created_at"];
    const esc=(v:any)=>{const t=String(v??"");return /[",\n]/.test(t)?('"'+t.replace(/"/g,'""')+'"'):t;};
    const PESO=new Set(["srp","selling_price","unit_cost"]);
    const csv=[cols.join(","),...filteredIntake.map((r:any)=>cols.map(c=>esc(PESO.has(c)?(r[c]||0)/100:r[c])).join(","))].join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`sb_latest_inventory_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  };

  // ── Overview: date range, KPIs, chart, channels, activity ──
  const [createOrder,setCreateOrder]=useState(false);
  const [prepareReq,setPrepareReq]=useState<any>(null); // order-form request being converted
  // Payment-proof verification panel state
  const [proofInfo,setProofInfo]=useState<Record<string,any>>({});
  const [reupFor,setReupFor]=useState<string|null>(null);
  const [reupReason,setReupReason]=useState("");
  const openProof=async(o:any)=>{
    let v=String(o.payment_proof_url||"");
    if(!v) return;
    // Legacy rows stored the full public URL — convert to a bucket path so the
    // signed-URL route keeps working once the bucket is switched to private.
    const legacy=v.match(/\/object\/public\/(payment-proofs\/.+)$/);
    if(legacy) v=legacy[1];
    else if(/^https?:\/\//.test(v)){window.open(v,"_blank","noopener");return;}
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),op:"proof_url",path:v})});
      const out=await r.json().catch(()=>({} as any));
      if(!r.ok||!out.url) throw new Error(out.error||"could not open proof");
      window.open(out.url,"_blank","noopener"); // 10-minute signed URL — private bucket
    }catch(e:any){toast.error(e.message||"Could not open proof");}
  };
  const loadProofInfo=async(o:any)=>{
    try{
      const rows=await sb.select("sb_order_log",`order_number=eq.${encodeURIComponent(o.order_number)}&action=eq.payment_proof_submitted&order=created_at.desc&limit=1&select=new_value,created_at`);
      setProofInfo(p=>({...p,[o.id]:(Array.isArray(rows)&&rows[0])||null}));
    }catch{setProofInfo(p=>({...p,[o.id]:null}));}
  };
  const requestReupload=async(o:any)=>{
    const reason=reupReason.trim();
    if(reason.length<3){toast.error("A reason is required — the customer will see it.");return;}
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),op:"request_reupload",order_number:o.order_number,reason})});
      const out=await r.json().catch(()=>({} as any));
      if(!r.ok) throw new Error(out.error||"request failed");
      toast.success("New proof requested — the customer sees your reason on their invoice page");
      setReupFor(null); setReupReason(""); loadOrders();
    }catch(e:any){toast.error(e.message||"Request failed");}
  };
  const [rangeDays,setRangeDays]=useState<number>(7);
  const DAY=864e5;
  const rangeOrders=useMemo(()=>sbOrders.filter(o=>o.status!=="cancelled"&&(!rangeDays||+new Date(o.created_at)>=Date.now()-rangeDays*DAY)),[sbOrders,rangeDays]);
  const prevOrders=useMemo(()=>{
    if(!rangeDays)return [] as any[];
    const end=Date.now()-rangeDays*DAY,start=end-rangeDays*DAY;
    return sbOrders.filter(o=>{if(o.status==="cancelled")return false;const t=+new Date(o.created_at);return t>=start&&t<end;});
  },[sbOrders,rangeDays]);
  const kpi=useMemo(()=>{
    const sum=(os:any[])=>os.reduce((s,o)=>s+(o.total||0),0);
    const cnt=(os:any[])=>os.reduce((s,o)=>s+((o.items||[]).reduce((a:number,i:any)=>a+(i.qty||1),0)),0);
    const key=(o:any)=>(o.contact_number||o.customer_name||"").trim().toLowerCase();
    const before=new Set(sbOrders.filter(o=>rangeDays&&+new Date(o.created_at)<Date.now()-rangeDays*DAY).map(key));
    const newCust=rangeDays
      ?new Set(rangeOrders.filter(o=>key(o)&&!before.has(key(o))).map(key)).size
      :new Set(sbOrders.map(key).filter(Boolean)).size;
    const delta=(a:number,b:number)=>b>0?Math.round(((a-b)/b)*100):null;
    return {orders:rangeOrders.length,dOrders:delta(rangeOrders.length,prevOrders.length),
      sales:sum(rangeOrders),dSales:delta(sum(rangeOrders),sum(prevOrders)),
      items:cnt(rangeOrders),dItems:delta(cnt(rangeOrders),cnt(prevOrders)),
      newCust,aov:rangeOrders.length?Math.round(sum(rangeOrders)/rangeOrders.length):0};
  },[rangeOrders,prevOrders,sbOrders,rangeDays]);
  const daily=useMemo(()=>{
    const days=rangeDays||90;
    const buckets:number[]=Array(days).fill(0);const labels:string[]=[];
    for(let i=0;i<days;i++) labels.push(new Date(Date.now()-(days-1-i)*DAY).toLocaleDateString("en-PH",{month:"short",day:"numeric"}));
    sbOrders.forEach(o=>{if(o.status==="cancelled")return;
      const idx=days-1-Math.floor((Date.now()-+new Date(o.created_at))/DAY);
      if(idx>=0&&idx<days)buckets[idx]+=o.total||0;});
    return {buckets,labels};
  },[sbOrders,rangeDays]);
  const channelSegs=useMemo(()=>{
    const c={website:0,sheet:0,manual:0};
    rangeOrders.forEach(o=>{const s=o.source||"website";if(s==="sheet_import")c.sheet++;else if(s==="manual")c.manual++;else c.website++;});
    return [
      {label:"Website",value:c.website,color:"#8b7cf6"},
      {label:"FB Form",value:c.sheet,color:"#3b82f6"},
      {label:"Manual",value:c.manual,color:"#9ca3af"},
    ].filter(s=>s.value>0||s.label!=="Manual");
  },[rangeOrders]);
  const activity=useMemo(()=>{
    const ev:any[]=[];
    sbOrders.slice(0,40).forEach(o=>{
      ev.push({t:+new Date(o.created_at),icon:"🛒",text:`New order ${o.order_number}`,
        sub:`${o.source==="sheet_import"?"FB Form":o.source==="manual"?"Manual":"Website"} · ${fmt(o.total)}`});
      if(o.payment_status==="submitted")ev.push({t:+new Date(o.updated_at||o.created_at),icon:"💳",text:`Payment proof — ${o.order_number}`,sub:"awaiting verification"});
      if(o.status==="shipped"&&o.tracking_reference)ev.push({t:+new Date(o.updated_at||o.created_at),icon:"🚚",text:`${o.order_number} shipped`,sub:[o.courier,o.tracking_reference].filter(Boolean).join(" · ")});
    });
    return ev.sort((a,b)=>b.t-a.t).slice(0,7);
  },[sbOrders]);

  // ── Sales & Reports: line-level P&L from cost snapshots ──
  const reportLines=useMemo(()=>{
    const out:any[]=[];
    sbOrders.forEach(o=>{if(o.status==="cancelled")return;
      (o.items||[]).forEach((it:any,idx:number)=>out.push({
        oid:o.id,order:o.order_number,month:String(o.created_at||"").slice(0,7),
        src:o.source||"website",code:String(it.id||"").trim(),name:it.name||"",size:it.size||"",
        qty:it.qty||1,price:it.price||0,cost:typeof it.cost==="number"?it.cost:null,idx,created:o.created_at,
      }));});
    return out;
  },[sbOrders]);
  const repTotals=useMemo(()=>{
    const t={rev:0,cogs:0,costedRev:0,lines:reportLines.length,costed:0};
    reportLines.forEach(l=>{t.rev+=l.price*l.qty;if(l.cost&&l.cost>0){t.cogs+=l.cost*l.qty;t.costedRev+=l.price*l.qty;t.costed++;}});
    return t;
  },[reportLines]);
  const monthly=useMemo(()=>{
    const m=new Map<string,any>();
    reportLines.forEach(l=>{
      const r=m.get(l.month)||{month:l.month,orders:new Set<string>(),rev:0,cogs:0,costedRev:0,lines:0,costed:0};
      r.orders.add(l.order);r.rev+=l.price*l.qty;r.lines++;
      if(l.cost&&l.cost>0){r.cogs+=l.cost*l.qty;r.costedRev+=l.price*l.qty;r.costed++;}
      m.set(l.month,r);});
    return Array.from(m.values()).sort((a,b)=>b.month.localeCompare(a.month));
  },[reportLines]);
  const bySrc=useMemo(()=>{
    const m=new Map<string,any>();
    reportLines.forEach(l=>{
      const k=l.src==="sheet_import"?"FB Form":l.src==="manual"?"Manual":"Website";
      const r=m.get(k)||{src:k,rev:0,cogs:0,costedRev:0,lines:0,costed:0};
      r.rev+=l.price*l.qty;r.lines++;
      if(l.cost&&l.cost>0){r.cogs+=l.cost*l.qty;r.costedRev+=l.price*l.qty;r.costed++;}
      m.set(k,r);});
    return Array.from(m.values()).sort((a,b)=>b.rev-a.rev);
  },[reportLines]);
  const missingCost=useMemo(()=>reportLines.filter(l=>!(l.cost&&l.cost>0)).sort((a,b)=>+new Date(b.created)-+new Date(a.created)),[reportLines]);
  const [costDraft,setCostDraft]=useState<Record<string,string>>({});
  const [missingShown,setMissingShown]=useState(20);
  const saveLineCost=async(l:any)=>{
    const pesos=costDraft[`${l.oid}:${l.idx}`];
    const v=Math.round(parseFloat(pesos||"")*100);
    if(!v||v<=0){toast.error("Enter a valid cost in pesos");return;}
    const o=sbOrders.find(x=>x.id===l.oid);if(!o)return;
    const items=[...(o.items||[])];
    items[l.idx]={...items[l.idx],cost:v,cost_source:"manual"};
    try{
      await sb.update("sb_orders",`id=eq.${l.oid}`,{items,updated_at:new Date().toISOString()});
      toast.success(`Cost saved — ${l.order}`);
      setCostDraft(d=>{const n={...d};delete n[`${l.oid}:${l.idx}`];return n;});
      loadOrders();
    }catch(e:any){toast.error("Save failed: "+(e.message||e));}
  };
  const pct=(num:number,den:number)=>den>0?Math.round(num/den*100):0;

  const [uploadingRow,setUploadingRow]=useState<string|null>(null);
  const uploadPhoto = async (p:any, file:File) => {
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){toast.error("JPEG/PNG/WebP only");return;}
    if(file.size>5*1024*1024){toast.error("Max 5MB");return;}
    setUploadingRow(p.itemCode);
    try{
      const base64:string = await new Promise((ok,err)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=()=>err(new Error("read failed"));r.readAsDataURL(file);});
      
      const res = await fetch("/api/upload-image",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),item_code:p.itemCode,sku:p.sku||"",content_type:file.type,base64})});
      const out = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(out.error||"upload failed");
      toast.success("Photo linked to "+p.itemCode);
      const {refreshInventory} = await import("@/hooks/useInventory");
      await refreshInventory(); refetchInv();
    }catch(e:any){toast.error(e.message||"Upload failed");}
    finally{setUploadingRow(null);}
  };

  const INV_STATUSES=["Available","Reserved","Sold","Returned","Damaged","Archived"];
  const canonStatus=(s:string)=>INV_STATUSES.find(x=>x.toUpperCase()===(s||"").toUpperCase().trim())||"Available";
  const startEdit = (p:any) => { setEditingRow(p.itemCode); setEditValues({name:p.name,sku:p.sku,size:p.size,srp:Math.round((p.srp||0)/100),selling_price:Math.round((p.sellingPrice||0)/100),unit_cost:Math.round((costMap[p.itemCode]||0)/100),stock:p.stock??1,status:canonStatus(p.status)}); };
  const cancelEdit = () => { setEditingRow(null); setEditValues({}); };
  const saveEdit = async (itemCode:string) => {
    setSavingRow(itemCode);
    try {
      const payload = {item_code:itemCode,name:editValues.name,sku:editValues.sku,size:editValues.size,
        srp:Math.round(Number(editValues.srp)*100),selling_price:Math.round(Number(editValues.selling_price)*100),
        unit_cost:Math.round(Number(editValues.unit_cost)||0)*100,
        stock:Number(editValues.stock),status:editValues.status||"Available",updated_at:new Date().toISOString()};
      await sb.upsert('sb_inventory','on_conflict=item_code',payload);
      toast.success('Saved!');
      setEditingRow(null); setEditValues({});
      loadCosts(); // keep the admin cost map in step — costs never ride the public API
      const {refreshInventory} = await import('@/hooks/useInventory');
      await refreshInventory(); refetchInv();
    } catch(e:any){toast.error('Save failed');}
    finally{setSavingRow(null);}
  };
  const resetEdit = async (itemCode:string) => {
    if(!confirm('Reset to Google Sheets data?')) return;
    try { await sb.delete('sb_inventory',`item_code=eq.${itemCode}`); toast.success('Reset to Sheets'); }
    catch(e:any){ toast.error('Reset failed'); return; }
    const {refreshInventory} = await import('@/hooks/useInventory');
    await refreshInventory(); refetchInv();
  };
  const deleteProduct = async (id:string) => {
    if(!confirm("Delete this product?")) return;
    await sb.delete("sb_products",`id=eq.${id}`);
    toast.success("Deleted"); loadProducts();
  };
  const updateOrderStatus = async (id:string,status:string) => {
    await sb.update("sb_orders",`id=eq.${id}`,{status,updated_at:new Date().toISOString()});
    toast.success("Order updated"); loadOrders(); refetchInv();
    if(status==="shipped"){ const o=sbOrders.find(x=>String(x.id)===String(id)); if(o) sendShippedEmail(o); }
  };
  const [shipEdit,setShipEdit]=useState<Record<string,{courier?:string;tracking_reference?:string}>>({});
  const saveFulfillment = async (o:any) => {
    const e = shipEdit[o.id]||{};
    const payload:any = {
      courier:(e.courier??o.courier)||null,
      tracking_reference:(e.tracking_reference??o.tracking_reference)||null,
      updated_at:new Date().toISOString(),
    };
    try{
      await sb.update("sb_orders",`id=eq.${o.id}`,payload);
      toast.success("Fulfillment saved");
      setShipEdit(prev=>{const n={...prev}; delete n[o.id]; return n;});
      loadOrders();
    }catch(err:any){toast.error("Save failed: "+(err.message||err));}
  };
  const [invBusy,setInvBusy]=useState<string|null>(null);
  const generateInvoice = async (o:any, regenerate=false) => {
    if(regenerate && !confirm("Create a new invoice for "+o.order_number+"? The link on the order (and column O in the sheet) will point to the new one.")) return;
    setInvBusy(o.id);
    try{
      
      const r=await fetch("/api/generate-invoice",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),order_number:o.order_number})});
      const out=await r.json().catch(()=>({} as any));
      if(!r.ok) throw new Error(out.error||"Invoice generation failed");
      toast.success(regenerate?"New invoice created — link updated":"Invoice created — link saved on the order");
      loadOrders();
    }catch(e:any){toast.error(e.message||"Invoice generation failed");}
    finally{setInvBusy(null);}
  };
  const [sendBusy,setSendBusy]=useState<string|null>(null);
  const sendInvoice = async (o:any, resend=false) => {
    if(!o.customer_email){toast.error("No email on this order — add it first");return;}
    if(resend && !confirm("Email the invoice to "+o.customer_email+" again?")) return;
    setSendBusy(o.id);
    try{
      
      const r=await fetch("/api/send-invoice",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),order_number:o.order_number})});
      const out=await r.json().catch(()=>({} as any));
      if(!r.ok) throw new Error(out.error||"Send failed");
      toast.success("Invoice emailed to "+(out.email||o.customer_email));
      loadOrders();
    }catch(e:any){toast.error(e.message||"Send failed");}
    finally{setSendBusy(null);}
  };
  const [receiptScan,setReceiptScan]=useState<any>(null);
  const [receiptBusy,setReceiptBusy]=useState(false);
  const scanReceipt = async (file:File) => {
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){toast.error("JPEG/PNG/WebP only");return;}
    if(file.size>5*1024*1024){toast.error("Max 5MB");return;}
    setReceiptBusy(true); setReceiptScan(null);
    try{
      const base64:string = await new Promise((ok,err)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=()=>err(new Error("read failed"));r.readAsDataURL(file);});
      
      const res=await fetch("/api/parse-shipping-receipt",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),fileBase64:base64,mimeType:file.type})});
      const out=await res.json().catch(()=>({} as any));
      if(!res.ok) throw new Error(out.error||"Scan failed");
      setReceiptScan({...out, chosen: out.match?.order_number || out.candidates?.[0]?.order_number || ""});
      if(!out.text_found) toast.info("Couldn't read much text — try a sharper photo");
    }catch(e:any){toast.error(e.message||"Scan failed");}
    finally{setReceiptBusy(false);}
  };
  const confirmReceipt = async () => {
    const rs=receiptScan; if(!rs?.chosen){toast.error("Pick an order first");return;}
    if(!rs.tracking && !confirm("No tracking number was detected — save courier and receipt anyway?")) return;
    try{
      await sb.update("sb_orders",`order_number=eq.${encodeURIComponent(rs.chosen)}`,{
        courier: rs.courier||null, tracking_reference: rs.tracking||null,
        shipping_receipt_url: rs.receipt_url||null,
        status: "shipped", updated_at: new Date().toISOString(),
      });
      toast.success(`Saved to ${rs.chosen} — marked shipped`);
      setReceiptScan(null); loadOrders();
    }catch(e:any){toast.error("Save failed: "+(e.message||e));}
  };
  // Orders 2.0: per-order receipt scan — attaches straight to the selected order,
  // no matching step; courier & tracking prefill the inputs below.
  const scanForOrder = async (o:any, file:File) => {
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){toast.error("JPEG/PNG/WebP only");return;}
    if(file.size>5*1024*1024){toast.error("Max 5MB");return;}
    setReceiptBusy(true);
    try{
      const base64:string = await new Promise((ok,err)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=()=>err(new Error("read failed"));r.readAsDataURL(file);});
      
      const res=await fetch("/api/parse-shipping-receipt",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),fileBase64:base64,mimeType:file.type})});
      const out=await res.json().catch(()=>({} as any));
      if(!res.ok) throw new Error(out.error||"Scan failed");
      setOrderScan({forId:String(o.id),courier:out.courier||"",tracking:out.tracking||"",receipt_url:out.receipt_url||"",ts:Date.now()});
      setShipEdit(prev=>({...prev,[o.id]:{
        courier: out.courier || prev[o.id]?.courier || o.courier || "",
        tracking_reference: out.tracking || prev[o.id]?.tracking_reference || o.tracking_reference || "",
      }}));
      if(!out.tracking) toast.info("No tracking number detected — type it in, the receipt photo is still saved");
    }catch(e:any){toast.error(e.message||"Scan failed");}
    finally{setReceiptBusy(false);}
  };
  // best-effort: email the customer their tracking when an order ships
  // (gated server-side on the GAS email patch, same as the other emails)
  const sendShippedEmail = async (o:any) => {
    if(!o?.customer_email) return;
    try{
      const r=await fetch("/api/send-order-email",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...adminCred(),order_number:o.order_number,type:"shipped"})});
      if(r.ok) toast.success("Tracking emailed to "+o.customer_email);
    }catch{}
  };
  const saveShipAndMarkShipped = async (o:any) => {
    const se=shipEdit[o.id]||{};
    const courier=(se.courier??o.courier??"").trim();
    const track=(se.tracking_reference??o.tracking_reference??"").trim();
    const payload:any={courier:courier||null,tracking_reference:track||null,status:"shipped",updated_at:new Date().toISOString()};
    if(orderScan&&orderScan.forId===String(o.id)&&orderScan.receipt_url) payload.shipping_receipt_url=orderScan.receipt_url;
    try{
      await sb.update("sb_orders",`id=eq.${o.id}`,payload);
      toast.success(`${o.order_number} — tracking saved, marked shipped`);
      setOrderScan(null); loadOrders();
      sendShippedEmail({...o,courier,tracking_reference:track});
    }catch(e:any){toast.error("Save failed: "+(e?.message||String(e)).slice(0,120));}
  };

  // Orders 2.0: full-order edit + delete (delete cancels first so stock restocks,
  // then tombstones the order number so the hourly sheet import can't resurrect it)
  const saveOrderEdit = async (id:string, payload:any) => {
    try{
      await sb.update("sb_orders",`id=eq.${id}`,{...payload,updated_at:new Date().toISOString()});
      toast.success("Order updated"); setEditOrder(null); loadOrders();
    }catch(e:any){ toast.error("Save failed: "+(e?.message||String(e)).slice(0,120)); }
  };
  const deleteOrder = async (o:any) => {
    try{
      // Cancel-first (restocks pairs) is for WEBSITE orders only: FB sheet orders
      // never decremented stock, so restocking them would corrupt inventory.
      const isWebsite=(o.source||"website")==="website";
      if(o.status!=="cancelled"&&isWebsite)
        await sb.update("sb_orders",`id=eq.${o.id}`,{status:"cancelled",updated_at:new Date().toISOString()});
      try{ await sb.insert("sb_deleted_orders",{order_number:o.order_number}); }catch{/* dup tombstone is fine */}
      await sb.delete("sb_orders",`id=eq.${o.id}`);
      toast.success(`${o.order_number} deleted${o.status!=="cancelled"?" — stock restocked":""}`);
      setSelOrderId(null); setDelArm(false); loadOrders(); refetchInv();
    }catch(e:any){ toast.error("Delete failed: "+(e?.message||String(e)).slice(0,120)); }
  };

  const setPaymentStatus = async (o:any, ps:string) => {
    try{
      // Duplicate-verification guard: VERIFY only lands on a payment that is
      // actually awaiting review — a second click (or a second admin) no-ops.
      const q = ps==="verified" ? `id=eq.${o.id}&payment_status=eq.submitted` : `id=eq.${o.id}`;
      const rows = await sb.update("sb_orders",q,{payment_status:ps,updated_at:new Date().toISOString()});
      if(ps==="verified"&&(!Array.isArray(rows)||!rows.length)){
        toast.error("Nothing to confirm — no proof awaiting review (maybe already verified)."); loadOrders(); return;
      }
      toast.success("Payment "+ps); loadOrders();
      // Order + payment confirmed → the confirmation email goes out by itself
      // (Nike/Adidas-style). Skips quietly if there's no email or already sent.
      if(ps==="verified" && o.customer_email && !o.invoice_sent_at){
        try{
          if(!o.invoice_url) await generateInvoice(o);
          
          // branded "payment confirmed" email (photos + totals), logged in sb_email_log
          let r=await fetch("/api/send-order-email",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({...adminCred(),order_number:o.order_number,type:"payment_verified"})});
          if(!r.ok){ // fall back to the legacy invoice email until the GAS patch lands
            r=await fetch("/api/send-invoice",{method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({...adminCred(),order_number:o.order_number})});
          }
          if(r.ok){toast.success("Confirmation emailed to "+o.customer_email);loadOrders();}
          else{const out=await r.json().catch(()=>({} as any));toast.error("Auto-email failed: "+(out.error||"—")+" — use 📧 Send invoice");}
        }catch{toast.error("Auto-email failed — use 📧 Send invoice");}
      }
    }catch(err:any){toast.error("Save failed: "+(err.message||err));}
  };

  const NAV = [
    {id:"overview" as Section, icon:LayoutDashboard, label:"Dashboard"},
    {id:"orders"    as Section, icon:ShoppingCart,   label:"Orders"},
    {id:"customers" as Section, icon:Users,          label:"Customers"},
    {id:"products"  as Section, icon:Package,        label:"Products & Inventory"},
    {id:"intake"    as Section, icon:QrCode,         label:"Latest Inventory"},
    {id:"reports"   as Section, icon:TrendingUp,     label:"Sales & Reports"},
    {id:"promos"    as Section, icon:Tag,            label:"Vouchers & Promos"},
    {id:"campaign"  as Section, icon:Tag,            label:"Shoe Cleaner Campaign"},
    {id:"analytics" as Section, icon:BarChart3,      label:"Analytics"},
    {id:"system"    as Section, icon:Database,       label:"System"},
    {id:"settings"  as Section, icon:Settings,       label:"Settings"},
  ];

  // ─── Login ──────────────────────────────────────────────────────────────
  if (!isAdmin) return (
    <div className="min-h-screen bg-[#050f12] flex items-center justify-center px-4" style={{fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-[#C9A84C]"/>
          </div>
          <div className="font-black text-2xl tracking-[.14em] text-white uppercase mb-1">SoleBlessing</div>
          <div className="text-xs text-white/30 tracking-widest uppercase">Admin Access</div>
        </div>
        <form onSubmit={async e=>{
          e.preventDefault();
          const ok = await sb.authenticate(password);
          if(ok){localStorage.setItem(ADMIN_KEY,"true");window.location.reload();}
          else setLoginError("Wrong password. Try again.");
        }} className="space-y-4">
          <div>
            <label className="text-xs font-semibold tracking-[.1em] uppercase text-white/40 block mb-2">Admin Password</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setLoginError("");}}
              placeholder="Enter admin password" autoFocus
              className="w-full bg-white/[.06] border border-white/[.1] px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] transition-colors rounded placeholder-white/20"/>
            {loginError&&<p className="text-red-400 text-xs mt-2">{loginError}</p>}
          </div>
          <button type="submit" disabled={!password}
            className="w-full bg-[#C9A84C] text-[#050f12] font-bold tracking-[.12em] uppercase py-3 text-sm hover:opacity-90 disabled:opacity-40 rounded">
            Enter Dashboard
          </button>
        </form>
        <p className="text-center text-[10px] text-white/20 mt-6 leading-relaxed">
          Set password: Vercel → Environment Variables → <span className="font-mono text-white/35">ADMIN_PASSWORD</span>
        </p>
      </div>
    </div>
  );

  // ─── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F4EF] flex" style={{fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
      {qrModal?.open && <QRModal itemCode={qrModal.itemCode} name={qrModal.name} onClose={()=>setQrModal(null)}/>}
      {productModal.open&&<ProductModal product={productModal.product} onClose={()=>setProductModal({open:false})} onSave={()=>{setProductModal({open:false});loadProducts();}}/>}
      {createOrder&&<CreateOrderModal inventory={inventory||[]} costMap={costMap}
        prefill={prepareReq?{requestRef:prepareReq.request_ref,pm:prepareReq.payment_method,
          cust:{name:prepareReq.receiver_name||"",fbName:prepareReq.fb_ig_name||"",contact:prepareReq.contact_number||"",
            email:prepareReq.email||"",address:prepareReq.address||"",region:prepareReq.region||"",city:prepareReq.city||"",
            notes:prepareReq.special_request||""}}:null}
        onClose={()=>{setCreateOrder(false);setPrepareReq(null);}}
        onPlaced={()=>{loadOrders();refetchInv();refreshInventory().catch(()=>{});}}/>}
      {editOrder&&<OrderEditModal order={editOrder} onClose={()=>setEditOrder(null)} onSave={saveOrderEdit}/>}
      {scanBox&&<ScanBoxModal existingCodes={existingCodes} allRows={intakeRows} nextCode={nextCode}
        onClose={()=>setScanBox(false)}
        onSaved={()=>{loadIntake();refetchInv();refreshInventory().catch(()=>{});}}/>}
      {editScan&&<ScanEditModal row={editScan} onClose={()=>setEditScan(null)}
        onSaved={()=>{setEditScan(null);loadIntake();}}/>}

      {/* Sidebar — staff admins get a top-bar-only phone layout (single screen, no nav needed) */}
      {!isStaff&&<aside className={`${sidebarOpen?"w-56":"w-14"} flex-shrink-0 bg-[#050f12] flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-y-auto hidden sm:flex`}>
        <div className="px-4 py-4 flex items-center gap-3 border-b border-white/[.06]">
          <img src="/logo-soleblessing.png" alt="SoleBlessing" className="h-9 w-9 object-contain flex-shrink-0"
            onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
          {sidebarOpen&&<div className="leading-tight">
            <div className="font-black text-sm tracking-[.08em] text-white uppercase">SoleBlessing</div>
            <div className="text-[8px] tracking-[.22em] text-white/30 uppercase">Sneakers · Fashion · Lifestyle</div>
          </div>}
        </div>
        <nav className="flex-1 py-4 px-2">
          {NAV.filter(n=>!isStaff||n.id==="intake").map(n=>(
            <button key={n.id} onClick={()=>setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${section===n.id?"bg-[#C9A84C]/20 text-[#C9A84C]":"text-white/40 hover:text-white hover:bg-white/[.06]"}`}>
              <n.icon className="h-4 w-4 flex-shrink-0"/>
              {sidebarOpen&&<span className="text-xs font-medium tracking-wide">{n.label}</span>}
              {n.id==="promos"&&sidebarOpen&&<span className="ml-auto text-[9px] bg-[#C9A84C]/20 text-[#C9A84C] px-1.5 py-0.5 rounded">NEW</span>}
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
      </aside>}

      {/* Main */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-3 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-10 flex-wrap">
          {section==="overview"?(
            <div className="leading-tight">
              <h1 className="text-lg font-black text-[#0d2430] tracking-tight">
                {(()=>{const h=new Date().getHours();return h<12?"Good Morning!":h<18?"Good Afternoon!":"Good Evening!";})()}
              </h1>
              <p className="text-[11px] text-gray-400">SoleBlessing Operations Dashboard</p>
            </div>
          ):(
          <h1 className="text-lg font-black text-[#0d2430] tracking-tight capitalize">
            {section==="campaign"?"Shoe Cleaner Campaign":section==="promos"?"Vouchers & Promos":section==="reports"?"Sales & Reports":section==="intake"?"Latest Inventory":section==="analytics"?"Analytics":section==="system"?"System":section.charAt(0).toUpperCase()+section.slice(1)}
          </h1>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white" style={{background:getRoleColor()}}>{ROLE}</span>
            {!isStaff&&<button onClick={()=>setCreateOrder(true)}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-bold rounded-lg hover:opacity-90">
              <Plus className="h-3.5 w-3.5"/> Create Order
            </button>}
            {section==="products"&&(
              <button onClick={()=>setProductModal({open:true})}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-bold rounded-lg hover:opacity-90">
                <Plus className="h-3.5 w-3.5"/> Add Product
              </button>
            )}
            {!isStaff&&<button onClick={()=>{syncInventory();}} disabled={syncing}
              className="hidden sm:flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`}/> Sync Sheets
            </button>}
            {!isStaff&&<button onClick={()=>setLocation("/upload-payment")}
              className="hidden sm:flex items-center gap-2 border border-gray-200 text-[#0d2430] px-4 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
              <Zap className="h-3.5 w-3.5"/> Payment Portal
            </button>}
          </div>
        </div>

        {/* Mobile nav — the sidebar is hidden on phones */}
        {!isStaff&&(
          <div className="sm:hidden bg-[#050f12] px-2 py-2 flex gap-1 overflow-x-auto sticky top-[57px] z-10">
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setSection(n.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${section===n.id?"bg-[#C9A84C]/20 text-[#C9A84C]":"text-white/50"}`}>
                <n.icon className="h-3.5 w-3.5"/>{n.label}
              </button>
            ))}
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap text-white/40 ml-auto flex-shrink-0">
              <LogOut className="h-3.5 w-3.5"/>
            </button>
          </div>
        )}
        {isStaff&&(
          <div className="bg-[#050f12] px-3 py-2.5 flex items-center justify-between sticky top-[57px] z-10">
            <div className="flex items-center gap-2">
              <img src="/logo-soleblessing.png" alt="" className="h-6 w-6 object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
              <span className="text-white font-black text-xs tracking-wider uppercase">SoleBlessing · Scanner</span>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 text-white/50 text-[11px] font-bold">
              <LogOut className="h-3.5 w-3.5"/> Log out
            </button>
          </div>
        )}

        <div className="p-3 sm:p-8">

          {/* ── OVERVIEW ── */}
          {section==="overview"&&(
            <div className="space-y-6">
              {/* Date range */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-1.5">
                  {[{d:7,l:"Last 7 days"},{d:30,l:"30 days"},{d:90,l:"90 days"},{d:0,l:"All time"}].map(r=>(
                    <button key={r.d} onClick={()=>setRangeDays(r.d)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${rangeDays===r.d?"bg-[#0d2430] text-white border-[#0d2430]":"bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                      {r.l}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-gray-400">vs the previous {rangeDays||"—"} days</span>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  {label:"Total Orders", value:String(kpi.orders), d:kpi.dOrders, icon:ShoppingCart, color:"text-purple-600", bg:"bg-purple-50"},
                  {label:"Total Sales",  value:fmt(kpi.sales),     d:kpi.dSales,  icon:TrendingUp,   color:"text-green-600",  bg:"bg-green-50"},
                  {label:"Items Sold",   value:String(kpi.items),  d:kpi.dItems,  icon:Package,      color:"text-blue-600",   bg:"bg-blue-50"},
                  {label:"New Customers",value:String(kpi.newCust),d:null,        icon:Tag,          color:"text-indigo-600", bg:"bg-indigo-50"},
                  {label:"Avg Order Value",value:fmt(kpi.aov),     d:null,        icon:BarChart3,    color:"text-amber-600",  bg:"bg-amber-50"},
                ].map(s=>(
                  <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                      <s.icon className={`h-4 w-4 ${s.color}`}/>
                    </div>
                    <div className="text-xl font-black text-[#0d2430] mb-0.5 truncate">{s.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
                    {s.d!=null&&<div className={`text-[10px] font-bold mt-1 ${s.d>=0?"text-green-600":"text-red-500"}`}>{s.d>=0?"↑":"↓"} {Math.abs(s.d)}% vs prev</div>}
                  </div>
                ))}
              </div>

              {/* Sales chart + channel donut */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">📈 Sales Overview</h2>
                    <span className="text-[10px] text-gray-400">{rangeDays?`last ${rangeDays} days`:"last 90 days"} · daily revenue</span>
                  </div>
                  <AreaChart data={daily.buckets} labels={daily.labels}/>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">Orders by Channel</h2>
                  <Donut segs={channelSegs}/>
                </div>
              </div>

              {/* Recent orders + quick actions / low stock */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">🧾 Recent Orders</h2>
                    <button onClick={()=>setSection("orders")} className="text-xs text-[#C9A84C] font-semibold">View All Orders →</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-[10px] uppercase tracking-wider text-gray-400 text-left">
                      <th className="py-2 font-semibold">Order #</th><th className="font-semibold">Channel</th>
                      <th className="font-semibold">Customer</th><th className="font-semibold text-right">Amount</th>
                      <th className="font-semibold text-right">Status</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {sbOrders.slice(0,6).map(o=>(
                        <tr key={o.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={()=>setSection("orders")}>
                          <td className="py-2.5 font-bold text-[#0d2430] text-xs">{o.order_number}</td>
                          <td><span className="text-[10px] font-bold">{(o.source||"website")==="sheet_import"?"📋 FB Form":(o.source==="manual"?"✍️ Manual":"🌐 Website")}</span></td>
                          <td className="text-xs text-gray-500">{o.customer_name}</td>
                          <td className="text-right font-black text-[#0d2430] text-xs">{fmt(o.total)}</td>
                          <td className="text-right"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status]||"bg-gray-100 text-gray-600"}`}>{o.status}</span></td>
                        </tr>
                      ))}
                      {sbOrders.length===0&&<tr><td colSpan={5} className="py-6 text-center text-sm text-gray-400">No orders yet</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-6">
                  <div className="bg-[#050f12] rounded-xl p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">⚡ Quick Actions</h3>
                    <div className="space-y-2">
                      {[
                        {label:"➕ Create Order (Manual)",fn:()=>setCreateOrder(true)},
                        {label:"📦 Add / Update Product",fn:()=>{setSection("products");setProductModal({open:true});}},
                        {label:"🏷️ Create Promo / Voucher",fn:()=>setSection("promos")},
                        {label:"🗃️ Manage Inventory",fn:()=>setSection("products")},
                        {label:"🧾 Generate / Send Invoice",fn:()=>setSection("orders")},
                        {label:"📄 Scan Courier Receipt",fn:()=>setSection("orders")},
                      ].map(a=>(
                        <button key={a.label} onClick={a.fn}
                          className="w-full text-left bg-white/[.06] border border-white/[.08] rounded-lg px-3.5 py-2.5 text-xs text-white/80 font-semibold hover:bg-white/[.12] transition-colors">
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">⚠️ Low Stock</h3>
                      <button onClick={()=>setSection("products")} className="text-[10px] text-[#C9A84C] font-semibold">View →</button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {inventoryGrouped.filter(p=>p.totalStock<=1).slice(0,5).map(p=>(
                        <div key={p.sku} className="py-2 flex items-center justify-between gap-2">
                          <div className="text-xs font-medium text-[#0d2430] leading-tight truncate">{p.name}</div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${p.totalStock===0?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                            {p.totalStock===0?"Out":"Last pair"}
                          </span>
                        </div>
                      ))}
                      {inventoryGrouped.filter(p=>p.totalStock<=1).length===0&&<div className="py-4 text-center text-xs text-gray-400">All stocked ✓</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory investment strip */}
              <div className="bg-[#050f12] rounded-xl px-6 py-4 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C]">Inventory Investment</p>
                  <p className="text-2xl font-black text-white">{stats.totalAssets>0?fmt(stats.totalAssets):"—"} <span className="text-xs font-medium text-white/40">· {stats.totalUnits} pairs · {stats.total} models</span></p>
                </div>
                <div className="flex gap-8 text-right">
                  <div><p className="text-[10px] text-white/30 uppercase tracking-wider">Retail Value</p><p className="text-base font-bold text-white/80">{fmt(stats.retailValue)}</p></div>
                  {stats.potentialProfit>0&&<div><p className="text-[10px] text-white/30 uppercase tracking-wider">Potential Profit</p><p className="text-base font-bold text-[#C9A84C]">{fmt(stats.potentialProfit)}</p></div>}
                  <button onClick={()=>setSection("reports")} className="self-center bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-bold rounded-lg hover:opacity-90">Sales Report →</button>
                </div>
              </div>

              {/* Operations hub + activity */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">🧰 Operations Hub</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {icon:"📦",label:"Inventory",sub:"Stock, photos, QR codes",fn:()=>setSection("products")},
                      {icon:"🧾",label:"Invoices",sub:"Generate & change invoices",fn:()=>setSection("orders")},
                      {icon:"🚚",label:"Fulfillment",sub:"Courier, tracking, receipts",fn:()=>setSection("orders")},
                      {icon:"📊",label:"Reports",sub:"Sales, profit, margins",fn:()=>setSection("reports")},
                      {icon:"💳",label:"Payments",sub:"Verify payment proofs",fn:()=>setSection("orders")},
                      {icon:"⚙️",label:"Settings",sub:"Store, shipping & more",fn:()=>setSection("settings")},
                    ].map(h=>(
                      <button key={h.label} onClick={h.fn}
                        className="text-left border border-gray-100 rounded-xl p-4 hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/[.04] transition-colors">
                        <div className="text-xl mb-1.5">{h.icon}</div>
                        <div className="text-xs font-bold text-[#0d2430]">{h.label}</div>
                        <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{h.sub}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                    {[
                      {label:"📊 Inventory Sheet",href:"https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit"},
                      {label:"📋 SB ORDER Sheet",href:"https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit"},
                      {label:"💾 Payment Proofs",href:"https://drive.google.com/drive/folders/1MMLgawQE5KKQQqufa2Leoka5zdXV6qIY"},
                      {label:"🗄️ Supabase",href:"https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp"},
                      {label:"▲ Vercel",href:"https://vercel.com/maldipias-projects/soleblessing-ecommerce"},
                    ].map(l=>(
                      <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-gray-400 border border-gray-200 rounded-full px-3 py-1 hover:text-[#0d2430] hover:border-gray-300">{l.label}</a>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-3">🕐 Recent Activity</h3>
                  <div className="divide-y divide-gray-50">
                    {activity.map((a,i)=>(
                      <div key={i} className="py-2.5 flex items-start gap-2.5">
                        <span className="text-base leading-none mt-0.5">{a.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#0d2430] truncate">{a.text}</div>
                          <div className="text-[10px] text-gray-400">{a.sub} · {new Date(a.t).toLocaleDateString("en-PH",{month:"short",day:"numeric"})}</div>
                        </div>
                      </div>
                    ))}
                    {activity.length===0&&<div className="py-4 text-center text-xs text-gray-400">No activity yet</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTS (unified: Sheets + Custom) ── */}
          {section==="products"&&(
            <div className="space-y-6">

              {/* ── TOP BAR ── */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                  <input placeholder="Search name, SKU, item code…" value={search} onChange={e=>setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-[#0d2430]"/>
                </div>
                <span className="text-xs text-gray-400">{filteredInv.length} items</span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {(['all','2025','2024'] as const).map(t=>(
                    <button key={t} onClick={()=>setTabFilter(t)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${tabFilter===t?'bg-white text-[#0d2430] shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                      {t==='all'?'Year: All':t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {([['all','Img: All'],['has','Has'],['none','Missing']] as const).map(([v,label])=>(
                    <button key={v} onClick={()=>setImageFilter(v)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${imageFilter===v?(v==='none'?'bg-red-500 text-white shadow-sm':'bg-white text-[#0d2430] shadow-sm'):'text-gray-500 hover:text-gray-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setEditedOnly(v=>!v)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${editedOnly?'bg-[#C9A84C] text-[#050f12] border-[#C9A84C]':'bg-white text-gray-500 border-gray-200 hover:text-gray-700'}`}>
                  ● Edited
                </button>
                <button onClick={()=>setShowLegend(v=>!v)} title="Color legend"
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showLegend?'bg-[#0d2430] text-white border-[#0d2430]':'bg-white text-gray-500 border-gray-200 hover:text-gray-700'}`}>
                  🎨 Legend
                </button>
                <button onClick={()=>syncInventory()} disabled={syncing}
                  className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`}/> Sync Sheets
                </button>
                <a href="https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit?gid=631652219"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-3 py-2 text-xs font-semibold rounded-xl hover:opacity-90">
                  <ExternalLink className="h-3.5 w-3.5"/> Edit in Sheets
                </a>
              </div>

              {/* ── BRAND TOGGLES ── */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {brandOptions.map(b=>(
                  <button key={b} onClick={()=>setBrandFilter(b)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                      brandFilter===b
                        ? (BRAND_COLOR[b]||'bg-[#0d2430] text-white')+' border-transparent shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                    {b}
                  </button>
                ))}
              </div>

              {/* ── COLOR LEGEND (toggle) ── */}
              {showLegend&&(
                <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-x-6 gap-y-2 flex-wrap text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">Legend</span>
                  <span className="flex items-center gap-1.5"><span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">2025</span> current year</span>
                  <span className="flex items-center gap-1.5"><span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">2024</span> prior year</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded border-l-2 border-[#C9A84C] bg-[#fffbeb]"/> edited (Supabase override)</span>
                  <span className="flex items-center gap-1.5"><span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">-%</span> on sale</span>
                  <span className="flex items-center gap-1.5"><span className="text-lg leading-none opacity-30">👟</span> no image</span>
                  <span className="flex items-center gap-1.5"><span className="font-bold text-green-600">●</span> in stock <span className="font-bold text-amber-500">●</span> last pair <span className="font-bold text-red-500">●</span> out</span>
                </div>
              )}

              {/* ── SHEETS INVENTORY TABLE ── */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">
                    Live Inventory <span className="text-[#C9A84C] ml-1">· {tabFilter==='all'?'2025 + 2024':tabFilter} Sheet</span>
                  </h3>
                  <span className="text-[10px] text-gray-400">{filteredInv.length} items</span>
                </div>
                {invLoading ? (
                  <div className="py-12 text-center"><div className="flex gap-2 justify-center">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div></div>
                ) : (
                  <div className="overflow-auto" style={{maxHeight:"calc(100vh - 280px)"}}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 shadow-sm"><tr className="bg-[#F7F4EF] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                      <th className="w-14 px-4 py-3"/>
                      <th className="text-left px-3 py-3">Product</th>
                      <th className="text-left px-3 py-3 w-24">Brand</th>
                      <th className="text-left px-3 py-3 w-28">SKU</th>
                      <th className="text-left px-3 py-3 w-24">Size</th>
                      <th className="text-right px-3 py-3 w-28">SRP</th>
                      <th className="text-right px-3 py-3 w-28">Sale Price</th>
                      <th className="text-right px-3 py-3 w-24 text-amber-600">Unit Cost</th>
                      <th className="text-center px-3 py-3 w-16">Stock</th>
                      <th className="text-center px-3 py-3 w-10">QR</th>
                      <th className="px-3 py-3 w-28"/>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredInv.length===0 ? (
                        <tr><td colSpan={9} className="text-center py-12 text-sm text-gray-400">No products found</td></tr>
                      ) : pagedInv.map((p:any)=>{
                        const isEditing = editingRow===p.itemCode;
                        const isSaving = savingRow===p.itemCode;
                        const inp = "w-full border border-[#C9A84C] rounded-lg px-2 py-1 text-xs outline-none font-mono bg-white";
                        return(
                        <tr key={p.itemCode} className={`transition-colors ${isEditing?"bg-[#fffbeb]":"hover:bg-gray-50/50"} ${p.edited?"border-l-2 border-[#C9A84C]":((p as any).tab==="2024"?"border-l-2 border-amber-200":"border-l-2 border-blue-200")}`}>
                          <td className="px-4 py-2">
                            <label className="w-11 h-11 bg-[#EDE9E3] rounded-lg overflow-hidden flex-shrink-0 block cursor-pointer relative group/img" title={`Upload photo for ${p.itemCode}`}>
                              {uploadingRow===p.itemCode
                                ?<span className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[#C9A84C] animate-pulse">…</span>
                                :p.imageUrl?<img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"/>:<span className="w-full h-full flex items-center justify-center text-lg opacity-20">👟</span>}
                              <span className="absolute inset-0 bg-black/50 text-white text-[8px] font-bold items-center justify-center hidden group-hover/img:flex">UPLOAD</span>
                              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                                onChange={e=>{const f=e.target.files?.[0]; e.currentTarget.value=""; if(f) uploadPhoto(p,f);}}/>
                            </label>
                          </td>
                          <td className="px-3 py-2">
                            {isEditing
                              ?<input className={inp} value={editValues.name||""} onChange={e=>setEditValues(v=>({...v,name:e.target.value}))}/>
                              :<div><p className="text-xs font-bold text-[#0d2430]">{p.name}</p><div className="flex items-center gap-1.5 mt-0.5"><p className="text-[10px] text-gray-400 font-mono">{p.itemCode}</p><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${(p as any).tab==="2024"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700"}`}>{(p as any).tab||"2025"}</span></div></div>}
                          </td>
                          <td className="px-3 py-2">
                            {(() => {
                              const brand = (p as any).brand || "";
                              return brand
                                ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BRAND_COLOR[brand]||"bg-gray-200 text-gray-700"}`}>{brand}</span>
                                : <span className="text-gray-300 text-[10px]">—</span>;
                            })()}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing
                              ?<input className={inp} value={editValues.sku||""} onChange={e=>setEditValues(v=>({...v,sku:e.target.value}))}/>
                              :<span className="text-[11px] font-mono text-gray-500">{p.sku}</span>}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing
                              ?<input className={inp} value={editValues.size||""} onChange={e=>setEditValues(v=>({...v,size:e.target.value}))}/>
                              :<span className="text-[11px] bg-[#EDE9E3] text-[#0d2430] px-2 py-1 rounded font-bold">{p.size}</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isEditing
                              ?<input className={inp+" text-right"} type="number" value={editValues.srp||""} onChange={e=>setEditValues(v=>({...v,srp:e.target.value}))}/>
                              :<span className="text-[11px] text-gray-400 line-through">{p.srp>0?fmt(p.srp):"-"}</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isEditing
                              ?<input className={inp+" text-right"} type="number" value={editValues.selling_price||""} onChange={e=>setEditValues(v=>({...v,selling_price:e.target.value}))}/>
                              :<div className="flex items-center justify-end gap-1"><span className="text-sm font-black text-[#0d2430]">{fmt(p.sellingPrice)}</span>{p.discount>0&&<span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">-{p.discount}%</span>}</div>}
                          </td>
                          {/* Unit Cost — admin only, never shown on website */}
                          <td className="px-3 py-2 text-right">
                            {isEditing
                              ?<input className={inp+" text-right"} type="number" min="0" value={editValues.unit_cost??''} onChange={e=>setEditValues(v=>({...v,unit_cost:e.target.value}))} placeholder="Cost"/>
                              :<span className="text-[11px] text-gray-400">{(costMap[p.itemCode]||0)>0?("₱"+(costMap[p.itemCode]/100).toLocaleString("en-PH")):"-"}</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isEditing
                              ?<div className="space-y-1">
                                 <input className={inp+" text-center"} type="number" min="0" value={editValues.stock??1} onChange={e=>setEditValues(v=>({...v,stock:e.target.value}))}/>
                                 <select className={inp+" text-center text-[10px]"} value={editValues.status||"Available"} onChange={e=>setEditValues(v=>({...v,status:e.target.value}))}>
                                   {INV_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                                 </select>
                               </div>
                              :<span className={`text-xs font-bold ${(p.stock||1)===0?"text-red-500":(p.stock||1)<=2?"text-amber-500":"text-green-600"}`}>{p.stock??1}</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={()=>setQrModal({open:true,itemCode:p.itemCode,name:p.name})} className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg hover:bg-[#050f12] hover:text-white transition-all mx-auto"><QrCode className="h-3.5 w-3.5"/></button>
                          </td>
                          <td className="px-3 py-2">
                            {isEditing
                              ?<div className="flex items-center gap-1.5">
                                  <button onClick={()=>saveEdit(p.itemCode)} disabled={isSaving} className="flex items-center gap-1 bg-[#0d2430] text-white px-3 py-1.5 text-[10px] font-bold rounded-lg disabled:opacity-50">
                                    {isSaving?"Saving…":<><Save className="h-3 w-3"/>Save</>}
                                  </button>
                                  <button onClick={cancelEdit} className="text-gray-400 hover:text-red-400"><X className="h-4 w-4"/></button>
                                </div>
                              :<div className="flex items-center gap-1">
                                  <button onClick={()=>startEdit(p)} className="flex items-center gap-1 border border-gray-200 text-gray-500 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg hover:bg-[#0d2430] hover:text-white hover:border-[#0d2430] transition-all">
                                    <Edit2 className="h-3 w-3"/>Edit
                                  </button>
                                  {p.edited&&<button onClick={()=>resetEdit(p.itemCode)} title="Reset to Sheets" className="text-gray-300 hover:text-red-400"><RefreshCw className="h-3 w-3"/></button>}
                                </div>}
                          </td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
                {!invLoading && filteredInv.length>PAGE_SIZE && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-xs">
                    <span className="text-gray-400">
                      Showing {(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filteredInv.length)} of {filteredInv.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setPage(1)} disabled={safePage===1}
                        className="px-2 py-1 rounded-lg font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-100">«</button>
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}
                        className="px-3 py-1 rounded-lg font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-100">Prev</button>
                      <span className="px-2 font-bold text-[#0d2430]">{safePage} / {pageCount}</span>
                      <button onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={safePage===pageCount}
                        className="px-3 py-1 rounded-lg font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-100">Next</button>
                      <button onClick={()=>setPage(pageCount)} disabled={safePage===pageCount}
                        className="px-2 py-1 rounded-lg font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-100">»</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── CUSTOM PRODUCTS (Supabase) ── */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">
                    Custom Listings <span className="text-gray-400 font-normal ml-1">· Manually added</span>
                  </h3>
                  <button onClick={()=>setProductModal({open:true})}
                    className="flex items-center gap-1.5 bg-[#0d2430] text-white px-3 py-1.5 text-[11px] font-bold rounded-lg hover:bg-[#122d3a]">
                    <Plus className="h-3 w-3"/> Add Custom
                  </button>
                </div>
                {filteredProducts.length===0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400 mb-3">No custom products yet</p>
                    <button onClick={()=>setProductModal({open:true})} className="text-xs text-[#C9A84C] font-semibold underline">Add one</button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 shadow-sm"><tr className="bg-[#F7F4EF] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                      <th className="text-left px-5 py-3 w-12"/>
                      <th className="text-left px-3 py-3 w-28">SKU</th>
                      <th className="text-left px-3 py-3">Product</th>
                      <th className="text-left px-3 py-3 w-32">Sizes</th>
                      <th className="text-right px-3 py-3 w-28">Price</th>
                      <th className="text-right px-3 py-3 w-36">Sale Price</th>
                      <th className="text-center px-3 py-3 w-20">Stock</th>
                      <th className="text-center px-3 py-3 w-16">Status</th>
                      <th className="text-center px-3 py-3 w-12">QR</th>
                      <th className="px-3 py-3 w-20"/>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map((p:any)=>{
                        const discount = p.sale_price && p.price ? Math.round((1-p.sale_price/p.price)*100) : 0;
                        const sizeEntries = p.sizes ? Object.entries(p.sizes) : [];
                        const sizeLabel = sizeEntries.length===1 ? `${sizeEntries[0][0]}:${sizeEntries[0][1]}` : sizeEntries.length > 0 ? `${sizeEntries.length} sizes` : "—";
                        const totalQty = sizeEntries.reduce((sum:number,[,qty]:any)=>sum+Number(qty),0) || p.stock || 0;
                        const isLow = totalQty > 0 && totalQty <= 3;
                        return(
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3"><div className="w-12 h-12 bg-[#EDE9E3] rounded-lg overflow-hidden">
                              {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover"/> : <span className="w-full h-full flex items-center justify-center text-lg opacity-20">👟</span>}
                            </div></td>
                            <td className="px-3 py-3"><span className="text-[11px] font-mono text-gray-400">{p.sku||"—"}</span></td>
                            <td className="px-3 py-3"><p className="text-sm font-semibold text-[#0d2430]">{p.name}</p><p className="text-[10px] text-gray-400">{p.category}</p></td>
                            <td className="px-3 py-3">
                              <div className="relative">
                                <button onClick={()=>setExpandedSizeId(expandedSizeId===p.id?null:p.id)}
                                  className="flex items-center gap-1.5 border border-[#C9A84C] text-[#0d2430] text-[11px] font-bold px-2.5 py-1 rounded hover:bg-[#C9A84C]/10">
                                  <span>{sizeLabel}</span>
                                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${expandedSizeId===p.id?"rotate-180":""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                                </button>
                                {expandedSizeId===p.id && sizeEntries.length > 0 && (
                                  <div className="absolute top-8 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[140px]">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sizes</p>
                                    {sizeEntries.map(([sz,qty]:any)=>(
                                      <div key={sz} className="flex justify-between items-center py-1 text-xs">
                                        <span className="font-semibold text-[#0d2430]">{sz}</span>
                                        <span className={`font-bold ${Number(qty)===0?"text-red-400":"text-green-600"}`}>{qty} units</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right"><span className={`text-sm ${p.sale_price?"text-gray-400 line-through text-[11px]":"font-bold text-[#0d2430]"}`}>₱{(p.price/100).toLocaleString("en-PH",{minimumFractionDigits:2})}</span></td>
                            <td className="px-3 py-3 text-right">{p.sale_price ? (<div className="flex items-center justify-end gap-1.5"><span className="text-sm font-bold text-red-500">₱{(p.sale_price/100).toLocaleString("en-PH",{minimumFractionDigits:2})}</span>{discount>0&&<span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">-{discount}%</span>}</div>) : <span className="text-[11px] text-gray-300">+ sale</span>}</td>
                            <td className="px-3 py-3 text-center"><span className={`text-xs font-bold ${totalQty===0?"text-red-500":isLow?"text-amber-500":"text-green-600"}`}>{totalQty} units</span></td>
                            <td className="px-3 py-3 text-center"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${p.status==="active"?"bg-[#0d2430] text-white":p.status==="draft"?"bg-gray-100 text-gray-500":"bg-red-100 text-red-500"}`}>{p.status}</span></td>
                            <td className="px-3 py-3 text-center"><button onClick={()=>setQrModal({open:true,itemCode:p.sku||p.id,name:p.name})} className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg hover:bg-[#050f12] hover:text-white transition-all mx-auto"><QrCode className="h-3.5 w-3.5"/></button></td>
                            <td className="px-3 py-3"><div className="flex items-center gap-1.5 justify-end">
                              <button onClick={()=>setProductModal({open:true,product:p})} className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg hover:bg-[#0d2430] hover:text-white transition-all"><Edit2 className="h-3.5 w-3.5"/></button>
                              <button onClick={()=>deleteProduct(p.id)} className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg hover:bg-red-100 hover:text-red-500 transition-all"><Trash2 className="h-3.5 w-3.5"/></button>
                            </div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {section==="orders"&&(()=>{
            // ── Orders 2.0 (per approved mockup): stat cards → tabs → table + side panel ──
            const sel = selOrderId ? sbOrders.find(o=>String(o.id)===selOrderId) || null : null;
            const now=Date.now(), WK=7*864e5;
            const in7=sbOrders.filter(o=>now-new Date(o.created_at).getTime()<WK);
            const prev7=sbOrders.filter(o=>{const t=now-new Date(o.created_at).getTime();return t>=WK&&t<2*WK;});
            const liveSales=(arr:any[])=>arr.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+(o.total||0),0);
            const delta7=(a:number,b:number)=>b===0?(a>0?100:0):Math.round(((a-b)/b)*100);
            const dOrd=delta7(in7.length,prev7.length), dSales=delta7(liveSales(in7),liveSales(prev7));
            const isFB=channelFilter==="sheet_import";
            const srcCnt=(s:string)=>sbOrders.filter(o=>(o.source||"website")===s).length;
            const base=channelFilter==="all"?sbOrders:sbOrders.filter(o=>(o.source||"website")===channelFilter);
            const cnt=(s:string)=>base.filter(o=>o.status===s).length;
            const pages=Math.max(1,Math.ceil(filteredOrders.length/ordPer));
            const page=Math.min(ordPage,pages-1);
            const rows=filteredOrders.slice(page*ordPer,(page+1)*ordPer);
            // thumbnails: website orders carry imageUrl; FB orders fall back to the
            // inventory photo matched by item code
            const invImg:Record<string,string>={};
            (Array.isArray(inventory)?inventory:[]).forEach((x:any)=>{ if(x.imageUrl&&x.itemCode&&!invImg[x.itemCode]) invImg[x.itemCode]=x.imageUrl; });
            const itemImg=(i:any)=>i?.imageUrl||invImg[String(i?.id||"")]||null;
            const thumbOf=(o:any)=>{ for(const i of (o.items||[])){ const u=itemImg(i); if(u) return u; } return null; };
            const payBadge=(o:any)=> o.payment_status==="verified"
              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">Paid</span>
              : o.payment_method==="cod"
              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#0d2430] text-[#0d2430]">COD</span>
              : o.payment_status==="submitted"
              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Proof ↑</span>
              : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>;
            const TAB_LABEL:Record<string,string>={all:"All Orders",pending:"New",paid:"Paid",processing:"To Pack",shipped:"Shipped",delivered:"Delivered",cancelled:"Cancelled"};
            const deltaEl=(d:number)=><span className={`text-[10px] font-bold ${d>=0?"text-emerald-600":"text-red-500"}`}>{d>=0?"↑":"↓"} {Math.abs(d)}% vs. last 7 days</span>;
            return (
            <div>
              {/* header controls */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                  <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)}
                    placeholder="Search order no., name, FB, or contact…"
                    className="h-10 w-72 max-w-full pl-9 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A84C]"/>
                  {orderSearch&&<button onClick={()=>setOrderSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>}
                </div>
                <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
                  {([["website",`🌐 Website ${srcCnt("website")}`],["sheet_import",`📋 FB / Order Form ${srcCnt("sheet_import")}`]] as const).map(([v,l])=>(
                    <button key={v} onClick={()=>setChannelFilter(v)}
                      className={`px-3 py-2 text-[11px] font-bold ${channelFilter===v?"bg-[#0d2430] text-white":"text-gray-500 hover:bg-gray-50"}`}>{l}</button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{filteredOrders.length} orders</span>
                <button onClick={loadOrders} className="ml-auto flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
                  <RefreshCw className="h-3.5 w-3.5"/> Refresh
                </button>
                <a href="https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#0d2430] text-white px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a]">
                  <ExternalLink className="h-3.5 w-3.5"/> Sheet archive
                </a>
              </div>

              {/* Combined FB / Order Form workspace (per Pia, Nov 25): two clearly
                  separated sections on one page — Order Requests on top (own
                  search + status chips), FB Form Orders below (own search,
                  filters and stats). Sources are never mixed. */}
              {channelFilter==="sheet_import"&&<>
                <IncomingRequests onPrepare={(r:any)=>{setPrepareReq(r);setCreateOrder(true);}}/>
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <h3 className="text-[12px] font-black uppercase tracking-[.12em] text-[#0d2430]">📋 FB Form Orders</h3>
                  <span className="text-[10px] font-bold text-gray-400">imported form submissions — search &amp; filters below apply to this section only</span>
                  <div className="flex-1 border-t border-gray-200"/>
                </div>
              </>}
              <>
              {/* stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-1"><ShoppingCart className="h-3.5 w-3.5 text-[#C9A84C]"/> Total Orders</div>
                  <div className="text-2xl font-black text-[#0d2430]">{sbOrders.length}</div>
                  {deltaEl(dOrd)}
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-1"><DollarSign className="h-3.5 w-3.5 text-[#C9A84C]"/> Total Sales</div>
                  <div className="text-2xl font-black text-[#0d2430]">{fmt(liveSales(sbOrders))}</div>
                  {deltaEl(dSales)}
                </div>
                <button onClick={()=>setOrderFilter("processing")} className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-[#C9A84C] transition-colors">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-1"><Package className="h-3.5 w-3.5 text-amber-500"/> To Pack</div>
                  <div className="text-2xl font-black text-[#0d2430]">{cnt("paid")+cnt("processing")}</div>
                  <span className="text-[10px] text-gray-400">paid + processing</span>
                </button>
                <button onClick={()=>setOrderFilter("shipped")} className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-[#C9A84C] transition-colors">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-1"><Truck className="h-3.5 w-3.5 text-blue-500"/> In Transit</div>
                  <div className="text-2xl font-black text-[#0d2430]">{cnt("shipped")}</div>
                  <span className="text-[10px] text-gray-400">shipped, on the way</span>
                </button>
                <button onClick={()=>setOrderFilter("delivered")} className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-[#C9A84C] transition-colors">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-500"/> Delivered</div>
                  <div className="text-2xl font-black text-[#0d2430]">{cnt("delivered")}</div>
                  <span className="text-[10px] text-gray-400">completed</span>
                </button>
              </div>

              {/* status tabs */}
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {["all","pending","paid","processing","shipped","delivered","cancelled"].map(s=>(
                  <button key={s} onClick={()=>setOrderFilter(s)}
                    className={`px-3.5 py-2 text-[11.5px] font-bold rounded-lg border ${orderFilter===s?"bg-[#0d2430] text-white border-[#0d2430]":"bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {TAB_LABEL[s]} ({s==="all"?base.length:cnt(s)})
                  </button>
                ))}
              </div>

              {/* MOP (mode of payment) tabs */}
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mr-1">MOP</span>
                {([["all","All"],["straight","💳 Straight Payment"],["cod","💵 COD"],["other","📦 Others"]] as const).map(([v,l])=>(
                  <button key={v} onClick={()=>setMopFilter(v)}
                    className={`px-3.5 py-2 text-[11.5px] font-bold rounded-lg border ${mopFilter===v?"bg-[#C9A84C] text-[#0d2430] border-[#C9A84C]":"bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {l} ({v==="all"?base.length:base.filter(o=>mopOf(o)===v).length})
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
                {/* ── table ── */}
                <div className="xl:col-span-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
                          <th className="pl-3 pr-1.5 py-3">Order No.</th>
                          <th className="px-1.5 py-3">Date & Time</th>
                          <th className="px-1.5 py-3">Customer</th>
                          <th className="px-1.5 py-3">Payment</th>
                          <th className="px-1.5 py-3">Proof</th>
                          <th className="px-1.5 py-3">Shipping</th>
                          <th className="pl-1.5 pr-3 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(o=>{
                          const t=thumbOf(o);
                          return (
                          <tr key={o.id} onClick={()=>setSelOrderId(String(o.id))}
                            className={`border-b border-gray-50 cursor-pointer text-[11px] ${String(o.id)===selOrderId?"bg-[#C9A84C]/10":"hover:bg-gray-50/70"}`}>
                            <td className="pl-3 pr-1.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-lg bg-[#F7F4EF] overflow-hidden flex items-center justify-center flex-shrink-0">
                                  {t?<img src={t} alt="" className="w-full h-full object-cover"/>:<span className="opacity-40">👟</span>}
                                </div>
                                <span className="font-black text-[#0d2430] whitespace-nowrap">{o.order_number}</span>
                              </div>
                            </td>
                            <td className="px-1.5 py-2.5 text-gray-500 whitespace-nowrap">{fmtDT(o.created_at)}</td>
                            <td className="px-1.5 py-2.5">
                              <div className="font-bold text-[#0d2430] whitespace-nowrap max-w-[130px] truncate">{o.customer_name}</div>
                              <div className="text-[10px] text-gray-400 whitespace-nowrap">{o.contact_number}</div>
                            </td>
                            <td className="px-1.5 py-2.5">{payBadge(o)}</td>
                            <td className="px-1.5 py-2.5">
                              {o.payment_proof_url
                                ? <button onClick={e=>{e.stopPropagation();openProof(o);}}
                                    className="text-[10px] font-bold text-[#8a6d25] border border-[#C9A84C] px-2 py-0.5 rounded-full hover:bg-[#C9A84C]/10 whitespace-nowrap">View</button>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-1.5 py-2.5">
                              {o.courier||o.tracking_reference
                                ? <div className="whitespace-nowrap"><span className="font-bold text-[#0d2430]">{o.courier||"—"}</span><div className="text-[10px] text-gray-400 font-mono max-w-[90px] truncate">{o.tracking_reference||""}</div></div>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="pl-1.5 pr-3 py-2.5 text-right font-black text-[#0d2430] whitespace-nowrap">{fmt(o.total)}</td>
                          </tr>);
                        })}
                        {rows.length===0&&<tr><td colSpan={7} className="py-16 text-center text-sm text-gray-400">No orders found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  {/* pagination */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 flex-wrap">
                    <span className="text-[11px] text-gray-400">Showing {filteredOrders.length===0?0:page*ordPer+1}–{Math.min((page+1)*ordPer,filteredOrders.length)} of {filteredOrders.length} orders</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={()=>setOrdPage(p=>Math.max(0,p-1))} disabled={page===0}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 disabled:opacity-30 hover:border-gray-300">‹</button>
                      {Array.from({length:pages},(_,i)=>i).filter(i=>i===0||i===pages-1||Math.abs(i-page)<=2).map((i,idx,arr)=>(
                        <span key={i} className="flex items-center gap-1">
                          {idx>0&&arr[idx-1]!==i-1&&<span className="text-gray-300 text-xs px-0.5">…</span>}
                          <button onClick={()=>setOrdPage(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold ${i===page?"bg-[#C9A84C] text-[#0d2430]":"border border-gray-200 text-gray-500 hover:border-gray-300"}`}>{i+1}</button>
                        </span>
                      ))}
                      <button onClick={()=>setOrdPage(p=>Math.min(pages-1,p+1))} disabled={page>=pages-1}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 disabled:opacity-30 hover:border-gray-300">›</button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      Rows:
                      <select value={ordPer} onChange={e=>{setOrdPer(Number(e.target.value));setOrdPage(0);}}
                        className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs font-bold text-[#0d2430] outline-none">
                        {[10,25,50].map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── side panel ── */}
                <div className="space-y-4">
                  {/* selected order */}
                  {sel ? (
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <h3 className="text-sm font-black text-[#0d2430]">Selected Order</h3>
                        <div className="flex items-center gap-1.5">
                          <button onClick={()=>setEditOrder(sel)} title="Edit this order"
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#C9A84C] hover:text-[#8a6d25]">
                            <Edit2 className="h-3.5 w-3.5"/>
                          </button>
                          {delArm
                            ? <span className="flex items-center gap-1">
                                <button onClick={()=>deleteOrder(sel)}
                                  className="text-[10px] font-bold bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700">Delete?</button>
                                <button onClick={()=>setDelArm(false)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5"/></button>
                              </span>
                            : <button onClick={()=>setDelArm(true)} title="Delete this order"
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-red-400 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5"/>
                              </button>}
                          <span className="text-[10px] font-bold bg-[#C9A84C] text-[#0d2430] px-2.5 py-1 rounded-lg">{sel.order_number}</span>
                        </div>
                      </div>
                      <div className="mb-3 -mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(sel.source||"website")==="website"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"}`}>
                          {(sel.source||"website")==="website"?"🌐 Website":"📋 FB Form"}
                        </span>
                        {sel.promo_code&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 ml-1.5">🏷 {sel.promo_code}</span>}
                      </div>
                      {/* items */}
                      <div className="space-y-2 mb-3">
                        {(sel.items||[]).map((item:any,i:number)=>(
                          <div key={i} className="flex items-center gap-2.5">
                            <div className="w-11 h-11 rounded-lg bg-[#F7F4EF] overflow-hidden flex items-center justify-center flex-shrink-0">
                              {itemImg(item)?<img src={itemImg(item)!} alt="" className="w-full h-full object-cover"/>:<span className="opacity-40">👟</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#0d2430] truncate">{item.name}</p>
                              <p className="text-[10px] text-gray-400">Size {item.size} · Qty {item.qty}</p>
                            </div>
                            <span className="text-xs font-black text-[#0d2430]">{fmt(item.price*item.qty)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-baseline border-t border-gray-100 pt-2">
                          <span className="text-[11px] font-bold text-gray-500">Total{sel.discount_amount>0?<span className="text-green-600 font-semibold"> (saved {fmt(sel.discount_amount)}{sel.promo_code?` · ${sel.promo_code}`:""})</span>:null}</span>
                          <span className="text-base font-black text-[#0d2430]">{fmt(sel.total)}</span>
                        </div>
                      </div>
                      {/* customer / address */}
                      <div className="space-y-2.5 text-xs border-t border-gray-100 pt-3 mb-3">
                        <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Customer</span>
                          <span className="text-[#0d2430]"><b>{sel.customer_name}</b>{sel.facebook_name?<span className="text-blue-500"> · FB: {sel.facebook_name}</span>:null}<br/>{sel.customer_email||"no email"} · {sel.contact_number}</span></div>
                        <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Address</span>
                          <span className="text-[#0d2430]">{sel.shipping_address}</span></div>
                        {sel.notes&&<div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Notes</span>
                          <span className="text-[#0d2430]">{sel.notes}</span></div>}
                        <div className="flex gap-2 items-center flex-wrap"><span className="text-gray-400 w-16 flex-shrink-0 font-semibold">Payment</span>
                          {payBadge(sel)}
                          <span className="text-[#0d2430] capitalize font-semibold">{sel.payment_method?.replace(/_/g," ")}</span>
                          {sel.payment_status==="reupload"&&<span className="text-[10px] font-black text-orange-600">↻ new proof requested</span>}
                          {sel.payment_status==="awaiting_full_payment"&&<span className="text-[10px] font-black text-orange-600">PRE-ORDER — full payment first</span>}
                        </div>
                        {(sel.payment_proof_url||sel.payment_status==="submitted"||sel.payment_status==="reupload")&&(
                          <div className="mt-1.5 bg-[#fbfaf7] border border-gray-200 rounded-xl p-2.5 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="font-black text-[#0d2430]">💳 Payment proof</span>
                              {sel.payment_status==="submitted"&&<span className="text-gray-500 font-semibold">submitted {fmtDate(sel.updated_at||sel.created_at)}</span>}
                              {sel.payment_reference&&<span className="font-mono font-bold text-[#0d2430]">ref {sel.payment_reference}</span>}
                              <span className="font-black text-[#0d2430] tabular-nums ml-auto">{fmt(sel.total)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {sel.payment_proof_url&&<button onClick={()=>openProof(sel)}
                                className="text-[10.5px] font-bold bg-[#0d2430] text-white px-2.5 py-1 rounded-lg hover:bg-[#122d3a]">🔍 View / download proof</button>}
                              {proofInfo[sel.id]===undefined
                                ? <button onClick={()=>loadProofInfo(sel)} className="text-[10.5px] font-bold text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50">ℹ Submission details</button>
                                : proofInfo[sel.id]
                                  ? <span className="text-[10.5px] text-gray-600 font-semibold">
                                      {proofInfo[sel.id].new_value?.method&&<>via <b>{proofInfo[sel.id].new_value.method}</b> · </>}
                                      {proofInfo[sel.id].new_value?.amount_claimed&&<>claimed ₱{proofInfo[sel.id].new_value.amount_claimed} · </>}
                                      {proofInfo[sel.id].new_value?.message?<>“{proofInfo[sel.id].new_value.message}”</>:<>no message</>}
                                    </span>
                                  : <span className="text-[10.5px] text-gray-400">no submission record</span>}
                            </div>
                            {sel.payment_status==="submitted"&&(
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={()=>setPaymentStatus(sel,"verified")}
                                  className="text-[11px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">✓ Confirm Payment</button>
                                <button onClick={()=>{setReupFor(reupFor===String(sel.id)?null:String(sel.id));setReupReason("");}}
                                  className="text-[11px] font-bold text-orange-700 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50">↻ Request new proof</button>
                              </div>
                            )}
                            {reupFor===String(sel.id)&&(
                              <div className="flex items-center gap-1.5">
                                <input value={reupReason} onChange={e=>setReupReason(e.target.value)} placeholder="Reason (required — customer will see this)"
                                  className="flex-1 border border-orange-300 rounded-lg px-2.5 py-1.5 text-[11px] outline-none focus:border-orange-500"/>
                                <button onClick={()=>requestReupload(sel)} disabled={reupReason.trim().length<3}
                                  className="text-[11px] font-black bg-orange-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-40">Send</button>
                              </div>
                            )}
                            {sel.payment_status==="reupload"&&<p className="text-[10.5px] font-semibold text-orange-700">Waiting for the customer to upload a new proof — they see your reason on their invoice page.</p>}
                          </div>
                        )}
                      </div>
                      {/* invoice — WEBSITE orders: site's branded /invoice page (Google Sheet
                          as archive). FB orders: Google Drive invoice is THE invoice —
                          generate it here, no site-invoice button. */}
                      <div className="flex items-center gap-1.5 flex-wrap border-t border-gray-100 pt-3 mb-3">
                        {(sel.source||"website")==="website"&&(
                          <a href={`/invoice/${encodeURIComponent(sel.order_number)}`} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-bold bg-[#C9A84C] text-[#0d2430] px-2.5 py-1 rounded-lg hover:opacity-90 flex items-center gap-1">
                            🧾 Invoice</a>
                        )}
                        {sel.invoice_url
                          ? <>
                              <a href={sel.invoice_url} target="_blank" rel="noopener noreferrer" title="Google Drive invoice"
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${(sel.source||"website")==="website"
                                  ?"text-gray-500 border border-gray-200 hover:border-[#C9A84C] hover:text-[#8a6d25]"
                                  :"bg-[#C9A84C] text-[#0d2430] hover:opacity-90"}`}>
                                {(sel.source||"website")==="website"?<><ExternalLink className="h-3 w-3"/> Sheet</>:<>🧾 Invoice</>}</a>
                              <button onClick={()=>generateInvoice(sel,true)} disabled={invBusy===sel.id} title="Regenerate the Google invoice"
                                className="text-[11px] font-bold text-gray-500 border border-gray-200 px-2 py-1 rounded-lg hover:border-[#C9A84C] hover:text-[#8a6d25] disabled:opacity-50">
                                {invBusy===sel.id?"…":"↻"}</button>
                              {sel.invoice_sent_at
                                ? <button onClick={()=>sendInvoice(sel,true)} disabled={sendBusy===sel.id} title={`Emailed ${fmtDate(sel.invoice_sent_at)} — send again`}
                                    className="text-[11px] font-bold text-green-700 border border-green-300 px-2 py-1 rounded-lg hover:bg-green-50 disabled:opacity-50">{sendBusy===sel.id?"…":"📧 ↻"}</button>
                                : <button onClick={()=>sendInvoice(sel)} disabled={sendBusy===sel.id}
                                    className="text-[11px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600 disabled:opacity-50">{sendBusy===sel.id?"Sending…":"📧 Send invoice"}</button>}
                            </>
                          : <button onClick={()=>generateInvoice(sel)} disabled={invBusy===sel.id}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg disabled:opacity-50 ${(sel.source||"website")==="website"
                                ?"text-gray-500 border border-gray-200 hover:border-[#C9A84C] hover:text-[#8a6d25]"
                                :"bg-[#C9A84C] text-[#0d2430] hover:opacity-90"}`}>
                              {invBusy===sel.id?"Generating…":(sel.source||"website")==="website"?"+ Sheet copy":"Generate invoice"}</button>}
                      </div>
                      {/* per-order receipt scan — above tracking (per approved mockup) */}
                      <label className={`flex items-center gap-2.5 border-[1.5px] border-dashed border-[#C9A84C]/70 bg-[#fffdf7] rounded-xl px-3 py-2.5 mb-2.5 cursor-pointer hover:bg-[#C9A84C]/10 ${receiptBusy?"opacity-50 pointer-events-none":""}`}>
                        <span className="text-[15px]">📄</span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold text-[#0d2430]">Courier receipt for this order</span>
                          <span className="block text-[9.5px] text-gray-400 font-semibold">Photo or scan — courier & tracking auto-fill below</span>
                        </span>
                        <span className="ml-auto bg-[#C9A84C] text-[#0d2430] text-[10px] font-black px-2.5 py-1.5 rounded-lg whitespace-nowrap">{receiptBusy?"Scanning…":"⬆ Upload / Scan"}</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={e=>{const f=e.target.files?.[0]; e.currentTarget.value=""; if(f) scanForOrder(sel,f);}}/>
                      </label>
                      {orderScan&&orderScan.forId===String(sel.id)&&(
                        <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2 mb-2.5 text-[11px]">
                          ✅ <b className="text-emerald-700">Receipt scanned</b>
                          {orderScan.receipt_url&&<> · <a href={orderScan.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[#8a6d25] font-bold underline">view saved receipt</a></>}
                          <div className="text-[10.5px] text-[#0d2430] mt-0.5">Courier: <b>{orderScan.courier||"—"}</b> · Tracking: <b className="font-mono">{orderScan.tracking||"not detected"}</b></div>
                        </div>
                      )}
                      {/* shipping */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <Truck className="h-3.5 w-3.5 text-gray-400"/>
                        <input key={`c-${sel.id}-${orderScan?.forId===String(sel.id)?orderScan.ts:0}`} placeholder="Courier"
                          defaultValue={shipEdit[sel.id]?.courier ?? sel.courier ?? ""}
                          onChange={e=>setShipEdit(prev=>({...prev,[sel.id]:{...prev[sel.id],courier:e.target.value}}))}
                          className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#C9A84C]"/>
                        <input key={`t-${sel.id}-${orderScan?.forId===String(sel.id)?orderScan.ts:0}`} placeholder="Tracking #"
                          defaultValue={shipEdit[sel.id]?.tracking_reference ?? sel.tracking_reference ?? ""}
                          onChange={e=>setShipEdit(prev=>({...prev,[sel.id]:{...prev[sel.id],tracking_reference:e.target.value}}))}
                          className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#C9A84C] font-mono"/>
                        <button onClick={()=>saveFulfillment(sel)} disabled={!shipEdit[sel.id]}
                          className="text-[11px] font-bold bg-[#0d2430] text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40">Save</button>
                      </div>
                      {orderScan&&orderScan.forId===String(sel.id)&&(
                        <button onClick={()=>saveShipAndMarkShipped(sel)}
                          className="w-full bg-emerald-600 text-white py-2.5 mb-3 text-[11px] font-black rounded-lg hover:bg-emerald-700">
                          ✓ Save & Mark Shipped
                        </button>
                      )}
                      {/* activity timeline (P1 audit trail) */}
                      {orderLog.length>0&&(
                        <div className="border-t border-gray-100 pt-3 mb-3">
                          <p className="text-[9px] font-black uppercase tracking-[.14em] text-gray-300 mb-2">Activity</p>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {orderLog.map((l:any)=>{
                              const nv=l.new_value||{}, ov=l.old_value||{};
                              let what=l.action;
                              if(l.action==="create") what=`Order placed · ${fmt(nv.total||0)}`;
                              else if(l.action==="payment_proof_submitted") what=`Payment proof submitted${nv.reference?` · ref ${nv.reference}`:""}`;
                              else if(l.action==="duplicate_checkout_blocked") what="Duplicate checkout blocked";
                              else if(l.action==="delete") what="Order deleted";
                              else if(l.action==="update"){
                                const bits:string[]=[];
                                if("status" in nv) bits.push(`status ${ov.status??"?"} → ${nv.status}`);
                                if("payment_status" in nv) bits.push(`payment ${ov.payment_status??"?"} → ${nv.payment_status}`);
                                if("tracking_reference" in nv&&nv.tracking_reference) bits.push(`tracking ${nv.tracking_reference}`);
                                if("courier" in nv&&nv.courier) bits.push(String(nv.courier));
                                if(!bits.length) bits.push("details edited");
                                what=bits.join(" · ");
                              }
                              return (
                                <div key={l.id} className="flex items-start gap-2 text-[10.5px]">
                                  <span className="text-gray-300 whitespace-nowrap font-mono">{new Date(l.created_at).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>
                                  <span className="text-[#0d2430] font-semibold flex-1">{what}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${l.actor==="customer"?"bg-blue-50 text-blue-600":"bg-[#C9A84C]/20 text-[#8a6d25]"}`}>{l.actor||"system"}</span>
                                </div>);
                            })}
                          </div>
                        </div>
                      )}
                      {/* status */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[sel.status]||"bg-gray-100 text-gray-600"}`}>{TAB_LABEL[sel.status]||sel.status}</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400 font-semibold">Update Status</span>
                          <Select value={sel.status} onValueChange={val=>updateOrderStatus(sel.id,val)}>
                            <SelectTrigger className="w-32 h-8 text-xs font-bold bg-[#C9A84C] text-[#0d2430] border-[#C9A84C] rounded-lg"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {["pending","paid","processing","shipped","delivered","cancelled"].map(s=>(
                                <SelectItem key={s} value={s} className="text-xs">{TAB_LABEL[s]||s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-gray-200 rounded-xl py-10 text-center text-xs text-gray-400">
                      Click an order in the table to see its details here
                    </div>
                  )}
                </div>
              </div>
              </>
            </div>);
          })()}

          {/* ── CUSTOMERS ── */}
          {section==="customers"&&<AdminCustomers orders={sbOrders}
            onOpenOrder={(n,src)=>{setChannelFilter(src==="sheet_import"?"sheet_import":"website");setOrderSearch(n);setSection("orders");}}/>}

          {/* ── PROMO CODES ── */}
          {section==="promos"&&<AdminPromos/>}
          {section==="campaign"&&<ShoeCleanerCampaign/>}

          {/* ── SETTINGS ── */}
          {section==="settings"&&<AdminSettings/>}

          {/* ── ANALYTICS ── */}
          {section==="analytics"&&<AdminVisitors/>}
          {section==="analytics"&&(
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-5">Inventory Health</h3>
                {[
                  {label:"Total SKUs",value:stats.total,pct:100,color:"bg-blue-500"},
                  {label:"In Stock",value:inventoryGrouped.filter(p=>p.totalStock>0).length,pct:stats.total?(inventoryGrouped.filter(p=>p.totalStock>0).length/stats.total)*100:0,color:"bg-green-500"},
                  {label:"Low Stock",value:stats.lowStock,pct:stats.total?(stats.lowStock/stats.total)*100:0,color:"bg-amber-500"},
                  {label:"Out of Stock",value:stats.outStock,pct:stats.total?(stats.outStock/stats.total)*100:0,color:"bg-red-500"},
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-5">Order Stats</h3>
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

          {/* ── LATEST INVENTORY (shoebox intake log) ── */}
          {section==="intake"&&(
            <div className="space-y-4">
              {/* quick-nav tabs (Pia: "tab headers where i can choose recent add") */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mb-2">
                {([["all","All"],["today","🆕 Today"],["mine","👤 Mine"],["unpriced","₱? Unpriced"]] as const).map(([k,lbl])=>(
                  <button key={k} onClick={()=>setIntakeTab(k)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${intakeTab===k?"bg-[#0d2430] border-[#0d2430] text-white":"border-gray-200 text-gray-500 hover:border-gray-300 bg-white"}`}>
                    {lbl} <span className={intakeTab===k?"text-[#C9A84C]":"text-gray-400"}>{intakeTabCounts[k]}</span>
                  </button>
                ))}
              </div>
              {/* running total of the scan file (Pia: "put total above the SRP — only what you scanned") */}
              <div className="bg-[#050f12] rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Scanned so far</span>
                  <span className="text-lg font-black text-white">{scanTotals.pairs}</span>
                  <span className="text-[10px] text-white/40">pairs</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total SRP</span>
                  <span className="text-lg font-black text-[#C9A84C]">₱{scanTotals.srp.toLocaleString()}</span>
                  <span className="text-[10px] text-white/40">{scanTotals.priced} of {scanTotals.pairs} priced</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total Cost</span>
                  <span className="text-lg font-black text-white">₱{scanTotals.cost.toLocaleString()}</span>
                  <span className="text-[10px] text-white/40">{scanTotals.costed} of {scanTotals.pairs} costed</span>
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 sm:flex-none min-w-[180px]">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/>
                    <input value={intakeSearch} onChange={e=>setIntakeSearch(e.target.value)}
                      placeholder="code / model / SKU / barcode / size"
                      className="pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-xs w-full sm:w-64 outline-none focus:border-[#C9A84C]"/>
                  </div>
                  <select value={intakeCond} onChange={e=>setIntakeCond(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 text-xs outline-none">
                    {["All","Good","Stained","Missing pair","Unknown"].map(c=><option key={c}>{c}</option>)}
                  </select>
                  <span className="text-[11px] font-bold text-gray-400 self-center">📷 {scannedCount} scanned pair{scannedCount===1?"":"s"}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setScanBox(true)}
                    className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2.5 text-xs font-black rounded-lg hover:bg-[#122d3a] flex-1 sm:flex-none justify-center">
                    📷 SCAN SHOEBOX
                  </button>
                  <button onClick={intakeCSV} className="flex items-center gap-1.5 border border-gray-200 text-gray-500 px-3 py-2 text-xs font-bold rounded-lg hover:bg-gray-50">
                    <Download className="h-3.5 w-3.5"/> CSV
                  </button>
                  <button onClick={loadIntake} className="border border-gray-200 text-gray-500 px-3 py-2 text-xs font-bold rounded-lg hover:bg-gray-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${intakeLoading?"animate-spin":""}`}/>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl overflow-auto max-h-[68vh]">
                <table className="w-full text-sm min-w-[1120px]">
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(0,0,0,.06)]"><tr className="text-[10px] uppercase tracking-wider text-gray-400 text-left">
                    <th className="px-3 py-2.5 font-semibold">📸</th>
                    <th className="px-2 font-semibold">Item Code</th>
                    <th className="px-2 font-semibold">Brand</th>
                    <th className="px-2 font-semibold">Model</th>
                    <th className="px-2 font-semibold">SKU</th>
                    <th className="px-2 font-semibold">Size US</th>
                    <th className="px-2 font-semibold">EUR</th>
                    <th className="px-2 font-semibold">CM</th>
                    <th className="px-2 font-semibold">Barcode</th>
                    <th className="px-2 font-semibold bg-[#C9A84C]/10">SRP ₱</th>
                    <th className="px-2 font-semibold bg-green-50">Sale ₱</th>
                    <th className="px-2 font-semibold">Cost ₱</th>
                    <th className="px-2 font-semibold">Status</th>
                    <th className="px-2 font-semibold">By</th>
                    <th className="px-2 font-semibold">Added</th>
                    <th className="px-2"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredIntake.slice(0,intakeShown).map((r:any)=>{
                      const cond=(r.condition==="New"?"Good":r.condition)||"Good";
                      const condCls=cond==="Good"?"bg-green-100 text-green-700":cond==="Stained"?"bg-amber-100 text-amber-700":cond==="Missing pair"?"bg-red-100 text-red-600":"bg-gray-100 text-gray-500";
                      const img=imgByCode.get(r.item_code);
                      return (
                        <tr key={r.item_code} className="hover:bg-gray-50/60">
                          <td className="px-3 py-2">{img?<img src={img} className="w-8 h-8 rounded object-cover"/>:<span className="text-gray-300">—</span>}</td>
                          <td className="px-2 font-mono font-black text-xs text-[#0d2430]">{r.item_code}</td>
                          <td className="px-2 text-xs">{r.brand||"—"}</td>
                          <td className="px-2 text-xs font-medium max-w-[180px] truncate">{(()=>{
                            // the stored name is "Brand + Model" (the store needs it) — next to
                            // the Brand column, show only the model part
                            const nm=String(r.name||""), b=String(r.brand||"").trim();
                            if(b&&nm.toLowerCase().startsWith(b.toLowerCase()+" ")) return nm.slice(b.length+1);
                            if(b&&nm.toLowerCase()===b.toLowerCase()) return "—";
                            return nm;
                          })()}</td>
                          <td className="px-2 font-mono text-[11px] text-gray-500">{r.sku||"—"}</td>
                          <td className="px-2 text-xs font-bold">{r.size||"—"}</td>
                          <td className="px-2 text-xs text-gray-500">{r.size_eur||"—"}</td>
                          <td className="px-2 text-xs text-gray-500">{r.size_cm||"—"}</td>
                          <td className="px-2 font-mono text-[10px] text-gray-400">{r.barcode?("…"+String(r.barcode).slice(-6)):"—"}</td>
                          {/* SRP / Sale / Cost — click any to edit in place. yellow ✦ = SRP didn't come from the box label */}
                          {priceCell(r,"srp",`px-2 text-xs font-bold ${/srp updated/i.test(r.notes||"")?"bg-yellow-200 text-yellow-900":"bg-[#C9A84C]/[.06]"}`,
                            <>{r.srp?((r.srp/100).toLocaleString("en-PH")):"—"}{/srp updated/i.test(r.notes||"")?" ✦":""}</>)}
                          {/* Sale ₱ = selling_price — the website price, NOT the SRP */}
                          {priceCell(r,"selling_price","px-2 text-xs font-bold bg-green-50/60 text-green-700",
                            <>{r.selling_price?((r.selling_price/100).toLocaleString("en-PH")):"—"}</>)}
                          {/* Cost ₱ = unit_cost — internal only, never sent to the website */}
                          {priceCell(r,"unit_cost","px-2 text-xs text-gray-500",
                            <>{r.unit_cost>0?((r.unit_cost/100).toLocaleString("en-PH")):"0"}</>)}
                          <td className="px-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${condCls}`}>{cond}</span>
                            {r.status==="Sold"&&<span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-800 text-white">Sold</span>}</td>
                          <td className="px-2">{r.added_by
                            ?<span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{background:BY_COLORS[r.added_by]||"#6b7280"}}>{r.added_by}</span>
                            :<span className="text-gray-300 text-[10px]">—</span>}</td>
                          <td className="px-2 text-[10px] text-gray-400 whitespace-nowrap">{r.created_at?fmtDate(r.created_at):"—"}</td>
                          <td className="px-2 whitespace-nowrap">
                            <button title="Edit this pair" onClick={()=>setEditScan(r)} className="text-gray-400 hover:text-[#0d2430] mr-1"><Edit2 className="h-3.5 w-3.5"/></button>
                            <button title="QR sticker" onClick={()=>setQrModal({open:true,itemCode:r.item_code,name:r.name})} className="text-gray-400 hover:text-[#0d2430]"><QrCode className="h-3.5 w-3.5"/></button>
                          </td>
                        </tr>
                      );})}
                    {!intakeLoading&&filteredIntake.length===0&&<tr><td colSpan={16} className="px-4 py-10 text-center text-sm text-gray-400">
                      {!intakeSearch&&intakeCond==="All"
                        ?<>Nothing scanned yet — hit <b>📷 SCAN SHOEBOX</b> to log your first pair.<br/><span className="text-[11px]">Everything else stays in Products &amp; Inventory.</span></>
                        :"No matches"}</td></tr>}
                    {intakeLoading&&<tr><td colSpan={16} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td></tr>}
                  </tbody>
                </table>
              </div>
              {filteredIntake.length>intakeShown&&(
                <AutoLoader onMore={()=>setIntakeShown(n=>n+50)} remaining={filteredIntake.length-intakeShown}/>
              )}
              <p className="text-[10px] text-gray-400">Newest first. <b>Good/Stained</b> are sellable once priced · <b>Missing pair/Unknown</b> never reach the website · <b>Sale ₱</b> is the website price (SRP is the compare-at price) · <b>Cost ₱</b> is internal — it never reaches the website · ✏️ edits the pair right here (scans never join the sheet inventory) · QR reprints the box sticker.</p>
            </div>
          )}

          {/* ── SALES & REPORTS ── */}
          {section==="reports"&&(
            <div className="space-y-6">
              {/* P&L cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Revenue (items)</p>
                  <p className="text-2xl font-black text-[#0d2430]">{fmt(repTotals.rev)}</p>
                  <p className="text-[10px] text-gray-400">{repTotals.lines} lines · all time · excl. shipping</p>
                </div>
                <div className="bg-white border-l-4 border border-gray-100 border-l-amber-400 rounded-xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">COGS (known)</p>
                  <p className="text-2xl font-black text-[#0d2430]">{fmt(repTotals.cogs)}</p>
                  <p className="text-[10px] font-bold text-amber-600">{repTotals.costed}/{repTotals.lines} lines costed ({pct(repTotals.costed,repTotals.lines)}%)</p>
                </div>
                <div className="bg-white border-l-4 border border-gray-100 border-l-green-500 rounded-xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Gross Profit</p>
                  <p className="text-2xl font-black text-green-600">{fmt(repTotals.costedRev-repTotals.cogs)}</p>
                  <p className="text-[10px] text-gray-400">on costed lines only</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Margin</p>
                  <p className="text-2xl font-black text-[#0d2430]">{repTotals.costedRev>0?Math.round((repTotals.costedRev-repTotals.cogs)/repTotals.costedRev*100):0}%</p>
                  <p className="text-[10px] text-gray-400">of costed revenue</p>
                </div>
              </div>

              {missingCost.length>0&&(
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-semibold text-amber-800">
                    ⚠️ {missingCost.length} order lines have no unit cost — profit is understated. Fill them below and the report updates instantly.
                  </p>
                  <button onClick={()=>{document.getElementById("missing-cost-list")?.scrollIntoView({behavior:"smooth"});}}
                    className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-amber-600">Fill costs ↓</button>
                </div>
              )}

              {/* Monthly table */}
              <div className="bg-white border border-gray-100 rounded-xl p-6 overflow-x-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">📅 Monthly Performance</h3>
                <table className="w-full text-sm min-w-[560px]">
                  <thead><tr className="text-[10px] uppercase tracking-wider text-gray-400 text-left">
                    <th className="py-2 font-semibold">Month</th><th className="font-semibold text-right">Orders</th>
                    <th className="font-semibold text-right">Revenue</th><th className="font-semibold text-right">COGS</th>
                    <th className="font-semibold text-right">Profit</th><th className="font-semibold text-right">Margin</th>
                    <th className="font-semibold text-right">Costed</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthly.map(m=>{
                      const profit=m.costedRev-m.cogs;
                      const cov=pct(m.costed,m.lines);
                      return (
                        <tr key={m.month}>
                          <td className="py-2.5 font-bold text-[#0d2430] text-xs">{m.month?new Date(m.month+"-01").toLocaleDateString("en-PH",{month:"short",year:"numeric"}):"—"}</td>
                          <td className="text-right text-xs text-gray-500">{m.orders.size}</td>
                          <td className="text-right font-bold text-[#0d2430] text-xs">{fmt(m.rev)}</td>
                          <td className="text-right text-xs text-gray-500">{m.cogs>0?fmt(m.cogs):"—"}</td>
                          <td className={`text-right font-bold text-xs ${profit>0?"text-green-600":"text-gray-400"}`}>{m.cogs>0?fmt(profit):"—"}</td>
                          <td className="text-right text-xs text-gray-500">{m.costedRev>0?Math.round(profit/m.costedRev*100)+"%":"—"}</td>
                          <td className="text-right"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cov>=70?"bg-green-100 text-green-700":cov>=30?"bg-amber-100 text-amber-700":"bg-red-100 text-red-600"}`}>{cov}%</span></td>
                        </tr>
                      );})}
                  </tbody>
                </table>
                <p className="text-[10px] text-gray-400 mt-3">Revenue = item lines only (shipping excluded). Profit uses the cost snapshot saved on each line at sale time — "Costed %" shows how complete each month's profit figure is.</p>
              </div>

              {/* Channel split */}
              <div className="bg-white border border-gray-100 rounded-xl p-6 overflow-x-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4">📣 By Sales Channel</h3>
                <table className="w-full text-sm min-w-[480px]">
                  <thead><tr className="text-[10px] uppercase tracking-wider text-gray-400 text-left">
                    <th className="py-2 font-semibold">Channel</th><th className="font-semibold text-right">Lines</th>
                    <th className="font-semibold text-right">Revenue</th><th className="font-semibold text-right">COGS</th>
                    <th className="font-semibold text-right">Profit</th><th className="font-semibold text-right">Costed</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {bySrc.map(c=>(
                      <tr key={c.src}>
                        <td className="py-2.5 font-bold text-[#0d2430] text-xs">{c.src==="Website"?"🌐 Website":c.src==="FB Form"?"📋 FB Form":"✍️ Manual"}</td>
                        <td className="text-right text-xs text-gray-500">{c.lines}</td>
                        <td className="text-right font-bold text-[#0d2430] text-xs">{fmt(c.rev)}</td>
                        <td className="text-right text-xs text-gray-500">{c.cogs>0?fmt(c.cogs):"—"}</td>
                        <td className="text-right font-bold text-xs text-green-600">{c.cogs>0?fmt(c.costedRev-c.cogs):"—"}</td>
                        <td className="text-right text-xs text-gray-500">{pct(c.costed,c.lines)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Missing-cost worklist */}
              <div id="missing-cost-list" className="bg-white border border-gray-100 rounded-xl p-6">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">✏️ Lines Missing Unit Cost ({missingCost.length})</h3>
                </div>
                <p className="text-[10px] text-gray-400 mb-4">Pre-orders and old codes have no inventory match — type the acquisition cost once (₱) and it's saved to the order permanently. Newest first.</p>
                <div className="divide-y divide-gray-50">
                  {missingCost.slice(0,missingShown).map(l=>{
                    const k=`${l.oid}:${l.idx}`;
                    const isPO=!l.code||l.code.toUpperCase()==="PO";
                    return (
                      <div key={k} className="py-2.5 flex items-center gap-3 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isPO?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-500"}`}>{isPO?"PRE-ORDER":l.code}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#0d2430] truncate">{l.name||"(no name)"} {l.size&&<span className="text-gray-400">· {l.size}</span>}</div>
                          <div className="text-[10px] text-gray-400">{l.order} · sold {fmt(l.price)}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-400">cost ₱</span>
                          <input className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#C9A84C]"
                            placeholder="0" inputMode="decimal" value={costDraft[k]||""}
                            onChange={e=>setCostDraft(d=>({...d,[k]:e.target.value}))}
                            onKeyDown={e=>{if(e.key==="Enter")saveLineCost(l);}}/>
                          <button onClick={()=>saveLineCost(l)} disabled={!costDraft[k]}
                            className="bg-[#0d2430] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#122d3a] disabled:opacity-30">Save</button>
                        </div>
                      </div>
                    );})}
                  {missingCost.length===0&&<div className="py-6 text-center text-sm text-gray-400">Every line has a cost — report is 100% accurate 🎉</div>}
                </div>
                {missingCost.length>missingShown&&(
                  <AutoLoader onMore={()=>setMissingShown(n=>n+30)} remaining={missingCost.length-missingShown}/>
                )}
              </div>
            </div>
          )}

          {section==="system"&&(
            <div className="space-y-6">
              {(()=>{  
                const Card=({bg,border,title,titleC,num,numC,sub,onClick,href}:any)=>{
                  const inner=(<>
                    <p className="text-xs font-bold" style={{color:titleC}}>{title}</p>
                    <p className="text-xl font-black leading-tight" style={{color:numC}}>{num}</p>
                    <p className="text-[10px]" style={{color:numC}}>{sub}</p>
                  </>);
                  const cls="rounded-lg px-3 py-2.5 text-left w-full transition-transform hover:scale-[1.02]";
                  const st={background:bg,border:`1px solid ${border}`};
                  return href
                    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={st}>{inner}</a>
                    : <button onClick={onClick} className={cls} style={st}>{inner}</button>;
                };
                const G=({label,color,children}:any)=>(
                  <div>
                    <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{color}}>■ {label}</p>
                    <div className="grid grid-cols-3 gap-2">{children}</div>
                  </div>);
                const SBURL="https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp/editor";
                const withPhoto=(inventory||[]).filter((p:any)=>p.imageUrl).length;
                const rev=sbOrders.filter((o:any)=>o.status!=="cancelled").reduce((a:number,o:any)=>a+(o.total||0),0);
                return(
                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">Your database, mapped</h3>
                    <span className="text-[10px] text-gray-400">live counts · click a card to open it</span>
                  </div>
                  <G label="CATALOG — what you sell" color="#8a6d25">
                    <Card bg="#FBF6E9" border="#C9A84C" titleC="#0d2430" numC="#8a6d25" title="Inventory"
                      num={sysStats.totalRows} sub={`${sysStats.live} live · source of truth`} onClick={()=>setSection("products")}/>
                    <Card bg="#FBF6E9" border="#e6d9b3" titleC="#0d2430" numC="#8a6d25" title="Product photos"
                      num={`${sysStats.coverage}%`} sub={`${withPhoto} of ${sysStats.live} live`} onClick={()=>{setImageFilter("none");setSection("products");}}/>
                    <Card bg="#FBF6E9" border="#e6d9b3" titleC="#0d2430" numC="#BA7517" title="Custom listings"
                      num={sbProducts.length} sub="not shown on site yet" onClick={()=>setSection("products")}/>
                  </G>
                  <G label="SALES — money moving" color="#0F6E56">
                    <Card bg="#E1F5EE" border="#5DCAA5" titleC="#04342C" numC="#0F6E56" title="Orders"
                      num={sbOrders.length} sub={`${fmt(rev)} · 2 channels`} onClick={()=>setSection("orders")}/>
                    <Card bg="#E1F5EE" border="#9FE1CB" titleC="#04342C" numC="#0F6E56" title="Promo codes"
                      num={sysCounts.promos??"…"} sub="+ usage log" onClick={()=>setSection("promos")}/>
                    <Card bg="#E1F5EE" border="#9FE1CB" titleC="#04342C" numC="#0F6E56" title="Payment proofs"
                      num="→" sub="attached on orders" onClick={()=>setSection("orders")}/>
                  </G>
                  <G label="CUSTOMERS — who buys" color="#534AB7">
                    <Card bg="#EEEDFE" border="#AFA9EC" titleC="#26215C" numC="#534AB7" title="Loyalty members"
                      num={sysCounts.loyalty??"…"} sub="+ points ledger" href={SBURL}/>
                    <Card bg="#EEEDFE" border="#CECBF6" titleC="#26215C" numC="#534AB7" title="Reviews"
                      num={sysCounts.reviews??"…"} sub="by product sku" href={SBURL}/>
                    <Card bg="#EEEDFE" border="#CECBF6" titleC="#26215C" numC="#534AB7" title="Wishlist signals"
                      num={sysCounts.wishlist??"…"} sub="analytics" href={SBURL}/>
                  </G>
                  <G label="SYSTEM — keeps it running" color="#5F5E5A">
                    <Card bg="#F1EFE8" border="#D3D1C7" titleC="#2C2C2A" numC="#5F5E5A" title="Site settings"
                      num={sysCounts.settings??"…"} sub="brand · payments · shipping" onClick={()=>setSection("settings")}/>
                    <Card bg="#F1EFE8" border="#D3D1C7" titleC="#2C2C2A" numC="#5F5E5A" title="Import history"
                      num={sysLog.length} sub="hourly auto-sync" onClick={()=>{}}/>
                    <Card bg="#F1EFE8" border="#D3D1C7" titleC="#2C2C2A" numC="#B4B2A9" title="Peso views"
                      num="SQL" sub="v_orders_pesos · v_sales_daily" href="https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp/sql/new"/>
                  </G>
                </div>);
              })()}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Database health · Supabase is the single source of truth</p>
                <div className="flex gap-2">
                  <button onClick={()=>syncInventory().then(loadSystem)} disabled={syncing}
                    className="flex items-center gap-1.5 bg-[#C9A84C] text-[#0d2430] text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`}/> Import from Sheets
                  </button>
                  <button onClick={backupCSV} disabled={sysLoading||!sysRaw}
                    className="flex items-center gap-1.5 bg-[#0d2430] text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                    <Download className="h-3.5 w-3.5"/> Backup CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#f8f6f1] rounded-xl p-4">
                  <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Products live</p>
                  <p className="text-2xl font-black text-[#0d2430]">{sysStats.live}</p>
                  <p className="text-[11px] text-gray-400">{sysLoading?"loading rows…":`${sysStats.totalRows} rows total`}</p>
                </div>
                <div className="bg-[#f8f6f1] rounded-xl p-4">
                  <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Photo coverage</p>
                  <p className={`text-2xl font-black ${sysStats.coverage<60?"text-amber-600":"text-[#0d2430]"}`}>{sysStats.coverage}%</p>
                  <p className="text-[11px] text-gray-400">of live products</p>
                </div>
                <div className="bg-[#f8f6f1] rounded-xl p-4">
                  <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Last import</p>
                  <p className="text-sm font-black text-[#0d2430] mt-1.5">{sysLog[0]?new Date(sysLog[0].created_at).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}</p>
                  <p className="text-[11px] text-gray-400">{sysLog[0]?`+${sysLog[0].synced||0} new of ${sysLog[0].total||0}`:"no runs yet"}</p>
                </div>
                <div className="bg-[#f8f6f1] rounded-xl p-4">
                  <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Last order</p>
                  <p className="text-sm font-black text-[#0d2430] mt-1.5">{sbOrders[0]?new Date(sbOrders[0].created_at).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}</p>
                  <p className="text-[11px] text-gray-400">DB write confirmed</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600"/> Data quality
                  </h3>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                    <span className="text-gray-500">Missing photo (live products)</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-amber-600">{sysStats.missingPhoto}</span>
                      {sysStats.missingPhoto>0&&<button onClick={()=>{setImageFilter("none");setSection("products");}}
                        className="text-[11px] font-bold text-[#8a6d25] border border-[#C9A84C] px-2.5 py-1 rounded-lg hover:bg-[#C9A84C]/10">Show in Products</button>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                    <span className="text-gray-500">No price · hidden from site</span>
                    <span className="font-black text-[#0d2430]">{sysStats.hiddenNoPrice}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-sm">
                    <span className="text-gray-500">Blank status</span>
                    <span className="font-black text-[#0d2430]">{sysStats.blankStatus}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3">Fix no-price and blank-status rows by setting a sale price or status — they appear on the site automatically once valid.</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4 flex items-center gap-2">
                    <History className="h-3.5 w-3.5"/> Sheet imports
                  </h3>
                  {sysLog.length===0&&<p className="text-sm text-gray-400">{sysLoading?"Loading…":"No import runs logged yet"}</p>}
                  {sysLog.map((l:any,i:number)=>(
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                      <span className="text-gray-500">{new Date(l.created_at).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                      <span className={`font-bold ${(l.synced||0)>0?"text-emerald-700":"text-gray-400"}`}>+{l.synced||0} new of {l.total||0}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-400 mt-3">Imports only add new item codes from the 2025 + 2024 sheet tabs — your DB edits are never overwritten.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
