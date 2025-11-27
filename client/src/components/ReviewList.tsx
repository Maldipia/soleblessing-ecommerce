import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import ImageLightbox from "./ImageLightbox";

interface ReviewListProps {
  productId: number;
}

export function ReviewList({ productId }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  const { data, isLoading } = trpc.reviews.list.useQuery({
    productId,
    page,
    limit: 10,
  });

  const voteReview = trpc.reviews.vote.useMutation({
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit vote");
    },
  });

  const handleVote = (reviewId: number, helpful: boolean) => {
    voteReview.mutate({ reviewId, helpful });
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.reviews.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">
          No reviews yet. Be the first to review this product!
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / 10);

  return (
    <div className="space-y-6">
      {/* Reviews List */}
      <div className="space-y-6">
        {data.reviews.map((review) => (
          <div key={review.id} className="border rounded-lg p-6">
            <div className="flex items-start gap-4">
              {/* User Avatar */}
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                {review.userName?.charAt(0).toUpperCase() || "U"}
              </div>

              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {review.userName || "Anonymous"}
                      </span>
                      {review.verifiedPurchase === 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Verified Purchase
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={review.rating} readonly size="sm" />
                      {review.size && (
                        <span className="text-sm text-muted-foreground">
                          • Size: {review.size}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(review.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                {/* Review Title */}
                {review.title && (
                  <h4 className="font-semibold text-lg">{review.title}</h4>
                )}

                {/* Review Comment */}
                {review.comment && (
                  <p className="text-muted-foreground leading-relaxed">
                    {review.comment}
                  </p>
                )}

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {review.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => openLightbox(review.images, index)}
                        className="w-24 h-24 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Helpful Vote */}
                <div className="flex items-center gap-4 pt-2">
                  <span className="text-sm text-muted-foreground">
                    Was this review helpful?
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVote(review.id, true)}
                    disabled={voteReview.isPending}
                    className="gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Helpful ({review.helpfulCount})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Image Lightbox */}
      {showLightbox && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
