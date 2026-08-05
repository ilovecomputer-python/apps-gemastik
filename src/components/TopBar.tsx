import Icon from "./Icon";

interface TopBarProps {
  title?: string;
  onBack?: () => void;
}

export default function TopBar({ title, onBack }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        {onBack && (
          <button className="back-btn" onClick={onBack} aria-label="Kembali">
            <Icon name="back" size={22} />
          </button>
        )}
        {title ? (
          <h1 className="top-bar-title">{title}</h1>
        ) : (
          <div className="brand-lockup">
            <span className="brand-name">AURA</span>
            <span className="brand-sub">MARKETPLACE</span>
          </div>
        )}
      </div>
    </header>
  );
}
