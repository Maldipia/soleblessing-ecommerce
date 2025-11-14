import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Acceptance of Terms</CardTitle></CardHeader>
            <CardContent><p>By accessing and using SoleBlessing, you accept and agree to be bound by these terms.</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Product Authenticity</CardTitle></CardHeader>
            <CardContent><p>All products sold on SoleBlessing are 100% authentic. We guarantee the authenticity of every item.</p></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
