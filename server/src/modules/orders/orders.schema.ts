import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  shippingOptionId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  /** A redeemed voucher to spend. The discount itself is never sent by the client. */
  userVoucherId: z.string().min(1).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
