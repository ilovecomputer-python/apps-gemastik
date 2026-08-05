import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipient: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
  fullAddress: z.string().trim().min(10).max(300),
  isDefault: z.boolean().optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
