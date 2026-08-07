import type { Product } from "../types";
import { formatPrice, formatSoldLabel } from "../utils/format";
import ProductImage from "./ProductImage";
import Icon from "./Icon";

interface ProductCardProps {
  product: Product;
  wishlisted: boolean;
  onOpen: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  /** Extra badge shown alongside Halal/UMKM, e.g. "Baru" on new arrivals. */
  badge?: string;
}

export default function ProductCard({
  product,
  wishlisted,
  onOpen,
  onToggleWishlist,
  badge,
}: ProductCardProps) {
  return (
    <div className="card" onClick={() => onOpen(product.id)}>
      <div className="card-image-wrap">
        <ProductImage color={product.color} label={product.name} imageUrl={product.imageUrl} />
        <button
          className={`wishlist-dot${wishlisted ? " active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          aria-label="Simpan ke wishlist"
        >
          <Icon name={wishlisted ? "heart-filled" : "heart"} size={15} />
        </button>
        <div className="badge-row">
          {badge && <span className="badge badge-new">{badge}</span>}
          {product.halal && <span className="badge badge-halal">Halal</span>}
          {product.umkm && <span className="badge badge-umkm">UMKM</span>}
        </div>
      </div>
      <div className="body">
        <span className="brand">{product.brand}</span>
        <div className="name">{product.name}</div>
        <div className="price-row">
          <span className="price">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="price-strike">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="meta">
          ★ {product.rating.toFixed(1)} · {formatSoldLabel(product.soldCount)}
        </div>
      </div>
    </div>
  );
}
