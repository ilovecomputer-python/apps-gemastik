import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  addressId: z.string().min(1),
  shippingOptionId: z.string().min(1),
  paymentMethodId: z.string().min(1),
});

export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;
