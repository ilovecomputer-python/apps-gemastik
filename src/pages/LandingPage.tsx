import Icon from "../components/Icon";

interface LandingPageProps {
  onEnter: () => void;
  onOpenSettings: () => void;
}

export default function LandingPage({
  onEnter,
  onOpenSettings,
}: LandingPageProps) {
  return (
    <div className="landing">
      <button
        className="landing-settings"
        onClick={onOpenSettings}
        aria-label="Pengaturan"
      >
        <Icon name="settings" size={18} />
        Pengaturan
      </button>

      <div className="landing-body">
        <div className="landing-mark">
          <Icon name="sparkle" size={26} />
        </div>
        <span className="landing-eyebrow">
          ADAPTIVE UNIFIED RECOGNITION FOR AESTHETICS
        </span>
        <h1 className="landing-title">
          Marketplace kecantikan,
          <br />
          dibaca AI.
        </h1>
        <p className="landing-copy">
          Belanja skincare dan makeup brand lokal dengan rekomendasi dari
          analisis wajahmu sendiri.
        </p>
      </div>

      <button className="btn-primary landing-cta" onClick={onEnter}>
        Masuk ke AURA
      </button>
    </div>
  );
}
