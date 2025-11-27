import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface ReviewFormProps {
  productId: number;
  orderId?: number;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, orderId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [size, setSize] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      // Reset form
      setRating(0);
      setTitle("");
      setComment("");
      setSize("");
      setImages([]);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload-review-image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      setImages([...images, ...urls]);
      toast.success("Images uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    createReview.mutate({
      productId,
      orderId,
      rating,
      title: title || undefined,
      comment: comment || undefined,
      size: size || undefined,
      images: images.length > 0 ? images : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Overall Rating</Label>
        <div className="mt-2">
          <StarRating rating={rating} onRatingChange={setRating} size="lg" />
        </div>
        {rating > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="title">Review Title (Optional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience"
          maxLength={100}
        />
      </div>

      <div>
        <Label htmlFor="comment">Your Review (Optional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={5}
          maxLength={1000}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {comment.length}/1000 characters
        </p>
      </div>

      <div>
        <Label htmlFor="size">Size Purchased (Optional)</Label>
        <Input
          id="size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="e.g., US 9"
          maxLength={20}
        />
      </div>

      <div>
        <Label>Add Photos (Optional)</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload up to 5 photos to help others see your experience
        </p>

        <div className="grid grid-cols-5 gap-2 mb-3">
          {images.map((url, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={url}
                alt={`Review ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {images.length < 5 && (
          <div>
            <input
              type="file"
              id="review-images"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            <Label
              htmlFor="review-images"
              className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>{uploading ? "Uploading..." : "Upload Photos"}</span>
            </Label>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={rating === 0 || createReview.isPending || uploading}
        className="w-full"
      >
        {createReview.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
