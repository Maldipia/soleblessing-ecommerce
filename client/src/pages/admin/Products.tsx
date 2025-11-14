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
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminProducts() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: products, refetch } = trpc.admin.products.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const deleteMutation = trpc.admin.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`);
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

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Product Management</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Add a new sneaker to your store
                </DialogDescription>
              </DialogHeader>
              <ProductForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <div className="aspect-square relative mb-4">
                  {product.images && JSON.parse(product.images)[0] && (
                    <img
                      src={JSON.parse(product.images)[0]}
                      alt={product.name}
                      className="object-cover w-full h-full rounded-md"
                    />
                  )}
                </div>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{product.brand}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Price:</span>
                    <span className="font-bold">₱{(product.basePrice / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Stock:</span>
                    <span className={product.stock < 10 ? "text-red-500 font-bold" : ""}>
                      {product.stock}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Product</DialogTitle>
                        </DialogHeader>
                        <ProductForm
                          product={product}
                          onSuccess={() => refetch()}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductForm({ product, onSuccess }: { product?: any; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    brand: product?.brand || "",
    category: product?.category || "",
    basePrice: product ? product.basePrice / 100 : 0,
    salePrice: product?.salePrice ? product.salePrice / 100 : null,
    images: product?.images || "[]",
    sizes: product?.sizes || "[]",
    sizeStock: product?.sizeStock || "{}",
    stock: product?.stock || 0,
    featured: product?.featured || 0,
    clearance: product?.clearance || 0,
    fitNotes: product?.fitNotes || "",
  });

  const createMutation = trpc.admin.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });

  const updateMutation = trpc.admin.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      basePrice: Math.round(formData.basePrice * 100),
      salePrice: formData.salePrice ? Math.round(formData.salePrice * 100) : null,
    };

    if (product) {
      updateMutation.mutate({ id: product.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basePrice">Base Price (₱)</Label>
          <Input
            id="basePrice"
            type="number"
            step="0.01"
            value={formData.basePrice}
            onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="salePrice">Sale Price (₱) - Optional</Label>
          <Input
            id="salePrice"
            type="number"
            step="0.01"
            value={formData.salePrice || ""}
            onChange={(e) => setFormData({ ...formData, salePrice: e.target.value ? parseFloat(e.target.value) : null })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="stock">Total Stock</Label>
        <Input
          id="stock"
          type="number"
          value={formData.stock}
          onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
          required
        />
      </div>

      <div>
        <Label htmlFor="images">Images (JSON array of URLs)</Label>
        <Input
          id="images"
          value={formData.images}
          onChange={(e) => setFormData({ ...formData, images: e.target.value })}
          placeholder='["/products/image1.jpg", "/products/image2.jpg"]'
          required
        />
      </div>

      <div>
        <Label htmlFor="sizes">Sizes (JSON array)</Label>
        <Input
          id="sizes"
          value={formData.sizes}
          onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
          placeholder='["US 7", "US 8", "US 9"]'
          required
        />
      </div>

      <div>
        <Label htmlFor="sizeStock">Size Stock (JSON object)</Label>
        <Input
          id="sizeStock"
          value={formData.sizeStock}
          onChange={(e) => setFormData({ ...formData, sizeStock: e.target.value })}
          placeholder='{"US 7": 5, "US 8": 10}'
          required
        />
      </div>

      <div>
        <Label htmlFor="fitNotes">Fit Notes</Label>
        <Input
          id="fitNotes"
          value={formData.fitNotes}
          onChange={(e) => setFormData({ ...formData, fitNotes: e.target.value })}
          placeholder="True to size / Runs small / Runs large"
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured === 1}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked ? 1 : 0 })}
          />
          Featured Product
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.clearance === 1}
            onChange={(e) => setFormData({ ...formData, clearance: e.target.checked ? 1 : 0 })}
          />
          Clearance Sale
        </label>
      </div>

      <Button type="submit" className="w-full">
        {product ? "Update Product" : "Create Product"}
      </Button>
    </form>
  );
}
