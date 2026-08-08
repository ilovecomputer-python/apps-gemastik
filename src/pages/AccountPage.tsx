import { useEffect, useState } from "react";
import type { ReviewerStats, User } from "../types";
import { reviewsApi } from "../lib/api";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface AccountPageProps {
  user: User | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSubscription: () => void;
  onOpenBrandOnboarding: () => void;
  onOpenAdmin: () => void;
  onOpenVouchers: () => void;
  onOpenCommunity: () => void;
  onOpenOrders: () => void;
  onOpenWishlist: () => void;
  onOpenAddresses: () => void;
}

export default function AccountPage({
  user,
  darkMode,
  onToggleDarkMode,
  onLogin,
  onLogout,
  onOpenSubscription,
  onOpenBrandOnboarding,
  onOpenAdmin,
  onOpenVouchers,
  onOpenCommunity,
  onOpenOrders,
  onOpenWishlist,
  onOpenAddresses,
}: AccountPageProps) {
  const [reviewerStats, setReviewerStats] = useState<ReviewerStats | null>(null);

  useEffect(() => {
    if (!user) return;
    reviewsApi
      .myStats()
      .then(setReviewerStats)
      .catch(() => setReviewerStats(null));
  }, [user]);

  if (!user) {
    return (
      <div className="screen">
        <TopBar title="Akun" />
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="user" size={28} />
          </span>
          <h3>Belum masuk</h3>
          <p className="empty-state-text">
            Login untuk melihat profil, poin, dan riwayat pesananmu.
          </p>
          <button className="btn-primary empty-state-cta" onClick={onLogin}>
            Masuk / Daftar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar title="Akun" />

      <div className="profile-card">
        <div className="profile-avatar">{user.name[0]?.toUpperCase()}</div>
        <div>
          <div className="profile-name">{user.name}</div>
          <div className="meta">{user.email}</div>
        </div>
        <div className="profile-points">
          <Icon name="star" size={16} />
          <div>
            <div className="points-value">{user.points}</div>
            <div className="points-label">poin</div>
          </div>
        </div>
      </div>

      {reviewerStats && reviewerStats.reviewCount > 0 && (
        <button className="reviewer-stats-card" onClick={onOpenCommunity}>
          <span className="reviewer-badge-pill">{reviewerStats.badge}</span>
          <div className="reviewer-stats-body">
            <div className="option-row-title">
              {reviewerStats.reviewCount} ulasan ditulis
            </div>
            <p className="meta">
              👍 {reviewerStats.totalHelpful} orang terbantu
            </p>
          </div>
          <Icon name="chevron-right" size={15} className="menu-chevron" />
        </button>
      )}

      <button className="menu-item points-item" onClick={onOpenVouchers}>
        <span className="menu-icon">
          <Icon name="star" size={17} />
        </span>
        <div>
          <div className="menu-title">Tukar poin</div>
          <p className="menu-desc">
            {user.points} poin · tukar jadi voucher belanja
          </p>
        </div>
        <Icon name="chevron-right" size={15} className="menu-chevron" />
      </button>

      <button className="upgrade-banner" onClick={onOpenSubscription}>
        <span className="upgrade-badge">AURA+</span>
        <div>
          <div className="upgrade-title">Upgrade ke AURA+</div>
          <p className="upgrade-copy">
            Trial kit tiap bulan dari brand partner, sebelum kamu beli full
            pack
          </p>
        </div>
      </button>

      <div className="menu-list">
        <button className="menu-item" onClick={onOpenOrders}>
          <span className="menu-icon">
            <Icon name="package" size={17} />
          </span>
          <div>
            <div className="menu-title">Pesanan saya</div>
            <p className="menu-desc">Lacak dan riwayat pesanan</p>
          </div>
          <Icon name="chevron-right" size={15} className="menu-chevron" />
        </button>

        <button className="menu-item" onClick={onOpenWishlist}>
          <span className="menu-icon">
            <Icon name="heart" size={17} />
          </span>
          <div>
            <div className="menu-title">Wishlist</div>
            <p className="menu-desc">Produk favorit yang kamu simpan</p>
          </div>
          <Icon name="chevron-right" size={15} className="menu-chevron" />
        </button>

        <button className="menu-item" onClick={onOpenAddresses}>
          <span className="menu-icon">
            <Icon name="user" size={17} />
          </span>
          <div>
            <div className="menu-title">Alamat pengiriman</div>
            <p className="menu-desc">Kelola alamat rumah, kantor, dan lainnya</p>
          </div>
          <Icon name="chevron-right" size={15} className="menu-chevron" />
        </button>

        <div className="menu-item menu-toggle">
          <span className="menu-icon">
            <Icon name="moon" size={17} />
          </span>
          <div>
            <div className="menu-title">Mode gelap</div>
            <p className="menu-desc">Tampilan nyaman di malam hari</p>
          </div>
          <button
            className={`switch${darkMode ? " on" : ""}`}
            onClick={onToggleDarkMode}
            aria-label="Toggle mode gelap"
          >
            <span className="switch-knob" />
          </button>
        </div>
      </div>

      <div className="menu-list">
        <button className="menu-item" onClick={onOpenBrandOnboarding}>
          <span className="menu-icon">
            <Icon name="store" size={17} />
          </span>
          <div>
            <div className="menu-title">Seller Center</div>
            <p className="menu-desc">Kelola brand dan produkmu</p>
          </div>
          <Icon name="chevron-right" size={15} className="menu-chevron" />
        </button>

        {/* Only admins see this; the server re-checks on every admin call. */}
        {user.role === "ADMIN" && (
          <button className="menu-item" onClick={onOpenAdmin}>
            <span className="menu-icon">
              <Icon name="shield" size={17} />
            </span>
            <div>
              <div className="menu-title">Admin</div>
              <p className="menu-desc">Tinjau pendaftaran brand UMKM</p>
            </div>
            <Icon name="chevron-right" size={15} className="menu-chevron" />
          </button>
        )}
      </div>

      <button className="menu-item logout-item" onClick={onLogout}>
        <span className="menu-icon">
          <Icon name="back" size={17} />
        </span>
        <div className="menu-title">Keluar</div>
      </button>
    </div>
  );
}
