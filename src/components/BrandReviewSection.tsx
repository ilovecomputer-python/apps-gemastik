import { useState } from "react";
import type { Review } from "../types";
import { reviewsApi, ApiError } from "../lib/api";
import Icon from "./Icon";

interface BrandReviewSectionProps {
  storeId: string;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  /** Called after a successful submit so the parent can refresh the brand's star rating. */
  onReviewed?: () => void;
}

/**
 * Reviews live collapsed per brand card - NewBrandsPage already shows every
 * brand's full story and product grid on one screen, so an always-open
 * review list per card would make that page unreasonably long.
 */
export default function BrandReviewSection({
  storeId,
  isLoggedIn,
  onRequireLogin,
  onReviewed,
}: BrandReviewSectionProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { reviews } = await reviewsApi.brandList(storeId);
      setReviews(reviews);
      setLoaded(true);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpen = () => {
    if (!open && !loaded) load();
    setOpen((v) => !v);
  };

  const handleToggleHelpful = async (review: Review) => {
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

  const handleWriteReview = () => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { review } = await reviewsApi.brandCreate(storeId, {
        rating,
        text,
      });
      setReviews((prev) => [review, ...prev]);
      setShowForm(false);
      setText("");
      setRating(5);
      onReviewed?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengirim ulasan",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyReviewed = reviews.some((r) => r.isMine);

  return (
    <div className="review-section">
      <div className="section-heading-row no-pad">
        <h3 className="section-title">
          Ulasan brand{reviews.length > 0 && ` (${reviews.length})`}
        </h3>
        <button className="link-btn" onClick={handleToggleOpen}>
          {open ? "Tutup" : "Lihat & ulas"}
        </button>
      </div>

      {open && (
        <>
          {!alreadyReviewed && !showForm && (
            <div className="section-heading-row no-pad">
              <span className="meta">Sudah pernah beli dari brand ini?</span>
              <button className="link-btn" onClick={handleWriteReview}>
                Tulis ulasan
              </button>
            </div>
          )}

          {showForm && (
            <div className="review-form">
              <div className="review-stars-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="star-btn"
                    onClick={() => setRating(star)}
                    aria-label={`${star} bintang`}
                  >
                    <Icon
                      name="star"
                      size={22}
                      className={star <= rating ? "star-filled" : "star-empty"}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="review-textarea"
                placeholder="Ceritakan pengalamanmu dengan brand ini…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
              />
              {error && <p className="auth-error">{error}</p>}
              <div className="sheet-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={text.trim().length < 5 || submitting}
                >
                  {submitting ? "Mengirim…" : "Kirim (+10 poin)"}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="loading-text">Memuat ulasan…</p>
          ) : reviews.length === 0 ? (
            <p className="empty-state-text">
              Belum ada ulasan. Jadi yang pertama menulis ulasan!
            </p>
          ) : (
            <div className="review-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-card-header">
                    <span className="review-stars">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                    <span className="option-row-title">
                      {review.authorName}
                      {review.isMine && (
                        <span className="badge badge-default">Kamu</span>
                      )}
                    </span>
                  </div>
                  <p className="review-text">{review.text}</p>
                  <button
                    className={`helpful-btn${review.markedHelpfulByMe ? " active" : ""}`}
                    onClick={() => handleToggleHelpful(review)}
                    disabled={review.isMine}
                  >
                    👍 Membantu ({review.helpfulCount})
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
