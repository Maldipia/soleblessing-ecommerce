import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { StarRating } from "./StarRating";
import { ThumbsUp, MessageSquare } from "lucide-react";

interface ReviewListProps {
  sku: string;
}

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  size_purchased: string | null;
  helpful_count: number;
  created_at: string;
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

export function ReviewList({ sku }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [helpedIds, setHelpedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await sb.select("sb_reviews", `sku=eq.${sku}&status=eq.published&order=created_at.desc&limit=20`);
        setReviews(Array.isArray(data) ? data : []);
      } catch { setReviews([]); }
      finally { setLoading(false); }
    })();
  }, [sku]);

  const markHelpful = async (reviewId: string) => {
    if (helpedIds.has(reviewId)) return;
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;
      await sb.update("sb_reviews", `id=eq.${reviewId}`, {
        helpful_count: review.helpful_count + 1,
      });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r));
      setHelpedIds(prev => new Set([...prev, reviewId]));
    } catch {}
  };

  if (loading) return (
    <div className="py-8 text-center">
      <div className="flex gap-2 justify-center">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>
    </div>
  );

  if (reviews.length === 0) return (
    <div className="py-8 text-center">
      <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
      <p className="text-sm text-gray-400">No reviews yet — be the first!</p>
    </div>
  );

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const dist = [5,4,3,2,1].map(n => ({ stars: n, count: reviews.filter(r => r.rating === n).length }));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-6 bg-[#F7F4EF] rounded-xl p-5">
        <div className="text-center">
          <div className="text-4xl font-black text-[#0d2430]">{avgRating.toFixed(1)}</div>
          <StarRating rating={Math.round(avgRating)} />
          <p className="text-[10px] text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {dist.map(d => (
            <div key={d.stars} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-4">{d.stars}</span>
              <span className="text-[10px] text-yellow-400">★</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#C9A84C] rounded-full"
                  style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }} />
              </div>
              <span className="text-[10px] text-gray-400 w-4">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.map(r => (
        <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0d2430]">{r.customer_name}</span>
                {r.size_purchased && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Size {r.size_purchased}</span>
                )}
              </div>
              <StarRating rating={r.rating} size="sm" />
            </div>
            <span className="text-[10px] text-gray-400">{fmtDate(r.created_at)}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{r.comment}</p>
          <button onClick={() => markHelpful(r.id)} disabled={helpedIds.has(r.id)}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${helpedIds.has(r.id) ? "text-[#C9A84C]" : "text-gray-400 hover:text-gray-600"}`}>
            <ThumbsUp className="h-3 w-3" />
            Helpful {r.helpful_count > 0 ? `(${r.helpful_count})` : ""}
          </button>
        </div>
      ))}
    </div>
  );
}
