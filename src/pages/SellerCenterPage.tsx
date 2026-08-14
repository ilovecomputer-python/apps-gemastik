import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SellerFinance, SellerOrder, SellerProduct, SellerStore } from "../types";
import { ApiError, sellerApi } from "../lib/api";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import Icon from "../components/Icon";

const ORDER_STATUS_LABEL: Record<string, string> = {
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

/** What tapping the action button does next, keyed by the order's current status. */
const NEXT_ACTION_LABEL: Record<string, string> = {
  PAID: "Konfirmasi",
  PROCESSING: "Kirim",
};

/** Reuses the 3 store-status badge tones for order status, by meaning rather than name. */
const TX_BADGE_TONE: Record<string, "approved" | "pending" | "rejected"> = {
  PAID: "pending",
  PROCESSING: "pending",
  SHIPPED: "pending",
  COMPLETED: "approved",
  CANCELLED: "rejected",
};

const formatOrderDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/** "2026-08" -> "Agu 26", using the browser's own locale data. */
const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
};

/**
 * Short, AURA-specific tips rather than a generic seller-education hub -
 * each one points at something this app actually does, not a course to enrol in.
 */
const SELLER_TIPS: { icon: "sparkle" | "camera" | "star"; title: string; body: string }[] = [
  {
    icon: "sparkle",
    title: "Produk baru otomatis tampil di Baru Rilis",
    body: "Tidak perlu daftar promosi terpisah - begitu ditambahkan, produkmu langsung masuk kanal yang diurutkan terbaru dulu.",
  },
  {
    icon: "camera",
    title: "Foto asli bikin pembeli lebih percaya",
    body: "Produk dengan foto sungguhan (bukan warna polos) lebih meyakinkan saat dibandingkan di katalog.",
  },
  {
    icon: "star",
    title: "Ulasan pertama paling berharga",
    body: "Brand baru tampil di halaman Brand Baru supaya dapat ulasan pertamanya - itu yang bikin brand berikutnya makin dipercaya pembeli.",
  },
];

interface SellerCenterPageProps {
  /** Omitted when this page is the seller's own bottom-tab root, not a sub-page. */
  onBack?: () => void;
  onApply: () => void;
  onOpenProduct: (id: string) => void;
}

const CONCERNS = [
  { key: "acne", label: "Jerawat" },
  { key: "blackheads", label: "Komedo" },
  { key: "dark_spots", label: "Noda hitam" },
  { key: "pores", label: "Pori besar" },
  { key: "wrinkles", label: "Garis halus" },
];

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  PENDING: {
    title: "Menunggu ditinjau",
    body: "Pendaftaranmu sedang ditinjau tim AURA. Kamu bisa menambahkan produk setelah disetujui.",
  },
  REJECTED: {
    title: "Pendaftaran ditolak",
    body: "Hubungi tim AURA lewat email jika ingin menanyakan alasannya atau mendaftar ulang.",
  },
};

export default function SellerCenterPage({
  onBack,
  onApply,
  onOpenProduct,
}: SellerCenterPageProps) {
  const [store, setStore] = useState<SellerStore | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [finance, setFinance] = useState<SellerFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { store } = await sellerApi.store();
      setStore(store);
      if (store?.status === "APPROVED") {
        const [{ products }, { orders }, { finance }] = await Promise.all([
          sellerApi.products(),
          sellerApi.orders(),
          sellerApi.finance(),
        ]);
        setProducts(products);
        setOrders(orders);
        setFinance(finance);
      }
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdvance = async (orderId: string) => {
    setAdvancingId(orderId);
    try {
      await sellerApi.advanceOrder(orderId);
      const [{ store }, { orders }] = await Promise.all([
        sellerApi.store(),
        sellerApi.orders(),
      ]);
      setStore(store);
      setOrders(orders);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal memproses pesanan.",
      );
    } finally {
      setAdvancingId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await sellerApi.createProduct({
        name: String(f.get("name")),
        price: Number(f.get("price")),
        category: String(f.get("category")) as "SKINCARE" | "MAKEUP" | "BODYCARE",
        description: String(f.get("description")),
        concerns,
        shades: String(f.get("shades"))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        halal: f.get("halal") === "on",
        color: String(f.get("color")),
      });
      setNotice("Produk berhasil ditambahkan dan langsung tampil di katalog.");
      setShowForm(false);
      setConcerns([]);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menambahkan produk.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <TopBar title="Seller Center" onBack={onBack} />
        <p className="loading-text">Memuat…</p>
      </div>
    );
  }

  // No store yet: point them at the application form.
  if (!store) {
    return (
      <div className="screen">
        <TopBar title="Seller Center" onBack={onBack} />
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="store" size={30} />
          </span>
          <h3>Belum punya brand</h3>
          <p className="empty-state-text">
            Daftarkan brand UMKM-mu untuk mulai berjualan di AURA.
          </p>
          <button className="btn-primary empty-state-cta" onClick={onApply}>
            Daftarkan brand
          </button>
        </div>
      </div>
    );
  }

  const pendingCopy = STATUS_COPY[store.status];
  const maxMonthlyRevenue = finance
    ? Math.max(...finance.monthly.map((m) => m.revenue), 0)
    : 0;
  const recentTransactions = orders.filter((o) => o.status !== "PENDING").slice(0, 6);

  return (
    <div className="screen">
      <TopBar title="Seller Center" onBack={onBack} />

      <div className="seller-header">
        <div className="seller-head-row">
          <div>
            <h2 className="seller-name">{store.name}</h2>
            <div className="meta">{store.city}</div>
          </div>
          <span className={`badge badge-status-${store.status.toLowerCase()}`}>
            {store.status}
          </span>
        </div>
        {store.tagline && <p className="admin-tagline">{store.tagline}</p>}
      </div>

      {pendingCopy ? (
        <div className="seller-status-card">
          <h3 className="section-title">{pendingCopy.title}</h3>
          <p className="condition-advice">{pendingCopy.body}</p>
        </div>
      ) : (
        <>
          <div className="seller-stats seller-stats-grid">
            <div className={`seller-stat${store.newOrdersCount > 0 ? " attn" : ""}`}>
              <div className="seller-stat-value">{store.newOrdersCount}</div>
              <div className="points-label">Pesanan Baru</div>
            </div>
            <div className="seller-stat">
              <div className="seller-stat-value seller-stat-money">
                {formatPrice(store.revenueThisMonth)}
              </div>
              <div className="points-label">Pendapatan Bulan Ini</div>
            </div>
            <div className="seller-stat">
              <div className="seller-stat-value">{store.productCount}</div>
              <div className="points-label">Produk</div>
            </div>
            <div className="seller-stat">
              <div className="seller-stat-value">{store.rating.toFixed(1)}</div>
              <div className="points-label">Rating</div>
            </div>
          </div>

          {orders.some((o) => o.status === "PAID" || o.status === "PROCESSING") && (
            <>
              <div className="section-heading-row">
                <h3>Perlu diproses</h3>
              </div>
              <div className="cart-list">
                {orders
                  .filter((o) => o.status === "PAID" || o.status === "PROCESSING")
                  .map((order) => (
                    <div key={order.id} className="admin-card seller-order-row">
                      <div className="admin-card-head">
                        <div>
                          <div className="option-row-title">{order.orderNumber}</div>
                          <div className="meta">
                            {formatOrderDate(order.createdAt)} ·{" "}
                            {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                          </div>
                        </div>
                        <span className="badge badge-status-approved">
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </div>
                      <div className="admin-card-head">
                        <span className="meta">Subtotal produkmu</span>
                        <span className="option-row-title">{formatPrice(order.subtotal)}</span>
                      </div>
                      <button
                        className="btn-secondary seller-advance-btn"
                        onClick={() => handleAdvance(order.id)}
                        disabled={advancingId === order.id}
                      >
                        {advancingId === order.id
                          ? "Memproses…"
                          : NEXT_ACTION_LABEL[order.status]}
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}

          {finance && (
            <>
              <div className="section-heading-row">
                <h3>Keuangan</h3>
                {finance.currentTier && (
                  <span className="badge badge-status-approved">
                    Tier {finance.currentTier.name} · {finance.currentTier.feePercent}%
                  </span>
                )}
              </div>
              <div className="seller-balance">
                <div className="seller-balance-card">
                  <div className="points-label">Saldo tersedia</div>
                  <div className="seller-balance-value">
                    {formatPrice(finance.balance.available)}
                  </div>
                  <p className="seller-balance-hint">Dari pesanan yang sudah selesai</p>
                </div>
                <div className="seller-balance-card">
                  <div className="points-label">Tertahan</div>
                  <div className="seller-balance-value seller-balance-value-muted">
                    {formatPrice(finance.balance.pending)}
                  </div>
                  <p className="seller-balance-hint">
                    Masih diproses/dikirim, cair setelah pesanan selesai
                  </p>
                </div>
              </div>
              <p className="seller-balance-hint seller-fee-note">
                Saldo di atas sudah dipotong komisi platform - Rp
                {finance.feeDeducted.toLocaleString("id-ID")} dipotong sejauh ini.
              </p>

              <div className="seller-finance-subhead">Pendapatan 6 bulan terakhir</div>
              <div className="seller-finance-months">
                {finance.monthly.map((m) => (
                  <div key={m.month} className="seller-finance-row">
                    <span className="seller-finance-month-label">
                      {formatMonthLabel(m.month)}
                    </span>
                    <div className="seller-finance-bar-track">
                      <div
                        className="seller-finance-bar-fill"
                        style={{
                          width:
                            maxMonthlyRevenue > 0
                              ? `${Math.max(3, Math.round((m.revenue / maxMonthlyRevenue) * 100))}%`
                              : "0%",
                        }}
                      />
                    </div>
                    <span className="seller-finance-month-value">
                      {formatPrice(m.revenue)}
                    </span>
                  </div>
                ))}
              </div>

              {recentTransactions.length > 0 && (
                <>
                  <div className="seller-finance-subhead">Transaksi terbaru</div>
                  <div className="cart-list">
                    {recentTransactions.map((order) => (
                      <div key={order.id} className="admin-card">
                        <div className="admin-card-head">
                          <div>
                            <div className="option-row-title">{order.orderNumber}</div>
                            <div className="meta">{formatOrderDate(order.createdAt)}</div>
                          </div>
                          <span
                            className={`badge badge-status-${TX_BADGE_TONE[order.status] ?? "pending"}`}
                          >
                            {ORDER_STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </div>
                        <div className="admin-card-head">
                          <span className="meta">Nilai transaksi</span>
                          <span className="option-row-title">
                            {formatPrice(order.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <div className="section-heading-row">
            <h3>Performa toko</h3>
          </div>
          <div className="seller-health">
            <div className="seller-health-item">
              <div className="seller-health-value">
                {store.fulfillmentRate === null ? "—" : `${store.fulfillmentRate}%`}
              </div>
              <div className="points-label">Tingkat selesai</div>
            </div>
            <div className="seller-health-item">
              <div className="seller-health-value">{store.completedOrders}</div>
              <div className="points-label">Pesanan selesai</div>
            </div>
            <div className="seller-health-item">
              <div className="seller-health-value">{store.unitsSold}</div>
              <div className="points-label">Terjual</div>
            </div>
          </div>

          {notice && (
            <div className="admin-notice">
              <Icon name="sparkle" size={14} />
              <span>{notice}</span>
            </div>
          )}

          <div className="section-heading-row">
            <h3>Produk saya</h3>
            <button className="link-btn" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Batal" : "+ Tambah produk"}
            </button>
          </div>

          {showForm && (
            <form className="auth-form seller-form" onSubmit={handleAdd}>
              <label className="auth-field">
                <span>Nama produk</span>
                <input name="name" required minLength={3} maxLength={80} />
              </label>
              <label className="auth-field">
                <span>Harga (Rp)</span>
                <input name="price" type="number" required min={1000} step={500} />
              </label>
              <label className="auth-field">
                <span>Kategori</span>
                <select name="category" className="seller-select" required>
                  <option value="SKINCARE">Skincare</option>
                  <option value="MAKEUP">Makeup</option>
                  <option value="BODYCARE">Bodycare</option>
                </select>
              </label>
              <label className="auth-field">
                <span>Deskripsi</span>
                <textarea
                  name="description"
                  className="review-textarea"
                  required
                  minLength={30}
                  maxLength={1000}
                  rows={4}
                />
              </label>

              <div className="auth-field">
                <span>Masalah kulit yang diatasi</span>
                <div className="sheet-options">
                  {CONCERNS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`option-chip${concerns.includes(c.key) ? " active" : ""}`}
                      onClick={() =>
                        setConcerns((prev) =>
                          prev.includes(c.key)
                            ? prev.filter((x) => x !== c.key)
                            : [...prev, c.key],
                        )
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="menu-desc">
                  Dipakai AI Scan untuk mencocokkan produkmu dengan kondisi kulit
                  pembeli.
                </p>
              </div>

              <label className="auth-field">
                <span>Shade (pisahkan dengan koma, kosongkan jika tidak ada)</span>
                <input name="shades" placeholder="N02, W20, C30" />
              </label>
              <label className="auth-field">
                <span>Warna kartu produk</span>
                <input name="color" type="color" defaultValue="#839958" className="seller-color" />
              </label>
              <label className="seller-check">
                <input name="halal" type="checkbox" />
                <span>Bersertifikat halal</span>
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Menyimpan…" : "Tambah produk"}
              </button>
            </form>
          )}

          {products.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">
                <Icon name="package" size={28} />
              </span>
              <h3>Belum ada produk</h3>
              <p className="empty-state-text">
                Tambahkan produk pertamamu — akan langsung tampil di Baru Rilis.
              </p>
            </div>
          ) : (
            <div className="cart-list">
              {products.map((p) => (
                <button
                  key={p.id}
                  className="cart-item seller-product"
                  onClick={() => onOpenProduct(p.id)}
                >
                  <ProductImage color={p.color} label={p.name} aspect="1 / 1" imageUrl={p.imageUrl} />
                  <div className="cart-item-body">
                    <div className="name">{p.name}</div>
                    <span className="price">{formatPrice(p.price)}</span>
                    <span className="meta">
                      ★ {p.rating.toFixed(1)} · {p.reviewCount} ulasan
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="section-heading-row">
            <h3>Tips untuk penjual</h3>
          </div>
          <div className="seller-tips">
            {SELLER_TIPS.map((tip) => (
              <div key={tip.title} className="seller-tip-card">
                <span className="seller-tip-icon">
                  <Icon name={tip.icon} size={16} />
                </span>
                <div>
                  <div className="seller-tip-title">{tip.title}</div>
                  <p className="seller-tip-body">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
