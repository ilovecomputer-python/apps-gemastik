import { useEffect, useState, type FormEvent } from "react";
import type { Address } from "../types";
import { ApiError, addressesApi } from "../lib/api";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface AddressesPageProps {
  onBack: () => void;
}

export default function AddressesPage({ onBack }: AddressesPageProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    addressesApi
      .list()
      .then(({ addresses }) => setAddresses(addresses))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const { address } = await addressesApi.create({
        label: String(form.get("label")),
        recipient: String(form.get("recipient")),
        phone: String(form.get("phone")),
        fullAddress: String(form.get("fullAddress")),
        isDefault: addresses.length === 0,
      });
      setAddresses((prev) => [address, ...prev]);
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan alamat.",
      );
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await addressesApi.remove(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menghapus alamat.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Alamat Pengiriman" onBack={onBack} />

      {error && <p className="auth-error admin-error">{error}</p>}

      {loading ? (
        <p className="loading-text">Memuat…</p>
      ) : (
        <div className="checkout-section">
          {addresses.length === 0 && !showForm ? (
            <div className="empty-state">
              <span className="empty-state-icon">
                <Icon name="user" size={28} />
              </span>
              <h3>Belum ada alamat</h3>
              <p className="empty-state-text">
                Tambahkan alamat supaya checkout lebih cepat lain kali.
              </p>
            </div>
          ) : (
            <div className="option-list">
              {addresses.map((a) => (
                <div key={a.id} className="option-row address-row">
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
                  <button
                    className="icon-btn"
                    onClick={() => handleDelete(a.id)}
                    disabled={busyId === a.id}
                    aria-label={`Hapus alamat ${a.label}`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <form className="auth-form" onSubmit={handleAdd}>
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </button>
                <button className="btn-primary" type="submit">
                  Simpan alamat
                </button>
              </div>
            </form>
          ) : (
            <button className="btn-secondary" onClick={() => setShowForm(true)}>
              + Tambah alamat baru
            </button>
          )}
        </div>
      )}
    </div>
  );
}
