import { formatPrice } from "../utils/format";
import Icon from "../components/Icon";

interface OrderSuccessPageProps {
  orderId: string;
  total: number;
  onBackHome: () => void;
}

export default function OrderSuccessPage({
  orderId,
  total,
  onBackHome,
}: OrderSuccessPageProps) {
  return (
    <div className="screen order-success">
      <div className="order-success-mark">
        <Icon name="sparkle" size={30} />
      </div>
      <h2>Pesanan berhasil dibuat</h2>
      <p className="order-success-copy">
        Terima kasih! Pesananmu sedang diproses oleh penjual.
      </p>

      <div className="order-success-card">
        <div className="summary-row">
          <span>No. Pesanan</span>
          <span className="order-id">{orderId}</span>
        </div>
        <div className="summary-row summary-total">
          <span>Total dibayar</span>
          <span className="price large">{formatPrice(total)}</span>
        </div>
      </div>

      <button className="btn-primary order-success-cta" onClick={onBackHome}>
        Kembali ke Beranda
      </button>
    </div>
  );
}
