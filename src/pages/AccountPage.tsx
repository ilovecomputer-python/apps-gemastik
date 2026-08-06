import { useEffect, useState } from "react";
import type { ReviewerStats, User } from "../types";
import { reviewsApi } from "../lib/api";
import TopBar from "../components/TopBar";
import Icon, { type IconName } from "../components/Icon";

interface AccountPageProps {
  user: User | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSubscription: () => void;
  onOpenBrandOnboarding: () => void;
}

const MENU_ITEMS: { title: string; desc: string; icon: IconName }[] = [
  { title: "Pesanan saya", desc: "Lacak dan riwayat pesanan", icon: "package" },
  { title: "Wishlist", desc: "Produk favorit dan alert harga", icon: "heart" },
  {
    title: "Profil dan pengaturan",
    desc: "Alamat, kontak, notifikasi, keamanan",
    icon: "user",
  },
];

export default function AccountPage({
  user,
  darkMode,
  onToggleDarkMode,
  onLogin,
  onLogout,
  onOpenSubscription,
  onOpenBrandOnboarding,
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
        <div className="reviewer-stats-card">
          <span className="reviewer-badge-pill">{reviewerStats.badge}</span>
          <div>
            <div className="option-row-title">
              {reviewerStats.reviewCount} ulasan ditulis
            </div>
            <p className="meta">
              👍 {reviewerStats.totalHelpful} orang terbantu
            </p>
          </div>
        </div>
      )}

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
        {MENU_ITEMS.map((item) => (
          <button key={item.title} className="menu-item">
            <span className="menu-icon">
              <Icon name={item.icon} size={17} />
            </span>
            <div>
              <div className="menu-title">{item.title}</div>
              <p className="menu-desc">{item.desc}</p>
            </div>
            <Icon name="chevron-right" size={15} className="menu-chevron" />
          </button>
        ))}

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
            <div className="menu-title">Untuk penjual</div>
            <p className="menu-desc">Daftarkan brand UMKM-mu di AURA</p>
          </div>
          <Icon name="chevron-right" size={15} className="menu-chevron" />
        </button>
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
