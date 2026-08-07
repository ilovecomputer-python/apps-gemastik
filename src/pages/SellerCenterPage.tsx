import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SellerProduct, SellerStore } from "../types";
import { ApiError, sellerApi } from "../lib/api";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import Icon from "../components/Icon";

interface SellerCenterPageProps {
  onBack: () => void;
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { store } = await sellerApi.store();
      setStore(store);
      if (store?.status === "APPROVED") {
        setProducts((await sellerApi.products()).products);
      }
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <div className="seller-stats">
            <div className="seller-stat">
              <div className="seller-stat-value">{store.productCount}</div>
              <div className="points-label">Produk</div>
            </div>
            <div className="seller-stat">
              <div className="seller-stat-value">{store.unitsSold}</div>
              <div className="points-label">Terjual</div>
            </div>
            <div className="seller-stat">
              <div className="seller-stat-value">{store.rating.toFixed(1)}</div>
              <div className="points-label">Rating</div>
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
        </>
      )}
    </div>
  );
}
