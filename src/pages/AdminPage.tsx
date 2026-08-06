import { useCallback, useEffect, useState } from "react";
import type { BrandApplication } from "../types";
import { ApiError, adminApi } from "../lib/api";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface AdminPageProps {
  onBack: () => void;
}

type Tab = "PENDING" | "APPROVED" | "REJECTED";

const TAB_LABEL: Record<Tab, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export default function AdminPage({ onBack }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>("PENDING");
  const [applications, setApplications] = useState<BrandApplication[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const [{ applications }, summary] = await Promise.all([
        adminApi.brands(status),
        adminApi.summary(),
      ]);
      setApplications(applications);
      setPendingCount(summary.pending);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal memuat pendaftaran.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const decide = async (app: BrandApplication, approve: boolean) => {
    setBusyId(app.id);
    setError(null);
    try {
      const { message } = approve
        ? await adminApi.approve(app.id)
        : await adminApi.reject(app.id);
      setNotice(message);
      // Drop it from the current list straight away, then refresh the counter.
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      adminApi.summary().then((s) => setPendingCount(s.pending));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memproses.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Admin" onBack={onBack} />

      <div className="admin-intro">
        <p>
          Tinjau pendaftaran brand UMKM. Brand hanya tampil di{" "}
          <strong>Brand Baru</strong> setelah disetujui.
        </p>
      </div>

      <div className="chip-row admin-tabs">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            className={`chip${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABEL[t]}
            {t === "PENDING" && pendingCount > 0 && (
              <span className="chip-count">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <div className="admin-notice">
          <Icon name="sparkle" size={14} />
          <span>{notice}</span>
        </div>
      )}
      {error && <p className="auth-error admin-error">{error}</p>}

      {loading ? (
        <p className="loading-text">Memuat…</p>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="store" size={28} />
          </span>
          <h3>
            {tab === "PENDING"
              ? "Tidak ada antrian"
              : `Belum ada yang ${TAB_LABEL[tab].toLowerCase()}`}
          </h3>
          <p className="empty-state-text">
            {tab === "PENDING"
              ? "Semua pendaftaran sudah ditinjau."
              : "Daftar akan muncul di sini setelah kamu meninjau pendaftaran."}
          </p>
        </div>
      ) : (
        <div className="admin-list">
          {applications.map((app) => (
            <div key={app.id} className="admin-card">
              <div className="admin-card-head">
                <div>
                  <div className="option-row-title">{app.name}</div>
                  <div className="meta">
                    {app.city} · {app.productCount} produk
                  </div>
                </div>
                <span className={`badge badge-status-${app.status.toLowerCase()}`}>
                  {app.status}
                </span>
              </div>

              {app.tagline && <p className="admin-tagline">{app.tagline}</p>}
              {app.story && <p className="condition-advice">{app.story}</p>}

              <div className="meta">
                {app.contactName} · {app.contactEmail}
              </div>

              {app.status === "PENDING" && (
                <div className="sheet-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => decide(app, false)}
                    disabled={busyId === app.id}
                  >
                    Tolak
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => decide(app, true)}
                    disabled={busyId === app.id}
                  >
                    {busyId === app.id ? "Memproses…" : "Setujui"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
