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
  undertone: string;
  undertoneLabel: string;
  undertoneAdvice: string;
  depth: string;
  depthLabel: string;
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
  createdAt: string;
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
  | { name: "subscription" };

export type BottomTab = "home" | "scan" | "wishlist" | "account";
