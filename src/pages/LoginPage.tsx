import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import Logo from "../components/Logo";
import Icon from "../components/Icon";

type LoginDestination = "home" | "seller" | "admin";
type Intent = "buyer" | "seller";

interface LoginPageProps {
  onSuccess: (destination: LoginDestination) => void;
  onGoRegister: () => void;
  onSkip: () => void;
}

const COPY: Record<Intent, { title: string; body: string; hint: string }> = {
  buyer: {
    title: "Masuk ke AURA",
    body: "Login untuk menyimpan wishlist, keranjang, dan riwayat pesananmu.",
    hint: "Demo pembeli: demo@aura.id / password123",
  },
  seller: {
    title: "Masuk ke Seller Center",
    body: "Login dengan akun brand kamu untuk kelola produk dan pesanan.",
    hint: "Demo penjual: seller@aura.id / password123",
  },
};

export default function LoginPage({
  onSuccess,
  onGoRegister,
  onSkip,
}: LoginPageProps) {
  const { login } = useAuth();
  const [intent, setIntent] = useState<Intent>("buyer");
  const [email, setEmail] = useState("demo@aura.id");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      // An admin account always lands in the admin dashboard, regardless of
      // which tab was open - there is no separate admin login, just a
      // regular account whose role happens to unlock it.
      if (user.role === "ADMIN") onSuccess("admin");
      else onSuccess(intent === "seller" ? "seller" : "home");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal login, coba lagi.",
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

      <div className="auth-role-tabs" role="tablist" aria-label="Masuk sebagai">
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
            placeholder="Minimal 8 karakter"
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <p className="auth-hint">
        {copy.hint}
        {intent === "buyer" && (
          <>
            <br />
            Demo admin: admin@aura.id / admin12345
          </>
        )}
      </p>

      <div className="auth-footer">
        <button className="link-btn" onClick={onGoRegister}>
          Belum punya akun? Daftar
        </button>
        <button className="link-btn muted" onClick={onSkip}>
          Jelajahi dulu tanpa akun
        </button>
      </div>
    </div>
  );
}
