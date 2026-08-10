import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import Logo from "../components/Logo";
import Icon from "../components/Icon";

type Intent = "buyer" | "seller";

interface RegisterPageProps {
  onSuccess: (destination: "home" | "seller") => void;
  onGoLogin: () => void;
}

const COPY: Record<Intent, { title: string; body: string }> = {
  buyer: {
    title: "Buat akun AURA",
    body: "Satu akun untuk belanja, wishlist, dan rekomendasi AI yang lebih personal.",
  },
  seller: {
    title: "Daftar sebagai Penjual",
    body: "Buat akun, lalu ajukan brand kamu untuk mulai jualan di AURA.",
  },
};

export default function RegisterPage({
  onSuccess,
  onGoLogin,
}: RegisterPageProps) {
  const { register } = useAuth();
  const [intent, setIntent] = useState<Intent>("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Registration always creates a plain account - "Penjual" here only
      // decides where the new account lands, the Seller Center dashboard
      // itself is what prompts them to apply for a brand.
      await register(name, email, password);
      onSuccess(intent === "seller" ? "seller" : "home");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal daftar, coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copy = COPY[intent];

  return (
    <div className="auth-screen">
      <Logo size={52} className="auth-mark" />
      <h2>{copy.title}</h2>
      <p className="auth-copy">{copy.body}</p>

      <div className="auth-role-tabs" role="tablist" aria-label="Daftar sebagai">
        <button
          type="button"
          role="tab"
          aria-selected={intent === "buyer"}
          className={`auth-role-tab${intent === "buyer" ? " active" : ""}`}
          onClick={() => setIntent("buyer")}
        >
          <Icon name="user" size={15} />
          Pembeli
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={intent === "seller"}
          className={`auth-role-tab${intent === "seller" ? " active" : ""}`}
          onClick={() => setIntent("seller")}
        >
          <Icon name="store" size={15} />
          Penjual
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Nama</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kamu"
            required
          />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            required
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 karakter, ada huruf besar & angka"
            minLength={8}
            pattern="(?=.*[A-Z])(?=.*[0-9]).*"
            title="Harus ada huruf besar dan angka"
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? "Memproses…"
            : intent === "seller"
              ? "Daftar & lanjut ke Seller Center"
              : "Daftar"}
        </button>
      </form>

      <div className="auth-footer">
        <button className="link-btn" onClick={onGoLogin}>
          Sudah punya akun? Masuk
        </button>
      </div>
    </div>
  );
}
