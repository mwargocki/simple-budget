import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val >= 0.01 && val <= 1000000.0, {
      message: "Amount must be between 0.01 and 1,000,000.00",
    }),
  type: z.enum(["expense", "income"], {
    errorMap: () => ({ message: "Type must be 'expense' or 'income'" }),
  }),
  category_id: z.string().uuid("Invalid category ID format"),
  description: z
    .string({ required_error: "Description is required" })
    .min(1, "Description is required")
    .max(255, "Description must not exceed 255 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Description cannot be whitespace-only",
    }),
  occurred_at: z.string().datetime({ message: "Invalid ISO 8601 datetime format" }).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const transactionIdSchema = z.string().uuid("Invalid transaction ID format");
