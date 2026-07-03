// ─── Token store ──────────────────────────────────────────────────────────────
// Access token is kept in memory only (cleared on page refresh).
// Refresh token is persisted in localStorage so sessions survive a reload.

let _accessToken: string | null = null;
let _refreshing: Promise<void> | null = null;
let _onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  _onSessionExpired = handler;
}

export function setTokens(accessToken: string, refreshToken: string) {
  _accessToken = accessToken;
  if (typeof window !== "undefined") {
    localStorage.setItem("hl_access_token", accessToken);
    localStorage.setItem("hl_refresh_token", refreshToken);
  }
}

export function clearTokens() {
  _accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("hl_access_token");
    localStorage.removeItem("hl_refresh_token");
    localStorage.removeItem("hl_user_cache");
    localStorage.removeItem("hl_farmer_verified");
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hl_refresh_token");
}

export function getStoredAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof window === "undefined") return null;
  _accessToken = localStorage.getItem("hl_access_token");
  return _accessToken;
}

async function doRefresh(): Promise<void> {
  const rt = getStoredRefreshToken();
  if (!rt) throw new Error("No refresh token");

  const res = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) {
    clearTokens();
    _onSessionExpired?.();
    throw new Error("Session expired. Please log in again.");
  }

  const { accessToken, refreshToken } = await res.json() as {
    accessToken: string;
    refreshToken: string;
  };
  setTokens(accessToken, refreshToken);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  wallet_id?: string;
  user_id?: string;
  available_balance: string;
  pending_balance: string;
  total_paid_in: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phoneNumber: string | null;
  role: "farmer" | "buyer";
  farmName: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  location_state: string | null;
  location_lga: string | null;
  location_village: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  liveness_verified: boolean;
  trust_score: number;
  preferred_language: string | null;
  wallet: WalletBalance | null;
  bio?: string | null;
}

export interface Transaction {
  transaction_id: string;
  wallet_id: string;
  user_id: string;
  type: "credit" | "debit";
  amount: string;
  balance_before: string;
  balance_after: string;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export interface SignupData {
  role: "farmer" | "buyer";
  firstName: string;
  lastName: string;
  email: string;
  farmName?: string;
  location: string;
  phoneNumber: string;
  password: string;
}

export interface UpdateProfileData {
  fullName?: string;
  bio?: string;
  locationState?: string;
  locationLga?: string;
  locationVillage?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  preferredLanguage?: string;
  farmName?: string;
}

export interface Listing {
  listing_id: string;
  farmer_id: string;
  product_name: string;
  category: string;
  quantity: string;
  unit: string;
  price_per_unit: number;
  total_price: number;
  location_state: string;
  location_lga: string | null;
  pickup_address: string | null;
  description: string | null;
  status: "active" | "sold" | "expired" | "paused";
  views: number;
  inquiries: number;
  harvest_date: string | null;
  delivery_options: string[] | null;
  images: string[] | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateListingData {
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  location_state: string;
  location_lga?: string;
  pickup_address?: string;
  description?: string;
  harvest_date?: string | null;
  delivery_options?: string[];
  images?: string[];
  status?: "active" | "paused";
}

export interface Bank {
  name: string;
  code: string;
}

export interface WithdrawData {
  amount: number;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name?: string;
}

export interface BankVerifyResponse {
  success: boolean;
  message: string;
  data: { account_name: string };
}

export interface WithdrawResponse {
  success: boolean;
  message: string;
  transaction_id: string;
  status: "pending" | "completed" | "failed";
}

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: "order" | "payment" | "system";
  title: string;
  message: string;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface Scan {
  scan_id: string;
  user_id: string;
  image_url: string;
  thumbnail_url: string | null;
  crop_type: string;
  farmer_notes: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  result_disease: string | null;
  result_confidence: number | null;
  result_severity: "low" | "medium" | "high" | null;
  result_recommendations: unknown;
  processing_time_ms: number | null;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DashboardStats {
  listings_count?: number;
  orders_received?: number;
  completed_orders?: number;
  total_revenue?: number;
  orders_placed?: number;
}

// ─── Money helpers ─────────────────────────────────────────────────────────────

export function koboToNaira(kobo: string | number): number {
  const n = typeof kobo === "string" ? parseInt(kobo, 10) : kobo;
  return isNaN(n) ? 0 : n / 100;
}

export function formatNaira(kobo: string | number): string {
  return `₦${koboToNaira(kobo).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

// ─── Base fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  // Restore access token from localStorage on first call after page load
  if (!_accessToken && typeof window !== "undefined") {
    _accessToken = localStorage.getItem("hl_access_token");
  }

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  Object.assign(headers, init?.headers ?? {});

  const res = await fetch(path, { ...init, headers });

  // Auto-refresh on 401, deduplicated across concurrent calls.
  // Skip for auth mutation endpoints — their 401s mean wrong credentials,
  // not an expired session, so we must NOT trigger the refresh loop.
  const AUTH_NO_REFRESH = ["/auth/login", "/auth/signup", "/auth/google", "/auth/refresh"];
  const isAuthEndpoint = AUTH_NO_REFRESH.some((p) => path.includes(p));
  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    if (!_refreshing) {
      _refreshing = doRefresh().finally(() => { _refreshing = null; });
    }
    try {
      await _refreshing;
    } catch {
      _onSessionExpired?.();
      throw new Error("Your session has expired. Please log in again.");
    }
    return apiFetch<T>(path, init, true);
  }

  const text = await res.text();

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      if (text) {
        const body = JSON.parse(text) as Record<string, unknown>;
        if (body.details && typeof body.details === "object") {
          const fieldErrors = Object.entries(body.details as Record<string, string[]>)
            .map(([field, msgs]) => {
              const label = field.charAt(0).toUpperCase() + field.slice(1);
              return `${label}: ${msgs.join(", ")}`;
            })
            .join(" | ");
          if (fieldErrors) message = fieldErrors;
        } else if (typeof body.error === "string") {
          message = body.error;
        } else if (typeof body.message === "string") {
          message = body.message;
        }
      }
    } catch { /* ignore parse error */ }
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (data: SignupData) =>
    apiFetch<{ message: string }>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        confirmPassword: data.password,
        phoneNumber: data.phoneNumber || undefined,
        location: data.location || undefined,
        role: data.role,
      }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string; role: "farmer" | "buyer" } }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  google: (idToken: string, role?: "farmer" | "buyer") =>
    apiFetch<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string; role: "farmer" | "buyer" } }>(
      "/api/v1/auth/google",
      { method: "POST", body: JSON.stringify({ idToken, role }) }
    ),

  logout: (refreshToken: string) =>
    apiFetch<void>("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  verifyEmail: (token: string, refreshToken?: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; user: { id: string; role: "farmer" | "buyer" } }>(
      `/api/v1/auth/verify-email?token=${encodeURIComponent(token)}${refreshToken ? `&refreshToken=${encodeURIComponent(refreshToken)}` : ""}`
    ),

  resendVerification: (email: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  getMe: () =>
    apiFetch<User>("/api/v1/users/me"),

  getUser: (id: string) =>
    apiFetch<User>(`/api/v1/users/${id}`),

  updateUser: (data: UpdateProfileData) =>
    apiFetch<User>("/api/v1/users/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getStats: () =>
    apiFetch<DashboardStats>("/api/v1/users/me/stats"),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ url: string; user: User }>("/api/v1/users/avatar", { method: "POST", body: form });
  },

  livenessCheck: (selfie: File) => {
    const form = new FormData();
    form.append("selfie", selfie);
    return apiFetch<{ passed: boolean; liveness_score: number; is_live: boolean; message: string }>(
      "/api/v1/users/liveness-check",
      { method: "POST", body: form }
    );
  },

  uploadNinDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ url: string; user: User }>("/api/v1/users/verify-nin", { method: "POST", body: form });
  },

  uploadOwnershipDoc: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ url: string; user: User }>("/api/v1/users/upload-ownership-doc", { method: "POST", body: form });
  },

  completeOAuthProfile: (data: { role: "farmer" | "buyer"; farmName?: string; location?: string; phoneNumber?: string }) =>
    apiFetch<User>("/api/v1/users/complete-oauth", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getFarmerRatings: (farmerId: string) =>
    apiFetch<{ farmer_id: string; average_rating: number | null; total_reviews: number; ratings: unknown[] }>(
      `/api/v1/users/${farmerId}/ratings`
    ),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─── Wallet API ───────────────────────────────────────────────────────────────

export const walletApi = {
  getBanks: () =>
    apiFetch<{ banks: Bank[] }>("/api/v1/wallet/banks"),

  getBalance: () =>
    apiFetch<WalletBalance>("/api/v1/wallet/balance"),

  getTransactions: () =>
    apiFetch<Transaction[]>("/api/v1/wallet/transactions"),

  verifyBank: (bankCode: string, accountNumber: string) =>
    apiFetch<BankVerifyResponse>(
      `/api/v1/wallet/verify-bank?bank_code=${encodeURIComponent(bankCode)}&account_number=${encodeURIComponent(accountNumber)}`
    ),

  withdraw: (data: WithdrawData) =>
    apiFetch<WithdrawResponse>("/api/v1/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface PublicListing extends Listing {
  farmer: {
    name: string;
    farmName: string | null;
    location_state: string | null;
    location_lga: string | null;
  };
}

// ─── Marketplace API ──────────────────────────────────────────────────────────

export const marketplaceApi = {
  getAllListings: async (filters?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    const res = await apiFetch<{ data: PublicListing[]; page: number; limit: number; total: number }>(
      `/api/v1/marketplace/listings${qs ? `?${qs}` : ""}`
    );
    return res.data;
  },

  getListing: (id: string) =>
    apiFetch<PublicListing>(`/api/v1/marketplace/listings/${id}`),

  createListing: (data: CreateListingData) =>
    apiFetch<Listing>("/api/v1/marketplace/listings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateListing: (id: string, data: Partial<CreateListingData>) =>
    apiFetch<Listing>(`/api/v1/marketplace/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getMyListings: () =>
    apiFetch<Listing[]>("/api/v1/marketplace/listings/my"),

  deleteListing: (id: string) =>
    apiFetch<void>(`/api/v1/marketplace/listings/${id}`, { method: "DELETE" }),

  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiFetch<{ url: string }>("/api/v1/marketplace/upload", {
      method: "POST",
      body: form,
    });
    return res.url;
  },
};

// ─── Orders API ───────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending_payment"
  | "payment_confirmed"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "disputed";

export interface BuyerOrder {
  order_id: string;
  order_ref: string;
  farmer_id: string;
  quantity: string;
  unit_price: number;
  total_amount: number;
  delivery_method: string;
  delivery_address: string | null;
  special_instructions: string | null;
  status: OrderStatus;
  escrow_state: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  checkout_link?: string | null;
  listing: { product_name: string; unit: string };
  farmer: { name: string; farmName: string | null };
}

export interface CreateOrderData {
  listing_id: string;
  quantity: number;
  delivery_method: "pickup" | "delivery";
  delivery_address?: string | null;
  special_instructions?: string | null;
}

export interface FarmerOrder {
  order_id: string;
  order_ref: string;
  buyer_id: string;
  quantity: string;
  unit_price: number;
  total_amount: number;
  delivery_method: string;
  delivery_address: string | null;
  status: OrderStatus;
  escrow_state: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  listing: { product_name: string; unit: string };
  buyer: { name: string };
}

export const ordersApi = {
  createOrder: (data: CreateOrderData) =>
    apiFetch<BuyerOrder>("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyBuyerOrders: () =>
    apiFetch<BuyerOrder[]>("/api/v1/orders/buyer"),

  getMyFarmerOrders: () =>
    apiFetch<FarmerOrder[]>("/api/v1/orders/my"),

  confirmDelivery: (orderId: string) =>
    apiFetch<{ message: string; order: { order_id: string; status: string } }>(
      `/api/v1/orders/${orderId}/confirm-delivery`,
      { method: "PATCH" }
    ),

  simulatePayment: (orderId: string) =>
    apiFetch<{ order_id: string; status: string; escrow_state: string }>(
      `/api/v1/orders/${orderId}/simulate-payment`,
      { method: "PATCH" }
    ),

  updateStatus: (orderId: string) =>
    apiFetch<{ order_id: string; status: string; escrow_state: string }>(
      `/api/v1/orders/${orderId}/status`,
      { method: "PATCH" }
    ),

  cancelOrder: (orderId: string, reason?: string) =>
    apiFetch<{ order_id: string; status: string }>(
      `/api/v1/orders/${orderId}/cancel`,
      { method: "PATCH", body: JSON.stringify({ reason }) }
    ),

  rateOrder: (orderId: string, data: {
    rating: number;
    review?: string;
    quality_rating?: number;
    communication_rating?: number;
    delivery_rating?: number;
  }) =>
    apiFetch<{ rating_id: string; rating: number }>(`/api/v1/orders/${orderId}/rate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Notifications API ────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: (type?: "order" | "payment" | "system") => {
    const qs = type ? `?type=${type}` : "";
    return apiFetch<NotificationItem[]>(`/api/v1/notifications${qs}`);
  },

  getUnreadCount: () =>
    apiFetch<{ count: number }>("/api/v1/notifications/unread-count"),

  markRead: (id: string) =>
    apiFetch<{ notification_id: string; is_read: boolean }>(`/api/v1/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllRead: () =>
    apiFetch<{ message: string }>("/api/v1/notifications/read-all", { method: "PATCH" }),
};

// ─── Scans API ────────────────────────────────────────────────────────────────

export const scansApi = {
  createScan: (
    imageFile: File,
    cropType: string,
    notes?: string,
    result?: {
      disease: string;
      confidence: number;
      severity: "low" | "medium" | "high";
      recommendations: Record<string, string>;
    }
  ) => {
    const form = new FormData();
    form.append("image", imageFile);
    form.append("crop_type", cropType);
    if (notes) form.append("farmer_notes", notes);
    if (result) {
      form.append("result_disease", result.disease);
      form.append("result_confidence", String(result.confidence));
      form.append("result_severity", result.severity);
      form.append("result_recommendations", JSON.stringify(result.recommendations));
    }
    return apiFetch<Scan>("/api/v1/scans", { method: "POST", body: form });
  },

  getMyScans: () =>
    apiFetch<Scan[]>("/api/v1/scans/my"),
};
