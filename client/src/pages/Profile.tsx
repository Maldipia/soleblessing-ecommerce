import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Package, Heart, Trophy } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Profile() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: orders } = trpc.orders.myOrders.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = getLoginUrl();
    }
  }, [user, loading]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const stats = [
    {
      title: "Total Orders",
      value: orders?.length || 0,
      icon: Package,
      color: "text-blue-500",
    },
    {
      title: "Wishlist Items",
      value: 0,
      icon: Heart,
      color: "text-red-500",
    },
    {
      title: "Raffle Entries",
      value: 0,
      icon: Trophy,
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground">Manage your profile and track your orders</p>
        </div>

        {/* User Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle>{user.name || "Customer"}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>Track your recent purchases</CardDescription>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">Order #{order.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        order.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                        order.status === "processing" ? "bg-blue-500/20 text-blue-500" :
                        order.status === "shipped" ? "bg-purple-500/20 text-purple-500" :
                        order.status === "delivered" ? "bg-green-500/20 text-green-500" :
                        "bg-gray-500/20 text-gray-500"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Items:</span> {order.items?.length || 0}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Total:</span>{" "}
                        <span className="font-bold">₱{(order.totalAmount / 100).toLocaleString()}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setLocation(`/order/${order.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <Button onClick={() => setLocation("/products")}>Start Shopping</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
