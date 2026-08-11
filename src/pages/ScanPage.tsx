import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface ScanPageProps {
  onBack: () => void;
  onStartScan: () => void;
  onOpenQuiz: () => void;
}

export default function ScanPage({
  onBack,
  onStartScan,
  onOpenQuiz,
}: ScanPageProps) {
  return (
    <div className="screen">
      <TopBar title="AI Scan Studio" onBack={onBack} />
      <div className="scan-intro">
        <p>
          Dua cara mengenal kulitmu di AURA: foto untuk warna & shade, atau
          jawab quiz untuk kondisi kulitmu.
        </p>
      </div>
      <div className="scan-mode-list">
        <button className="scan-mode-card" onClick={onStartScan}>
          <span className="scan-mode-icon">
            <Icon name="face" size={20} />
          </span>
          <div>
            <div className="scan-mode-title">Analisis Warna & Shade</div>
            <p className="scan-mode-desc">
              Foto wajahmu diukur AI untuk undertone dan personal colour,
              lalu dicocokkan ke shade foundation yang beneran ada di katalog.
            </p>
          </div>
          <Icon name="chevron-right" size={16} className="scan-mode-chevron" />
        </button>

        <button className="scan-mode-card scan-mode-highlight" onClick={onOpenQuiz}>
          <span className="scan-mode-icon">
            <Icon name="sparkle" size={20} />
          </span>
          <div>
            <div className="scan-mode-title">Beauty Quiz</div>
            <p className="scan-mode-desc">
              Tanpa foto — jawab soal kondisi dan tipe kulitmu, dapat trial
              kit personal termasuk pilihan dari brand baru.
            </p>
          </div>
          <Icon name="chevron-right" size={16} className="scan-mode-chevron" />
        </button>
      </div>
    </div>
  );
}
