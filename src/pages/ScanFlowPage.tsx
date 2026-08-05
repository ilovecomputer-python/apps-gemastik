import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanAnalysis, ScanMode } from "../types";
import { ApiError, scanApi } from "../lib/api";
import { fileToDataUrl, videoFrameToDataUrl } from "../utils/image";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface ScanFlowPageProps {
  mode: ScanMode;
  onBack: () => void;
  onAnalyzed: (result: ScanAnalysis) => void;
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
  onAnalyzed,
}: ScanFlowPageProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const copy = MODE_COPY[mode];

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // Never leave the camera light on when the user navigates away.
  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhoto(null);
      setCameraOn(true);
      // The <video> only exists after the state flip, so attach on next tick.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      setError(
        "Tidak bisa mengakses kamera. Izinkan akses kamera atau unggah foto dari galeri.",
      );
    }
  };

  const capture = () => {
    if (!videoRef.current) return;
    try {
      setPhoto(videoFrameToDataUrl(videoRef.current));
      stopCamera();
    } catch {
      setError("Gagal mengambil gambar dari kamera.");
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    stopCamera();
    try {
      setPhoto(await fileToDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membaca gambar.");
    }
  };

  const analyze = async () => {
    if (!photo) return;
    setAnalyzing(true);
    setError(null);
    try {
      onAnalyzed(await scanApi.analyze(mode, photo));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal menganalisa foto. Coba lagi.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title={copy.title} onBack={onBack} />
      <div className="scan-flow">
        <div className={`scan-preview${photo || cameraOn ? " has-photo" : ""}`}>
          {cameraOn ? (
            <video ref={videoRef} className="scan-video" playsInline muted />
          ) : photo ? (
            <img src={photo} alt="Foto untuk dianalisa" className="scan-photo" />
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {cameraOn ? (
          <div className="scan-actions">
            <button className="btn-secondary" onClick={stopCamera}>
              Batal
            </button>
            <button className="btn-primary" onClick={capture}>
              Ambil foto
            </button>
          </div>
        ) : (
          <div className="scan-actions">
            <button
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="upload" size={15} />
              {photo ? "Ganti foto" : "Unggah foto"}
            </button>
            <button className="btn-secondary" onClick={startCamera}>
              <Icon name="camera" size={15} />
              Kamera
            </button>
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}

        {!cameraOn && (
          <button
            className="btn-primary"
            disabled={!photo || analyzing}
            onClick={analyze}
          >
            {analyzing ? "Menganalisa dengan AI…" : "Mulai analisa"}
          </button>
        )}

        <p className="scan-status">
          Foto dianalisa oleh Gemini AI dan tidak disimpan di server.
        </p>
      </div>
    </div>
  );
}
