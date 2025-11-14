import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Information We Collect</CardTitle></CardHeader>
            <CardContent><p>We collect information you provide during registration, orders, and inquiries including name, email, phone, and shipping address.</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>How We Use Your Information</CardTitle></CardHeader>
            <CardContent><p>We use your information to process orders, communicate about your purchases, and improve our services.</p></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
