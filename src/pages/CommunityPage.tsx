import { useCallback, useEffect, useState } from "react";
import type { FeedReview, ReviewerStats } from "../types";
import { reviewsApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface CommunityPageProps {
  onBack: () => void;
  onOpenProduct: (id: string) => void;
  onOpenBrands: () => void;
  onOpenVouchers: () => void;
  onRequireLogin: () => void;
}

const BADGE_LADDER = [
  { badge: "Reviewer Pemula", need: "Mulai dari ulasan pertama" },
  { badge: "Reviewer Aktif", need: "5 ulasan" },
  { badge: "Reviewer Terpercaya", need: "15 ulasan + 20 tanda membantu" },
];

export default function CommunityPage({
  onBack,
  onOpenProduct,
  onOpenBrands,
  onOpenVouchers,
  onRequireLogin,
}: CommunityPageProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<FeedReview[]>([]);
  const [stats, setStats] = useState<ReviewerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [feed, mine] = await Promise.all([
        reviewsApi.feed(),
        user ? reviewsApi.myStats().catch(() => null) : Promise.resolve(null),
      ]);
      setReviews(feed.reviews);
      setStats(mine);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHelpful = async (review: FeedReview) => {
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
  };

  return (
    <div className="screen">
      <TopBar title="Komunitas" onBack={onBack} />

      {/* How the rewards actually work, stated plainly up front. */}
      <div className="rewards-box">
        <h2 className="rewards-title">Ulasanmu dihargai</h2>
        <div className="rewards-grid">
          <div className="reward-item">
            <span className="reward-value">+10</span>
            <span className="reward-label">poin per ulasan</span>
          </div>
          <div className="reward-item">
            <span className="reward-value">+2</span>
            <span className="reward-label">tiap ditandai membantu</span>
          </div>
          <div className="reward-item">
            <span className="reward-value">3</span>
            <span className="reward-label">tingkat badge</span>
          </div>
        </div>
        <p className="rewards-copy">
          Makin banyak orang merasa ulasanmu membantu, makin cepat poinmu naik —
          lalu poin ditukar jadi voucher belanja.
        </p>
        <button className="btn-primary rewards-cta" onClick={onOpenVouchers}>
          Tukar poin jadi voucher
        </button>
      </div>

      {stats && (
        <div className="checkout-section">
          <h3 className="section-title">Statistik kamu</h3>
          <div className="seller-stats">
            <div className="seller-stat">
              <div className="seller-stat-value">{stats.reviewCount}</div>
              <div className="points-label">Ulasan</div>
            </div>
            <div className="seller-stat">
              <div className="seller-stat-value">{stats.totalHelpful}</div>
              <div className="points-label">Membantu</div>
            </div>
            <div className="seller-stat">
              <div className="seller-stat-value points-value">
                {user?.points ?? 0}
              </div>
              <div className="points-label">Poin</div>
            </div>
          </div>
          <div className="badge-ladder">
            {BADGE_LADDER.map((b) => (
              <div
                key={b.badge}
                className={`ladder-row${stats.badge === b.badge ? " current" : ""}`}
              >
                <Icon
                  name={stats.badge === b.badge ? "heart-filled" : "shield"}
                  size={14}
                />
                <span className="ladder-badge">{b.badge}</span>
                <span className="meta">{b.need}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-heading-row">
        <h3>Ulasan paling membantu</h3>
      </div>

      {loading ? (
        <p className="loading-text">Memuat…</p>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="heart" size={28} />
          </span>
          <h3>Belum ada ulasan</h3>
          <p className="empty-state-text">
            Jadi yang pertama menulis ulasan dan kumpulkan poinnya.
          </p>
        </div>
      ) : (
        <div className="community-list">
          {reviews.map((review) => (
            <div key={review.id} className="community-card wide">
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
              <p className="review-text">{review.text}</p>
              <div className="community-foot">
                <span className="meta">
                  {review.authorName}
                  {review.isMine && " (kamu)"}
                </span>
                <button
                  className={`helpful-btn${review.markedHelpfulByMe ? " active" : ""}`}
                  onClick={() => toggleHelpful(review)}
                  disabled={review.isMine}
                  title={
                    review.isMine
                      ? "Tidak bisa menandai ulasan sendiri"
                      : "Tandai membantu — penulisnya dapat +2 poin"
                  }
                >
                  👍 Membantu ({review.helpfulCount})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
