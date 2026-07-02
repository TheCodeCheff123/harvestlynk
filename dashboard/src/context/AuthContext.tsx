"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  authApi,
  usersApi,
  walletApi,
  setTokens,
  clearTokens,
  getStoredRefreshToken,
  type User,
  type WalletBalance,
  type SignupData,
} from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  wallet: WalletBalance | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string, role?: "farmer" | "buyer") => Promise<User>;
  signup: (data: SignupData) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CACHE_KEY = "hl_user_cache";
const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

const DEV_USER: User = {
  id: "dev-bypass-user",
  name: "Dev Farmer",
  email: "dev@harvestlynk.local",
  emailVerified: true,
  image: null,
  phoneNumber: null,
  role: "farmer",
  farmName: "Dev Farm",
  location: "Lagos",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  location_state: "Lagos",
  location_lga: null,
  location_village: null,
  bank_name: null,
  bank_account_number: null,
  bank_account_name: null,
  liveness_verified: false,
  trust_score: 0,
  preferred_language: "English",
  wallet: {
    available_balance: "0",
    pending_balance: "0",
    total_paid_in: "0",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_BYPASS ? DEV_USER : null);
  const [wallet, setWallet] = useState<WalletBalance | null>(DEV_BYPASS ? DEV_USER.wallet : null);
  const [loading, setLoading] = useState(!DEV_BYPASS);

  // On mount: hydrate from cache immediately for fast paint, then silently
  // restore the session from the stored refresh token.
  useEffect(() => {
    if (DEV_BYPASS) return;

    // Fast paint from cached user
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as User;
        setUser(parsed);
        if (parsed.wallet) setWallet(parsed.wallet);
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    // Silently refresh tokens to verify the session is still valid
    async function restoreSession() {
      const rt = getStoredRefreshToken();
      if (!rt) { setLoading(false); return; }

      try {
        // Use raw fetch so we don't go through apiFetch (which might retry
        // endlessly if no token is set yet)
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });

        if (!res.ok) {
          clearTokens();
          setUser(null);
          setWallet(null);
          setLoading(false);
          return;
        }

        const { accessToken, refreshToken } = await res.json() as {
          accessToken: string;
          refreshToken: string;
        };
        setTokens(accessToken, refreshToken);

        // Load fresh user profile now that we have a valid access token
        const fullUser = await usersApi.getMe();
        setUser(fullUser);
        localStorage.setItem(CACHE_KEY, JSON.stringify(fullUser));
        if (fullUser.wallet) setWallet(fullUser.wallet);
      } catch {
        clearTokens();
        setUser(null);
        setWallet(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const { accessToken, refreshToken, user: authUser } = await authApi.login(email, password);
    setTokens(accessToken, refreshToken);

    // Fetch full profile (includes wallet, trust_score, etc.)
    const fullUser = await usersApi.getUser(authUser.id);
    setUser(fullUser);
    localStorage.setItem(CACHE_KEY, JSON.stringify(fullUser));
    if (fullUser.wallet) setWallet(fullUser.wallet);
    return fullUser;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string, role?: "farmer" | "buyer"): Promise<User> => {
    const { accessToken, refreshToken, user: authUser } = await authApi.google(idToken, role);
    setTokens(accessToken, refreshToken);

    const fullUser = await usersApi.getUser(authUser.id);
    setUser(fullUser);
    localStorage.setItem(CACHE_KEY, JSON.stringify(fullUser));
    if (fullUser.wallet) setWallet(fullUser.wallet);
    return fullUser;
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<{ message: string }> => {
    return authApi.signup(data);
  }, []);

  const logout = useCallback(async () => {
    const rt = getStoredRefreshToken();
    if (rt) {
      await authApi.logout(rt).catch(() => {});
    }
    clearTokens();
    setUser(null);
    setWallet(null);
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const w = await walletApi.getBalance();
      setWallet(w);
    } catch { /* stale data is acceptable */ }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const updated = await usersApi.getUser(user.id);
      setUser(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      if (updated.wallet) setWallet(updated.wallet);
    } catch { /* silently fail */ }
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, wallet, loading, login, loginWithGoogle, signup, logout, refreshWallet, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
