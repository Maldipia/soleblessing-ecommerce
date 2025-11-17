import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Upload, CreditCard, Banknote } from "lucide-react";

export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: user?.name || "",
    customerEmail: user?.email || "",
    contactNumber: "",
    shippingAddress: "",
    notes: "",
  });

  const { data: cartItems, isLoading: cartLoading } = trpc.cart.get.useQuery(undefined, {
    enabled: !!user,
  });

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: (order) => {
      toast.success("Order placed successfully! Please wait for payment verification.");
      setLocation(`/orders/${order.id}`);
    },
    onError: (error) => {
      toast.error(`Order failed: ${error.message}`);
    },
  });

  if (authLoading || cartLoading) {
    return <div className="container py-8">Loading...</div>;
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <Button onClick={() => setLocation("/products")}>Continue Shopping</Button>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum: number, item: any) => {
    if (!item.product) return sum;
    const price = item.product.salePrice || item.product.basePrice;
    return sum + (price * item.quantity);
  }, 0);

  const shippingFee = 15000; // ₱150 flat rate
  const total = subtotal + shippingFee;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setPaymentProofFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentProofFile) {
      toast.error("Please upload payment proof");
      return;
    }

    setUploading(true);
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", paymentProofFile);
      
      const uploadResponse = await fetch("/api/upload-payment-proof", {
        method: "POST",
        body: formDataUpload,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload payment proof");
      }
      
      const { url: paymentProofUrl } = await uploadResponse.json();
      
      await createOrderMutation.mutateAsync({
        ...formData,
        paymentMethod,
        paymentProofUrl,
        items: cartItems.map((item: any) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        })),
      });
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <Input
                    id="contactNumber"
                    placeholder="+63 967 40 000 40"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="shippingAddress">Complete Address *</Label>
                <Textarea
                  id="shippingAddress"
                  placeholder="Street, Barangay, City, Province, Postal Code"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  required
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Pay via bank transfer or GCash, then upload your payment proof
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer">
                      <Banknote className="h-5 w-5" />
                      Bank Transfer (BDO, BPI, UnionBank)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gcash" id="gcash" />
                    <Label htmlFor="gcash" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-5 w-5" />
                      GCash
                    </Label>
                  </div>
                </RadioGroup>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-semibold">Payment Instructions:</p>
                  {paymentMethod === "bank_transfer" && (
                    <div className="text-sm space-y-1">
                      <p><strong>BDO:</strong> 1234-5678-9012</p>
                      <p><strong>BPI:</strong> 9876-5432-1098</p>
                      <p><strong>Account Name:</strong> SoleBlessing Store</p>
                    </div>
                  )}
                  {paymentMethod === "gcash" && (
                    <div className="text-sm space-y-1">
                      <p><strong>GCash Number:</strong> +63 967 40 000 40</p>
                      <p><strong>Account Name:</strong> SoleBlessing Store</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    After payment, upload a screenshot of your payment confirmation below.
                  </p>
                </div>

                <div>
                  <Label htmlFor="paymentProof">Upload Payment Proof *</Label>
                  <div className="mt-2">
                    <label
                      htmlFor="paymentProof"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                    >
                      {paymentProofFile ? (
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 mb-2 text-primary" />
                          <p className="text-sm font-medium">{paymentProofFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(paymentProofFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload payment screenshot
                          </p>
                          <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </label>
                    <input
                      id="paymentProof"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Any special instructions or requests?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full" disabled={uploading || createOrderMutation.isPending}>
              {uploading || createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
            </Button>
          </form>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item: any) => {
                if (!item.product) return null;
                const price = item.product.salePrice || item.product.basePrice;
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-muted-foreground">
                        Size {item.size} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">₱{((price * item.quantity) / 100).toLocaleString()}</p>
                  </div>
                );
              })}
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₱{(subtotal / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>₱{(shippingFee / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>₱{(total / 100).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
