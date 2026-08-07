// The default entry point injects Stripe.js the moment the module is imported,
// which cost every visitor a 252 KB download on the landing page for a script
// only the payment screen uses. The /pure entry defers the injection until
// loadStripe() is actually called.
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined;

/**
 * loadStripe injects a script tag, so it must be called once per page load
 * rather than on every render of the payment page.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!publishableKey) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

export const isStripeConfigured = () => Boolean(publishableKey);
