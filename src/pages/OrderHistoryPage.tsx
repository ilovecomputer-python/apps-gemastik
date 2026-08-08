import { useEffect, useState } from "react";
import type { Order } from "../types";
import { ordersApi } from "../lib/api";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface OrderHistoryPageProps {
  onBack: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "badge-status-pending",
  CANCELLED: "badge-status-rejected",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function OrderHistoryPage({ onBack }: OrderHistoryPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi
      .list()
      .then(({ orders }) => setOrders(orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <TopBar title="Pesanan Saya" onBack={onBack} />

      {loading ? (
        <p className="loading-text">Memuat…</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="package" size={28} />
          </span>
          <h3>Belum ada pesanan</h3>
          <p className="empty-state-text">
            Pesanan yang kamu buat akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="admin-list">
          {orders.map((order) => (
            <div key={order.id} className="admin-card">
              <div className="admin-card-head">
                <div>
                  <div className="option-row-title">{order.orderNumber}</div>
                  <div className="meta">{formatDate(order.createdAt)}</div>
                </div>
                <span
                  className={`badge ${STATUS_CLASS[order.status] ?? "badge-status-approved"}`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <div className="order-item-list">
                {order.items.map((item) => (
                  <p key={item.id} className="meta">
                    {item.quantity}x {item.brand} · {item.name}
                  </p>
                ))}
              </div>

              <div className="admin-card-head">
                <span className="meta">
                  {order.shippingOption.name} · {order.paymentMethod.name}
                </span>
                <span className="option-row-title">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
