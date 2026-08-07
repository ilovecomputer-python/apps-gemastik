import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../types";
import { authApi, tokenStore } from "../lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    tokenStore.set(token);
    setUser(user);
    // Returned directly rather than read back from context state: the caller
    // (login/register screens) needs to route on the role the instant it is
    // known, and setUser's effect on `user` isn't visible until next render.
    return user;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { token, user } = await authApi.register(name, email, password);
      tokenStore.set(token);
      setUser(user);
      return user;
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      // ignore transient refresh failures
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
