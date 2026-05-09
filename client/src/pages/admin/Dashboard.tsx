import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, Package, ShoppingCart, Users, MessageSquare,
  RefreshCw, Edit, Trash2, Plus, Search, Eye, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, Settings, LogOut,
  BarChart3, Star, Heart, Bell, ChevronRight, Save, X,
  QrCode, Zap, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AdminSection = "overview" | "inventory" | "orders" | "customers" | "inquiries" | "analytics" | "content";

const NAV = [
  { id: "overview" as AdminSection, icon: LayoutDashboard, label: "Overview" },
  { id: "inventory" as AdminSection, icon: Package, label: "Inventory" },
  { id: "orders" as AdminSection, icon: ShoppingCart, label: "Orders" },
  { id: "customers" as AdminSection, icon: Users, label: "Customers" },
  { id: "inquiries" as AdminSection, icon: MessageSquare, label: "Inquiries" },
  { id: "analytics" as AdminSection, icon: BarChart3, label: "Analytics" },
];

const fmt = (centavos: number) => `₱${(centavos / 100).toLocaleString("en-PH")}`;

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [section, setSection] = useState<AdminSection>("overview");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = trpc.inventory.list.useQuery();
  const { data: dbProducts, refetch: refetchDb } = trpc.admin.products.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: orders, refetch: refetchOrders } = trpc.admin.orders.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: inquiries, refetch: refetchInq } = trpc.admin.inquiries.list.useQuery(undefined, { enabled: user?.role === "admin" });

  const syncMutation = trpc.inventory.refresh.useMutation({
    onSuccess: () => { toast.success("Inventory synced from Google Sheets!"); refetchInv(); setSyncing(false); },
    onError: (e) => { toast.error(e.message); setSyncing(false); },
  });

  const deleteProductMutation = trpc.admin.products.delete.useMutation({
    onSuccess: () => { toast.success("Product deleted"); refetchDb(); },
    onError: (e) => { toast.error(e.message); },
  });

  const updateOrderMutation = trpc.admin.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Order updated"); refetchOrders(); },
    onError: (e) => { toast.error(e.message); },
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) setLocation("/");
  }, [user, loading]);

  // Inventory grouped by SKU
  const inventoryGrouped = useMemo(() => {
    if (!inventory) return [];
    const grouped = new Map<string, any>();
    inventory.forEach(item => {
      if (!grouped.has(item.sku)) {
        grouped.set(item.sku, { ...item, sizes: [item.size], totalStock: item.status === "AVAILABLE" ? 1 : 0 });
      } else {
        const g = grouped.get(item.sku);
        if (item.size && !g.sizes.includes(item.size)) g.sizes.push(item.size);
        if (item.status === "AVAILABLE") g.totalStock++;
      }
    });
    return Array.from(grouped.values());
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (!search) return inventoryGrouped;
    return inventoryGrouped.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventoryGrouped, search]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (orderFilter === "all") return orders;
    return orders.filter((o: any) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const stats = useMemo(() => {
    const totalInv = inventoryGrouped.length;
    const lowStock = inventoryGrouped.filter(p => p.totalStock <= 1).length;
    const totalOrders = orders?.length || 0;
    const pendingOrders = orders?.filter((o: any) => o.status === "pending").length || 0;
    const revenue = orders?.filter((o: any) => o.status !== "cancelled")
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0;
    return { totalInv, lowStock, totalOrders, pendingOrders, revenue };
  }, [inventoryGrouped, orders]);

  if (loading) return (
    <div className="min-h-screen bg-[#050f12] flex items-center justify-center">
      <div className="flex gap-2">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>
    </div>
  );
  if (!user || user.role !== "admin") return null;

  const STATUS_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? "w-56" : "w-14"} flex-shrink-0 bg-[#050f12] flex flex-col transition-all duration-300 sticky top-0 h-screen overflow-y-auto`}>
        <div className="px-4 py-5 flex items-center gap-3 border-b border-white/[.06]">
          <Shield className="h-5 w-5 text-[#C9A84C] flex-shrink-0" />
          {sidebarOpen && <span className="font-black text-sm tracking-[.12em] text-white uppercase">Admin</span>}
        </div>

        <nav className="flex-1 py-4 px-2">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-all ${
                section === n.id ? "bg-[#C9A84C]/20 text-[#C9A84C]" : "text-white/40 hover:text-white hover:bg-white/[.06]"
              }`}>
              <n.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium tracking-wide">{n.label}</span>}
            </button>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-white/[.06] space-y-1">
          <button onClick={() => setLocation("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-white/30 hover:text-white transition-colors">
            <Eye className="h-4 w-4" />
            {sidebarOpen && <span className="text-xs">View Site</span>}
          </button>
          <button onClick={() => setSidebarOpen(s=>!s)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-white/30 hover:text-white transition-colors">
            <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
            {sidebarOpen && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-black text-[#0d2430] tracking-tight capitalize">
              {section === "overview" ? "Dashboard" : section}
            </h1>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setSyncing(true); syncMutation.mutate(); }}
              disabled={syncing}
              className="flex items-center gap-2 bg-[#0d2430] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#122d3a] transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync Sheets
            </button>
            <button onClick={() => setLocation("/upload-payment")}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#050f12] px-4 py-2 text-xs font-semibold rounded-lg hover:opacity-90">
              <Zap className="h-3.5 w-3.5" />
              Payment Portal
            </button>
          </div>
        </div>

        <div className="p-8">

          {/* ========== OVERVIEW ========== */}
          {section === "overview" && (
            <div>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Inventory", value: stats.totalInv, sub: "unique SKUs", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Low Stock", value: stats.lowStock, sub: "needs restock", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Total Orders", value: stats.totalOrders, sub: `${stats.pendingOrders} pending`, icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Total Revenue", value: fmt(stats.revenue), sub: "all time", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", large: true },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                      <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                    </div>
                    <div className={`font-black text-[#0d2430] mb-0.5 ${s.large ? "text-lg" : "text-2xl"}`}>{s.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Low stock alerts */}
              <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide">⚠ Low Stock Alerts</h2>
                  <button onClick={() => setSection("inventory")} className="text-xs text-[#C9A84C] font-semibold">View All →</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {inventoryGrouped.filter(p => p.totalStock <= 1).slice(0, 5).map(p => (
                    <div key={p.sku} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#0d2430]">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.sku}</div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.totalStock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.totalStock === 0 ? "Out of Stock" : "Last Unit"}
                      </span>
                    </div>
                  ))}
                  {inventoryGrouped.filter(p => p.totalStock <= 1).length === 0 && (
                    <div className="py-4 text-center text-sm text-gray-400">All items well stocked ✓</div>
                  )}
                </div>
              </div>

              {/* Recent orders */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide">Recent Orders</h2>
                  <button onClick={() => setSection("orders")} className="text-xs text-[#C9A84C] font-semibold">View All →</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50">
                      <th className="text-left pb-3">Order</th>
                      <th className="text-left pb-3">Customer</th>
                      <th className="text-left pb-3">Amount</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(orders || []).slice(0, 6).map((o: any) => (
                      <tr key={o.id}>
                        <td className="py-3 font-mono text-xs text-gray-500">#{o.id}</td>
                        <td className="py-3 text-[#0d2430] font-medium text-xs">{o.customerName || "—"}</td>
                        <td className="py-3 font-bold text-[#0d2430] text-xs">{fmt(o.totalAmount)}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] || "bg-gray-100 text-gray-600"}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!orders || orders.length === 0) && <div className="text-center py-6 text-sm text-gray-400">No orders yet</div>}
              </div>
            </div>
          )}

          {/* ========== INVENTORY ========== */}
          {section === "inventory" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)}
                    className="pl-9 text-sm h-10 bg-white border-gray-200" />
                </div>
                <div className="text-xs text-gray-400">{filteredInventory.length} products · from Google Sheets</div>
                <button onClick={() => { setSyncing(true); syncMutation.mutate(); }}
                  disabled={syncing}
                  className="flex items-center gap-2 border border-gray-200 bg-white text-[#0d2430] px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 ml-auto">
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  Sync Now
                </button>
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
                    {filteredInventory.map(p => (
                      <tr key={p.sku} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded bg-gray-100 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-[#EDE9E3] rounded flex items-center justify-center text-lg flex-shrink-0">👟</div>
                            )}
                            <div>
                              <div className="font-medium text-[#0d2430] text-xs leading-tight max-w-[200px] truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{p.itemCode}</div>
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
                            {(p.sizes || []).slice(0, 3).map((s: string) => (
                              <span key={s} className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">{s}</span>
                            ))}
                            {(p.sizes || []).length > 3 && (
                              <span className="text-[9px] text-gray-400">+{p.sizes.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${p.totalStock === 0 ? "text-red-500" : p.totalStock <= 1 ? "text-amber-500" : "text-green-600"}`}>
                            {p.totalStock}
                          </span>
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
                {filteredInventory.length === 0 && (
                  <div className="text-center py-12 text-sm text-gray-400">
                    {invLoading ? "Loading from Google Sheets…" : "No products found"}
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-[#050f12] rounded-xl flex items-center gap-4">
                <QrCode className="h-5 w-5 text-[#C9A84C] flex-shrink-0" />
                <div className="text-xs text-white/50 leading-relaxed">
                  Inventory is synced from your <strong className="text-white/80">Google Sheets</strong>. To add or edit products, update your inventory sheet then click <strong className="text-[#C9A84C]">Sync Now</strong>. Product QR codes are auto-generated per item code.
                </div>
              </div>
            </div>
          )}

          {/* ========== ORDERS ========== */}
          {section === "orders" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-44 bg-white border-gray-200 text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-400">{filteredOrders.length} orders</span>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F4EF] text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="text-left px-5 py-3">Order #</th>
                      <th className="text-left px-4 py-3">Customer</th>
                      <th className="text-left px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Payment</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">#{o.id}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-[#0d2430]">{o.customerName || "—"}</div>
                          <div className="text-[10px] text-gray-400">{o.customerEmail || o.contactNumber || ""}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#0d2430] text-sm">{fmt(o.totalAmount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{o.paymentMethod || "—"}</td>
                        <td className="px-4 py-3 text-[10px] text-gray-400">
                          {new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] || "bg-gray-100 text-gray-600"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Select value={o.status} onValueChange={(val) => updateOrderMutation.mutate({ id: o.id, status: val as any })}>
                            <SelectTrigger className="w-28 h-7 text-[10px] border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["pending","paid","processing","shipped","delivered","cancelled"].map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && (
                  <div className="text-center py-12 text-sm text-gray-400">No orders found</div>
                )}
              </div>
            </div>
          )}

          {/* ========== INQUIRIES ========== */}
          {section === "inquiries" && (
            <div className="space-y-4">
              {(inquiries || []).map((inq: any) => (
                <div key={inq.id} className="bg-white border border-gray-100 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm text-[#0d2430]">{inq.name}</div>
                      <div className="text-xs text-gray-400">{inq.email} · {inq.phone || "no phone"}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inq.status === "pending" ? "bg-amber-100 text-amber-700" :
                      inq.status === "replied" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{inq.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{inq.message}</p>
                  {inq.adminReply && (
                    <div className="bg-[#F7F4EF] rounded-lg p-3 text-xs text-gray-600">
                      <strong className="text-[#C9A84C]">Your reply:</strong> {inq.adminReply}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-2">
                    {new Date(inq.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              ))}
              {(!inquiries || inquiries.length === 0) && (
                <div className="bg-white border border-gray-100 rounded-xl py-16 text-center text-sm text-gray-400">No inquiries yet</div>
              )}
            </div>
          )}

          {/* ========== ANALYTICS ========== */}
          {section === "analytics" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide mb-5">Inventory Health</h3>
                <div className="space-y-3">
                  {[
                    { label: "Total SKUs", value: inventoryGrouped.length, color: "bg-blue-500" },
                    { label: "In Stock", value: inventoryGrouped.filter(p => p.totalStock > 0).length, color: "bg-green-500" },
                    { label: "Low Stock (≤1)", value: inventoryGrouped.filter(p => p.totalStock <= 1 && p.totalStock > 0).length, color: "bg-amber-500" },
                    { label: "Out of Stock", value: inventoryGrouped.filter(p => p.totalStock === 0).length, color: "bg-red-500" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
                      <div className="flex-1 text-xs text-gray-600">{s.label}</div>
                      <div className="text-sm font-bold text-[#0d2430]">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-sm font-bold text-[#0d2430] uppercase tracking-wide mb-5">Order Summary</h3>
                <div className="space-y-3">
                  {["pending","paid","processing","shipped","delivered","cancelled"].map(s => {
                    const count = orders?.filter((o: any) => o.status === s).length || 0;
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[s] || "bg-gray-100 text-gray-600"}`}>{s}</span>
                        <div className="flex-1 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${Math.min(100, (count / (orders?.length || 1)) * 100)}%` }} />
                        </div>
                        <div className="text-sm font-bold text-[#0d2430] w-6 text-right">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 bg-[#050f12] border border-white/[.06] rounded-xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-5">Quick Links</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Google Sheets Inventory", href: `https://docs.google.com/spreadsheets/d/1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI/edit`, icon: "📊" },
                    { label: "SB ORDER Sheet", href: `https://docs.google.com/spreadsheets/d/13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y/edit`, icon: "📋" },
                    { label: "Supabase Dashboard", href: "https://supabase.com/dashboard/project/akualfrqzaierqsfcnkp", icon: "🗄️" },
                    { label: "Vercel Dashboard", href: "https://vercel.com/maldipias-projects/soleblessing-ecommerce", icon: "▲" },
                  ].map(l => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                      className="bg-white/[.05] border border-white/[.08] rounded-lg p-4 hover:bg-white/[.08] transition-colors block">
                      <div className="text-2xl mb-2">{l.icon}</div>
                      <div className="text-xs text-white/60 font-medium leading-tight">{l.label}</div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========== CUSTOMERS ========== */}
          {section === "customers" && (
            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
              <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <div className="text-sm font-semibold text-[#0d2430] mb-1">Customer Management</div>
              <div className="text-xs text-gray-400 mb-6 max-w-sm mx-auto">
                Customer data is stored in your MySQL database. View and manage via your database dashboard.
              </div>
              <a href="https://vercel.com/maldipias-projects/soleblessing-ecommerce/stores" target="_blank"
                className="inline-flex items-center gap-2 bg-[#0d2430] text-white px-5 py-2.5 text-xs font-semibold rounded-lg hover:bg-[#122d3a]">
                Open DB Dashboard →
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
