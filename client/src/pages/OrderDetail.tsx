import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function OrderDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const orderId = parseInt(params.id || "0");

  const { data: order, isLoading } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: !!user && orderId > 0 }
  );

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = getLoginUrl();
    }
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-8 px-6 text-center">
            <p className="text-muted-foreground mb-4">Order not found</p>
            <Button onClick={() => setLocation("/profile")}>Back to Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusSteps = [
    { key: "pending", label: "Order Placed", icon: Clock },
    { key: "processing", label: "Processing", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
  ];

  const currentStepIndex = statusSteps.findIndex((step) => step.key === order.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/profile")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Order #{order.id}</h1>
          <p className="text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Order Status Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.key} className="flex-1 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <p
                        className={`text-sm mt-2 text-center ${
                          isCompleted ? "font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`absolute top-6 left-1/2 w-full h-0.5 ${
                          index < currentStepIndex ? "bg-primary" : "bg-muted"
                        }`}
                        style={{ transform: "translateY(-50%)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-4 last:border-0">
                    <div>
                      <p className="font-medium">Product ID: {item.productId}</p>
                      <p className="text-sm text-muted-foreground">
                        Size: {item.size} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold">₱{(item.price / 100).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No items found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{(order.totalAmount / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>₱{(order.totalAmount / 100).toLocaleString()}</span>
              </div>
            </div>

            {order.shippingAddress && (
              <div className="mt-6 pt-6 border-t">
                <p className="font-medium mb-2">Shipping Address</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {order.shippingAddress}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
