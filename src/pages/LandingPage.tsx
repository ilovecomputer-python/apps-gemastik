import Icon from "../components/Icon";

interface LandingPageProps {
  onEnter: () => void;
  onOpenProfile: () => void;
}

export default function LandingPage({
  onEnter,
  onOpenProfile,
}: LandingPageProps) {
  return (
    <div className="landing">
      <button
        className="landing-settings"
        onClick={onOpenProfile}
        aria-label="Profil"
      >
        <Icon name="user" size={18} />
        Profil
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
