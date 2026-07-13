import { useState } from "react";
import { sb } from "@/lib/supabase";
import { StarRating } from "./StarRating";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface ReviewFormProps {
  sku: string;
  itemCode?: string;
  onSuccess?: () => void;
}

export function ReviewForm({ sku, itemCode, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [size, setSize] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error("Please select a rating"); return; }
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!comment.trim()) { toast.error("Please write a review"); return; }

    setSubmitting(true);
    try {
      await sb.insert("sb_reviews", {
        sku,
        item_code: itemCode || null,
        customer_name: name.trim(),
        rating,
        comment: comment.trim(),
        size_purchased: size.trim() || null,
        status: "published",
      });
      toast.success("Review submitted! Thank you 🙏");
      setSubmitted(true);
      setRating(0); setName(""); setComment(""); setSize("");
      onSuccess?.();
    } catch(e: any) {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
      <p className="text-2xl mb-2">🙏</p>
      <p className="text-sm font-bold text-green-800">Thank you for your review!</p>
      <p className="text-xs text-green-600 mt-1">Your feedback helps other shoppers.</p>
      <button onClick={() => setSubmitted(false)} className="text-xs text-green-700 underline mt-2">Write another review</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-[#F7F4EF] rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d2430]">Write a Review</h3>

      {/* Star rating */}
      <div>
        <label className="text-xs font-semibold text-gray-500 block mb-2">Your Rating *</label>
        <StarRating rating={rating} onRatingChange={setRating} />
        {rating > 0 && (
          <p className="text-xs text-[#C9A84C] font-semibold mt-1">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent!"][rating]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Your Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Juan D."
            className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Size Purchased</label>
          <input value={size} onChange={e => setSize(e.target.value)}
            placeholder="e.g. US 9"
            className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 block mb-1.5">Your Review *</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="How's the fit? Quality? Would you recommend it?"
          rows={3}
          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0d2430] resize-none" />
      </div>

      <button type="submit" disabled={submitting || !rating || !name || !comment}
        className="w-full bg-[#0d2430] text-white py-3 text-sm font-bold tracking-wide uppercase rounded-xl hover:bg-[#122d3a] disabled:opacity-40 transition-all flex items-center justify-center gap-2">
        <Send className="h-4 w-4" />
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
