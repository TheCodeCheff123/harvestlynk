"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { authApi, usersApi, walletApi, User, WalletBalance, SignupData } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  wallet: WalletBalance | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
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

  // Hydrate from cache immediately for fast initial render
  useEffect(() => {
    if (DEV_BYPASS) return;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: User = JSON.parse(cached);
        setUser(parsed);
        if (parsed.wallet) setWallet(parsed.wallet);
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  // Then verify session with server and refresh data
  const loadFromSession = useCallback(async () => {
    if (DEV_BYPASS) return;
    try {
      const session = await authApi.getSession();
      if (session?.user?.id) {
        const fullUser = await usersApi.getUser(session.user.id);
        setUser(fullUser);
        localStorage.setItem(CACHE_KEY, JSON.stringify(fullUser));
        if (fullUser.wallet) setWallet(fullUser.wallet);
      } else {
        setUser(null);
        setWallet(null);
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {
      // Network error or session expired — clear cache
      setUser(null);
      setWallet(null);
      localStorage.removeItem(CACHE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromSession();
  }, [loadFromSession]);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const { user: sessionUser } = await authApi.signIn(email, password);
    const fullUser = await usersApi.getUser(sessionUser.id);
    setUser(fullUser);
    localStorage.setItem(CACHE_KEY, JSON.stringify(fullUser));
    if (fullUser.wallet) setWallet(fullUser.wallet);
    return fullUser;
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<User> => {
    await usersApi.signup(data);
    const fullUser = await usersApi.getMe();
    setUser(fullUser);
    localStorage.setItem(CACHE_KEY, JSON.stringify(fullUser));
    if (fullUser.wallet) setWallet(fullUser.wallet);
    return fullUser;
  }, []);

  const logout = useCallback(async () => {
    await authApi.signOut().catch(() => {});
    setUser(null);
    setWallet(null);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem("hl_farmer_verified");
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const w = await walletApi.getBalance();
      setWallet(w);
    } catch {
      // silently fail — stale data is acceptable
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const updated = await usersApi.getUser(user.id);
      setUser(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      if (updated.wallet) setWallet(updated.wallet);
    } catch {
      // silently fail
    }
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{ user, wallet, loading, login, signup, logout, refreshWallet, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
