import { trpc } from "@/lib/trpc";
import { sb } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Shield, ChevronRight, Lock, LogOut, Zap, ExternalLink,
  Search, RefreshCw, AlertTriangle, TrendingUp, Plus,
  Edit2, Trash2, X, Save, Eye, Settings, Tag
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminSettings from "./Settings";
import { useInventory, refreshInventory } from "@/hooks/useInventory";
import AdminPromos from "./Promos";

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

  const filteredInv = useMemo(()=>
    !search?inventoryGrouped:inventoryGrouped.filter(p=>
      p.name?.toLowerCase().includes(search.toLowerCase())||p.sku?.toLowerCase().includes(search.toLowerCase())),
    [inventoryGrouped,search]);

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

  const stats = useMemo(()=>({
    total:inventoryGrouped.length,
    lowStock:inventoryGrouped.filter(p=>p.totalStock<=1&&p.totalStock>0).length,
    outStock:inventoryGrouped.filter(p=>p.totalStock===0).length,
    totalOrders:sbOrders.length,
    pendingOrders:sbOrders.filter(o=>o.status==="pending").length,
    revenue:sbOrders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+o.total,0),
  }),[inventoryGrouped,sbOrders]);

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
    {id:"inventory" as Section, icon:Package,        label:"Inventory"},
    {id:"products"  as Section, icon:Plus,           label:"Products"},
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {label:"Sheet Inventory",value:stats.total,icon:Package,color:"text-blue-600",bg:"bg-blue-50"},
                  {label:"Low/Out Stock",value:stats.lowStock+stats.outStock,icon:AlertTriangle,color:"text-amber-600",bg:"bg-amber-50"},
                  {label:"Total Orders",value:stats.totalOrders,icon:ShoppingCart,color:"text-purple-600",bg:"bg-purple-50"},
                  {label:"Revenue",value:fmt(stats.revenue),icon:TrendingUp,color:"text-green-600",bg:"bg-green-50"},
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

          {/* ── INVENTORY ── */}
          {section==="inventory"&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                  <input placeholder="Search name or SKU…" value={search} onChange={e=>setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-[#0d2430]"/>
                </div>
                <span className="text-xs text-gray-400">{filteredInv.length} products</span>
                <button onClick={()=>{syncInventory();}} disabled={syncing}
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
                        <td className="px-5 py-3"><div className="flex items-center gap-3">
                          {p.imageUrl?<img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded bg-gray-100 flex-shrink-0"/>
                            :<div className="w-10 h-10 bg-[#EDE9E3] rounded flex items-center justify-center text-lg flex-shrink-0">👟</div>}
                          <div><div className="font-medium text-[#0d2430] text-xs leading-tight max-w-[200px] truncate">{p.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{p.itemCode}</div></div>
                        </div></td>
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

          {/* ── PRODUCTS (Supabase) ── */}
          {section==="products"&&(
            <div>
              {/* Search + category filters */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                  <input placeholder="Search SKU, name…"
                    value={search} onChange={e=>setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-[#0d2430]"/>
                </div>
                <span className="text-xs text-gray-400">{filteredProducts.length} products</span>
                <button onClick={()=>setProductModal({open:true})}
                  className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-bold rounded-xl hover:opacity-90 ml-auto">
                  <Plus className="h-3.5 w-3.5"/> Add Product
                </button>
                <button onClick={loadProducts}
                  className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-xl hover:bg-gray-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingProducts?"animate-spin":""}`}/>
                </button>
              </div>

              {/* Category pills */}
              <div className="flex gap-2 flex-wrap mb-5">
                {["All",...Array.from(new Set(sbProducts.map((p:any)=>p.category).filter(Boolean)))].map(cat=>{
                  const count = cat==="All" ? sbProducts.length : sbProducts.filter((p:any)=>p.category===cat).length;
                  const active = productCategory===cat;
                  return(
                    <button key={cat} onClick={()=>setProductCategory(cat)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        active?"bg-[#0d2430] text-white border-[#0d2430]":"bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}>
                      {cat}
                      <span className={`text-[10px] font-black ${active?"text-[#C9A84C]":"text-gray-400"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Products table */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {loadingProducts ? (
                  <div className="py-16 text-center"><div className="flex gap-2 justify-center">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div></div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-20 text-center">
                    <Package className="h-10 w-10 text-gray-200 mx-auto mb-3"/>
                    <p className="text-sm text-gray-400 mb-4">No products yet</p>
                    <button onClick={()=>setProductModal({open:true})} className="bg-[#0d2430] text-white px-5 py-2.5 text-xs font-bold rounded-xl hover:bg-[#122d3a]">Add First Product</button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead><tr className="bg-[#F7F4EF] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                      <th className="text-left px-5 py-3 w-12"/>
                      <th className="text-left px-3 py-3 w-28">SKU</th>
                      <th className="text-left px-3 py-3">Product</th>
                      <th className="text-left px-3 py-3 w-32">Sizes</th>
                      <th className="text-right px-3 py-3 w-28">Price</th>
                      <th className="text-right px-3 py-3 w-36">Sale Price</th>
                      <th className="text-center px-3 py-3 w-20">Stock</th>
                      <th className="text-center px-3 py-3 w-16">Status</th>
                      <th className="px-3 py-3 w-20"/>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map((p:any)=>{
                        const discount = p.sale_price && p.price ? Math.round((1-p.sale_price/p.price)*100) : 0;
                        const sizeEntries = p.sizes ? Object.entries(p.sizes) : [];
                        const sizeLabel = sizeEntries.length===1
                          ? `${sizeEntries[0][0]}:${sizeEntries[0][1]}`
                          : sizeEntries.length > 0
                            ? `${sizeEntries.length} sizes`
                            : "—";
                        const totalQty = sizeEntries.reduce((sum:number,[,qty]:any)=>sum+Number(qty),0) || p.stock || 0;
                        const isLow = totalQty > 0 && totalQty <= 3;
                        return(
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            {/* Image */}
                            <td className="px-5 py-3">
                              <div className="w-12 h-12 bg-[#EDE9E3] rounded-lg overflow-hidden flex-shrink-0">
                                {p.images?.[0]
                                  ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover"/>
                                  : <span className="w-full h-full flex items-center justify-center text-lg opacity-20">👟</span>}
                              </div>
                            </td>
                            {/* SKU */}
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-gray-400">{p.sku || "—"}</span>
                            </td>
                            {/* Name + category */}
                            <td className="px-3 py-3">
                              <p className="text-sm font-semibold text-[#0d2430] leading-tight">{p.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{p.category}</p>
                            </td>
                            {/* Size pill */}
                            <td className="px-3 py-3">
                              <div className="relative">
                                <button
                                  onClick={()=>setExpandedSizeId(expandedSizeId===p.id?null:p.id)}
                                  className="flex items-center gap-1.5 border border-[#C9A84C] text-[#0d2430] text-[11px] font-bold px-2.5 py-1 rounded hover:bg-[#C9A84C]/10 transition-colors">
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
                            {/* Price */}
                            <td className="px-3 py-3 text-right">
                              <span className={`text-sm ${p.sale_price?"text-gray-400 line-through text-[11px]":"font-bold text-[#0d2430]"}`}>
                                ₱{(p.price/100).toLocaleString("en-PH",{minimumFractionDigits:2})}
                              </span>
                            </td>
                            {/* Sale price + discount */}
                            <td className="px-3 py-3 text-right">
                              {p.sale_price ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-sm font-bold text-red-500">₱{(p.sale_price/100).toLocaleString("en-PH",{minimumFractionDigits:2})}</span>
                                  {discount>0&&<span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">-{discount}%</span>}
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-300">+ sale</span>
                              )}
                            </td>
                            {/* Stock */}
                            <td className="px-3 py-3 text-center">
                              <span className={`text-xs font-bold ${totalQty===0?"text-red-500":isLow?"text-amber-500":"text-green-600"}`}>
                                {totalQty} units
                              </span>
                            </td>
                            {/* Status */}
                            <td className="px-3 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                p.status==="active"?"bg-[#0d2430] text-white":
                                p.status==="draft"?"bg-gray-100 text-gray-500":"bg-red-100 text-red-500"
                              }`}>{p.status}</span>
                            </td>
                            {/* Actions */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5 justify-end">
                                <button onClick={()=>setProductModal({open:true,product:p})}
                                  className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg hover:bg-[#0d2430] hover:text-white transition-all">
                                  <Edit2 className="h-3.5 w-3.5"/>
                                </button>
                                <button onClick={()=>deleteProduct(p.id)}
                                  className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg hover:bg-red-100 hover:text-red-500 transition-all">
                                  <Trash2 className="h-3.5 w-3.5"/>
                                </button>
                              </div>
                            </td>
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
