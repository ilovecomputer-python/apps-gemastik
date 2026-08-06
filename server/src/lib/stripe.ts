import Stripe from "stripe";
import { env } from "./env.js";
import { HttpError } from "./http-error.js";

let client: Stripe | null = null;

/**
 * Lazily construct the Stripe client so the server still boots (and serves
 * every non-payment route) when no key is configured.
 */
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(
      503,
      "PAYMENTS_NOT_CONFIGURED",
      "Pembayaran kartu belum aktif. STRIPE_SECRET_KEY belum diset di server.",
    );
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      // Fail fast rather than holding a checkout request open indefinitely.
      timeout: 20_000,
      maxNetworkRetries: 2,
    });
  }
  return client;
}

export const isStripeConfigured = () => Boolean(env.STRIPE_SECRET_KEY);

/**
 * Stripe wants the amount in the currency's smallest unit. IDR is *not* on
 * Stripe's zero-decimal list, so rupiah must be multiplied by 100 — passing
 * the raw rupiah figure makes Stripe read Rp107.000 as Rp1.070 and undercharge
 * by 100x.
 */
export const toStripeAmount = (rupiah: number) => Math.round(rupiah * 100);

export const STRIPE_CURRENCY = "idr";

/**
 * Stripe rejects anything under roughly $0.50. At ~Rp16.000/USD that is about
 * Rp8.000, so catch it before the API call and say so in the app's own words.
 */
export const STRIPE_MINIMUM_RUPIAH = 9000;
