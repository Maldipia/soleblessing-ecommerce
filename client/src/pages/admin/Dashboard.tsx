import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, MessageSquare,
  RefreshCw, Search, Eye, TrendingUp, AlertTriangle,
  BarChart3, Shield, ChevronRight, Lock, LogOut,
  Zap, ExternalLink, QrCode
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Section = "overview" | "inventory" | "orders" | "analytics";

const NAV: { id: Section; icon: any; label: string }[] = [
  { id: "overview",   icon: LayoutDashboard, label: "Overview"  },
  { id: "inventory",  icon: Package,         label: "Inventory" },
  { id: "orders",     icon: ShoppingCart,    label: "Orders"    },
  { id: "analytics",  icon: BarChart3,       label: "Analytics" },
];

const ADMIN_KEY = "sb_admin_v1";
const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;

// Simple client-side auth — no Railway dependency
function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try { return localStorage.getItem(ADMIN_KEY) === "true"; } catch { return false; }
  });
  const login = (pw: string) => {
    // Password is checked against VITE_ADMIN_PW env var baked into build
    const correct = import.meta.env.VITE_ADMIN_PW || "SoleBlessing2026!";
    if (pw === correct) {
      localStorage.setItem(ADMIN_KEY, "true");
      setIsAdmin(true);
      return true;
    }
    return false;
  };
  const logout = () => {
    localStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
  };
  return { isAdmin, login, logout };
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAdmin, login, logout } = useAdminAuth();
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // ─── Inventory — uses existing public route, works on Railway now ──────
  const { data: inventory, isLoading: invLoading, refetch: refetchInv } =
    trpc.inventory.list.useQuery(undefined, { enabled: isAdmin });

  const syncMutation = trpc.inventory.refresh.useMutation({
    onSuccess: () => { refetchInv(); setSyncing(false); },
    onError:   () => { setSyncing(false); },
  });

  const inventoryGrouped = useMemo(() => {
    if (!inventory) return [];
    const map = new Map<string, any>();
    inventory.forEach(item => {
      if (!map.has(item.sku)) {
        map.set(item.sku, { ...item, sizes: [item.size], totalStock: item.status === "AVAILABLE" ? 1 : 0 });
      } else {
        const g = map.get(item.sku);
        if (item.size && !g.sizes.includes(item.size)) g.sizes.push(item.size);
        if (item.status === "AVAILABLE") g.totalStock++;
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  const filtered = useMemo(() =>
    !search ? inventoryGrouped
      : inventoryGrouped.filter(p =>
          p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.sku?.toLowerCase().includes(search.toLowerCase())),
    [inventoryGrouped, search]);

  const stats = useMemo(() => ({
    total:    inventoryGrouped.length,
    inStock:  inventoryGrouped.filter(p => p.totalStock > 0).length,
    lowStock: inventoryGrouped.filter(p => p.totalStock <= 1 && p.totalStock > 0).length,
    outStock: inventoryGrouped.filter(p => p.totalStock === 0).length,
  }), [inventoryGrouped]);

  // ─── Login ───────────────────────────────────────────────────────────────
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
          const ok = login(password);
          if (!ok) setLoginError("Wrong password. Try again.");
        }} className="space-y-4">
          <div>
            <label className="text-xs font-semibold tracking-[.1em] uppercase text-white/40 block mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginError(""); }}
              placeholder="Enter admin password"
              autoFocus
              className="w-full bg-white/[.06] border border-white/[.1] px-4 py-3 text-white text-sm outline-none focus:border-[#C9A84C] transition-colors rounded placeholder-white/20"
            />
            {loginError && <p className="text-red-400 text-xs mt-2">{loginError}</p>}
          </div>
          <button type="submit" disabled={!password}
            className="w-full bg-[#C9A84C] text-[#050f12] font-bold tracking-[.12em] uppercase py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
            Enter Dashboard
          </button>
        </form>

        <p className="text-center text-[10px] text-white/20 mt-6 leading-relaxed">
          Password is set in Vercel → Settings → Environment Variables<br/>
          Key: <span className="text-white/40 font-mono">VITE_ADMIN_PW</span>
        </p>
      </div>
    </div>
  );

  // ─── Dashboard ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F4EF] flex">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-52" : "w-14"} flex-shrink-0 bg-[#050f12] flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-y-auto`}>
        <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[.06]">
          <Shield className="h-5 w-5 text-[#C9A84C] flex-shrink-0" />
          {sidebarOpen && <span className="font-black text-sm tracking-[.1em] text-white uppercase">Admin</span>}
        </div>

        <nav className="flex-1 py-4 px-2">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                section === n.id
                  ? "bg-[#C9A84C]/20 text-[#C9A84C]"
                  : "text-white/40 hover:text-white hover:bg-white/[.06]"
              }`}>
              <n.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium tracking-wide">{n.label}</span>}
            </button>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-white/[.06] space-y-1">
          <button onClick={() => setLocation("/")}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-white transition-colors">
            <Eye className="h-4 w-4" />
            {sidebarOpen && <span className="text-xs">View Site</span>}
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span className="text-xs">Log Out</span>}
          </button>
          <button onClick={() => setSidebarOpen(s => !s)}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/30 hover:text-white transition-colors">
            <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
            {sidebarOpen && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-black text-[#0d2430] tracking-tight capitalize">
            {section === "overview" ? "Dashboard" : section}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSyncing(true); syncMutation.mutate(); }}
              disabled={syncing}
              className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a] disabled:opacity-50 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync Sheets
            </button>
            <button onClick={() => setLocation("/upload-payment")}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
              <Zap className="h-3.5 w-3.5" /> Payment Portal
            </button>
          </div>
        </div>

        <div className="p-8">

          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          {section === "overview" && (
            <div className="space-y-6">

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total SKUs",    value: stats.total,    icon: Package,       color: "text-blue-600",   bg: "bg-blue-50"   },
                  { label: "In Stock",      value: stats.inStock,  icon: TrendingUp,    color: "text-green-600",  bg: "bg-green-50"  },
                  { label: "Low Stock",     value: stats.lowStock, icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50"  },
                  { label: "Out of Stock",  value: stats.outStock, icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50"    },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                    <div className="text-2xl font-black text-[#0d2430] mb-0.5">{s.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Low stock */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0d2430]">⚠ Low / Out of Stock</h2>
                  <button onClick={() => setSection("inventory")} className="text-xs text-[#C9A84C] font-semibold">View All →</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {inventoryGrouped.filter(p => p.totalStock <= 1).slice(0, 8).map(p => (
                    <div key={p.sku} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#0d2430] leading-tight">{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{p.sku}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.totalStock === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {p.totalStock === 0 ? "Out of Stock" : "Last Unit"}
                      </span>
                    </div>
                  ))}
                  {inventoryGrouped.filter(p => p.totalStock <= 1).length === 0 && (
                    <div className="py-6 text-center text-sm text-gray-400">All items well stocked ✓</div>
                  )}
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-[#050f12] rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Quick Access</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Inventory Sheet",    href: "https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit", icon: "📊" },
                    { label: "SB ORDER Sheet",     href: "https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit",    icon: "📋" },
                    { label: "SB Sales Drive",     href: `https://drive.google.com/drive/folders/1MMLgawQE5KKQQqufa2Leoka5zdXV6qIY`,                    icon: "💾" },
                    { label: "Supabase DB",        href: "https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp",                                   icon: "🗄️" },
                    { label: "Vercel Dashboard",   href: "https://vercel.com/maldipias-projects/soleblessing-ecommerce",                                  icon: "▲" },
                    { label: "Payment Portal",     href: "/upload-payment",                                                                                icon: "💳" },
                  ].map(l => (
                    <a key={l.label} href={l.href}
                      target={l.href.startsWith("http") ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="bg-white/[.05] border border-white/[.08] rounded-lg p-4 hover:bg-white/[.10] transition-colors flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{l.icon}</span>
                      <span className="text-xs text-white/60 font-medium leading-tight">{l.label}</span>
                      <ExternalLink className="h-3 w-3 text-white/20 ml-auto flex-shrink-0 mt-0.5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY ────────────────────────────────────────── */}
          {section === "inventory" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    placeholder="Search by name or SKU…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-[#0d2430] transition-colors"
                  />
                </div>
                <span className="text-xs text-gray-400">{filtered.length} products</span>
                <button
                  onClick={() => { setSyncing(true); syncMutation.mutate(); }}
                  disabled={syncing}
                  className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 ml-auto transition-colors">
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync Now
                </button>
                <a href="https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-3 py-2 text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
                  <ExternalLink className="h-3.5 w-3.5" /> Edit in Sheets
                </a>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F4EF] text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="text-left px-5 py-3">Product</th>
                      <th className="text-left px-4 py-3">SKU</th>
                      <th className="text-left px-4 py-3">Price</th>
                      <th className="text-left px-4 py-3">Sizes</th>
                      <th className="text-left px-4 py-3">Stock</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => (
                      <tr key={p.sku} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded bg-gray-100 flex-shrink-0" />
                              : <div className="w-10 h-10 bg-[#EDE9E3] rounded flex items-center justify-center text-lg flex-shrink-0">👟</div>}
                            <div>
                              <div className="font-medium text-[#0d2430] text-xs leading-tight max-w-[200px] truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{p.itemCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{p.sku}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-[#0d2430]">
                            {p.sellingPrice > 0 ? fmt(p.sellingPrice) : fmt(p.srp)}
                          </div>
                          {p.sellingPrice > 0 && p.srp !== p.sellingPrice && (
                            <div className="text-[10px] text-gray-400 line-through">{fmt(p.srp)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.sizes || []).slice(0, 4).map((s: string) => (
                              <span key={s} className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">{s}</span>
                            ))}
                            {(p.sizes || []).length > 4 && <span className="text-[9px] text-gray-400">+{p.sizes.length - 4}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold"
                          style={{ color: p.totalStock === 0 ? "#ef4444" : p.totalStock <= 1 ? "#f59e0b" : "#22c55e" }}>
                          {p.totalStock}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>
                            {p.status || "AVAILABLE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-sm text-gray-400">
                    {invLoading ? "Loading from Google Sheets…" : "No products found"}
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-[#050f12] rounded-xl flex items-start gap-3">
                <QrCode className="h-4 w-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/40 leading-relaxed">
                  Inventory syncs from your <strong className="text-white/70">Google Sheets</strong>.
                  To edit prices, stock, or product details — open the sheet, make changes, then click <strong className="text-[#C9A84C]">Sync Now</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ── ORDERS ───────────────────────────────────────────── */}
          {section === "orders" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                <ShoppingCart className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                <div className="text-sm font-bold text-[#0d2430] mb-2">Manage Orders</div>
                <p className="text-xs text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
                  Orders placed via your payment portal and GCash/COD are logged in your Google Sheets.
                  Click below to view and manage them directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href="https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#0d2430] text-white px-5 py-3 text-xs font-bold rounded-lg hover:bg-[#122d3a] transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> Open SB ORDER Sheet
                  </a>
                  <a href={`https://drive.google.com/drive/folders/1MMLgawQE5KKQQqufa2Leoka5zdXV6qIY`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-gray-200 text-[#0d2430] px-5 py-3 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> Payment Proofs Drive
                  </a>
                </div>
              </div>

              <div className="bg-[#050f12] rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">How Orders Flow</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", label: "Customer places order", detail: "Via website cart or DM" },
                    { step: "2", label: "Customer uploads payment", detail: "soleblessingofficial.com/upload-payment" },
                    { step: "3", label: "Payment proof saved to Drive", detail: "Auto-organized by date" },
                    { step: "4", label: "GAS processes & logs to Sheets", detail: "SB ORDER spreadsheet updated" },
                    { step: "5", label: "You confirm & ship", detail: "Update status in SB ORDER sheet" },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#C9A84C]/20 text-[#C9A84C] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{s.step}</div>
                      <div>
                        <div className="text-xs font-semibold text-white">{s.label}</div>
                        <div className="text-[10px] text-white/35">{s.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ────────────────────────────────────────── */}
          {section === "analytics" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-5">Inventory Health</h3>
                  {[
                    { label: "Total SKUs",    value: stats.total,    pct: 100,                                    color: "bg-blue-500"  },
                    { label: "In Stock",      value: stats.inStock,  pct: stats.total ? (stats.inStock  / stats.total) * 100 : 0, color: "bg-green-500" },
                    { label: "Low Stock",     value: stats.lowStock, pct: stats.total ? (stats.lowStock / stats.total) * 100 : 0, color: "bg-amber-500" },
                    { label: "Out of Stock",  value: stats.outStock, pct: stats.total ? (stats.outStock / stats.total) * 100 : 0, color: "bg-red-500"   },
                  ].map(s => (
                    <div key={s.label} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${s.color}`} />
                          <span className="text-xs text-gray-600">{s.label}</span>
                        </div>
                        <span className="text-sm font-bold text-[#0d2430]">{s.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-5">Stock Distribution</h3>
                  {[
                    { label: "Multiple units",  value: inventoryGrouped.filter(p => p.totalStock > 1).length  },
                    { label: "Last unit",        value: inventoryGrouped.filter(p => p.totalStock === 1).length },
                    { label: "Out of stock",     value: inventoryGrouped.filter(p => p.totalStock === 0).length },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-600">{s.label}</span>
                      <span className="text-sm font-bold text-[#0d2430]">{s.value}</span>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total tracked inventory</span>
                      <span className="font-bold text-[#0d2430]">{stats.total} SKUs</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#050f12] rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">All Systems</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Google Sheets Inventory", href: "https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit", icon: "📊", desc: "Edit products, prices, stock" },
                    { label: "SB ORDER Sheet",           href: "https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit",    icon: "📋", desc: "View & manage orders"       },
                    { label: "Payment Proofs Drive",     href: `https://drive.google.com/drive/folders/1MMLgawQE5KKQQqufa2Leoka5zdXV6qIY`,                    icon: "💾", desc: "Customer payment uploads"  },
                    { label: "Supabase Dashboard",       href: "https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp",                                   icon: "🗄️", desc: "Image CDN & database"      },
                    { label: "Vercel Dashboard",         href: "https://vercel.com/maldipias-projects/soleblessing-ecommerce",                                  icon: "▲",  desc: "Frontend deployment"       },
                    { label: "Payment Portal",           href: "/upload-payment",                                                                                icon: "💳", desc: "Customer payment page"     },
                  ].map(l => (
                    <a key={l.label}
                      href={l.href}
                      target={l.href.startsWith("http") ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="bg-white/[.04] border border-white/[.07] rounded-lg p-4 hover:bg-white/[.08] transition-colors block group">
                      <div className="text-xl mb-2">{l.icon}</div>
                      <div className="text-xs text-white/70 font-semibold leading-tight mb-1">{l.label}</div>
                      <div className="text-[10px] text-white/30">{l.desc}</div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
