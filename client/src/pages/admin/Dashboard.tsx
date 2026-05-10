import { trpc } from "@/lib/trpc";
import { sb } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3,
  Shield, ChevronRight, Lock, LogOut, Zap, ExternalLink,
  Search, RefreshCw, AlertTriangle, TrendingUp, Plus,
  Edit2, Trash2, X, Save, QrCode, Eye
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Section = "overview" | "inventory" | "products" | "orders" | "analytics";
const ADMIN_KEY = "sb_admin_v1";
const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", paid: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800", shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-600",
};

function useAdminAuth() {
  const [isAdmin] = useState<boolean>(() => {
    try { return localStorage.getItem(ADMIN_KEY) === "true"; } catch { return false; }
  });
  const logout = () => { localStorage.removeItem(ADMIN_KEY); window.location.reload(); };
  return { isAdmin, logout };
}

// ─── Product Form Modal ──────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave }: { product?: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    brand: product?.brand || "",
    category: product?.category || "Sneakers",
    description: product?.description || "",
    price: product ? String(product.price / 100) : "",
    sale_price: product?.sale_price ? String(product.sale_price / 100) : "",
    sku: product?.sku || "",
    stock: product ? String(product.stock) : "1",
    featured: product?.featured || false,
    status: product?.status || "active",
    sizes: product?.sizes ? JSON.stringify(product.sizes) : '{"US 7":0,"US 8":0,"US 9":0,"US 10":0}',
    images: product?.images?.join("\n") || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.brand || !form.price) { setErr("Name, brand and price are required."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        name: form.name, brand: form.brand, category: form.category,
        description: form.description || null,
        price: Math.round(parseFloat(form.price) * 100),
        sale_price: form.sale_price ? Math.round(parseFloat(form.sale_price) * 100) : null,
        sku: form.sku || null,
        stock: parseInt(form.stock) || 0,
        featured: form.featured,
        status: form.status,
        sizes: (() => { try { return JSON.parse(form.sizes); } catch { return {}; } })(),
        images: form.images.split("\n").map(s=>s.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      };
      if (product?.id) {
        await sb.update("sb_products", `id=eq.${product.id}`, payload);
      } else {
        await sb.insert("sb_products", payload);
      }
      onSave();
    } catch(e:any) { setErr(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-black text-[#0d2430] text-lg">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Product Name *</label>
              <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Adidas Samba OG Classic"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Brand *</label>
              <input value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder="e.g. Adidas"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
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
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Sale Price (₱) — optional</label>
              <input type="number" value={form.sale_price} onChange={e=>set("sale_price",e.target.value)} placeholder="0.00"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">SKU</label>
              <input value={form.sku} onChange={e=>set("sku",e.target.value)} placeholder="SB-ADI-SAMBA-001"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Total Stock</label>
              <input type="number" value={form.stock} onChange={e=>set("stock",e.target.value)} placeholder="1"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
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
                placeholder="Product description, materials, fit guide..."
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Sizes & Stock (JSON format)</label>
              <textarea value={form.sizes} onChange={e=>set("sizes",e.target.value)} rows={3}
                placeholder={'{"US 7":2,"US 8":5,"US 9":3,"US 10":0}'}
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono outline-none focus:border-[#0d2430] resize-none" />
              <p className="text-[10px] text-gray-400 mt-1">Format: size → quantity. Zero = sold out.</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Image URLs (one per line)</label>
              <textarea value={form.images} onChange={e=>set("images",e.target.value)} rows={3}
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="feat" checked={form.featured} onChange={e=>set("featured",e.target.checked)}
                className="accent-[#0d2430]" />
              <label htmlFor="feat" className="text-sm text-gray-600 cursor-pointer">Featured product (shows on homepage)</label>
            </div>
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#0d2430] text-white py-3 text-sm font-bold tracking-wide uppercase hover:bg-[#122d3a] disabled:opacity-50 rounded flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : product ? "Update Product" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAdmin, logout } = useAdminAuth();
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [productModal, setProductModal] = useState<{ open: boolean; product?: any }>({ open: false });
  const [sbProducts, setSbProducts] = useState<any[]>([]);
  const [sbOrders, setSbOrders] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");

  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = trpc.inventory.list.useQuery(undefined, { enabled: isAdmin });
  const syncMutation = trpc.inventory.refresh.useMutation({
    onSuccess: () => { refetchInv(); setSyncing(false); },
    onError: () => setSyncing(false),
  });

  const loadSbProducts = async () => {
    setLoadingProducts(true);
    try { setSbProducts(await sb.select("sb_products", "order=created_at.desc")); }
    catch(e) { console.error(e); }
    finally { setLoadingProducts(false); }
  };

  const loadSbOrders = async () => {
    setLoadingOrders(true);
    try { setSbOrders(await sb.select("sb_orders", "order=created_at.desc")); }
    catch(e) { console.error(e); }
    finally { setLoadingOrders(false); }
  };

  useEffect(() => { if (isAdmin) { loadSbProducts(); loadSbOrders(); } }, [isAdmin]);

  const inventoryGrouped = useMemo(() => {
    if (!inventory) return [];
    const map = new Map<string, any>();
    inventory.forEach(item => {
      if (!map.has(item.sku)) map.set(item.sku, { ...item, sizes: [item.size], totalStock: item.status === "AVAILABLE" ? 1 : 0 });
      else { const g = map.get(item.sku); if (item.size && !g.sizes.includes(item.size)) g.sizes.push(item.size); if (item.status === "AVAILABLE") g.totalStock++; }
    });
    return Array.from(map.values());
  }, [inventory]);

  const filteredInv = useMemo(() =>
    !search ? inventoryGrouped : inventoryGrouped.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())),
    [inventoryGrouped, search]);

  const filteredOrders = useMemo(() =>
    orderFilter === "all" ? sbOrders : sbOrders.filter(o => o.status === orderFilter),
    [sbOrders, orderFilter]);

  const stats = useMemo(() => ({
    total: inventoryGrouped.length,
    inStock: inventoryGrouped.filter(p=>p.totalStock>0).length,
    lowStock: inventoryGrouped.filter(p=>p.totalStock<=1&&p.totalStock>0).length,
    outStock: inventoryGrouped.filter(p=>p.totalStock===0).length,
    totalOrders: sbOrders.length,
    pendingOrders: sbOrders.filter(o=>o.status==="pending").length,
    revenue: sbOrders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+o.total,0),
  }), [inventoryGrouped, sbOrders]);

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await sb.delete("sb_products", `id=eq.${id}`);
    loadSbProducts();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await sb.update("sb_orders", `id=eq.${id}`, { status, updated_at: new Date().toISOString() });
    loadSbOrders();
  };

  const NAV = [
    { id: "overview" as Section,   icon: LayoutDashboard, label: "Overview"  },
    { id: "inventory" as Section,  icon: Package,         label: "Inventory" },
    { id: "products" as Section,   icon: Plus,            label: "Products"  },
    { id: "orders" as Section,     icon: ShoppingCart,    label: "Orders"    },
    { id: "analytics" as Section,  icon: BarChart3,       label: "Analytics" },
  ];

  // ─── Login ──────────────────────────────────────────────────────────────
  if (!isAdmin) return (
    <div className="min-h-screen bg-[#050f12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-[#C9A84C]" />
          </div>
          <div className="font-black text-2xl tracking-[.14em] text-white uppercase mb-1">SoleBlessing</div>
          <div className="text-xs text-white/30 tracking-widest uppercase">Admin Access</div>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          const correct = import.meta.env.VITE_ADMIN_PW || "SoleBlessing2026!";
          if (password === correct) { localStorage.setItem(ADMIN_KEY, "true"); window.location.reload(); }
          else setLoginError("Wrong password. Try again.");
        }} className="space-y-4">
          <div>
            <label className="text-xs font-semibold tracking-[.1em] uppercase text-white/40 block mb-2">Admin Password</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setLoginError("");}}
              placeholder="Enter admin password" autoFocus
              className="w-full bg-white/[.06] border border-white/[.1] px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] transition-colors rounded placeholder-white/20" />
            {loginError && <p className="text-red-400 text-xs mt-2">{loginError}</p>}
          </div>
          <button type="submit" disabled={!password}
            className="w-full bg-[#C9A84C] text-[#050f12] font-bold tracking-[.12em] uppercase py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
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
      {productModal.open && (
        <ProductModal product={productModal.product} onClose={() => setProductModal({open:false})}
          onSave={() => { setProductModal({open:false}); loadSbProducts(); }} />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen?"w-52":"w-14"} flex-shrink-0 bg-[#050f12] flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-y-auto`}>
        <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[.06]">
          <Shield className="h-5 w-5 text-[#C9A84C] flex-shrink-0" />
          {sidebarOpen && <span className="font-black text-sm tracking-[.1em] text-white uppercase">SoleBlessing</span>}
        </div>
        <nav className="flex-1 py-4 px-2">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${section===n.id?"bg-[#C9A84C]/20 text-[#C9A84C]":"text-white/40 hover:text-white hover:bg-white/[.06]"}`}>
              <n.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium tracking-wide">{n.label}</span>}
            </button>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-white/[.06] space-y-1">
          <button onClick={() => setLocation("/")} className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-white transition-colors">
            <Eye className="h-4 w-4" />{sidebarOpen && <span className="text-xs">View Site</span>}
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />{sidebarOpen && <span className="text-xs">Log Out</span>}
          </button>
          <button onClick={() => setSidebarOpen(s=>!s)} className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-white transition-colors">
            <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen?"rotate-180":""}`} />
            {sidebarOpen && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-black text-[#0d2430] tracking-tight capitalize">
            {section === "products" ? "Product Management" : section === "overview" ? "Dashboard" : section}
          </h1>
          <div className="flex items-center gap-3">
            {section === "products" && (
              <button onClick={() => setProductModal({open:true})}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-bold rounded-lg hover:opacity-90">
                <Plus className="h-3.5 w-3.5" /> Add Product
              </button>
            )}
            <button onClick={() => { setSyncing(true); syncMutation.mutate(); }} disabled={syncing}
              className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing?"animate-spin":""}`} /> Sync Sheets
            </button>
            <button onClick={() => setLocation("/upload-payment")}
              className="flex items-center gap-2 border border-gray-200 text-[#0d2430] px-4 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
              <Zap className="h-3.5 w-3.5" /> Payment Portal
            </button>
          </div>
        </div>

        <div className="p-8">

          {/* ── OVERVIEW ── */}
          {section === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {label:"Sheet Inventory", value:stats.total,       icon:Package,       color:"text-blue-600",   bg:"bg-blue-50"},
                  {label:"Low/Out of Stock",value:stats.lowStock+stats.outStock, icon:AlertTriangle, color:"text-amber-600", bg:"bg-amber-50"},
                  {label:"Total Orders",    value:stats.totalOrders, icon:ShoppingCart,  color:"text-purple-600", bg:"bg-purple-50"},
                  {label:"Revenue",         value:fmt(stats.revenue),icon:TrendingUp,    color:"text-green-600",  bg:"bg-green-50"},
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
                {/* Low stock */}
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

                {/* Recent orders */}
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

              {/* Quick links */}
              <div className="bg-[#050f12] rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Quick Access</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {label:"Inventory Sheet", href:"https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit",icon:"📊"},
                    {label:"SB ORDER Sheet",  href:"https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit",icon:"📋"},
                    {label:"Payment Proofs",  href:`https://drive.google.com/drive/folders/1MMLgawQE5KKQQqufa2Leoka5zdXV6qIY`,icon:"💾"},
                    {label:"Supabase DB",     href:"https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp",icon:"🗄️"},
                    {label:"Vercel Deploy",   href:"https://vercel.com/maldipias-projects/soleblessing-ecommerce",icon:"▲"},
                    {label:"Payment Portal",  href:"/upload-payment",icon:"💳"},
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

          {/* ── INVENTORY (from Sheets) ── */}
          {section === "inventory" && (
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
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded bg-gray-100 flex-shrink-0"/>
                              : <div className="w-10 h-10 bg-[#EDE9E3] rounded flex items-center justify-center text-lg flex-shrink-0">👟</div>}
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
                {filteredInv.length===0&&<div className="text-center py-12 text-sm text-gray-400">{invLoading?"Loading from Google Sheets…":"No products found"}</div>}
              </div>
            </div>
          )}

          {/* ── PRODUCTS (Supabase — admin-managed) ── */}
          {section === "products" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs text-gray-400">Manage products stored in Supabase — these appear on your website independently from Google Sheets.</p>
                <button onClick={loadSbProducts} className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingProducts?"animate-spin":""}`}/> Refresh
                </button>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sbProducts.map(p=>(
                  <div key={p.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-[#EDE9E3] flex items-center justify-center overflow-hidden relative">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover"/>
                        : <span className="text-5xl opacity-20">👟</span>}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {p.featured&&<span className="bg-[#C9A84C] text-[#050f12] text-[9px] font-bold px-2 py-0.5">Featured</span>}
                        {p.status!=="active"&&<span className="bg-gray-800 text-white text-[9px] font-bold px-2 py-0.5 capitalize">{p.status}</span>}
                        {p.sale_price&&<span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5">Sale</span>}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={()=>setProductModal({open:true,product:p})}
                          className="w-7 h-7 bg-white/90 rounded flex items-center justify-center hover:bg-white shadow">
                          <Edit2 className="h-3.5 w-3.5 text-gray-600"/>
                        </button>
                        <button onClick={()=>deleteProduct(p.id)}
                          className="w-7 h-7 bg-white/90 rounded flex items-center justify-center hover:bg-red-50 shadow">
                          <Trash2 className="h-3.5 w-3.5 text-red-400"/>
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[9px] font-bold tracking-[.1em] uppercase text-[#C9A84C] mb-0.5">{p.brand} · {p.category}</p>
                      <p className="text-sm font-semibold text-[#0d2430] leading-tight mb-2">{p.name}</p>
                      <div className="flex items-baseline gap-2">
                        {p.sale_price
                          ? <><span className="text-base font-black text-red-500">{fmt(p.sale_price)}</span><span className="text-xs text-gray-400 line-through">{fmt(p.price)}</span></>
                          : <span className="text-base font-black text-[#0d2430]">{fmt(p.price)}</span>}
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
                {/* Add new card */}
                <div onClick={()=>setProductModal({open:true})}
                  className="bg-white border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#C9A84C] hover:bg-[#C9A84C]/[.02] transition-all min-h-[280px] group">
                  <div className="text-center">
                    <Plus className="h-8 w-8 text-gray-300 group-hover:text-[#C9A84C] mx-auto mb-2 transition-colors"/>
                    <p className="text-sm font-semibold text-gray-400 group-hover:text-[#C9A84C] transition-colors">Add New Product</p>
                  </div>
                </div>
                {sbProducts.length===0&&!loadingProducts&&(
                  <div className="bg-white border border-gray-100 rounded-xl p-8 text-center col-span-full">
                    <Package className="h-10 w-10 text-gray-200 mx-auto mb-3"/>
                    <p className="text-sm text-gray-400">No products yet. Click "Add Product" to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS (Supabase) ── */}
          {section === "orders" && (
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
                <button onClick={loadSbOrders} className="ml-auto flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50">
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
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{o.customer_name} · {o.contact_number} · {fmtDate(o.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#0d2430]">{fmt(o.total)}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{o.payment_method?.replace("_"," ")}</div>
                      </div>
                    </div>
                    {/* Items */}
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
                      <span className="text-xs text-gray-500 font-medium">Update Status:</span>
                      <Select value={o.status} onValueChange={(val)=>updateOrderStatus(o.id,val)}>
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
                {filteredOrders.length===0&&<div className="bg-white border border-gray-100 rounded-xl py-16 text-center text-sm text-gray-400">No orders yet</div>}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {section === "analytics" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-5">Inventory Health</h3>
                {[
                  {label:"Total SKUs",value:stats.total,pct:100,color:"bg-blue-500"},
                  {label:"In Stock",value:stats.inStock,pct:stats.total?(stats.inStock/stats.total)*100:0,color:"bg-green-500"},
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
