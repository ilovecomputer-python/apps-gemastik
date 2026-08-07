import { useEffect, useState, type FormEvent } from "react";
import type {
  Address,
  CartLine,
  PaymentMethod,
  PaymentSession,
  ShippingOption,
  UserVoucher,
} from "../types";
import {
  ApiError,
  addressesApi,
  cartApi,
  metaApi,
  ordersApi,
  paymentsApi,
  vouchersApi,
} from "../lib/api";
import { formatPrice } from "../utils/format";
import TopBar from "../components/TopBar";
import ProductImage from "../components/ProductImage";
import Icon from "../components/Icon";

interface CheckoutPageProps {
  onBack: () => void;
  onPlaceOrder: (orderId: string, total: number) => void;
  onPayOnline: (session: PaymentSession) => void;
  onBrowseVouchers: () => void;
}

export default function CheckoutPage({
  onBack,
  onPlaceOrder,
  onPayOnline,
  onBrowseVouchers,
}: CheckoutPageProps) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const [addressId, setAddressId] = useState<string | null>(null);
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [voucherSheetOpen, setVoucherSheetOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      cartApi.list(),
      addressesApi.list(),
      metaApi.shippingOptions(),
      metaApi.paymentMethods(),
      vouchersApi.mine(),
    ])
      .then(([cart, addr, shipping, payment, owned]) => {
        setItems(cart.items);
        setAddresses(addr.addresses);
        setShippingOptions(shipping.shippingOptions);
        setPaymentMethods(payment.paymentMethods);
        setVouchers(owned.vouchers.filter((v) => v.usable));
        setAddressId(
          addr.addresses.find((a) => a.isDefault)?.id ?? addr.addresses[0]?.id ?? null,
        );
        setShippingId(shipping.shippingOptions[0]?.id ?? null);
        setPaymentId(payment.paymentMethods[0]?.id ?? null);
        if (addr.addresses.length === 0) setShowAddressForm(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shipping = shippingOptions.find((s) => s.id === shippingId) ?? null;
  const address = addresses.find((a) => a.id === addressId) ?? null;

  const affordable = (v: UserVoucher) => subtotal >= v.voucher.minSpend;
  const selectedVoucher = vouchers.find((v) => v.id === voucherId) ?? null;
  // Shown before the server confirms it, but the server derives the real
  // figure from the stored voucher — this is only the preview.
  const discount = selectedVoucher
    ? Math.min(selectedVoucher.voucher.discountAmount, subtotal)
    : 0;
  const total = subtotal + (shipping?.price ?? 0) - discount;

  // Changing the cart can drop the basket below a chosen voucher's minimum.
  useEffect(() => {
    if (selectedVoucher && !affordable(selectedVoucher)) setVoucherId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, selectedVoucher]);

  const selectedPayment =
    paymentMethods.find((p) => p.id === paymentId) ?? null;
  const paysOnline = selectedPayment?.provider === "stripe";

  const handlePlaceOrder = async () => {
    if (!addressId || !shippingId || !paymentId) return;
    setPlacing(true);
    setError(null);
    try {
      // Only the voucher's id travels; the discount is worked out server-side.
      const voucher = voucherId ? { userVoucherId: voucherId } : {};
      if (paysOnline) {
        // Gateway orders stay PENDING until Stripe confirms, so hand off to
        // the payment page instead of creating a finished order here.
        onPayOnline(
          await paymentsApi.createIntent({
            addressId,
            shippingOptionId: shippingId,
            paymentMethodId: paymentId,
            ...voucher,
          }),
        );
        return;
      }
      const { order } = await ordersApi.create({
        addressId,
        shippingOptionId: shippingId,
        paymentMethodId: paymentId,
        ...voucher,
      });
      onPlaceOrder(order.orderNumber, order.total);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal membuat pesanan. Coba lagi.",
      );
      setPlacing(false);
    }
  };

  const handleAddAddress = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { address } = await addressesApi.create({
      label: String(form.get("label")),
      recipient: String(form.get("recipient")),
      phone: String(form.get("phone")),
      fullAddress: String(form.get("fullAddress")),
      isDefault: addresses.length === 0,
    });
    setAddresses((prev) => [address, ...prev]);
    setAddressId(address.id);
    setShowAddressForm(false);
    setAddressSheetOpen(false);
  };

  if (loading) {
    return (
      <div className="screen">
        <TopBar title="Checkout" onBack={onBack} />
        <p className="loading-text">Memuat checkout…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar title="Checkout" onBack={onBack} />

      {address ? (
        <button
          className="checkout-address"
          onClick={() => setAddressSheetOpen(true)}
        >
          <Icon name="user" size={17} className="checkout-address-icon" />
          <div className="checkout-address-body">
            <div className="checkout-address-top">
              <span className="checkout-address-label">{address.label}</span>
              <span className="checkout-address-recipient">
                {address.recipient} · {address.phone}
              </span>
            </div>
            <p className="checkout-address-text">{address.fullAddress}</p>
          </div>
          <Icon name="chevron-right" size={16} className="menu-chevron" />
        </button>
      ) : (
        <button
          className="checkout-address"
          onClick={() => {
            setShowAddressForm(true);
            setAddressSheetOpen(true);
          }}
        >
          <Icon name="user" size={17} className="checkout-address-icon" />
          <div className="checkout-address-body">
            <span className="checkout-address-label">Tambah alamat pengiriman</span>
          </div>
          <Icon name="chevron-right" size={16} className="menu-chevron" />
        </button>
      )}

      <div className="checkout-section">
        <h3 className="section-title">Produk dipesan</h3>
        <div className="checkout-items">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="checkout-item">
              <ProductImage
                color={product.color}
                label={product.name}
                aspect="1 / 1"
              />
              <div className="cart-item-body">
                <span className="brand">{product.brand}</span>
                <div className="name">{product.name}</div>
                <span className="meta">
                  {quantity} x {formatPrice(product.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="checkout-section">
        <h3 className="section-title">Metode pengiriman</h3>
        <div className="option-list">
          {shippingOptions.map((opt) => (
            <button
              key={opt.id}
              className={`option-row${shippingId === opt.id ? " active" : ""}`}
              onClick={() => setShippingId(opt.id)}
            >
              <div>
                <div className="option-row-title">{opt.name}</div>
                <div className="meta">Estimasi {opt.eta}</div>
              </div>
              <span className="option-row-price">
                {formatPrice(opt.price)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="checkout-section">
        <h3 className="section-title">Metode pembayaran</h3>
        <div className="option-list">
          {paymentMethods.map((pm) => (
            <button
              key={pm.id}
              className={`option-row${paymentId === pm.id ? " active" : ""}`}
              onClick={() => setPaymentId(pm.id)}
            >
              <div>
                <div className="option-row-title">{pm.name}</div>
                <div className="meta">{pm.group}</div>
              </div>
              <span
                className={`radio-dot${paymentId === pm.id ? " active" : ""}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="checkout-section">
        <h3 className="section-title">Voucher</h3>
        <button
          className={`voucher-picker${selectedVoucher ? " active" : ""}`}
          onClick={() =>
            vouchers.length > 0 ? setVoucherSheetOpen(true) : onBrowseVouchers()
          }
        >
          <Icon name="ticket" size={17} className="voucher-picker-icon" />
          <div className="voucher-picker-body">
            {selectedVoucher ? (
              <>
                <div className="voucher-picker-title">
                  {selectedVoucher.voucher.title}
                </div>
                <div className="meta">
                  Hemat {formatPrice(discount)} di pesanan ini
                </div>
              </>
            ) : vouchers.length > 0 ? (
              <>
                <div className="voucher-picker-title">Pakai voucher</div>
                <div className="meta">
                  {vouchers.length} voucher siap dipakai
                </div>
              </>
            ) : (
              <>
                <div className="voucher-picker-title">Belum punya voucher</div>
                <div className="meta">Tukar poin ulasanmu jadi potongan</div>
              </>
            )}
          </div>
          <Icon name="chevron-right" size={16} className="menu-chevron" />
        </button>
      </div>

      <div className="checkout-section">
        <h3 className="section-title">Ringkasan pembayaran</h3>
        <div className="summary-row">
          <span>Subtotal produk</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Ongkos kirim {shipping ? `(${shipping.name})` : ""}</span>
          <span>{formatPrice(shipping?.price ?? 0)}</span>
        </div>
        {discount > 0 && (
          <div className="summary-row summary-discount">
            <span>Diskon voucher</span>
            <span>−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="summary-row summary-total">
          <span>Total pembayaran</span>
          <span className="price large">{formatPrice(total)}</span>
        </div>
      </div>

      {error && <p className="auth-error checkout-section">{error}</p>}

      <div className="checkout-footer">
        <div>
          <div className="meta">Total pembayaran</div>
          <div className="price large">{formatPrice(total)}</div>
        </div>
        <button
          className="btn-primary checkout-submit"
          onClick={handlePlaceOrder}
          disabled={placing || items.length === 0 || !addressId}
        >
          {placing
            ? "Memproses…"
            : paysOnline
              ? "Lanjut ke Pembayaran"
              : "Buat Pesanan"}
        </button>
      </div>

      {voucherSheetOpen && (
        <div className="sheet-overlay" onClick={() => setVoucherSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 className="sheet-title">Pilih voucher</h3>
            <div className="option-list">
              {vouchers.map((v) => {
                const usable = affordable(v);
                return (
                  <button
                    key={v.id}
                    className={`option-row voucher-row${
                      voucherId === v.id ? " active" : ""
                    }${usable ? "" : " disabled"}`}
                    disabled={!usable}
                    onClick={() => {
                      setVoucherId(v.id);
                      setVoucherSheetOpen(false);
                    }}
                  >
                    <div>
                      <div className="option-row-title">{v.voucher.title}</div>
                      <div className="meta">
                        {usable
                          ? `Berlaku sampai ${new Date(v.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                          : `Belanja minimal ${formatPrice(v.voucher.minSpend)} — kurang ${formatPrice(v.voucher.minSpend - subtotal)}`}
                      </div>
                    </div>
                    <span className="option-row-price">
                      −{formatPrice(v.voucher.discountAmount)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="sheet-actions">
              {voucherId && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setVoucherId(null);
                    setVoucherSheetOpen(false);
                  }}
                >
                  Lepas voucher
                </button>
              )}
              <button className="btn-secondary" onClick={onBrowseVouchers}>
                Tukar poin
              </button>
            </div>
          </div>
        </div>
      )}

      {addressSheetOpen && (
        <div
          className="sheet-overlay"
          onClick={() => setAddressSheetOpen(false)}
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 className="sheet-title">
              {showAddressForm ? "Tambah alamat baru" : "Pilih alamat"}
            </h3>

            {showAddressForm ? (
              <form className="auth-form" onSubmit={handleAddAddress}>
                <label className="auth-field">
                  <span>Label</span>
                  <input name="label" placeholder="Rumah / Kantor" required />
                </label>
                <label className="auth-field">
                  <span>Nama penerima</span>
                  <input name="recipient" required />
                </label>
                <label className="auth-field">
                  <span>No. HP</span>
                  <input name="phone" required />
                </label>
                <label className="auth-field">
                  <span>Alamat lengkap</span>
                  <input name="fullAddress" required />
                </label>
                <div className="sheet-actions">
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAddressForm(false)}
                    >
                      Batal
                    </button>
                  )}
                  <button className="btn-primary" type="submit">
                    Simpan alamat
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="option-list">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      className={`option-row address-row${
                        addressId === a.id ? " active" : ""
                      }`}
                      onClick={() => {
                        setAddressId(a.id);
                        setAddressSheetOpen(false);
                      }}
                    >
                      <div>
                        <div className="option-row-title">
                          {a.label}
                          {a.isDefault && (
                            <span className="badge badge-default">Utama</span>
                          )}
                        </div>
                        <div className="meta">
                          {a.recipient} · {a.phone}
                        </div>
                        <p className="checkout-address-text">{a.fullAddress}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddressForm(true)}
                >
                  + Tambah alamat baru
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
