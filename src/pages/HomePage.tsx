import { useEffect, useState } from "react";
import type { Category, Product } from "../types";
import { productsApi } from "../lib/api";
import ProductCard from "../components/ProductCard";
import Icon from "../components/Icon";
import FilterSheet, { type SortKey } from "../components/FilterSheet";
import BrandSpotlightSection from "../components/BrandSpotlightSection";

interface HomePageProps {
  wishlist: Set<string>;
  cartCount: number;
  onOpenProduct: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  onOpenScan: () => void;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onOpenSettings: () => void;
}

const CATEGORIES: ("Semua" | Category)[] = [
  "Semua",
  "Skincare",
  "Makeup",
  "Bodycare",
];

export default function HomePage({
  wishlist,
  cartCount,
  onOpenProduct,
  onToggleWishlist,
  onOpenScan,
  onOpenWishlist,
  onOpenCart,
  onOpenSettings,
}: HomePageProps) {
  const [category, setCategory] = useState<"Semua" | Category>("Semua");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("popular");
  const [halalOnly, setHalalOnly] = useState(false);
  const [umkmOnly, setUmkmOnly] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilterCount =
    (sortKey !== "popular" ? 1 : 0) + (halalOnly ? 1 : 0) + (umkmOnly ? 1 : 0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    productsApi
      .list({
        category: category === "Semua" ? undefined : category,
        search: debouncedQuery || undefined,
        halal: halalOnly || undefined,
        umkm: umkmOnly || undefined,
        sort: sortKey,
      })
      .then(({ products }) => {
        if (!cancelled) setProducts(products);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat produk. Coba lagi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, debouncedQuery, sortKey, halalOnly, umkmOnly]);

  return (
    <div className="screen">
      <header className="home-header">
        <div className="delivery-row">
          <div>
            <span className="delivery-label">DIKIRIM KE · ALAMAT UTAMA</span>
            <div className="delivery-address">Rembang, Indonesia ▾</div>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={onOpenSettings}
              aria-label="Pengaturan"
            >
              <Icon name="settings" size={17} />
            </button>
            <button
              className="icon-btn"
              onClick={onOpenWishlist}
              aria-label="Wishlist"
            >
              <Icon name={wishlist.size > 0 ? "heart-filled" : "heart"} size={17} />
              {wishlist.size > 0 && (
                <span className="icon-badge">{wishlist.size}</span>
              )}
            </button>
            <button
              className="icon-btn"
              onClick={onOpenCart}
              aria-label="Keranjang"
            >
              <Icon name="cart" size={17} />
              {cartCount > 0 && <span className="icon-badge">{cartCount}</span>}
            </button>
          </div>
        </div>

        <div className="search-bar">
          <Icon name="search" size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="Cari skincare, foundation, lipstik…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="chip-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`chip${category === cat ? " active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
          <button
            className={`chip chip-filter${activeFilterCount > 0 ? " active" : ""}`}
            onClick={() => setFilterOpen(true)}
          >
            <Icon name="sliders" size={13} />
            Filter
            {activeFilterCount > 0 && (
              <span className="chip-count">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </header>

      <section className="banner-grid">
        <button className="banner banner-scan" onClick={onOpenScan}>
          <span className="banner-eyebrow">AI SCAN STUDIO</span>
          <h2 className="banner-title">Temukan shade dan skincare-mu</h2>
          <p className="banner-copy">
            Scan wajah untuk mencari undertone, bentuk wajah, dan kondisi
            kulit dengan presisi
          </p>
        </button>
        <div className="banner banner-umkm">
          <span className="banner-eyebrow">HUB UMKM DIGITAL</span>
          <h2 className="banner-title">Dukung beauty brand lokal</h2>
          <p className="banner-copy">
            Kurasi produk UMKM kecantikan asli Indonesia
          </p>
        </div>
      </section>

      <BrandSpotlightSection onOpenProduct={onOpenProduct} />

      <div className="section-heading-row">
        <h3>Untukmu</h3>
        <button className="link-btn" onClick={onOpenScan}>
          Pakai AI →
        </button>
      </div>

      {loading ? (
        <p className="loading-text">Memuat produk…</p>
      ) : error ? (
        <div className="empty-state">
          <h3>Gagal memuat</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="search" size={28} />
          </span>
          <h3>Produk tidak ditemukan</h3>
          <p className="empty-state-text">
            Coba kata kunci lain atau reset filter.
          </p>
        </div>
      ) : (
        <section className="grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              wishlisted={wishlist.has(product.id)}
              onOpen={onOpenProduct}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </section>
      )}

      <FilterSheet
        open={filterOpen}
        sortKey={sortKey}
        halalOnly={halalOnly}
        umkmOnly={umkmOnly}
        onChangeSort={setSortKey}
        onToggleHalal={() => setHalalOnly((v) => !v)}
        onToggleUmkm={() => setUmkmOnly((v) => !v)}
        onClose={() => setFilterOpen(false)}
        onReset={() => {
          setSortKey("popular");
          setHalalOnly(false);
          setUmkmOnly(false);
        }}
      />
    </div>
  );
}
