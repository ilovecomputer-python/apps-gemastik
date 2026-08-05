import type { BottomTab } from "../types";
import Icon, { type IconName } from "./Icon";

interface BottomNavProps {
  active: BottomTab;
  onSelect: (tab: BottomTab) => void;
  wishlistCount: number;
}

const TABS: { key: BottomTab; label: string; icon: IconName }[] = [
  { key: "home", label: "Beranda", icon: "home" },
  { key: "scan", label: "Scan AI", icon: "scan" },
  { key: "wishlist", label: "Wishlist", icon: "heart" },
  { key: "account", label: "Akun", icon: "user" },
];

export default function BottomNav({
  active,
  onSelect,
  wishlistCount,
}: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`bottom-nav-item${active === tab.key ? " active" : ""}`}
          onClick={() => onSelect(tab.key)}
        >
          <span className="bottom-nav-icon">
            <Icon
              name={
                tab.key === "wishlist" && active === "wishlist"
                  ? "heart-filled"
                  : tab.icon
              }
              size={20}
            />
            {tab.key === "wishlist" && wishlistCount > 0 && (
              <span className="nav-badge">{wishlistCount}</span>
            )}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
