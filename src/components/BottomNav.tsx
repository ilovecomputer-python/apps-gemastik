import type { BottomTab } from "../types";
import Icon, { type IconName } from "./Icon";

interface BottomNavProps {
  active: BottomTab;
  onSelect: (tab: BottomTab) => void;
  /** A seller account gets a focused nav - just their dashboard and account, no buyer browsing. */
  variant?: "buyer" | "seller";
}

const BUYER_TABS: { key: BottomTab; label: string; icon: IconName }[] = [
  { key: "home", label: "Beranda", icon: "home" },
  { key: "scan", label: "Scan AI", icon: "scan" },
  { key: "brands", label: "Brand Baru", icon: "store" },
  { key: "account", label: "Akun", icon: "user" },
];

const SELLER_TABS: { key: BottomTab; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "Dashboard", icon: "store" },
  { key: "account", label: "Akun", icon: "user" },
];

export default function BottomNav({ active, onSelect, variant = "buyer" }: BottomNavProps) {
  const tabs = variant === "seller" ? SELLER_TABS : BUYER_TABS;
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`bottom-nav-item${active === tab.key ? " active" : ""}`}
          onClick={() => onSelect(tab.key)}
        >
          <span className="bottom-nav-icon">
            <Icon name={tab.icon} size={20} />
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
