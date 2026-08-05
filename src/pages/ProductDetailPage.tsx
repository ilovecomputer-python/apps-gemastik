import { useEffect, useState } from "react";
import type { Product, Review } from "../types";
import { productsApi, reviewsApi, ApiError } from "../lib/api";
import { formatPrice, formatSoldLabel } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import Icon from "../components/Icon";

interface ProductDetailPageProps {
  id: string;
  wishlisted: boolean;
  onBack: () => void;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (id: string) => void;
  onGoToCart: () => void;
  onRequireLogin: () => void;
}

export default function ProductDetailPage({
  id,
  wishlisted,
  onBack,
  onToggleWishlist,
  onAddToCart,
  onGoToCart,
  onRequireLogin,
}: ProductDetailPageProps) {
  const { user, refreshUser } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [shade, setShade] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productsApi
      .get(id)
      .then(({ product }) => {
        if (cancelled) return;
        setProduct(product);
        setShade(product.shades[0] ?? "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    reviewsApi
      .list(id)
      .then(({ reviews }) => {
        if (!cancelled) setReviews(reviews);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="screen">
        <TopBar onBack={onBack} />
        <p className="loading-text">Memuat produk…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="screen">
        <TopBar title="Produk" onBack={onBack} />
        <p className="empty-state-text">Produk tidak ditemukan.</p>
      </div>
    );
  }

  const handleAddToCart = () => {
    onAddToCart(product.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const alreadyReviewed = reviews.some((r) => r.isMine);

  const handleToggleHelpful = async (review: Review) => {
    if (!user) {
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
    refreshUser();
  };

  const handleWriteReview = () => {
    if (!user) {
      onRequireLogin();
      return;
    }
    setShowReviewForm(true);
  };

  const handleSubmitReview = async () => {
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const { review } = await reviewsApi.create(product.id, {
        rating: reviewRating,
        text: reviewText,
      });
      setReviews((prev) => [review, ...prev]);
      setShowReviewForm(false);
      setReviewText("");
      setReviewRating(5);
      refreshUser();
    } catch (err) {
      setReviewError(
        err instanceof ApiError ? err.message : "Gagal mengirim ulasan.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="screen">
      <TopBar onBack={onBack} />
      <ProductImage color={product.color} label={product.name} aspect="4 / 3" />

      <div className="product-detail-body">
        <div className="detail-top-row">
          <div>
            <span className="brand">{product.brand}</span>
            <h2 className="detail-name">{product.name}</h2>
          </div>
          <button
            className={`wishlist-dot static${wishlisted ? " active" : ""}`}
            onClick={() => onToggleWishlist(product.id)}
            aria-label="Simpan ke wishlist"
          >
            <Icon name={wishlisted ? "heart-filled" : "heart"} size={17} />
          </button>
        </div>

        <div className="price-row">
          <span className="price large">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="price-strike">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="meta">
          ★ {product.rating.toFixed(1)} · {formatSoldLabel(product.soldCount)}
          {product.halal && <> · ✓ Halal</>}
        </div>

        <div className="store-row">
          <div className="store-avatar">{product.storeName[0]}</div>
          <div>
            <div className="store-name">{product.storeName}</div>
            <div className="meta">
              ★ {product.storeRating.toFixed(1)} · Kunjungi toko →
            </div>
          </div>
        </div>

        {product.shades.length > 0 && (
          <div className="shade-section">
            <h3 className="section-title">Pilih shade</h3>
            <div className="shade-row">
              {product.shades.map((s) => (
                <button
                  key={s}
                  className={`shade-chip${shade === s ? " active" : ""}`}
                  onClick={() => setShade(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="description-section">
          <h3 className="section-title">Deskripsi dibuat dengan AI</h3>
          <p className="description-text">{product.description}</p>
          <div className="hashtag-row">
            {product.hashtags.map((tag) => (
              <span key={tag} className="hashtag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="buy-row">
          <button
            className="btn-secondary cart-add-btn"
            onClick={handleAddToCart}
          >
            <Icon name="cart" size={16} />
            {justAdded ? "Ditambahkan ✓" : "+ Keranjang"}
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onAddToCart(product.id);
              onGoToCart();
            }}
          >
            Beli sekarang
          </button>
        </div>

        <div className="review-section">
          <div className="section-heading-row no-pad">
            <h3 className="section-title">
              Ulasan {reviews.length > 0 && `(${reviews.length})`}
            </h3>
            {!alreadyReviewed && (
              <button className="link-btn" onClick={handleWriteReview}>
                Tulis ulasan
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="review-form">
              <div className="review-stars-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="star-btn"
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} bintang`}
                  >
                    <Icon
                      name="star"
                      size={22}
                      className={star <= reviewRating ? "star-filled" : "star-empty"}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="review-textarea"
                placeholder="Ceritakan pengalamanmu pakai produk ini…"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
              />
              {reviewError && <p className="auth-error">{reviewError}</p>}
              <div className="sheet-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowReviewForm(false)}
                >
                  Batal
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmitReview}
                  disabled={reviewText.trim().length < 5 || reviewSubmitting}
                >
                  {reviewSubmitting ? "Mengirim…" : "Kirim (+10 poin)"}
                </button>
              </div>
            </div>
          )}

          {reviewsLoading ? (
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
        </div>
      </div>
    </div>
  );
}
