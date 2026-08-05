import type { ScanMode } from "../types";
import TopBar from "../components/TopBar";
import Icon, { type IconName } from "../components/Icon";

interface ScanPageProps {
  onBack: () => void;
  onSelectMode: (mode: ScanMode) => void;
  onOpenQuiz: () => void;
}

const MODES: {
  key: ScanMode;
  title: string;
  desc: string;
  icon: IconName;
}[] = [
  {
    key: "shade",
    title: "Analisis Shade",
    desc: "Undertone untuk foundation, lipstik dan blush yang pas.",
    icon: "sparkle",
  },
  {
    key: "skin",
    title: "Analisis Kulit",
    desc: "Tipe dan kondisi kulit untuk rekomendasi skincare.",
    icon: "face",
  },
  {
    key: "face-shape",
    title: "Analisis Bentuk Wajah",
    desc: "Bentuk wajah untuk tips contour dan blush.",
    icon: "scan",
  },
];

export default function ScanPage({
  onBack,
  onSelectMode,
  onOpenQuiz,
}: ScanPageProps) {
  return (
    <div className="screen">
      <TopBar title="AI Scan Studio" onBack={onBack} />
      <div className="scan-intro">
        <p>
          Pilih jenis analisa. Hasil langsung tersambung ke rekomendasi
          produk.
        </p>
      </div>
      <div className="scan-mode-list">
        <button className="scan-mode-card scan-mode-highlight" onClick={onOpenQuiz}>
          <span className="scan-mode-icon">
            <Icon name="sparkle" size={20} />
          </span>
          <div>
            <div className="scan-mode-title">Beauty Quiz</div>
            <p className="scan-mode-desc">
              Jawab beberapa pertanyaan, dapat trial kit personal — termasuk
              pilihan dari brand baru.
            </p>
          </div>
          <Icon name="chevron-right" size={16} className="scan-mode-chevron" />
        </button>
        {MODES.map((mode) => (
          <button
            key={mode.key}
            className="scan-mode-card"
            onClick={() => onSelectMode(mode.key)}
          >
            <span className="scan-mode-icon">
              <Icon name={mode.icon} size={20} />
            </span>
            <div>
              <div className="scan-mode-title">{mode.title}</div>
              <p className="scan-mode-desc">{mode.desc}</p>
            </div>
            <Icon name="chevron-right" size={16} className="scan-mode-chevron" />
          </button>
        ))}
      </div>
    </div>
  );
}
