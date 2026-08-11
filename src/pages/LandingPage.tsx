import { useEffect, useState } from "react";
import Logo from "../components/Logo";

interface LandingPageProps {
  onEnter: () => void;
}

// Holds the cover on just the logo for a beat before the CTA appears, so
// opening the app reads as a brief splash rather than an instant form.
const CTA_REVEAL_DELAY_MS = 3000;

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCta(true), CTA_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing">
      <div className="landing-body">
        <Logo size={120} className="landing-mark" />
        <div className="landing-wordmark">
          <span className="landing-wordmark-name">AURA</span>
          <span className="landing-wordmark-sub">MARKETPLACE</span>
        </div>
      </div>

      <div className="landing-cta-slot">
        {showCta && (
          <button className="btn-primary landing-cta landing-cta-in" onClick={onEnter}>
            Masuk ke AURA
          </button>
        )}
      </div>
    </div>
  );
}
