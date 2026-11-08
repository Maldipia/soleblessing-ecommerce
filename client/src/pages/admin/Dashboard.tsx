import { trpc } from "@/lib/trpc";
import { sbAdmin as sb } from "@/lib/supabaseAdmin";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Shield, ChevronRight, Lock, LogOut, Zap, ExternalLink,
  Search, RefreshCw, AlertTriangle, TrendingUp, Plus,
  Edit2, Trash2, X, Save, Eye, Settings, Tag,
  Download, QrCode, Copy, Database, History,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminSettings from "./Settings";
import { useInventory, refreshInventory } from "@/hooks/useInventory";
import AdminPromos from "./Promos";

type Section = "overview"|"products"|"orders"|"intake"|"reports"|"promos"|"settings"|"analytics"|"system";

const ADMIN_KEY = "sb_admin_v1";
const fmt = (c: number) => `₱${(c/100).toLocaleString("en-PH")}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});
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
      const hasPw = !!sessionStorage.getItem(PW_KEY);
      if (flagged && !hasPw) { localStorage.removeItem(ADMIN_KEY); return false; }
      return flagged;
    } catch { return false; }
  });
  const logout = () => {
    try { localStorage.removeItem(ADMIN_KEY); sessionStorage.removeItem(PW_KEY); sessionStorage.removeItem("sb_admin_role"); sessionStorage.removeItem("sb_admin_color"); } catch {}
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
type OrderLine = {code:string;name:string;sku:string;size:string;price:string;cost:number|null;found:boolean};
const BLANK_LINE: OrderLine = {code:"",name:"",sku:"",size:"",price:"",cost:null,found:false};

function CreateOrderModal({inventory,onClose,onPlaced}:{inventory:any[];onClose:()=>void;onPlaced:()=>void}){
  const [cust,setCust]=useState({name:"",contact:"",email:"",address:"",region:"",city:"",notes:""});
  const [pm,setPm]=useState("cod");
  const [shipFee,setShipFee]=useState("");
  const [lines,setLines]=useState<OrderLine[]>([{...BLANK_LINE}]);
  const [placing,setPlacing]=useState(false);

  const lookup=(code:string)=> (inventory||[]).find((p:any)=>(p.itemCode||"").toUpperCase()===code.trim().toUpperCase());
  const setLine=(i:number,patch:Partial<OrderLine>)=>setLines(ls=>ls.map((l,j)=>j===i?{...l,...patch}:l));
  const onCode=(i:number,raw:string)=>{
    const code=raw.toUpperCase();
    const hit=code&&code!=="PO"?lookup(code):null;
    if(hit) setLine(i,{code,name:hit.name,sku:hit.sku||"",size:hit.size||"",
      price:String(Math.round((hit.sellingPrice||hit.srp||0)/100)),cost:hit.unitCost||null,found:true});
    else setLine(i,{code,found:false,cost:null});
  };
  const subtotal=lines.reduce((s,l)=>s+(Math.round(Number(l.price)*100)||0),0);
  const fee=Math.round(Number(shipFee||0)*100)||0;

  const place=async()=>{
    const items=lines.filter(l=>l.name.trim()&&Number(l.price)>0).map(l=>({
      id:l.found?l.code:(l.code.trim().toUpperCase()==="PO"?"PO":l.code.trim()),
      name:l.name.trim(),sku:l.sku.trim(),size:l.size.trim(),
      price:Math.round(Number(l.price)*100),qty:1,brand:"",imageUrl:"",
    }));
    if(!cust.name.trim()){toast.error("Customer name is required");return;}
    if(!items.length){toast.error("Add at least one item with a name and price");return;}
    setPlacing(true);
    try{
      const orderData:any={
        order_number:`SB-${String(Math.floor(1e9+Math.random()*9e9))}`,
        customer_name:cust.name.trim(),customer_email:cust.email.trim(),
        contact_number:cust.contact.trim(),shipping_address:cust.address.trim(),
        region:cust.region.trim(),city:cust.city.trim(),notes:cust.notes.trim(),
        items,subtotal,shipping_fee:fee,discount_amount:0,total:subtotal+fee,
        payment_method:pm,source:"manual",
      };
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
            <p className="text-[10px] font-bold tracking-[.15em] uppercase text-[#C9A84C]">Create Order — Manual</p>
            <p className="text-sm font-black text-white">FB / Walk-in / Phone order → same system as website</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input className={inp} placeholder="Customer name *" value={cust.name} onChange={e=>setCust({...cust,name:e.target.value})}/>
            <input className={inp} placeholder="Contact number" value={cust.contact} onChange={e=>setCust({...cust,contact:e.target.value})}/>
            <input className={inp} placeholder="Email (optional)" value={cust.email} onChange={e=>setCust({...cust,email:e.target.value})}/>
            <input className={`${inp} col-span-2`} placeholder="Delivery address" value={cust.address} onChange={e=>setCust({...cust,address:e.target.value})}/>
            <select className={inp} value={pm} onChange={e=>setPm(e.target.value)}>
              <option value="cod">COD</option><option value="gcash">GCash</option><option value="maya">Maya</option>
              <option value="bdo">BDO</option><option value="bpi">BPI</option><option value="bank">Bank Transfer</option>
            </select>
            <input className={inp} placeholder="Region" value={cust.region} onChange={e=>setCust({...cust,region:e.target.value})}/>
            <input className={inp} placeholder="City" value={cust.city} onChange={e=>setCust({...cust,city:e.target.value})}/>
            <input className={inp} placeholder="Notes / special request" value={cust.notes} onChange={e=>setCust({...cust,notes:e.target.value})}/>
          </div>

          <div>
            <div className="grid grid-cols-[110px_1fr_90px_64px_90px] gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 px-0.5">
              <span>Item code</span><span>Model</span><span>SKU</span><span>Size</span><span>Price ₱</span>
            </div>
            {lines.map((l,i)=>(
              <div key={i} className="mb-2">
                <div className="grid grid-cols-[110px_1fr_90px_64px_90px_28px] gap-2 items-center">
                  <input className={`${inp} font-mono font-bold ${l.found?"border-green-400 bg-green-50":""}`} placeholder="Code / PO"
                    value={l.code} onChange={e=>onCode(i,e.target.value)}/>
                  <input className={`${inp} ${l.found?"bg-green-50":""}`} placeholder="Model name" value={l.name} onChange={e=>setLine(i,{name:e.target.value})}/>
                  <input className={`${inp} ${l.found?"bg-green-50":""}`} placeholder="SKU" value={l.sku} onChange={e=>setLine(i,{sku:e.target.value})}/>
                  <input className={`${inp} ${l.found?"bg-green-50":""}`} placeholder="—" value={l.size} onChange={e=>setLine(i,{size:e.target.value})}/>
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

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Shipping ₱</span>
              <input className={`${inp} w-24`} placeholder="0" inputMode="decimal" value={shipFee} onChange={e=>setShipFee(e.target.value)}/>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total</p>
              <p className="text-2xl font-black text-[#0d2430]">{fmt(subtotal+fee)}</p>
            </div>
          </div>
          <button onClick={place} disabled={placing}
            className="w-full bg-[#0d2430] text-white py-3.5 text-sm font-bold rounded-xl hover:bg-[#122d3a] disabled:opacity-50">
            {placing?"Placing order…":"Place Order — deduct stock & mirror to Google Sheet"}
          </button>
          <p className="text-[10px] text-gray-400 text-center">Atomic: stock is reserved instantly, the order mirrors to the ORDER sheet, and you can generate the invoice from the Orders tab.</p>
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
const getRole=()=>{try{return sessionStorage.getItem("sb_admin_role")||"OWNER"}catch{return "OWNER"}};
const getRoleColor=()=>{try{return sessionStorage.getItem("sb_admin_color")||"#C9A84C"}catch{return "#C9A84C"}};

function parseLabel(raw:string, fxRate:number){
  const text = raw.replace(/[|]/g," ");
  const U = text.toUpperCase();
  const out:any = {};
  // Brand + SKU patterns (pattern beats position — layouts differ per brand)
  const nikeSku = U.match(/\b(\d{6})[-\s]?(\d{3})\b/);
  const adiSku  = U.match(/\b([A-Z]{1,2}[0-9]{4,5})\b/);
  const asicsSku= U.match(/\b(\d{4}[A-Z]\d{3})(?:[-\s]?(\d{3}))?\b/);
  const nbSku   = U.match(/\b([MUW][A-Z]?\d{3,4}[A-Z]{0,4})\b/);
  if (/JORDAN/.test(U)) out.brand="Jordan";
  else if (/NIKE|WMNS/.test(U) || nikeSku) out.brand="Nike";
  else if (/ADIDAS|ORIGINALS/.test(U)) out.brand="Adidas";
  else if (/ASICS/.test(U) || asicsSku) out.brand="ASICS";
  else if (/NEW BALANCE/.test(U)) out.brand="New Balance";
  else if (/CONVERSE/.test(U)) out.brand="Converse";
  else if (/VANS/.test(U)) out.brand="Vans";
  else if (/PUMA/.test(U)) out.brand="Puma";
  if (asicsSku && /ASICS|GEL|\d{4}[A-Z]\d{3}/.test(U)) out.sku = asicsSku[0].replace(/\s/g,"");
  else if (nikeSku && out.brand!=="Adidas") out.sku = `${nikeSku[1]}-${nikeSku[2]}`;
  else if (adiSku && out.brand==="Adidas") out.sku = adiSku[1];
  else if (nbSku && out.brand==="New Balance") out.sku = nbSku[1];
  else if (adiSku) out.sku = adiSku[1];
  // Model: best line that isn't codes/sizes/colorways/origin boilerplate.
  // Colorway lines (FTWWHT/FTWWHT, BLACK / LAVA GLOW) lose to slash-free lines.
  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const candidates = lines.filter(l=>{
    const u=l.toUpperCase();
    if (u.length<4||u.length>40) return false;
    if (/MADE IN|FABRIQU|INDONESIA|VIETNAM|CHINA|UPC|PRICE|\bUS\b|\bUK\b|EUR|\bCM\b|\d{6,}/.test(u)) return false;
    if (/^(ORIGINALS?|SPORTSWEAR|PERFORMANCE|EQUIPMENT|AUTHENTICS?|CLASSICS?|NIKE|ADIDAS|ASICS|PUMA|VANS|CONVERSE|NEW BALANCE|JORDAN)$/.test(u)) return false; // brand taglines aren't models
    return /[A-Z]{3,}/i.test(u) && !/^\d/.test(l);
  });
  const score=(l:string)=>((l.match(/\//g)||[]).length?0:100)+l.length;
  const modelLine = candidates.sort((a,b)=>score(b)-score(a))[0] || "";
  out.model = modelLine;
  // Gender / youth markers — the model line itself counts ("X_PLR J" = junior)
  const MU = modelLine.toUpperCase();
  const isW = /WMNS|WOMEN/.test(U);
  const isY = /\bGS\b|\bPS\b|\bTD\b|\(J\)|JUNIOR|YOUTH/.test(U) || /\bJ$|\bJR$/.test(MU.trim());
  // Sizes — accept fractions and decimals
  const frac=(s:string)=>s.replace(/\s*1\/2|½/,".5").replace(/\s*2\/3|⅔/,".7").replace(/\s*1\/3|⅓/,".3").replace(",",".");
  const us = U.match(/\bUS\D{0,3}(\d{1,2}(?:[.,]5|\s?1\/2|½)?)/)
    || U.match(/\b(\d{1,2}(?:[.,]5|\s?1\/2|½)?)\s*(?:US|M\b|W\b)/)
    || U.match(/(?:^|\s)(\d{1,2}(?:[.,]5|\s?1\/2|½)?)\s+(?:UK|EUR|F)\b/m); // bare "6.5  UK 4" layout
  const eur = U.match(/\b(?:EUR?|F)\W{0,2}(\d{2}(?:[.,]\d|\s?[12]\/3|⅔|½|\s?1\/2)?)/);
  const cm = U.match(/\b(\d{2}(?:[.,]5)?)\s?CM\b/) || U.match(/\bCM\W{0,2}(\d{2}(?:[.,]5)?)/) || U.match(/\bJP\W{0,2}(\d{2}(?:[.,]5)?)/);
  if (us) out.usSize = frac(us[1]) + (isY?"Y":isW?"W":"M");
  if (eur) out.eurSize = frac(eur[1]);
  if (cm) out.cmSize = frac(cm[1]);
  // SRP from price sticker — any sign; ₱ as-is, $/€ converted, bare large number near PRICE
  const php = text.match(/(?:₱|PHP)\s*([\d,]+(?:\.\d{2})?)/i);
  const usd = text.match(/(?:\$|USD)\s*([\d,]+(?:\.\d{2})?)/i);
  const near = text.match(/PRICE[^\d]{0,12}([\d,]+(?:\.\d{2})?)/i);
  const num = (s:string)=>parseFloat(s.replace(/,/g,""));
  if (php) out.srp = String(Math.round(num(php[1])));
  else if (usd) out.srp = String(Math.round(num(usd[1])*fxRate));
  else if (near && num(near[1])>100) out.srp = String(Math.round(num(near[1])));
  return out;
}

function ScanBoxModal({existingCodes,allRows,nextCode,onClose,onSaved}:{existingCodes:Set<string>;allRows:any[];nextCode:string;onClose:()=>void;onSaved:()=>void}){
  const [f,setF]=useState<Intake>({...BLANK_INTAKE});
  const [fx,setFx]=useState(()=>{try{return Number(localStorage.getItem("sb_fx"))||56}catch{return 56}});
  const [phase,setPhase]=useState<"cam"|"form">("cam");
  const [busy,setBusy]=useState("");
  const [saving,setSaving]=useState(false);
  const [photo,setPhoto]=useState<string|null>(null); // dataURL for upload
  const [showPrice,setShowPrice]=useState(false);
  const videoRef=(window as any).__sbVid||={current:null as HTMLVideoElement|null};
  const streamRef=(window as any).__sbStream||={current:null as MediaStream|null};
  const scanTimer=(window as any).__sbTimer||={current:0};

  const stopCam=()=>{try{streamRef.current?.getTracks().forEach((t:any)=>t.stop());}catch{} streamRef.current=null;
    if(scanTimer.current){clearInterval(scanTimer.current);scanTimer.current=0;}};
  const startCam=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
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
    const c=document.createElement("canvas");
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d")!.drawImage(v,0,0);
    setPhoto(c.toDataURL("image/jpeg",0.85));
    stopCam();setPhase("form");
    setBusy("Reading label…");
    try{
      const BD=(window as any).BarcodeDetector;
      if(BD){try{const det=new BD({formats:["ean_13","upc_a","upc_e","ean_8","code_128"]});
        const codes=await det.detect(c);
        if(codes?.length)setF(p=>p.barcode?p:{...p,barcode:codes[0].rawValue});}catch{}}
      const T=await import("tesseract.js");
      const worker=await (T as any).createWorker("eng");
      const {data}=await worker.recognize(c);
      await worker.terminate();
      const got=parseLabel(data.text||"",fx);
      setF(p=>({...p,
        brand:p.brand||got.brand||"", model:p.model||got.model||"", sku:p.sku||got.sku||"",
        usSize:p.usSize||got.usSize||"", eurSize:p.eurSize||got.eurSize||"", cmSize:p.cmSize||got.cmSize||"",
        srp:p.srp||got.srp||"",
      }));
      toast.success("Label read — check the green fields");
    }catch(e:any){toast.info("Couldn't read text ("+(e.message||e)+") — fill fields manually");}
    finally{setBusy("");}
  };

  const codeNorm=normSBCode(f.code);
  const dup=codeNorm!==""&&existingCodes.has(codeNorm);
  // "Already in the file?" — same barcode, or same SKU + size, flags a possible re-scan.
  // Warning only: identical pairs legitimately exist as separate codes (1 code = 1 pair).
  const dupHits=useMemo(()=>{
    const hits:string[]=[];
    const bc=f.barcode.trim(); const sku=f.sku.trim().toUpperCase(); const sz=f.usSize.trim().toUpperCase();
    (allRows||[]).forEach((r:any)=>{
      if(bc&&String(r.barcode||"")===bc) hits.push(`${r.item_code} (same barcode)`);
      else if(sku&&sz&&String(r.sku||"").toUpperCase()===sku&&String(r.size||"").toUpperCase()===sz) hits.push(`${r.item_code} (same SKU + size)`);
    });
    return hits.slice(0,4);
  },[f.barcode,f.sku,f.usSize,allRows]);

  const save=async()=>{
    if(!codeNorm){toast.error("Item code is required");return;}
    if(dup){toast.error(`Code ${codeNorm} already exists — pick another`);return;}
    if(!f.model.trim()&&!f.sku.trim()){toast.error("Give it at least a model or SKU");return;}
    setSaving(true);
    try{
      const name=[f.brand&&!f.model.toUpperCase().includes(f.brand.toUpperCase())?f.brand:"",f.model].filter(Boolean).join(" ").trim()||f.sku;
      await sb.insert("sb_inventory",{
        item_code:codeNorm, name, sku:f.sku.trim(), size:f.usSize.trim(),
        size_eur:f.eurSize.trim()||null, size_cm:f.cmSize.trim()||null, barcode:f.barcode.trim()||null,
        brand:f.brand.trim()||null, condition:f.cond, category:"Sneakers",
        srp:Math.round(Number(f.srp)||0)*100, selling_price:Math.round(Number(f.selling)||0)*100,
        unit_cost:Math.round(Number(f.unitCost)||0)*100,
        status:"Available", stock:1, tab:"SCAN", added_by:getRole(), date_acquired:new Date().toISOString().slice(0,10),
      });
      // photo upload is best-effort
      if(photo){
        try{
          const pw=(()=>{try{return sessionStorage.getItem("sb_admin_pw")||""}catch{return ""}})();
          await fetch("/api/upload-image",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({password:pw,item_code:codeNorm,sku:f.sku.trim(),content_type:"image/jpeg",base64:photo.split(",")[1]})});
        }catch{}
      }
      toast.success(`${codeNorm} saved — ${name}`);
      onSaved();
      // batch mode: straight back to camera for the next box
      setF({...BLANK_INTAKE});setPhoto(null);setPhase("cam");
    }catch(e:any){toast.error("Save failed: "+(e.message||e));}
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
            <p className="text-xs font-bold text-white">{phase==="cam"?"Point at the box label":"Check & save — green = read from box"}</p>
          </div>
          <button onClick={()=>{stopCam();onClose();}} className="text-white/40 hover:text-white"><X className="h-5 w-5"/></button>
        </div>

        {phase==="cam"&&(
          <div className="p-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video id="sb-scan-video" playsInline muted className="w-full h-full object-cover"/>
              <div className="absolute inset-6 border-2 border-dashed border-[#C9A84C]/80 rounded-lg pointer-events-none"/>
              {f.barcode&&<div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded">✓ barcode {f.barcode}</div>}
            </div>
            <button onClick={capture} className="mt-3 w-full bg-[#C9A84C] text-[#050f12] py-3.5 rounded-xl font-black text-sm">📸 CAPTURE LABEL</button>
            <button onClick={()=>{stopCam();setPhase("form");}} className="mt-2 w-full border border-gray-200 py-2.5 rounded-xl text-xs font-semibold text-gray-500">Skip camera — type manually</button>
          </div>
        )}

        {phase==="form"&&(
          <div className="p-4 space-y-2.5">
            {busy&&<div className="text-xs font-bold text-amber-600 bg-amber-50 rounded-lg px-3 py-2 animate-pulse">{busy}</div>}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-amber-600">🟠 Item code — you enter</label>
              <div className="flex gap-2">
                <input className={`${inp} font-mono font-black text-lg ${dup?"border-red-400 bg-red-50":"border-amber-400 bg-amber-50"}`}
                  value={f.code} onChange={e=>setF({...f,code:e.target.value})} placeholder={nextCode} autoFocus/>
                <button onClick={()=>setF({...f,code:nextCode})} className="text-[10px] font-bold text-[#8a6d25] border border-[#C9A84C] rounded-lg px-2 whitespace-nowrap">use {nextCode}</button>
              </div>
              <p className={`text-[10px] font-semibold ${dup?"text-red-500":codeNorm?"text-green-600":"text-gray-400"}`}>
                {dup?`✗ ${codeNorm} already exists`:codeNorm?`✓ ${codeNorm} is free`:"type the code on the box / your series"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[9px] font-bold uppercase text-gray-400">Brand</label>
                <input className={`${inp} ${f.brand?auto:""}`} value={f.brand} onChange={e=>setF({...f,brand:e.target.value})}/></div>
              <div><label className="text-[9px] font-bold uppercase text-gray-400">SKU</label>
                <input className={`${inp} ${f.sku?auto:""}`} value={f.sku} onChange={e=>setF({...f,sku:e.target.value})}/></div>
            </div>
            <div><label className="text-[9px] font-bold uppercase text-gray-400">Model</label>
              <input className={`${inp} ${f.model?auto:""}`} value={f.model} onChange={e=>setF({...f,model:e.target.value})}/></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[9px] font-bold uppercase text-gray-400">Size US</label>
                <input className={`${inp} ${f.usSize?auto:""}`} value={f.usSize} onChange={e=>setF({...f,usSize:e.target.value})} placeholder="6.5W"/></div>
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
                <div><label className="text-[9px] font-bold uppercase text-gray-400">Unit cost ₱</label>
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
      const [raw,log,loy,promos,reviews,wl,settings] = await Promise.all([
        sb.select("sb_inventory","select=item_code,name,sku,size,srp,selling_price,unit_cost,status,stock,tab,updated_at"),
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

  useEffect(()=>{if(isAdmin&&!isStaff){loadProducts();loadOrders();}}, [isAdmin]); // staff: scanner only — no order/product reads

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

  const [channelFilter,setChannelFilter]=useState<"all"|"website"|"sheet_import">("all");
  const [ordersShown,setOrdersShown]=useState(25);
  useEffect(()=>{setOrdersShown(25);},[orderFilter,channelFilter]);
  const filteredOrders = useMemo(()=>
    sbOrders.filter(o=>(orderFilter==="all"||o.status===orderFilter)&&(channelFilter==="all"||(o.source||"website")===channelFilter)),
    [sbOrders,orderFilter,channelFilter]);

  const stats = useMemo(()=>{
    // Raw inventory items (each row = 1 unit in stock)
    const rawItems = Array.isArray(inventory) ? inventory : [];
    // Total Assets = sum of UNIT COST (what you paid) — your actual inventory investment
    const totalAssets = rawItems.reduce((s:number, item:any) =>
      s + (item.unitCost || 0), 0);
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
  },[inventory,inventoryGrouped,sbOrders]);

  // ── Shoebox intake / Latest Inventory ──
  const [scanBox,setScanBox]=useState(false);
  const [intakeRows,setIntakeRows]=useState<any[]>([]);
  const [intakeLoading,setIntakeLoading]=useState(false);
  const [intakeSearch,setIntakeSearch]=useState("");
  const [intakeCond,setIntakeCond]=useState("All");
  const intakeAll=false; // Latest Inventory is the scan log ONLY — full stock lives in Products & Inventory
  const [intakeShown,setIntakeShown]=useState(50);
  const loadIntake=async()=>{
    setIntakeLoading(true);
    try{setIntakeRows(await sb.select("sb_inventory","select=item_code,name,brand,sku,size,size_eur,size_cm,barcode,srp,selling_price,status,condition,tab,added_by,created_at&order=created_at.desc&limit=1000"));}
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
  const filteredIntake=useMemo(()=>intakeRows.filter((r:any)=>{
    if(!intakeAll&&r.tab!=="SCAN")return false; // intake log = scanned pairs only by default
    if(intakeCond!=="All"&&(r.condition||"Good")!==intakeCond&&!(intakeCond==="Good"&&(r.condition||"")==="New"))return false;
    if(!intakeSearch)return true;
    const q=intakeSearch.toLowerCase();
    return [r.item_code,r.name,r.brand,r.sku,r.size,r.size_eur,r.size_cm,r.barcode].some(v=>String(v||"").toLowerCase().includes(q));
  }),[intakeRows,intakeSearch,intakeCond,intakeAll]);
  useEffect(()=>{setIntakeShown(50);},[intakeSearch,intakeCond,intakeAll]);
  const intakeCSV=()=>{
    const cols=["item_code","brand","name","sku","size","size_eur","size_cm","barcode","srp","status","condition","created_at"];
    const esc=(v:any)=>{const t=String(v??"");return /[",\n]/.test(t)?('"'+t.replace(/"/g,'""')+'"'):t;};
    const csv=[cols.join(","),...filteredIntake.map((r:any)=>cols.map(c=>esc(c==="srp"?(r.srp||0)/100:r[c])).join(","))].join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`sb_latest_inventory_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  };

  // ── Overview: date range, KPIs, chart, channels, activity ──
  const [createOrder,setCreateOrder]=useState(false);
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
      const pw = (()=>{try{return sessionStorage.getItem(PW_KEY)||""}catch{return ""}})();
      const res = await fetch("/api/upload-image",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({password:pw,item_code:p.itemCode,sku:p.sku||"",content_type:file.type,base64})});
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
  const startEdit = (p:any) => { setEditingRow(p.itemCode); setEditValues({name:p.name,sku:p.sku,size:p.size,srp:Math.round((p.srp||0)/100),selling_price:Math.round((p.sellingPrice||0)/100),stock:p.stock??1,status:canonStatus(p.status)}); };
  const cancelEdit = () => { setEditingRow(null); setEditValues({}); };
  const saveEdit = async (itemCode:string) => {
    setSavingRow(itemCode);
    try {
      const payload = {item_code:itemCode,name:editValues.name,sku:editValues.sku,size:editValues.size,
        srp:Math.round(Number(editValues.srp)*100),selling_price:Math.round(Number(editValues.selling_price)*100),
        stock:Number(editValues.stock),status:editValues.status||"Available",updated_at:new Date().toISOString()};
      await sb.upsert('sb_inventory','on_conflict=item_code',payload);
      toast.success('Saved!');
      setEditingRow(null); setEditValues({});
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
      const pw=(()=>{try{return sessionStorage.getItem("sb_admin_pw")||""}catch{return ""}})();
      const r=await fetch("/api/generate-invoice",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({password:pw,order_number:o.order_number})});
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
      const pw=(()=>{try{return sessionStorage.getItem("sb_admin_pw")||""}catch{return ""}})();
      const r=await fetch("/api/send-invoice",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({password:pw,order_number:o.order_number})});
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
      const pw=(()=>{try{return sessionStorage.getItem("sb_admin_pw")||""}catch{return ""}})();
      const res=await fetch("/api/parse-shipping-receipt",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({password:pw,fileBase64:base64,mimeType:file.type})});
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
  const setPaymentStatus = async (o:any, ps:string) => {
    try{
      await sb.update("sb_orders",`id=eq.${o.id}`,{payment_status:ps,updated_at:new Date().toISOString()});
      toast.success("Payment "+ps); loadOrders();
    }catch(err:any){toast.error("Save failed: "+(err.message||err));}
  };

  const NAV = [
    {id:"overview" as Section, icon:LayoutDashboard, label:"Dashboard"},
    {id:"orders"    as Section, icon:ShoppingCart,   label:"Orders"},
    {id:"products"  as Section, icon:Package,        label:"Products & Inventory"},
    {id:"intake"    as Section, icon:QrCode,         label:"Latest Inventory"},
    {id:"reports"   as Section, icon:TrendingUp,     label:"Sales & Reports"},
    {id:"promos"    as Section, icon:Tag,            label:"Vouchers & Promos"},
    {id:"analytics" as Section, icon:BarChart3,      label:"Analytics"},
    {id:"system"    as Section, icon:Database,       label:"System"},
    {id:"settings"  as Section, icon:Settings,       label:"Settings"},
  ];

  // ─── Login ──────────────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-[#F7F4EF] flex">
      {qrModal?.open && <QRModal itemCode={qrModal.itemCode} name={qrModal.name} onClose={()=>setQrModal(null)}/>}
      {productModal.open&&<ProductModal product={productModal.product} onClose={()=>setProductModal({open:false})} onSave={()=>{setProductModal({open:false});loadProducts();}}/>}
      {createOrder&&<CreateOrderModal inventory={inventory||[]} onClose={()=>setCreateOrder(false)} onPlaced={()=>{loadOrders();refetchInv();refreshInventory().catch(()=>{});}}/>}
      {scanBox&&<ScanBoxModal existingCodes={existingCodes} allRows={intakeRows} nextCode={nextCode}
        onClose={()=>setScanBox(false)}
        onSaved={()=>{loadIntake();refetchInv();refreshInventory().catch(()=>{});}}/>}

      {/* Sidebar */}
      <aside className={`${sidebarOpen?"w-56":"w-14"} flex-shrink-0 bg-[#050f12] flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-y-auto`}>
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
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          {section==="overview"?(
            <div className="leading-tight">
              <h1 className="text-lg font-black text-[#0d2430] tracking-tight">
                {(()=>{const h=new Date().getHours();return h<12?"Good Morning!":h<18?"Good Afternoon!":"Good Evening!";})()}
              </h1>
              <p className="text-[11px] text-gray-400">SoleBlessing Operations Dashboard</p>
            </div>
          ):(
          <h1 className="text-lg font-black text-[#0d2430] tracking-tight capitalize">
            {section==="promos"?"Vouchers & Promos":section==="reports"?"Sales & Reports":section==="intake"?"Latest Inventory":section==="analytics"?"Analytics":section==="system"?"System":section.charAt(0).toUpperCase()+section.slice(1)}
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
              className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`}/> Sync Sheets
            </button>}
            {!isStaff&&<button onClick={()=>setLocation("/upload-payment")}
              className="flex items-center gap-2 border border-gray-200 text-[#0d2430] px-4 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
              <Zap className="h-3.5 w-3.5"/> Payment Portal
            </button>}
          </div>
        </div>

        <div className="p-8">

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
                              :<span className="text-[11px] text-gray-400">{p.unitCost>0?("₱"+(p.unitCost/100).toLocaleString("en-PH")):"-"}</span>}
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
                <div className="flex items-center gap-1">
                  {([["all","All"],["website","🌐 Website"],["sheet_import","📋 FB Form"]] as const).map(([v,l])=>(
                    <button key={v} onClick={()=>setChannelFilter(v)}
                      className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border ${channelFilter===v?"bg-[#0d2430] text-white border-[#0d2430]":"bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>{l}</button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{filteredOrders.length} orders</span>
                <label className={`ml-auto flex items-center gap-2 bg-[#C9A84C] text-[#0d2430] px-3 py-2 text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 ${receiptBusy?"opacity-50 pointer-events-none":""}`}>
                  <Download className="h-3.5 w-3.5 rotate-180"/> {receiptBusy?"Scanning…":"Scan courier receipt"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e=>{const f=e.target.files?.[0]; e.currentTarget.value=""; if(f) scanReceipt(f);}}/>
                </label>
                <button onClick={loadOrders} className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
                  <RefreshCw className="h-3.5 w-3.5"/> Refresh
                </button>
                <a href="https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#0d2430] text-white px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a]">
                  <ExternalLink className="h-3.5 w-3.5"/> Sheet archive
                </a>
              </div>
              {receiptScan&&(
                <div className={`border rounded-xl p-4 mb-4 ${receiptScan.candidates?.length?"border-emerald-300 bg-emerald-50":"border-amber-300 bg-amber-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">
                      {receiptScan.candidates?.length?"Receipt scanned — match found":"Receipt scanned — no confident match"}
                    </p>
                    <button onClick={()=>setReceiptScan(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4"/></button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#0d2430] mb-3">
                    <span>Courier: <b>{receiptScan.courier||"—"}</b></span>
                    <span>Tracking: <b className="font-mono">{receiptScan.tracking||"not detected"}</b></span>
                    <span className="col-span-2">{receiptScan.receipt_url&&<a href={receiptScan.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[#8a6d25] font-semibold underline">View saved receipt</a>}</span>
                  </div>
                  {receiptScan.candidates?.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">Attach to:</span>
                      {receiptScan.candidates.map((c:any)=>(
                        <button key={c.order_number} onClick={()=>setReceiptScan({...receiptScan,chosen:c.order_number})}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${receiptScan.chosen===c.order_number?"bg-[#0d2430] text-white border-[#0d2430]":"bg-white text-[#0d2430] border-gray-200 hover:border-[#C9A84C]"}`}>
                          {c.order_number} · {c.customer_name} · {c.score}%
                        </button>
                      ))}
                      <button onClick={confirmReceipt}
                        className="ml-auto text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:opacity-90">
                        Confirm — save tracking & mark shipped
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700">No open order matched the receiver on this receipt. Enter courier/tracking manually on the right order below.</p>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {filteredOrders.slice(0,ordersShown).map(o=>(
                  <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[#0d2430]">{o.order_number}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status]||"bg-gray-100 text-gray-600"}`}>{o.status}</span>
                          {o.promo_code&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">🏷 {o.promo_code}</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(o.source||"website")==="website"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"}`}>
                            {(o.source||"website")==="website"?"🌐 Website":"📋 FB Form"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{o.customer_name} · {o.contact_number} · {fmtDate(o.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#0d2430]">{fmt(o.total)}</div>
                        {o.discount_amount>0&&<div className="text-[10px] text-green-600">Saved {fmt(o.discount_amount)}</div>}
                        <div className="text-[10px] text-gray-400 capitalize">{o.payment_method?.replace("_"," ")}</div>
                      </div>
                    </div>
                    <div className="bg-[#F7F4EF] rounded-lg p-3 mb-3 text-xs text-gray-600 space-y-1">
                      {(o.items||[]).slice(0,3).map((item:any,i:number)=>(
                        <div key={i} className="flex justify-between">
                          <span>{item.name} · Size {item.size} × {item.qty}</span>
                          <span className="font-semibold">{fmt(item.price*item.qty)}</span>
                        </div>
                      ))}
                      {(o.items||[]).length>3&&<div className="text-gray-400">+{o.items.length-3} more</div>}
                    </div>
                    <div className="text-xs text-gray-500 mb-3"><strong>Ship to:</strong> {o.shipping_address}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-medium">Update:</span>
                      <Select value={o.status} onValueChange={val=>updateOrderStatus(o.id,val)}>
                        <SelectTrigger className="w-36 h-8 text-xs border-gray-200"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {["pending","paid","processing","shipped","delivered","cancelled"].map(s=>(
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {o.payment_proof_url&&(
                        <a href={o.payment_proof_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#C9A84C] font-semibold hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3"/> View Proof
                        </a>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.payment_status==="verified"?"bg-emerald-100 text-emerald-700":o.payment_status==="submitted"?"bg-blue-100 text-blue-700":"bg-gray-100 text-gray-500"}`}>
                        pay: {o.payment_status||"pending"}
                      </span>
                      {o.payment_status==="submitted"&&(
                        <button onClick={()=>setPaymentStatus(o,"verified")}
                          className="text-[11px] font-bold text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-lg hover:bg-emerald-50">Verify payment</button>
                      )}
                      {o.invoice_url
                        ? <span className="flex items-center gap-1 flex-wrap">
                            <a href={o.invoice_url} target="_blank" rel="noopener noreferrer"
                              title={o.invoice_sent_at?`Emailed to customer ${fmtDate(o.invoice_sent_at)}`:"Invoice created — not emailed yet"}
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${o.invoice_sent_at
                                ?"bg-green-600 text-white border border-green-600 hover:bg-green-700 shadow-sm"
                                :"text-[#8a6d25] border border-[#C9A84C] hover:bg-[#C9A84C]/10"}`}>
                              {o.invoice_sent_at?<>✓ Invoice</>:<><ExternalLink className="h-3 w-3"/> Invoice</>}</a>
                            <button onClick={()=>generateInvoice(o,true)} disabled={invBusy===o.id} title="Create a new invoice and replace the link"
                              className="text-[11px] font-bold text-gray-500 border border-gray-200 px-2 py-0.5 rounded-lg hover:border-[#C9A84C] hover:text-[#8a6d25] disabled:opacity-50">
                              {invBusy===o.id?"…":"↻ Change"}</button>
                            {o.invoice_sent_at
                              ? <button onClick={()=>sendInvoice(o,true)} disabled={sendBusy===o.id} title="Email the invoice again"
                                  className="text-[11px] font-bold text-green-700 border border-green-300 px-2 py-0.5 rounded-lg hover:bg-green-50 disabled:opacity-50">
                                  {sendBusy===o.id?"…":"📧 ↻"}</button>
                              : <button onClick={()=>sendInvoice(o)} disabled={sendBusy===o.id}
                                  title={o.customer_email?`Email the invoice to ${o.customer_email}`:"No email on this order"}
                                  className="text-[11px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                                  {sendBusy===o.id?"Sending…":"📧 Send invoice"}</button>}
                          </span>
                        : <button onClick={()=>generateInvoice(o)} disabled={invBusy===o.id}
                            className="text-[11px] font-bold bg-[#C9A84C] text-[#0d2430] px-2.5 py-0.5 rounded-lg hover:opacity-90 disabled:opacity-50">
                            {invBusy===o.id?"Generating…":"Generate invoice"}</button>}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                      <span className="text-xs text-gray-500 font-medium">Ship:</span>
                      <input placeholder="Courier (J&T, LBC…)" defaultValue={o.courier||""}
                        onChange={e=>setShipEdit(prev=>({...prev,[o.id]:{...prev[o.id],courier:e.target.value}}))}
                        className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#C9A84C]"/>
                      <input placeholder="Tracking #" defaultValue={o.tracking_reference||""}
                        onChange={e=>setShipEdit(prev=>({...prev,[o.id]:{...prev[o.id],tracking_reference:e.target.value}}))}
                        className="w-40 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#C9A84C] font-mono"/>
                      <button onClick={()=>saveFulfillment(o)} disabled={!shipEdit[o.id]}
                        className="text-[11px] font-bold bg-[#0d2430] text-white px-3 py-1 rounded-lg hover:opacity-90 disabled:opacity-40">Save</button>
                      {o.courier&&o.tracking_reference&&!shipEdit[o.id]&&
                        <span className="text-[11px] text-gray-400">{o.courier} · {o.tracking_reference}</span>}
                    </div>
                  </div>
                ))}
                {filteredOrders.length===0&&<div className="bg-white border border-gray-100 rounded-xl py-16 text-center text-sm text-gray-400">No orders found</div>}
                {filteredOrders.length>ordersShown&&(
                  <button onClick={()=>setOrdersShown(n=>n+50)}
                    className="w-full border border-gray-200 bg-white text-[#0d2430] py-2.5 text-xs font-bold rounded-xl hover:bg-gray-50">
                    Show more ({filteredOrders.length-ordersShown} remaining)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── PROMO CODES ── */}
          {section==="promos"&&<AdminPromos/>}

          {/* ── SETTINGS ── */}
          {section==="settings"&&<AdminSettings/>}

          {/* ── ANALYTICS ── */}
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/>
                    <input value={intakeSearch} onChange={e=>setIntakeSearch(e.target.value)}
                      placeholder="code / model / SKU / barcode / any size"
                      className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs w-64 outline-none focus:border-[#C9A84C]"/>
                  </div>
                  <select value={intakeCond} onChange={e=>setIntakeCond(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 text-xs outline-none">
                    {["All","Good","Stained","Missing pair","Unknown"].map(c=><option key={c}>{c}</option>)}
                  </select>
                  <span className="text-[11px] font-bold text-gray-400 self-center">📷 {scannedCount} scanned pair{scannedCount===1?"":"s"}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setScanBox(true)}
                    className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-black rounded-lg hover:bg-[#122d3a]">
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
                <table className="w-full text-sm min-w-[980px]">
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
                          <td className="px-2 text-xs font-medium max-w-[180px] truncate">{r.name}</td>
                          <td className="px-2 font-mono text-[11px] text-gray-500">{r.sku||"—"}</td>
                          <td className="px-2 text-xs font-bold">{r.size||"—"}</td>
                          <td className="px-2 text-xs text-gray-500">{r.size_eur||"—"}</td>
                          <td className="px-2 text-xs text-gray-500">{r.size_cm||"—"}</td>
                          <td className="px-2 font-mono text-[10px] text-gray-400">{r.barcode?("…"+String(r.barcode).slice(-6)):"—"}</td>
                          <td className="px-2 text-xs font-bold bg-[#C9A84C]/[.06]">{r.srp?((r.srp/100).toLocaleString("en-PH")):"—"}</td>
                          <td className="px-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${condCls}`}>{cond}</span>
                            {r.status==="Sold"&&<span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-800 text-white">Sold</span>}</td>
                          <td className="px-2">{r.added_by
                            ?<span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{background:BY_COLORS[r.added_by]||"#6b7280"}}>{r.added_by}</span>
                            :<span className="text-gray-300 text-[10px]">—</span>}</td>
                          <td className="px-2 text-[10px] text-gray-400 whitespace-nowrap">{r.created_at?fmtDate(r.created_at):"—"}</td>
                          <td className="px-2 whitespace-nowrap">
                            <button title="Edit in Products" onClick={()=>{setSearch(r.item_code);setSection("products");}} className="text-gray-400 hover:text-[#0d2430] mr-1"><Edit2 className="h-3.5 w-3.5"/></button>
                            <button title="QR sticker" onClick={()=>setQrModal({open:true,itemCode:r.item_code,name:r.name})} className="text-gray-400 hover:text-[#0d2430]"><QrCode className="h-3.5 w-3.5"/></button>
                          </td>
                        </tr>
                      );})}
                    {!intakeLoading&&filteredIntake.length===0&&<tr><td colSpan={14} className="px-4 py-10 text-center text-sm text-gray-400">
                      {!intakeSearch&&intakeCond==="All"
                        ?<>Nothing scanned yet — hit <b>📷 SCAN SHOEBOX</b> to log your first pair.<br/><span className="text-[11px]">Everything else stays in Products &amp; Inventory.</span></>
                        :"No matches"}</td></tr>}
                    {intakeLoading&&<tr><td colSpan={14} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td></tr>}
                  </tbody>
                </table>
              </div>
              {filteredIntake.length>intakeShown&&(
                <button onClick={()=>setIntakeShown(n=>n+50)} className="w-full border border-gray-200 rounded-lg py-2 text-xs font-bold text-gray-500 hover:bg-gray-50">
                  Show 50 more ({filteredIntake.length-intakeShown} left)
                </button>
              )}
              <p className="text-[10px] text-gray-400">Newest first. <b>Good/Stained</b> are sellable once priced · <b>Missing pair/Unknown</b> never reach the website · ✏️ opens the item in Products for full editing · QR reprints the box sticker.</p>
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
                  <button onClick={()=>setMissingShown(n=>n+30)}
                    className="mt-3 w-full border border-gray-200 rounded-lg py-2 text-xs font-bold text-gray-500 hover:bg-gray-50">
                    Show {Math.min(30,missingCost.length-missingShown)} more ({missingCost.length-missingShown} left)
                  </button>
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
