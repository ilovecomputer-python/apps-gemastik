import { useEffect, useState } from "react";
import type { Subscription, SubscriptionPlan } from "../types";
import { subscriptionApi, ApiError } from "../lib/api";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";
import ProductImage from "../components/ProductImage";

interface SubscriptionPageProps {
  onBack: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PROCESSING: "Sedang disiapkan",
  SHIPPED: "Dalam pengiriman",
  DELIVERED: "Sudah diterima",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SubscriptionPage({ onBack }: SubscriptionPageProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([subscriptionApi.plans(), subscriptionApi.mine()])
      .then(([plansRes, mineRes]) => {
        setPlans(plansRes.plans);
        setSubscription(mineRes.subscription);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
    setBusy(true);
    setError(null);
    try {
      const { subscription } = await subscriptionApi.subscribe(planId);
      setSubscription(subscription);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal berlangganan.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const { subscription } = await subscriptionApi.cancel();
      setSubscription(subscription);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membatalkan.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <TopBar title="AURA+" onBack={onBack} />
        <p className="loading-text">Memuat AURA+…</p>
      </div>
    );
  }

  const isActive = subscription?.status === "ACTIVE";
  const plan = plans[0];

  return (
    <div className="screen">
      <TopBar title="AURA+" onBack={onBack} />

      <div className="aura-plus-hero">
        <span className="upgrade-badge large">AURA+</span>
        <h2>Coba dulu sebelum beli full pack</h2>
        <p className="auth-copy">
          Berlangganan AURA+ dan dapatkan trial kit tiap bulan berisi sample
          produk dari brand partner kami.
        </p>
      </div>

      {error && <p className="auth-error checkout-section">{error}</p>}

      {isActive && subscription ? (
        <>
          <div className="checkout-section">
            <div className="sub-status-card">
              <div className="sub-status-row">
                <span className="badge badge-ai">Aktif</span>
                <span className="meta">
                  Perpanjangan {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
              <div className="option-row-title">{subscription.plan.name}</div>
              <span className="meta">
                {formatPrice(subscription.plan.price)} / bulan
              </span>
              <button
                className="btn-secondary sub-cancel-btn"
                onClick={handleCancel}
                disabled={busy}
              >
                {busy ? "Memproses…" : "Batalkan langganan"}
              </button>
            </div>
          </div>

          <div className="checkout-section">
            <h3 className="section-title">Trial kit kamu</h3>
            <div className="trial-kit-list">
              {subscription.trialKits.map((kit) => (
                <div key={kit.id} className="trial-kit-card">
                  <div className="trial-kit-header">
                    <span className="option-row-title">{kit.periodLabel}</span>
                    <span className="badge badge-default">
                      {STATUS_LABEL[kit.status]}
                    </span>
                  </div>
                  <div className="trial-kit-items">
                    {kit.items.map((item) => (
                      <div key={item.id} className="trial-kit-item">
                        <ProductImage
                          color={item.color}
                          label={item.name}
                          aspect="1 / 1"
                        />
                        <div className="cart-item-body">
                          <span className="brand">{item.brand}</span>
                          <div className="name">{item.name}</div>
                          <span className="meta">{item.note}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        plan && (
          <div className="checkout-section">
            <div className="plan-card">
              <div className="plan-card-price">
                {formatPrice(plan.price)}
                <span className="meta">/bulan</span>
              </div>
              <ul className="plan-benefits">
                {plan.benefits.map((b) => (
                  <li key={b}>
                    <Icon name="sparkle" size={14} />
                    {b}
                  </li>
                ))}
              </ul>
              <button
                className="btn-primary"
                onClick={() => handleSubscribe(plan.id)}
                disabled={busy}
              >
                {busy ? "Memproses…" : "Berlangganan sekarang"}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
