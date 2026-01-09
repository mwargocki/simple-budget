import { z } from "zod";

export const summaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format. Use YYYY-MM")
    .optional(),
});

export type SummaryQueryInput = z.infer<typeof summaryQuerySchema>;
