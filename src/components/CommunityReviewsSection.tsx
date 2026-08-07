import { useEffect, useState } from "react";
import type { FeedReview } from "../types";
import { reviewsApi } from "../lib/api";
import Icon from "./Icon";

interface CommunityReviewsSectionProps {
  onOpenProduct: (id: string) => void;
  onOpenBrands: () => void;
  onRequireLogin: () => void;
  onSeeAll: () => void;
  isLoggedIn: boolean;
}

export default function CommunityReviewsSection({
  onOpenProduct,
  onOpenBrands,
  onRequireLogin,
  onSeeAll,
  isLoggedIn,
}: CommunityReviewsSectionProps) {
  const [reviews, setReviews] = useState<FeedReview[]>([]);

  useEffect(() => {
    reviewsApi
      .feed()
      .then(({ reviews }) => setReviews(reviews.slice(0, 5)))
      .catch(() => setReviews([]));
  }, []);

  const toggleHelpful = async (review: FeedReview) => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    const { helpfulCount, markedHelpfulByMe } = await reviewsApi.toggleHelpful(
      review.id,
    );
    setReviews((prev) =>
      prev.map((r) =>
        r.id === review.id ? { ...r, helpfulCount, markedHelpfulByMe } : r,
      ),
    );
  };

  if (reviews.length === 0) return null;

  return (
    <>
      <div className="section-heading-row">
        <h3>Kata Komunitas</h3>
        <button className="link-btn" onClick={onSeeAll}>
          Poin & badge →
        </button>
      </div>
      <section className="community-row">
        {reviews.map((review) => (
          <div key={review.id} className="community-card">
            {review.product ? (
              <button
                className="community-product"
                onClick={() => onOpenProduct(review.product!.id)}
              >
                {review.product.imageUrl ? (
                  <img
                    className="community-swatch"
                    src={review.product.imageUrl}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="community-swatch"
                    style={{ background: review.product.color }}
                  />
                )}
                <span className="community-product-name">
                  {review.product.brand} · {review.product.name}
                </span>
              </button>
            ) : (
              <button className="community-product" onClick={onOpenBrands}>
                <span className="community-swatch community-swatch-brand">
                  <Icon name="store" size={13} />
                </span>
                <span className="community-product-name">
                  Ulasan brand · {review.store!.name}
                </span>
              </button>
            )}

            <span className="review-stars">
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </span>
            <p className="community-text">{review.text}</p>

            <div className="community-foot">
              <span className="meta">{review.authorName}</span>
              <button
                className={`helpful-btn${review.markedHelpfulByMe ? " active" : ""}`}
                onClick={() => toggleHelpful(review)}
                disabled={review.isMine}
                title={
                  review.isMine ? "Tidak bisa menandai ulasan sendiri" : undefined
                }
              >
                <Icon name="heart" size={12} /> {review.helpfulCount}
              </button>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
