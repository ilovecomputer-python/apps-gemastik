import { useState } from "react";
import type { ScanMode } from "../types";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface ScanFlowPageProps {
  mode: ScanMode;
  onBack: () => void;
  onAnalyze: () => void;
}

const MODE_COPY: Record<ScanMode, { title: string; hint: string }> = {
  shade: {
    title: "Analisis Shade",
    hint: "Cahaya merata, tanpa makeup berat",
  },
  skin: {
    title: "Analisis Kulit",
    hint: "Wajah bersih, cahaya natural dari depan",
  },
  "face-shape": {
    title: "Analisis Bentuk Wajah",
    hint: "Rambut disisir ke belakang, ambil dari depan",
  },
};

export default function ScanFlowPage({
  mode,
  onBack,
  onAnalyze,
}: ScanFlowPageProps) {
  const [hasPhoto, setHasPhoto] = useState(false);
  const copy = MODE_COPY[mode];

  return (
    <div className="screen">
      <TopBar title={copy.title} onBack={onBack} />
      <div className="scan-flow">
        <div
          className={`scan-preview${hasPhoto ? " has-photo" : ""}`}
          onClick={() => setHasPhoto(true)}
        >
          {hasPhoto ? (
            <>
              <Icon name="face" size={28} />
              <span>Foto siap dianalisa</span>
            </>
          ) : (
            <>
              <Icon name="camera" size={26} />
              <span className="scan-preview-title">
                Unggah selfie atau buka kamera
              </span>
              <span className="scan-preview-hint">{copy.hint}</span>
            </>
          )}
        </div>

        <div className="scan-actions">
          <button className="btn-secondary" onClick={() => setHasPhoto(true)}>
            <Icon name="upload" size={15} />
            Unggah foto
          </button>
          <button className="btn-secondary" onClick={() => setHasPhoto(true)}>
            <Icon name="camera" size={15} />
            Kamera
          </button>
        </div>

        <button
          className="btn-primary"
          disabled={!hasPhoto}
          onClick={onAnalyze}
        >
          Mulai analisa
        </button>

        <p className="scan-status">
          ⏳ Deteksi wajah AI (MediaPipe · 468 titik) — segera hadir
        </p>
      </div>
    </div>
  );
}
