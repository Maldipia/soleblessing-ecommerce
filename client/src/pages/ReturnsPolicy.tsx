import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function ReturnsPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Returns & Exchanges Policy</h1>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Return Window</CardTitle></CardHeader>
            <CardContent><p>We accept returns within 7 days of delivery for unworn items in original packaging.</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>How to Return</CardTitle></CardHeader>
            <CardContent><p>Contact us at info@soleblessing.com with your order number to initiate a return.</p></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
