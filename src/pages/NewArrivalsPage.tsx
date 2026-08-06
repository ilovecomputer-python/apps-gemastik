import { useEffect, useState } from "react";
import type { NewProduct } from "../types";
import { productsApi } from "../lib/api";
import TopBar from "../components/TopBar";
import ProductCard from "../components/ProductCard";
import Icon from "../components/Icon";

interface NewArrivalsPageProps {
  wishlist: Set<string>;
  onBack: () => void;
  onOpenProduct: (id: string) => void;
  onToggleWishlist: (id: string) => void;
}

export default function NewArrivalsPage({
  wishlist,
  onBack,
  onOpenProduct,
  onToggleWishlist,
}: NewArrivalsPageProps) {
  const [products, setProducts] = useState<NewProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi
      .newArrivals()
      .then(({ products }) => setProducts(products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <TopBar title="Baru Rilis" onBack={onBack} />

      <div className="admin-intro">
        <p>
          Produk yang baru masuk katalog. Belum punya riwayat penjualan, jadi
          jarang muncul di urutan populer — di sini mereka diurutkan dari yang
          paling baru.
        </p>
      </div>

      {loading ? (
        <p className="loading-text">Memuat…</p>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="package" size={28} />
          </span>
          <h3>Belum ada rilis baru</h3>
          <p className="empty-state-text">
            Produk yang baru diluncurkan akan tampil di sini.
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
              badge={
                product.daysSinceLaunch !== null && product.daysSinceLaunch <= 14
                  ? "Baru"
                  : undefined
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}
