import Icon from "../components/Icon";
import Logo from "../components/Logo";

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
        <Logo size={120} className="landing-mark" />
        <div className="landing-wordmark">
          <span className="landing-wordmark-name">AURA</span>
          <span className="landing-wordmark-sub">MARKETPLACE</span>
        </div>
      </div>

      <button className="btn-primary landing-cta" onClick={onEnter}>
        Masuk ke AURA
      </button>
    </div>
  );
}
