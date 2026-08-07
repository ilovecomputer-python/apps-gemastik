import { useCallback, useEffect, useState } from "react";
import type { UserVoucher, Voucher } from "../types";
import { ApiError, vouchersApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface VouchersPageProps {
  onBack: () => void;
}

export default function VouchersPage({ onBack }: VouchersPageProps) {
  const { refreshUser } = useAuth();
  const [catalogue, setCatalogue] = useState<Voucher[]>([]);
  const [mine, setMine] = useState<UserVoucher[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, owned] = await Promise.all([
        vouchersApi.list(),
        vouchersApi.mine(),
      ]);
      setCatalogue(list.vouchers);
      setPoints(list.points);
      setMine(owned.vouchers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const redeem = async (v: Voucher) => {
    setBusyId(v.id);
    setError(null);
    try {
      const res = await vouchersApi.redeem(v.id);
      setNotice(res.message);
      setPoints(res.pointsRemaining);
      refreshUser();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menukar voucher.");
    } finally {
      setBusyId(null);
    }
  };

  const usable = mine.filter((v) => v.usable);

  return (
    <div className="screen">
      <TopBar title="Tukar Poin" onBack={onBack} />

      <div className="points-banner">
        <Icon name="star" size={20} />
        <div>
          <div className="points-banner-value">{points ?? 0}</div>
          <div className="points-label">poin kamu</div>
        </div>
        <p className="points-banner-hint">
          Dapat poin dari menulis ulasan (+10) dan saat ulasanmu ditandai
          membantu (+2).
        </p>
      </div>

      {notice && (
        <div className="admin-notice">
          <Icon name="sparkle" size={14} />
          <span>{notice}</span>
        </div>
      )}
      {error && <p className="auth-error admin-error">{error}</p>}

      {usable.length > 0 && (
        <div className="checkout-section">
          <h3 className="section-title">Voucher siap pakai</h3>
          <div className="option-list">
            {usable.map((uv) => (
              <div key={uv.id} className="voucher-owned">
                <div>
                  <div className="option-row-title">{uv.voucher.title}</div>
                  <div className="meta">
                    Berlaku sampai{" "}
                    {new Date(uv.expiresAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <span className="badge badge-halal">Aktif</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="checkout-section">
        <h3 className="section-title">Tukar poin</h3>
        {loading ? (
          <p className="loading-text">Memuat…</p>
        ) : (
          <div className="option-list">
            {catalogue.map((v) => {
              const affordable = (points ?? 0) >= v.pointsCost;
              return (
                <div key={v.id} className="voucher-card">
                  <div className="voucher-head">
                    <div>
                      <div className="option-row-title">{v.title}</div>
                      <p className="menu-desc">{v.description}</p>
                    </div>
                    <span className="voucher-cost">{v.pointsCost} poin</span>
                  </div>
                  <div className="voucher-foot">
                    <span className="meta">
                      Min. belanja {formatPrice(v.minSpend)} · berlaku{" "}
                      {v.validForDays} hari
                    </span>
                    <button
                      className="btn-secondary voucher-btn"
                      onClick={() => redeem(v)}
                      disabled={!affordable || busyId === v.id}
                    >
                      {busyId === v.id
                        ? "Menukar…"
                        : affordable
                          ? "Tukar"
                          : `Kurang ${v.pointsCost - (points ?? 0)}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
