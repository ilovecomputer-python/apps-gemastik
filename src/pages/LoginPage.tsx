import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import Icon from "../components/Icon";

interface LoginPageProps {
  onSuccess: () => void;
  onGoRegister: () => void;
  onSkip: () => void;
}

export default function LoginPage({
  onSuccess,
  onGoRegister,
  onSkip,
}: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@aura.id");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal login, coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-mark">
        <Icon name="sparkle" size={24} />
      </div>
      <h2>Masuk ke AURA</h2>
      <p className="auth-copy">
        Login untuk menyimpan wishlist, keranjang, dan riwayat pesananmu.
      </p>

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

      <p className="auth-hint">Demo: demo@aura.id / password123</p>

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
