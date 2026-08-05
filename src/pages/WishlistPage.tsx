import { useEffect, useState } from "react";
import type { Product } from "../types";
import { wishlistApi } from "../lib/api";
import TopBar from "../components/TopBar";
import ProductCard from "../components/ProductCard";
import Icon from "../components/Icon";

interface WishlistPageProps {
  onBack: () => void;
  onOpenProduct: (id: string) => void;
  onToggleWishlist: (id: string) => void;
}

export default function WishlistPage({
  onBack,
  onOpenProduct,
  onToggleWishlist,
}: WishlistPageProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wishlistApi
      .list()
      .then(({ products }) => setItems(products))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    onToggleWishlist(id);
  };

  return (
    <div className="screen">
      <TopBar title="Wishlist" onBack={onBack} />
      {loading ? (
        <p className="loading-text">Memuat wishlist…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="heart" size={28} />
          </span>
          <h3>Belum ada favorit</h3>
          <p className="empty-state-text">
            Ketuk ❤ pada produk untuk menyimpannya. Kamu akan dapat notifikasi
            saat harga turun.
          </p>
        </div>
      ) : (
        <section className="grid">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              wishlisted
              onOpen={onOpenProduct}
              onToggleWishlist={handleToggle}
            />
          ))}
        </section>
      )}
    </div>
  );
}
