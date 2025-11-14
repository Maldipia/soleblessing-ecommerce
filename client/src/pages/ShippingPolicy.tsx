import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Shipping Policy</h1>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Processing Time</CardTitle></CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>All orders are processed within 1-3 business days. Orders are not shipped or delivered on weekends or holidays.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Shipping Rates & Delivery</CardTitle></CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ul>
                <li><strong>Metro Manila:</strong> 2-3 business days</li>
                <li><strong>Luzon:</strong> 3-5 business days</li>
                <li><strong>Visayas & Mindanao:</strong> 5-7 business days</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
