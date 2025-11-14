import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function AdminRaffles() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: raffles, refetch } = trpc.admin.raffles.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Raffle Management</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Raffle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Raffle</DialogTitle>
                <DialogDescription>
                  Set up a new raffle for limited edition sneakers
                </DialogDescription>
              </DialogHeader>
              <RaffleForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffles && raffles.length > 0 ? (
            raffles.map((raffle) => (
              <Card key={raffle.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Trophy className="h-8 w-8 text-primary" />
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      raffle.status === "active" ? "bg-green-500/20 text-green-500" :
                      raffle.status === "upcoming" ? "bg-blue-500/20 text-blue-500" :
                      "bg-gray-500/20 text-gray-500"
                    }`}>
                      {raffle.status}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-4">{raffle.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground line-clamp-2">{raffle.description}</p>
                    <div className="flex justify-between">
                      <span>Winners:</span>
                      <span className="font-bold">{raffle.winnerCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Start:</span>
                      <span>{new Date(raffle.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>End:</span>
                      <span>{new Date(raffle.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                No raffles created yet
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function RaffleForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    productId: 0,
    winnerCount: 1,
    startDate: "",
    endDate: "",
    status: "upcoming" as const,
  });

  const createMutation = trpc.admin.raffles.create.useMutation({
    onSuccess: () => {
      toast.success("Raffle created successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to create raffle: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
    };

    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Raffle Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Air Jordan 1 Chicago Raffle"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Win a chance to purchase the limited edition Air Jordan 1 Chicago"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="productId">Product ID</Label>
          <Input
            id="productId"
            type="number"
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="winnerCount">Number of Winners</Label>
          <Input
            id="winnerCount"
            type="number"
            value={formData.winnerCount}
            onChange={(e) => setFormData({ ...formData, winnerCount: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>



      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        Create Raffle
      </Button>
    </form>
  );
}
