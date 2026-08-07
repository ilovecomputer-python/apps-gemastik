import { useEffect, useState } from "react";
import type { CartLine } from "../types";
import { cartApi } from "../lib/api";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import Icon from "../components/Icon";

interface CartPageProps {
  onBack: () => void;
  onOpenScan: () => void;
  onCheckout: () => void;
  onCartChanged: () => void;
}

export default function CartPage({
  onBack,
  onOpenScan,
  onCheckout,
  onCartChanged,
}: CartPageProps) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cartApi
      .list()
      .then(({ items }) => setItems(items))
      .finally(() => setLoading(false));
  }, []);

  const handleIncrement = async (productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
    await cartApi.add(productId);
    onCartChanged();
  };

  const handleDecrement = async (productId: string) => {
    const { quantity } = await cartApi.decrement(productId);
    setItems((prev) =>
      quantity === 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    );
    onCartChanged();
  };

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  if (loading) {
    return (
      <div className="screen">
        <TopBar title="Keranjang" onBack={onBack} />
        <p className="loading-text">Memuat keranjang…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="screen">
        <TopBar title="Keranjang" onBack={onBack} />
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="cart" size={30} />
          </span>
          <h3>Keranjang masih kosong</h3>
          <p className="empty-state-text">
            Yuk mulai belanja skincare dan makeup favoritmu.
          </p>
          <button className="btn-primary empty-state-cta" onClick={onOpenScan}>
            Cari rekomendasi AI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar title="Keranjang" onBack={onBack} />
      <div className="cart-list">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="cart-item">
            <ProductImage color={product.color} label={product.name} aspect="1 / 1" imageUrl={product.imageUrl} />
            <div className="cart-item-body">
              <span className="brand">{product.brand}</span>
              <div className="name">{product.name}</div>
              <span className="price">{formatPrice(product.price)}</span>
            </div>
            <div className="qty-control">
              <button
                onClick={() => handleDecrement(product.id)}
                aria-label="Kurangi"
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => handleIncrement(product.id)}
                aria-label="Tambah"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-total-row">
          <span>Total</span>
          <span className="price large">{formatPrice(total)}</span>
        </div>
        <button className="btn-primary" onClick={onCheckout}>
          Checkout
        </button>
      </div>
    </div>
  );
}
