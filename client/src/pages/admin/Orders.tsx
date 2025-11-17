import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Eye, Package, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminOrders() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders, isLoading, refetch } = trpc.admin.orders.list.useQuery();
  const updateStatusMutation = trpc.admin.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated successfully");
      refetch();
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  if (authLoading || isLoading) {
    return <div className="container py-8">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending Payment" },
      processing: { variant: "default", icon: Package, label: "Processing" },
      shipped: { variant: "default", icon: Package, label: "Shipped" },
      delivered: { variant: "default", icon: CheckCircle, label: "Delivered" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Button variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {orders?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No orders yet
            </CardContent>
          </Card>
        ) : (
          orders?.map((order: any) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-2">Customer Information</p>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {order.customerName}</p>
                      <p><strong>Email:</strong> {order.customerEmail}</p>
                      <p><strong>Contact:</strong> {order.contactNumber}</p>
                      <p><strong>Address:</strong> {order.shippingAddress}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-2">Order Details</p>
                    <div className="space-y-1 text-sm">
                      <p><strong>Total Amount:</strong> ₱{(order.totalAmount / 100).toLocaleString()}</p>
                      <p><strong>Payment Method:</strong> {order.paymentMethod === "bank_transfer" ? "Bank Transfer" : "GCash"}</p>
                      {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Payment Proof
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Payment Proof - Order #{order.id}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Payment Method: {order.paymentMethod === "bank_transfer" ? "Bank Transfer" : "GCash"}
                          </p>
                          <img
                            src={order.paymentProofUrl}
                            alt="Payment Proof"
                            className="w-full rounded-lg border"
                          />
                        </div>
                        {order.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleStatusUpdate(order.id, "processing")}
                              disabled={updateStatusMutation.isPending}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve & Process
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleStatusUpdate(order.id, "cancelled")}
                              disabled={updateStatusMutation.isPending}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject Order
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {order.status !== "pending" && order.status !== "cancelled" && (
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusUpdate(order.id, value)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
