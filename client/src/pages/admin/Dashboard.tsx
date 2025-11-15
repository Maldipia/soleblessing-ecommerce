import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MessageSquare, Trophy, ShoppingCart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [syncing, setSyncing] = useState(false);
  
  const syncMutation = trpc.admin.syncInventory.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
  
  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMutation.mutateAsync();
    } finally {
      setSyncing(false);
    }
  };
  
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);
  
  const { data: products } = trpc.admin.products.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  
  const { data: inquiries } = trpc.admin.inquiries.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  
  const { data: orders } = trpc.admin.orders.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  
  const { data: raffles } = trpc.admin.raffles.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user || user.role !== "admin") {
    return null;
  }

  const stats = [
    {
      title: "Total Products",
      value: products?.length || 0,
      icon: Package,
      description: "Active products in store",
    },
    {
      title: "Pending Inquiries",
      value: inquiries?.filter(i => i.status === "pending").length || 0,
      icon: MessageSquare,
      description: "Customer questions",
    },
    {
      title: "Active Raffles",
      value: raffles?.filter(r => r.status === "active").length || 0,
      icon: Trophy,
      description: "Ongoing raffles",
    },
    {
      title: "Total Orders",
      value: orders?.length || 0,
      icon: ShoppingCart,
      description: "All time orders",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Inventory'}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inquiries</CardTitle>
              <CardDescription>Latest customer questions</CardDescription>
            </CardHeader>
            <CardContent>
              {inquiries && inquiries.length > 0 ? (
                <div className="space-y-4">
                  {inquiries.slice(0, 5).map((inquiry) => (
                    <div key={inquiry.id} className="border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{inquiry.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{inquiry.message}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          inquiry.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                          inquiry.status === "replied" ? "bg-green-500/20 text-green-500" :
                          "bg-gray-500/20 text-gray-500"
                        }`}>
                          {inquiry.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No inquiries yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alert</CardTitle>
              <CardDescription>Products running low</CardDescription>
            </CardHeader>
            <CardContent>
              {products && products.filter(p => p.stock < 10).length > 0 ? (
                <div className="space-y-4">
                  {products.filter(p => p.stock < 10).slice(0, 5).map((product) => (
                    <div key={product.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                      </div>
                      <span className="text-sm font-bold text-red-500">{product.stock} left</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">All products well stocked</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
