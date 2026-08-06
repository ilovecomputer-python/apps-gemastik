import { useEffect, useState } from "react";
import type { NewProduct } from "../types";
import { productsApi } from "../lib/api";
import { formatPrice } from "../utils/format";
import ProductImage from "./ProductImage";

interface NewArrivalsSectionProps {
  onOpenProduct: (id: string) => void;
  onSeeAll: () => void;
}

function launchLabel(days: number | null): string {
  if (days === null) return "Baru rilis";
  if (days <= 0) return "Rilis hari ini";
  if (days === 1) return "Rilis kemarin";
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "Minggu lalu" : `${weeks} minggu lalu`;
}

export default function NewArrivalsSection({
  onOpenProduct,
  onSeeAll,
}: NewArrivalsSectionProps) {
  const [products, setProducts] = useState<NewProduct[]>([]);

  useEffect(() => {
    productsApi
      .newArrivals()
      .then(({ products }) => setProducts(products))
      .catch(() => setProducts([]));
  }, []);

  if (products.length === 0) return null;

  return (
    <>
      <div className="section-heading-row">
        <h3>Baru Rilis</h3>
        <button className="link-btn" onClick={onSeeAll}>
          Lihat semua →
        </button>
      </div>
      <section className="new-arrivals-row">
        {products.map((product) => (
          <button
            key={product.id}
            className="new-arrival-card"
            onClick={() => onOpenProduct(product.id)}
          >
            <div className="new-arrival-image">
              <ProductImage color={product.color} label={product.name} />
              <span className="new-arrival-badge">
                {launchLabel(product.daysSinceLaunch)}
              </span>
            </div>
            <span className="brand">{product.brand}</span>
            <div className="name">{product.name}</div>
            <span className="price">{formatPrice(product.price)}</span>
          </button>
        ))}
      </section>
    </>
  );
}
