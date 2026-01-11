import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "Message content cannot be empty").max(100000),
});

export const responseFormatSchema = z.object({
  type: z.literal("json_schema"),
  json_schema: z.object({
    name: z.string(),
    strict: z.boolean(),
    schema: z.object({
      type: z.literal("object"),
      properties: z.record(z.unknown()),
      required: z.array(z.string()),
      additionalProperties: z.boolean(),
    }),
  }),
});

export const chatOptionsSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "At least one message is required").max(100),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(128000).optional(),
  topP: z.number().min(0).max(1).optional(),
  responseFormat: responseFormatSchema.optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatOptionsInput = z.infer<typeof chatOptionsSchema>;
