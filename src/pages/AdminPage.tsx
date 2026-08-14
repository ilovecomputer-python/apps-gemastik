import { useCallback, useEffect, useState } from "react";
import type { BrandApplication, CommissionTier, CommissionTierStore } from "../types";
import { ApiError, adminApi } from "../lib/api";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

/** Text-input mirror of a tier's numeric fields, so a field can sit empty mid-edit. */
interface TierDraft {
  minGmv: string;
  maxGmv: string;
  feePercent: string;
}

const toDraft = (t: CommissionTier): TierDraft => ({
  minGmv: String(t.minGmv),
  maxGmv: t.maxGmv === null ? "" : String(t.maxGmv),
  feePercent: String(t.feePercent),
});

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

  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [tierStores, setTierStores] = useState<CommissionTierStore[]>([]);
  const [tierDrafts, setTierDrafts] = useState<Record<string, TierDraft>>({});
  const [tiersLoading, setTiersLoading] = useState(true);
  const [tierError, setTierError] = useState<string | null>(null);
  const [tierNotice, setTierNotice] = useState<string | null>(null);
  const [savingTierId, setSavingTierId] = useState<string | null>(null);

  const loadTiers = useCallback(async () => {
    setTiersLoading(true);
    setTierError(null);
    try {
      const { tiers, stores } = await adminApi.commissionTiers();
      setTiers(tiers);
      setTierStores(stores);
      setTierDrafts(Object.fromEntries(tiers.map((t) => [t.id, toDraft(t)])));
    } catch (err) {
      setTierError(
        err instanceof ApiError ? err.message : "Gagal memuat tier komisi.",
      );
    } finally {
      setTiersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  const saveTier = async (tier: CommissionTier) => {
    const draft = tierDrafts[tier.id];
    const minGmv = Number(draft.minGmv);
    const feePercent = Number(draft.feePercent);
    if (!Number.isFinite(minGmv) || !Number.isFinite(feePercent)) {
      setTierError("GMV minimum dan potongan harus berupa angka.");
      return;
    }
    const maxGmv = draft.maxGmv.trim() === "" ? null : Number(draft.maxGmv);
    if (maxGmv !== null && !Number.isFinite(maxGmv)) {
      setTierError("GMV maksimum harus berupa angka, atau dikosongkan.");
      return;
    }

    setSavingTierId(tier.id);
    setTierError(null);
    try {
      const { tier: updated } = await adminApi.updateCommissionTier(tier.id, {
        minGmv,
        maxGmv,
        feePercent,
      });
      setTierNotice(`Tier ${updated.name} disimpan.`);
      await loadTiers();
    } catch (err) {
      setTierError(
        err instanceof ApiError ? err.message : "Gagal menyimpan tier.",
      );
    } finally {
      setSavingTierId(null);
    }
  };

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

      <div className="section-heading-row">
        <h3>Komisi Platform</h3>
      </div>
      <div className="admin-intro">
        <p>
          Potongan aplikasi bertingkat berdasarkan GMV 12 bulan terakhir toko,
          disepadankan dengan kriteria UMKM resmi (PP No. 7/2021: Usaha Mikro,
          Kecil, Menengah) - makin besar omzet tahunannya, makin besar
          potongannya, supaya Usaha Mikro tetap paling ringan. Sesuaikan
          rentangnya di bawah kalau kriterianya berubah.
        </p>
      </div>

      {tierNotice && (
        <div className="admin-notice">
          <Icon name="sparkle" size={14} />
          <span>{tierNotice}</span>
        </div>
      )}
      {tierError && <p className="auth-error admin-error">{tierError}</p>}

      {tiersLoading ? (
        <p className="loading-text">Memuat…</p>
      ) : (
        <>
          <div className="admin-list">
            {tiers.map((tier) => {
              const draft = tierDrafts[tier.id];
              if (!draft) return null;
              return (
                <div key={tier.id} className="admin-card">
                  <div className="admin-card-head">
                    <div className="option-row-title">{tier.name}</div>
                    <span className="seller-stat-value">{tier.feePercent}%</span>
                  </div>
                  <div className="tier-field-grid">
                    <label className="auth-field">
                      <span>GMV minimum (Rp)</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.minGmv}
                        onChange={(e) =>
                          setTierDrafts((prev) => ({
                            ...prev,
                            [tier.id]: { ...prev[tier.id], minGmv: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="auth-field">
                      <span>GMV maksimum (Rp)</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Tidak terbatas"
                        value={draft.maxGmv}
                        onChange={(e) =>
                          setTierDrafts((prev) => ({
                            ...prev,
                            [tier.id]: { ...prev[tier.id], maxGmv: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="auth-field">
                      <span>Potongan (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={draft.feePercent}
                        onChange={(e) =>
                          setTierDrafts((prev) => ({
                            ...prev,
                            [tier.id]: { ...prev[tier.id], feePercent: e.target.value },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="btn-secondary tier-save-btn"
                    onClick={() => saveTier(tier)}
                    disabled={savingTierId === tier.id}
                  >
                    {savingTierId === tier.id ? "Menyimpan…" : "Simpan"}
                  </button>
                </div>
              );
            })}
          </div>

          {tierStores.length > 0 && (
            <>
              <div className="section-heading-row">
                <h3>Toko & tier saat ini</h3>
              </div>
              <div className="admin-list">
                {tierStores.map((s) => (
                  <div key={s.id} className="admin-card admin-card-head">
                    <div>
                      <div className="option-row-title">{s.name}</div>
                      <div className="meta">GMV 12 bln: {formatPrice(s.gmv)}</div>
                    </div>
                    {s.tier ? (
                      <span className="badge badge-status-approved">
                        {s.tier.name} · {s.tier.feePercent}%
                      </span>
                    ) : (
                      <span className="badge badge-status-rejected">
                        Tidak ada tier
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
