export type Category = "Skincare" | "Makeup" | "Bodycare";

export interface Product {
  id: string;
  slug: string;
  brand: string;
  name: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  soldCount: number;
  category: Category;
  halal: boolean;
  umkm: boolean;
  storeName: string;
  storeRating: number;
  description: string;
  hashtags: string[];
  shades: string[];
  concerns: string[];
  color: string;
  imageUrl: string | null;
}

/** One of the five skin conditions from the labelled dataset taxonomy. */
export interface ScanCondition {
  key: string;
  label: string;
  score: number;
  severity: string;
  advice: string;
  noticeable: boolean;
}

export interface ScanRecommendation {
  product: Product;
  reason: string;
}

export interface PersonalColourResult {
  season: string;
  label: string;
  summary: string;
  palette: string[];
  avoid: string[];
  axes: {
    hue: string;
    value: string;
    chroma: string;
  };
}

export interface SkinShadeResult {
  fitzpatrick: number;
  fitzpatrickLabel: string;
  undertone: string;
  undertoneLabel: string;
  undertoneAdvice: string;
  matchedShade: string | null;
}

/** Result of the single unified skin scan. */
export interface ScanAnalysis {
  headline: string;
  detail: string;
  warning: string | null;
  disclaimer: string;
  recommendations: ScanRecommendation[];
  skinType: string;
  skinTypeLabel: string;
  conditions: ScanCondition[];
  topConcerns: string[];
  personalColour: PersonalColourResult;
  skinShade: SkinShadeResult;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  points: number;
  /** "ADMIN" unlocks the review queue; the server re-checks on every call. */
  role: string;
  createdAt: string;
}

/** The seller's own store, whatever its review state. */
export interface SellerStore {
  id: string;
  name: string;
  tagline: string | null;
  story: string | null;
  city: string | null;
  status: string;
  rating: number;
  launchDate: string | null;
  createdAt: string;
  productCount: number;
  unitsSold: number;
  /** Orders sitting at PAID or PROCESSING - awaiting some action from this seller. */
  newOrdersCount: number;
  revenueThisMonth: number;
  completedOrders: number;
  /** % of concluded (COMPLETED or CANCELLED) orders that completed. Null until any order has concluded. */
  fulfillmentRate: number | null;
}

export interface SellerProduct extends Product {
  reviewCount: number;
  launchedAt: string | null;
}

export interface SellerOrderItem {
  name: string;
  unitPrice: number;
  quantity: number;
}

/** An order as seen by one of its sellers - only that seller's own line items are included. */
export interface SellerOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  items: SellerOrderItem[];
  subtotal: number;
}

export interface SellerMonthlyRevenue {
  /** "2026-08" - formatted client-side so month names use the browser's own locale data. */
  month: string;
  revenue: number;
  orderCount: number;
}

/** Computed, not a stored ledger - there is no payout system behind this. */
export interface SellerFinance {
  balance: {
    /** From COMPLETED orders - settled and the seller's to count on. */
    available: number;
    /** From PAID/PROCESSING/SHIPPED orders - still moving, not final yet. */
    pending: number;
    lifetime: number;
  };
  /** Trailing 6 months, oldest first. */
  monthly: SellerMonthlyRevenue[];
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  pointsCost: number;
  discountAmount: number;
  minSpend: number;
  validForDays: number;
}

/** A voucher the user has redeemed with points. */
export interface UserVoucher {
  id: string;
  redeemedAt: string;
  expiresAt: string;
  usedAt: string | null;
  usable: boolean;
  voucher: Voucher;
}

/** A brand application in the admin review queue. */
export interface BrandApplication {
  id: string;
  name: string;
  tagline: string | null;
  story: string | null;
  city: string | null;
  contactName: string | null;
  contactEmail: string | null;
  status: string;
  createdAt: string;
  productCount: number;
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  fullAddress: string;
  isDefault: boolean;
}

export interface ShippingOption {
  id: string;
  name: string;
  eta: string;
  price: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  group: string;
  /** "stripe" goes through the gateway; anything else settles offline. */
  provider: string;
}

/** Everything the payment page needs to mount Stripe Elements. */
export interface PaymentSession {
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  voucherTitle: string | null;
  amount: number;
  currency: string;
  returnUrl: string;
}

export interface OrderItem {
  id: string;
  brand: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: string;
  createdAt: string;
  address: Address;
  shippingOption: ShippingOption;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  benefits: string[];
}

export interface TrialKitItem {
  id: string;
  brand: string;
  name: string;
  note: string;
  color: string;
}

export interface TrialKit {
  id: string;
  periodLabel: string;
  status: "PROCESSING" | "SHIPPED" | "DELIVERED";
  shippedAt: string | null;
  createdAt: string;
  items: TrialKitItem[];
}

export interface Subscription {
  id: string;
  status: "ACTIVE" | "CANCELLED";
  startedAt: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  plan: SubscriptionPlan;
  trialKits: TrialKit[];
}

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  order: number;
  question: string;
  multiSelect: boolean;
  options: QuizOption[];
}

export interface SkinProfile {
  skinType: string;
  skinTypeLabel: string;
  concerns: string[];
  concernLabels: string[];
  newBrandOk: boolean;
}

export interface PersonalizedKitItem {
  id: string;
  reason: string;
  product: Product;
}

export interface PersonalizedKit {
  id: string;
  createdAt: string;
  items: PersonalizedKitItem[];
}

export interface SpotlightBrand {
  id: string;
  name: string;
  rating: number;
  tagline: string | null;
  story: string | null;
  launchDate: string | null;
  products: Product[];
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  helpfulCount: number;
  createdAt: string;
  authorName: string;
  isMine: boolean;
  markedHelpfulByMe: boolean;
}

/** A product in the new-arrivals channel. */
export interface NewProduct extends Product {
  launchedAt: string | null;
  daysSinceLaunch: number | null;
}

/** A review in the community feed, about either a product or a brand - exactly one is set. */
export interface FeedReview extends Review {
  product: {
    id: string;
    brand: string;
    name: string;
    color: string;
    imageUrl: string | null;
  } | null;
  store: {
    id: string;
    name: string;
  } | null;
}

export interface ReviewerStats {
  reviewCount: number;
  totalHelpful: number;
  badge: string;
}

export type View =
  | { name: "landing" }
  | { name: "login" }
  | { name: "register" }
  | { name: "home" }
  | { name: "scan" }
  | { name: "scan-flow" }
  | { name: "scan-result"; result: ScanAnalysis }
  | { name: "quiz" }
  | { name: "quiz-result"; profile: SkinProfile; kit: PersonalizedKit }
  | { name: "product"; id: string }
  | { name: "wishlist" }
  | { name: "account" }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "payment"; session: PaymentSession }
  | { name: "order-success"; orderId: string; total: number }
  | { name: "subscription" }
  | { name: "brand-onboarding" }
  | { name: "new-arrivals" }
  | { name: "brands" }
  | { name: "admin" }
  | { name: "seller" }
  | { name: "vouchers" }
  | { name: "community" }
  | { name: "orders" }
  | { name: "addresses" };

export type BottomTab = "home" | "scan" | "brands" | "account" | "dashboard";
