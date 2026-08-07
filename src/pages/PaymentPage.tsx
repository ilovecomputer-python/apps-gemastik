import { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { PaymentSession } from "../types";
import { paymentsApi } from "../lib/api";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";
import Logo from "../components/Logo";

interface PaymentPageProps {
  session: PaymentSession;
  onBack: () => void;
  onPaid: (orderNumber: string, total: number) => void;
}

/** Payment links expire; a visible countdown mirrors the reference design. */
const SESSION_SECONDS = 10 * 60;

function Countdown({ seconds }: { seconds: number }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="pay-countdown" aria-label="Sisa waktu pembayaran">
      {[mm[0], mm[1]].map((d, i) => (
        <span key={`m${i}`} className="pay-digit">
          {d}
        </span>
      ))}
      <span className="pay-colon">:</span>
      {[ss[0], ss[1]].map((d, i) => (
        <span key={`s${i}`} className="pay-digit">
          {d}
        </span>
      ))}
    </div>
  );
}

function PaymentForm({
  session,
  onPaid,
  expired,
}: {
  session: PaymentSession;
  onPaid: (orderNumber: string, total: number) => void;
  expired: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: session.returnUrl },
      // Only leave the app when the chosen method genuinely needs a redirect.
      redirect: "if_required",
    });

    if (submitError) {
      setError(
        submitError.message ?? "Pembayaran gagal. Periksa data kartu kamu.",
      );
      setSubmitting(false);
      return;
    }

    // Confirmed without a redirect: reconcile server-side before celebrating.
    try {
      const { order } = await paymentsApi.orderStatus(session.orderId);
      if (order.status === "PAID") {
        onPaid(order.orderNumber, order.total);
        return;
      }
      setError("Pembayaran sedang diproses. Cek riwayat pesanan sebentar lagi.");
    } catch {
      setError("Pembayaran terkirim, tapi status belum bisa dipastikan.");
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="pay-element">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: "tabs" }}
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button
        className="btn-primary pay-submit"
        onClick={handleSubmit}
        disabled={!stripe || !ready || submitting || expired}
      >
        {expired
          ? "Waktu habis"
          : submitting
            ? "Memproses…"
            : `Bayar ${formatPrice(session.amount)}`}
      </button>

      <p className="pay-secure">
        <Icon name="shield" size={13} />
        Data kartu diproses langsung oleh Stripe — tidak pernah menyentuh server
        AURA.
      </p>
    </>
  );
}

export default function PaymentPage({
  session,
  onBack,
  onPaid,
}: PaymentPageProps) {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);

  useEffect(() => {
    const id = setInterval(
      () => setRemaining((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  const stripePromise = useMemo(() => getStripe(), []);

  if (!isStripeConfigured()) {
    return (
      <div className="screen">
        <TopBar title="Pembayaran" onBack={onBack} />
        <div className="empty-state">
          <h3>Pembayaran belum aktif</h3>
          <p className="empty-state-text">
            VITE_STRIPE_PUBLISHABLE_KEY belum diset. Pilih metode COD untuk
            sementara.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar title="Pembayaran" onBack={onBack} />

      <div className="pay-header">
        <div className="pay-brand">
          <Logo size={30} />
          <span className="pay-brand-name">
            AURA<span className="pay-brand-thin">pay</span>
          </span>
        </div>
        <Countdown seconds={remaining} />
      </div>

      <div className="pay-summary">
        <div className="summary-row">
          <span>No. Pesanan</span>
          <span className="order-id">{session.orderNumber}</span>
        </div>
        {session.discount > 0 && (
          <div className="summary-row summary-discount">
            <span>{session.voucherTitle ?? "Diskon voucher"}</span>
            <span>−{formatPrice(session.discount)}</span>
          </div>
        )}
        <div className="summary-row summary-total">
          <span>Yang harus dibayar</span>
          <span className="price large">{formatPrice(session.amount)}</span>
        </div>
      </div>

      <div className="pay-body">
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: session.clientSecret,
            appearance: {
              theme: "flat",
              variables: {
                colorPrimary: "#0a3323",
                colorBackground: "#ffffff",
                colorText: "#0a3323",
                borderRadius: "12px",
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              },
            },
          }}
        >
          <PaymentForm
            session={session}
            onPaid={onPaid}
            expired={remaining === 0}
          />
        </Elements>
      </div>
    </div>
  );
}
