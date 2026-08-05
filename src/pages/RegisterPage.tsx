import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import Icon from "../components/Icon";

interface RegisterPageProps {
  onSuccess: () => void;
  onGoLogin: () => void;
}

export default function RegisterPage({
  onSuccess,
  onGoLogin,
}: RegisterPageProps) {
  const { register } = useAuth();
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
      await register(name, email, password);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal daftar, coba lagi.",
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
      <h2>Buat akun AURA</h2>
      <p className="auth-copy">
        Satu akun untuk belanja, wishlist, dan rekomendasi AI yang lebih
        personal.
      </p>

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
            placeholder="Minimal 8 karakter"
            minLength={8}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Memproses…" : "Daftar"}
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
