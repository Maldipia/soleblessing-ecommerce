import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AdminInquiries() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [reply, setReply] = useState("");

  const { data: inquiries, refetch } = trpc.admin.inquiries.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const replyMutation = trpc.admin.inquiries.reply.useMutation({
    onSuccess: () => {
      toast.success("Reply sent successfully");
      setSelectedInquiry(null);
      setReply("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send reply: ${error.message}`);
    },
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

  const handleReply = () => {
    if (!selectedInquiry || !reply.trim()) return;
    replyMutation.mutate({ id: selectedInquiry.id, reply });
  };

  const exportToExcel = () => {
    if (!inquiries || inquiries.length === 0) {
      toast.error("No inquiries to export");
      return;
    }

    // Create CSV content
    const headers = ["ID", "Name", "Email", "Phone", "Product ID", "Message", "Status", "Admin Reply", "Created At"];
    const rows = inquiries.map(inq => [
      inq.id,
      inq.name,
      inq.email,
      inq.phone || "",
      inq.productId || "",
      `"${inq.message.replace(/"/g, '""')}"`,
      inq.status,
      inq.adminReply ? `"${inq.adminReply.replace(/"/g, '""')}"` : "",
      new Date(inq.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inquiries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Inquiries exported successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Customer Inquiries</h1>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {inquiries && inquiries.length > 0 ? (
            inquiries.map((inquiry) => (
              <Card key={inquiry.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{inquiry.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{inquiry.email}</p>
                      {inquiry.phone && (
                        <p className="text-sm text-muted-foreground">{inquiry.phone}</p>
                      )}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      inquiry.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                      inquiry.status === "replied" ? "bg-green-500/20 text-green-500" :
                      "bg-gray-500/20 text-gray-500"
                    }`}>
                      {inquiry.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Message:</p>
                      <p className="text-sm text-muted-foreground">{inquiry.message}</p>
                    </div>
                    
                    {inquiry.adminReply && (
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">Your Reply:</p>
                        <p className="text-sm">{inquiry.adminReply}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        {new Date(inquiry.createdAt).toLocaleString()}
                      </p>
                      {inquiry.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setReply("");
                          }}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Reply
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No inquiries yet
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {selectedInquiry?.name}</DialogTitle>
            <DialogDescription>
              Send a response to this customer inquiry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Customer Message:</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {selectedInquiry?.message}
              </p>
            </div>
            <div>
              <Textarea
                placeholder="Type your reply here..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
              />
            </div>
            <Button onClick={handleReply} className="w-full">
              Send Reply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
