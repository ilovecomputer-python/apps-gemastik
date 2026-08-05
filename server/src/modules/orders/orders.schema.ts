import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  shippingOptionId: z.string().min(1),
  paymentMethodId: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
