import { useState, type FormEvent } from "react";
import { ApiError, brandsApi } from "../lib/api";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";

interface BrandOnboardingPageProps {
  onBack: () => void;
}

export default function BrandOnboardingPage({
  onBack,
}: BrandOnboardingPageProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const { message } = await brandsApi.apply({
        name: String(form.get("name")),
        tagline: String(form.get("tagline")),
        story: String(form.get("story")),
        city: String(form.get("city")),
        contactName: String(form.get("contactName")),
        contactEmail: String(form.get("contactEmail")),
      });
      setDone(message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengirim pendaftaran.",
      );
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="screen">
        <TopBar title="Daftar Brand" onBack={onBack} />
        <div className="empty-state">
          <span className="empty-state-icon">
            <Icon name="store" size={30} />
          </span>
          <h3>Pendaftaran terkirim</h3>
          <p className="empty-state-text">{done}</p>
          <button className="btn-primary empty-state-cta" onClick={onBack}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar title="Daftar Brand" onBack={onBack} />

      <div className="onboarding-intro">
        <h2>Jual produkmu di AURA</h2>
        <p>
          Kami mengutamakan brand kecantikan UMKM Indonesia. Brand yang diterima
          tampil di section <strong>Brand Baru</strong> supaya dapat exposure
          dan ulasan pertama.
        </p>
      </div>

      <form className="auth-form onboarding-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Nama brand</span>
          <input name="name" required minLength={2} maxLength={60} placeholder="Sekar Ayu Botanicals" />
        </label>

        <label className="auth-field">
          <span>Tagline singkat</span>
          <input
            name="tagline"
            required
            minLength={10}
            maxLength={120}
            placeholder="Sabun herbal dari Yogyakarta, dibuat batch kecil"
          />
        </label>

        <label className="auth-field">
          <span>Cerita brand</span>
          <textarea
            name="story"
            className="review-textarea"
            required
            minLength={30}
            maxLength={1000}
            rows={4}
            placeholder="Ceritakan bagaimana brand-mu dimulai, bahan yang dipakai, dan apa yang membuatnya berbeda."
          />
        </label>

        <label className="auth-field">
          <span>Kota</span>
          <input name="city" required minLength={2} maxLength={60} placeholder="Yogyakarta" />
        </label>

        <label className="auth-field">
          <span>Nama penanggung jawab</span>
          <input name="contactName" required minLength={2} maxLength={80} placeholder="Ayu Lestari" />
        </label>

        <label className="auth-field">
          <span>Email aktif</span>
          <input name="contactEmail" type="email" required placeholder="ayu@sekarayu.id" />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Mengirim…" : "Kirim pendaftaran"}
        </button>

        <p className="scan-status">
          Pendaftaran ditinjau manual sebelum tampil, jadi katalog tetap terkurasi.
        </p>
      </form>
    </div>
  );
}
