import { z } from "zod";

export const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.array(z.string()).min(1)),
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
