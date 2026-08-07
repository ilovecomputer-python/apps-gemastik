import type { BottomTab } from "../types";
import Icon, { type IconName } from "./Icon";

interface BottomNavProps {
  active: BottomTab;
  onSelect: (tab: BottomTab) => void;
}

const TABS: { key: BottomTab; label: string; icon: IconName }[] = [
  { key: "home", label: "Beranda", icon: "home" },
  { key: "scan", label: "Scan AI", icon: "scan" },
  { key: "brands", label: "Brand Baru", icon: "store" },
  { key: "account", label: "Akun", icon: "user" },
];

export default function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
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
