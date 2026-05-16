import { trpc } from "@/lib/trpc";
import { sb } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Shield, ChevronRight, Lock, LogOut, Zap, ExternalLink,
  Search, RefreshCw, AlertTriangle, TrendingUp, Plus,
  Edit2, Trash2, X, Save, Eye, Settings, Tag,
  Download, QrCode, Copy,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminSettings from "./Settings";
import { useInventory, refreshInventory } from "@/hooks/useInventory";
import AdminPromos from "./Promos";

type Section = "overview"|"products"|"orders"|"promos"|"settings"|"analytics";

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

function useAdminAuth() {
  const [isAdmin] = useState<boolean>(() => {
    try { return localStorage.getItem(ADMIN_KEY)==="true"; } catch { return false; }
  });
  const logout = () => { localStorage.removeItem(ADMIN_KEY); window.location.reload(); };
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

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [,setLocation] = useLocation();
  const {isAdmin, logout} = useAdminAuth();
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [productModal, setProductModal] = useState<{open:boolean;product?:any}>({open:false});
  const [qrModal, setQrModal] = useState<{open:boolean;itemCode:string;name:string}|null>(null);
  const [tabFilter, setTabFilter] = useState<'all'|'2025'|'2024'>('all');
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
  const syncInventory = async () => {
    setSyncing(true);
    try {
      const { refreshInventory } = await import("@/hooks/useInventory");
      const result = await refreshInventory();
      refetchInv();
      setSyncing(false);
      toast.success(`Synced! ${result.count} products loaded`);
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

  useEffect(()=>{if(isAdmin){loadProducts();loadOrders();}}, [isAdmin]);

  // Close size dropdown on outside click
  useEffect(()=>{
    const handler = ()=>setExpandedSizeId(null);
    document.addEventListener("click", handler);
    return ()=>document.removeEventListener("click", handler);
  },[]);

  const inventoryGrouped = useMemo(()=>{
    if(!inventory) return [];
    const map = new Map<string,any>();
    inventory.forEach(item=>{
      if(!map.has(item.sku)) map.set(item.sku,{...item,sizes:[item.size],totalStock:item.status==="AVAILABLE"?1:0});
      else{const g=map.get(item.sku);if(item.size&&!g.sizes.includes(item.size))g.sizes.push(item.size);if(item.status==="AVAILABLE")g.totalStock++;}
    });
    return Array.from(map.values());
  },[inventory]);


type Section = "overview"|"products"|"orders"|"promos"|"settings"|"analytics";

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

function useAdminAuth() {
  const [isAdmin] = useState<boolean>(() => {
    try { return localStorage.getItem(ADMIN_KEY)==="true"; } catch { return false; }
  });
  const logout = () => { localStorage.removeItem(ADMIN_KEY); window.location.reload(); };
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

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [,setLocation] = useLocation();
  const {isAdmin, logout} = useAdminAuth();
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [productModal, setProductModal] = useState<{open:boolean;product?:any}>({open:false});
  const [qrModal, setQrModal] = useState<{open:boolean;itemCode:string;name:string}|null>(null);
  const [tabFilter, setTabFilter] = useState<'all'|'2025'|'2024'>('all');
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
  const syncInventory = async () => {
    setSyncing(true);
    try {
      const { refreshInventory } = await import("@/hooks/useInventory");
      const result = await refreshInventory();
      refetchInv();
      setSyncing(false);
      toast.success(`Synced! ${result.count} products loaded`);
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

  useEffect(()=>{if(isAdmin){loadProducts();loadOrders();}}, [isAdmin]);

  // Close size dropdown on outside click
  useEffect(()=>{
    const handler = ()=>setExpandedSizeId(null);
    document.addEventListener("click", handler);
    return ()=>document.removeEventListener("click", handler);
  },[]);

  const inventoryGrouped = useMemo(()=>{
    if(!inventory) return [];
    const map = new Map<string,any>();
    inventory.forEach(item=>{
      if(!map.has(item.sku)) map.set(item.sku,{...item,sizes:[item.size],totalStock:item.status==="AVAILABLE"?1:0});
      else{const g=map.get(item.sku);if(item.size&&!g.sizes.includes(item.size))g.sizes.push(item.size);if(item.status==="AVAILABLE")g.totalStock++;}
    });
    return Array.from(map.values());
  },[inventory]);

  const filteredInv = useMemo(()=>{
    const base = Array.isArray(inventory) ? inventory : inventoryGrouped;
    return base.filter((p:any)=>{
      if(tabFilter!=='all' && (p as any).tab!==tabFilter) return false;
      if(!search) return true;
      return p.name?.toLowerCase().includes(search.toLowerCase())||
        p.sku?.toLowerCase().includes(search.toLowerCase())||
        p.itemCode?.toLowerCase().includes(search.toLowerCase())||
        ((p as any).brand||'').toLowerCase().includes(search.toLowerCase());
    });
  },[inventory,inventoryGrouped,search,tabFilter]);

  const filteredProducts = useMemo(()=>
    sbProducts.filter((p:any)=>{
      const matchCat = productCategory==="All" || p.category===productCategory;
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    }),
    [sbProducts, productCategory, search]);

  const filteredOrders = useMemo(()=>
    orderFilter==="all"?sbOrders:sbOrders.filter(o=>o.status===orderFilter),
    [sbOrders,orderFilter]);

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

  const startEdit = (p:any) => { setEditingRow(p.itemCode); setEditValues({name:p.name,sku:p.sku,size:p.size,srp:Math.round((p.srp||0)/100),selling_price:Math.round((p.sellingPrice||0)/100),stock:p.stock??1}); };
  const cancelEdit = () => { setEditingRow(null); setEditValues({}); };
  const saveEdit = async (itemCode:string) => {
    setSavingRow(itemCode);
    try {
      const payload = {item_code:itemCode,name:editValues.name,sku:editValues.sku,size:editValues.size,
        srp:Math.round(Number(editValues.srp)*100),selling_price:Math.round(Number(editValues.selling_price)*100),
        stock:Number(editValues.stock),updated_at:new Date().toISOString()};
      const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY||'';
      const sbUrl = 'https://akualfrqzaierqsfcnkp.supabase.co/rest/v1/sb_inventory';
      const hdrs = {'apikey':sbKey,'Authorization':`Bearer ${sbKey}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'};
      await fetch(sbUrl,{method:'POST',headers:hdrs,body:JSON.stringify(payload)});
      toast.success('Saved!');
      setEditingRow(null); setEditValues({});
      const {refreshInventory} = await import('@/hooks/useInventory');
      await refreshInventory(); refetchInv();
    } catch(e:any){toast.error('Save failed');}
    finally{setSavingRow(null);}
  };
  const resetEdit = async (itemCode:string) => {
    if(!confirm('Reset to Google Sheets data?')) return;
    const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY||'';
    await fetch(`https://akualfrqzaierqsfcnkp.supabase.co/rest/v1/sb_inventory?item_code=eq.${itemCode}`,
      {method:'DELETE',headers:{'apikey':sbKey,'Authorization':`Bearer ${sbKey}`}});
    toast.success('Reset to Sheets');
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
    toast.success("Order updated"); loadOrders();
  };

  const NAV = [
    {id:"overview" as Section, icon:LayoutDashboard, label:"Overview"},
    {id:"products"  as Section, icon:Package,        label:"Products"},
    {id:"orders"    as Section, icon:ShoppingCart,   label:"Orders"},
    {id:"promos"    as Section, icon:Tag,            label:"Promo Codes"},
    {id:"settings"  as Section, icon:Settings,       label:"Settings"},
    {id:"analytics" as Section, icon:BarChart3,      label:"Analytics"},
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
        <form onSubmit={e=>{
          e.preventDefault();
          const correct=import.meta.env.VITE_ADMIN_PW||"SoleBlessing2026!";
          if(password===correct){localStorage.setItem(ADMIN_KEY,"true");window.location.reload();}
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
          Set password: Vercel → Environment Variables → <span className="font-mono text-white/35">VITE_ADMIN_PW</span>
        </p>
      </div>
    </div>
  );

  // ─── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F4EF] flex">
      {qrModal?.open && <QRModal itemCode={qrModal.itemCode} name={qrModal.name} onClose={()=>setQrModal(null)}/>}
      {productModal.open&&<ProductModal product={productModal.product} onClose={()=>setProductModal({open:false})} onSave={()=>{setProductModal({open:false});loadProducts();}}/>}

      {/* Sidebar */}
      <aside className={`${sidebarOpen?"w-56":"w-14"} flex-shrink-0 bg-[#050f12] flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-y-auto`}>
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
          <h1 className="text-lg font-black text-[#0d2430] tracking-tight capitalize">
            {section==="overview"?"Dashboard":section==="promos"?"Promo Codes":section==="analytics"?"Analytics":section.charAt(0).toUpperCase()+section.slice(1)}
          </h1>
          <div className="flex items-center gap-3">
            {section==="products"&&(
              <button onClick={()=>setProductModal({open:true})}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-bold rounded-lg hover:opacity-90">
                <Plus className="h-3.5 w-3.5"/> Add Product
              </button>
            )}
            <button onClick={()=>{syncInventory();}} disabled={syncing}
              className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`}/> Sync Sheets
            </button>
            <button onClick={()=>setLocation("/upload-payment")}
              className="flex items-center gap-2 border border-gray-200 text-[#0d2430] px-4 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
              <Zap className="h-3.5 w-3.5"/> Payment Portal
            </button>
          </div>
        </div>

        <div className="p-8">

          {/* ── OVERVIEW ── */}
          {section==="overview"&&(
            <div className="space-y-6">
              {/* ── Total Assets hero card ── */}
              <div className="bg-[#050f12] rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[.18em] uppercase text-[#C9A84C] mb-1">Total Inventory Cost</p>
                  <div className="text-4xl font-black text-white mb-1">{stats.totalAssets>0?fmt(stats.totalAssets):"—"}</div>
                  <p className="text-xs text-white/40">{stats.totalUnits} units · {stats.total} SKUs</p>
                </div>
                <div className="text-right space-y-1.5">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Retail Value</p>
                    <p className="text-lg font-bold text-white/70">{fmt(stats.retailValue)}</p>
                  </div>
                  {stats.potentialProfit > 0 && (
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Potential Profit</p>
                      <p className="text-sm font-bold text-[#C9A84C]">{fmt(stats.potentialProfit)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Stat cards grid ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  {label:"SKUs",        value:stats.total,                             icon:Package,       color:"text-blue-600",   bg:"bg-blue-50"},
                  {label:"Units",       value:stats.totalUnits,                        icon:Tag,           color:"text-indigo-600", bg:"bg-indigo-50"},
                  {label:"Low Stock",   value:stats.lowStock+stats.outStock,           icon:AlertTriangle, color:"text-amber-600",  bg:"bg-amber-50"},
                  {label:"Orders",      value:stats.totalOrders,                       icon:ShoppingCart,  color:"text-purple-600", bg:"bg-purple-50"},
                  {label:"Revenue",     value:fmt(stats.revenue),                      icon:TrendingUp,    color:"text-green-600",  bg:"bg-green-50"},
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
                    <button onClick={()=>setSection("products")} className="text-xs text-[#C9A84C] font-semibold">View All →</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {inventoryGrouped.filter(p=>p.totalStock<=1).slice(0,6).map(p=>(
                      <div key={p.sku} className="py-3 flex items-center justify-between">
                        <div><div className="text-sm font-medium text-[#0d2430] leading-tight">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{p.sku}</div></div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.totalStock===0?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                          {p.totalStock===0?"Out":"Last Unit"}
                        </span>
                      </div>
                    ))}
                    {inventoryGrouped.filter(p=>p.totalStock<=1).length===0&&<div className="py-6 text-center text-sm text-gray-400">All stocked ✓</div>}
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
                        <div><div className="text-xs font-bold text-[#0d2430]">{o.order_number}</div>
                          <div className="text-[10px] text-gray-400">{o.customer_name} · {fmtDate(o.created_at)}</div></div>
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
                    {label:"SB ORDER Sheet",href:"https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit",icon:"📋"},
                    {label:"Payment Proofs",href:"https://drive.google.com/drive/folders/1MMLgawQE5KKQQqufa2Leoka5zdXV6qIY",icon:"💾"},
                    {label:"Supabase DB",href:"https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp",icon:"🗄️"},
                    {label:"Vercel Deploy",href:"https://vercel.com/maldipias-projects/soleblessing-ecommerce",icon:"▲"},
                    {label:"Payment Portal",href:"/upload-payment",icon:"💳"},
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
                      {t==='all'?'All':t}
                    </button>
                  ))}
                </div>
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

              {/* ── SHEETS INVENTORY TABLE ── */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">
                    Live Inventory <span className="text-[#C9A84C] ml-1">· 2025 Sheet</span>
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
                      ) : filteredInv.map((p:any)=>{
                        const isEditing = editingRow===p.itemCode;
                        const isSaving = savingRow===p.itemCode;
                        const inp = "w-full border border-[#C9A84C] rounded-lg px-2 py-1 text-xs outline-none font-mono bg-white";
                        return(
                        <tr key={p.itemCode} className={`transition-colors ${isEditing?"bg-[#fffbeb]":"hover:bg-gray-50/50"} ${p.edited?"border-l-2 border-[#C9A84C]":""}`}>
                          <td className="px-4 py-2">
                            <div className="w-11 h-11 bg-[#EDE9E3] rounded-lg overflow-hidden flex-shrink-0">
                              {p.imageUrl?<img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"/>:<span className="w-full h-full flex items-center justify-center text-lg opacity-20">👟</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {isEditing
                              ?<input className={inp} value={editValues.name||""} onChange={e=>setEditValues(v=>({...v,name:e.target.value}))}/>
                              :<div><p className="text-xs font-bold text-[#0d2430]">{p.name}</p><div className="flex items-center gap-1.5 mt-0.5"><p className="text-[10px] text-gray-400 font-mono">{p.itemCode}</p><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${(p as any).tab==="2024"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700"}`}>{(p as any).tab||"2025"}</span></div></div>}
                          </td>
                          <td className="px-3 py-2">
                            {(() => {
                              const brand = (p as any).brand || "";
                              const colors: Record<string,string> = {
                                "Nike":       "bg-black text-white",
                                "Jordan":     "bg-red-600 text-white",
                                "Adidas":     "bg-blue-600 text-white",
                                "VEJA":       "bg-green-600 text-white",
                                "On Running": "bg-gray-700 text-white",
                              };
                              return brand
                                ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[brand]||"bg-gray-200 text-gray-700"}`}>{brand}</span>
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
                              ?<input className={inp+" text-center"} type="number" min="0" value={editValues.stock??1} onChange={e=>setEditValues(v=>({...v,stock:e.target.value}))}/>
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
                <span className="text-xs text-gray-400">{filteredOrders.length} orders</span>
                <button onClick={loadOrders} className="ml-auto flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
                  <RefreshCw className="h-3.5 w-3.5"/> Refresh
                </button>
                <a href="https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#0d2430] text-white px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a]">
                  <ExternalLink className="h-3.5 w-3.5"/> Sheets
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
                          {o.promo_code&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">🏷 {o.promo_code}</span>}
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
                    </div>
                  </div>
                ))}
                {filteredOrders.length===0&&<div className="bg-white border border-gray-100 rounded-xl py-16 text-center text-sm text-gray-400">No orders found</div>}
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
        </div>
      </div>
    </div>
  );
}
