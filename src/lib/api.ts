import type {
  Address,
  BrandApplication,
  CartLine,
  Order,
  PaymentMethod,
  PaymentSession,
  PersonalizedKit,
  Product,
  QuizQuestion,
  FeedReview,
  NewProduct,
  Review,
  ReviewerStats,
  ScanAnalysis,
  ShippingOption,
  SkinProfile,
  SpotlightBrand,
  Subscription,
  SubscriptionPlan,
  User,
} from "../types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

const TOKEN_KEY = "aura_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  if (options.auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = payload?.error?.message ?? `Request failed (${res.status})`;
    const code = payload?.error?.code ?? "UNKNOWN_ERROR";
    throw new ApiError(res.status, code, message);
  }

  return payload as T;
}

// --- Auth ---
export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => request<{ user: User }>("/auth/me", { auth: true }),
};

// --- Products ---
export interface ProductListParams {
  category?: "Skincare" | "Makeup" | "Bodycare";
  search?: string;
  halal?: boolean;
  umkm?: boolean;
  sort?: "popular" | "price-asc" | "price-desc" | "rating";
}

export const productsApi = {
  list: (params: ProductListParams = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.halal) query.set("halal", "true");
    if (params.umkm) query.set("umkm", "true");
    if (params.sort) query.set("sort", params.sort);
    const qs = query.toString();
    return request<{ products: Product[] }>(`/products${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => request<{ product: Product }>(`/products/${id}`),
  /** Newly launched products, newest first. */
  newArrivals: () =>
    request<{ products: NewProduct[] }>("/products/new"),
};

// --- Wishlist ---
export const wishlistApi = {
  list: () => request<{ products: Product[] }>("/wishlist", { auth: true }),
  add: (productId: string) =>
    request<{ ok: true }>(`/wishlist/${productId}`, { method: "POST", auth: true }),
  remove: (productId: string) =>
    request<{ ok: true }>(`/wishlist/${productId}`, { method: "DELETE", auth: true }),
};

// --- Cart ---
export const cartApi = {
  list: () => request<{ items: CartLine[] }>("/cart", { auth: true }),
  add: (productId: string) =>
    request<{ quantity: number }>(`/cart/${productId}`, { method: "POST", auth: true }),
  decrement: (productId: string) =>
    request<{ quantity: number }>(`/cart/${productId}/decrement`, {
      method: "POST",
      auth: true,
    }),
  remove: (productId: string) =>
    request<{ ok: true }>(`/cart/${productId}`, { method: "DELETE", auth: true }),
};

// --- Addresses ---
export const addressesApi = {
  list: () => request<{ addresses: Address[] }>("/addresses", { auth: true }),
  create: (data: {
    label: string;
    recipient: string;
    phone: string;
    fullAddress: string;
    isDefault?: boolean;
  }) =>
    request<{ address: Address }>("/addresses", {
      method: "POST",
      body: data,
      auth: true,
    }),
};

// --- Meta ---
export const metaApi = {
  shippingOptions: () =>
    request<{ shippingOptions: ShippingOption[] }>("/shipping-options"),
  paymentMethods: () =>
    request<{ paymentMethods: PaymentMethod[] }>("/payment-methods"),
};

// --- Payments (Stripe) ---
export const paymentsApi = {
  status: () => request<{ enabled: boolean }>("/payments/status"),
  createIntent: (data: {
    addressId: string;
    shippingOptionId: string;
    paymentMethodId: string;
  }) =>
    request<PaymentSession>("/payments/intent", {
      method: "POST",
      body: data,
      auth: true,
    }),
  orderStatus: (orderId: string) =>
    request<{
      order: {
        id: string;
        orderNumber: string;
        status: string;
        total: number;
      };
    }>(`/payments/orders/${orderId}`, { auth: true }),
};

// --- Orders ---
export const ordersApi = {
  create: (data: { addressId: string; shippingOptionId: string; paymentMethodId: string }) =>
    request<{ order: Order }>("/orders", { method: "POST", body: data, auth: true }),
  list: () => request<{ orders: Order[] }>("/orders", { auth: true }),
  get: (id: string) => request<{ order: Order }>(`/orders/${id}`, { auth: true }),
};

// --- Subscription (AURA+) ---
export const subscriptionApi = {
  plans: () => request<{ plans: SubscriptionPlan[] }>("/subscription/plans"),
  mine: () =>
    request<{ subscription: Subscription | null }>("/subscription", {
      auth: true,
    }),
  subscribe: (planId: string) =>
    request<{ subscription: Subscription }>("/subscription/subscribe", {
      method: "POST",
      body: { planId },
      auth: true,
    }),
  cancel: () =>
    request<{ subscription: Subscription }>("/subscription/cancel", {
      method: "POST",
      auth: true,
    }),
};

// --- Beauty Quiz ---
export const quizApi = {
  questions: () => request<{ questions: QuizQuestion[] }>("/quiz"),
  submit: (answers: Record<string, string[]>) =>
    request<{ profile: SkinProfile; kit: PersonalizedKit }>("/quiz/submit", {
      method: "POST",
      body: { answers },
      auth: true,
    }),
};

// --- Brand Spotlight & on-boarding ---
export const brandsApi = {
  spotlight: () =>
    request<{ brands: SpotlightBrand[] }>("/brands/spotlight"),
  apply: (data: {
    name: string;
    tagline: string;
    story: string;
    city: string;
    contactName: string;
    contactEmail: string;
  }) =>
    request<{
      application: { id: string; name: string; status: string };
      message: string;
    }>("/brands/apply", { method: "POST", body: data }),
};

// --- Admin ---
export const adminApi = {
  summary: () =>
    request<{ pending: number; approved: number; rejected: number }>(
      "/admin/summary",
      { auth: true },
    ),
  brands: (status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") =>
    request<{ applications: BrandApplication[] }>(
      `/admin/brands?status=${status}`,
      { auth: true },
    ),
  approve: (id: string) =>
    request<{ message: string }>(`/admin/brands/${id}/approve`, {
      method: "POST",
      auth: true,
    }),
  reject: (id: string) =>
    request<{ message: string }>(`/admin/brands/${id}/reject`, {
      method: "POST",
      auth: true,
    }),
};

// --- Reviews ---
export const reviewsApi = {
  list: (productId: string) =>
    request<{ reviews: Review[] }>(`/products/${productId}/reviews`, {
      auth: true,
    }),
  create: (productId: string, data: { rating: number; text: string }) =>
    request<{ review: Review; pointsAwarded: number }>(
      `/products/${productId}/reviews`,
      { method: "POST", body: data, auth: true },
    ),
  toggleHelpful: (reviewId: string) =>
    request<{ helpfulCount: number; markedHelpfulByMe: boolean }>(
      `/reviews/${reviewId}/helpful`,
      { method: "POST", auth: true },
    ),
  myStats: () => request<ReviewerStats>("/users/me/reviewer-stats", { auth: true }),
  /** Most-helpful reviews across every product. */
  feed: () => request<{ reviews: FeedReview[] }>("/reviews/feed", { auth: true }),
};

// --- AI Scan (Gemini vision) ---
export const scanApi = {
  status: () => request<{ enabled: boolean }>("/scan/status"),
  /**
   * @param image data URL from the camera/file picker, e.g. "data:image/jpeg;base64,..."
   */
  analyze: (image: string) =>
    request<ScanAnalysis>("/scan", {
      method: "POST",
      body: { image },
      auth: true,
    }),
};
