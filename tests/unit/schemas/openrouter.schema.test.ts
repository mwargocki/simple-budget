import { describe, it, expect } from "vitest";
import { chatMessageSchema, chatOptionsSchema, responseFormatSchema } from "@/lib/schemas/openrouter.schema";

describe("chatMessageSchema", () => {
  describe("valid data", () => {
    it("should validate system message", () => {
      const result = chatMessageSchema.safeParse({
        role: "system",
        content: "You are a helpful assistant.",
      });

      expect(result.success).toBe(true);
    });

    it("should validate user message", () => {
      const result = chatMessageSchema.safeParse({
        role: "user",
        content: "Hello, how are you?",
      });

      expect(result.success).toBe(true);
    });

    it("should validate assistant message", () => {
      const result = chatMessageSchema.safeParse({
        role: "assistant",
        content: "I am doing well, thank you!",
      });

      expect(result.success).toBe(true);
    });

    it("should accept content with minimum length (1 character)", () => {
      const result = chatMessageSchema.safeParse({
        role: "user",
        content: "A",
      });

      expect(result.success).toBe(true);
    });

    it("should accept long content (up to 100000 characters)", () => {
      const result = chatMessageSchema.safeParse({
        role: "user",
        content: "a".repeat(100000),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("role validation", () => {
    it("should reject invalid role", () => {
      const result = chatMessageSchema.safeParse({
        role: "admin",
        content: "Test",
      });

      expect(result.success).toBe(false);
    });

    it("should reject empty role", () => {
      const result = chatMessageSchema.safeParse({
        role: "",
        content: "Test",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing role", () => {
      const result = chatMessageSchema.safeParse({
        content: "Test",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("content validation", () => {
    it("should reject empty content", () => {
      const result = chatMessageSchema.safeParse({
        role: "user",
        content: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Message content cannot be empty");
      }
    });

    it("should reject content longer than 100000 characters", () => {
      const result = chatMessageSchema.safeParse({
        role: "user",
        content: "a".repeat(100001),
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing content", () => {
      const result = chatMessageSchema.safeParse({
        role: "user",
      });

      expect(result.success).toBe(false);
    });
  });
});

describe("chatOptionsSchema", () => {
  const validMessage = { role: "user" as const, content: "Hello" };

  describe("valid data", () => {
    it("should validate with required messages only", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
      });

      expect(result.success).toBe(true);
    });

    it("should validate with all optional fields", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
      });

      expect(result.success).toBe(true);
    });

    it("should accept multiple messages", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "How are you?" },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should accept up to 100 messages", () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `Message ${i}`,
      }));

      const result = chatOptionsSchema.safeParse({ messages });

      expect(result.success).toBe(true);
    });
  });

  describe("messages validation", () => {
    it("should reject empty messages array", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("At least one message is required");
      }
    });

    it("should reject missing messages", () => {
      const result = chatOptionsSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should reject more than 100 messages", () => {
      const messages = Array.from({ length: 101 }, () => validMessage);

      const result = chatOptionsSchema.safeParse({ messages });

      expect(result.success).toBe(false);
    });

    it("should reject invalid message in array", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage, { role: "invalid", content: "test" }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("temperature validation", () => {
    it("should accept temperature at minimum (0)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        temperature: 0,
      });

      expect(result.success).toBe(true);
    });

    it("should accept temperature at maximum (2)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        temperature: 2,
      });

      expect(result.success).toBe(true);
    });

    it("should accept temperature in between (0.7)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        temperature: 0.7,
      });

      expect(result.success).toBe(true);
    });

    it("should reject temperature below 0", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        temperature: -0.1,
      });

      expect(result.success).toBe(false);
    });

    it("should reject temperature above 2", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        temperature: 2.1,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("maxTokens validation", () => {
    it("should accept positive integer maxTokens", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        maxTokens: 1000,
      });

      expect(result.success).toBe(true);
    });

    it("should accept maxTokens at minimum (1)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        maxTokens: 1,
      });

      expect(result.success).toBe(true);
    });

    it("should accept maxTokens at maximum (128000)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        maxTokens: 128000,
      });

      expect(result.success).toBe(true);
    });

    it("should reject zero maxTokens", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        maxTokens: 0,
      });

      expect(result.success).toBe(false);
    });

    it("should reject negative maxTokens", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        maxTokens: -100,
      });

      expect(result.success).toBe(false);
    });

    it("should reject maxTokens above 128000", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        maxTokens: 128001,
      });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer maxTokens", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        maxTokens: 100.5,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("topP validation", () => {
    it("should accept topP at minimum (0)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        topP: 0,
      });

      expect(result.success).toBe(true);
    });

    it("should accept topP at maximum (1)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        topP: 1,
      });

      expect(result.success).toBe(true);
    });

    it("should accept topP in between (0.9)", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        topP: 0.9,
      });

      expect(result.success).toBe(true);
    });

    it("should reject topP below 0", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        topP: -0.1,
      });

      expect(result.success).toBe(false);
    });

    it("should reject topP above 1", () => {
      const result = chatOptionsSchema.safeParse({
        messages: [validMessage],
        topP: 1.1,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("model validation", () => {
    it("should accept any model string", () => {
      const models = ["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "custom-model"];

      models.forEach((model) => {
        const result = chatOptionsSchema.safeParse({
          messages: [validMessage],
          model,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});

describe("responseFormatSchema", () => {
  describe("valid data", () => {
    it("should validate correct response format", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(true);
    });

    it("should accept schema with multiple properties", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "analysis",
          strict: false,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              summary: { type: "string" },
              tags: { type: "array" },
            },
            required: ["score", "summary"],
            additionalProperties: true,
          },
        },
      });

      expect(result.success).toBe(true);
    });

    it("should accept schema with empty required array", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "optional",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("type validation", () => {
    it("should reject type other than json_schema", () => {
      const result = responseFormatSchema.safeParse({
        type: "text",
        json_schema: {
          name: "test",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing type", () => {
      const result = responseFormatSchema.safeParse({
        json_schema: {
          name: "test",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("json_schema validation", () => {
    it("should reject missing json_schema", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing name in json_schema", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          strict: true,
          schema: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing strict in json_schema", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "test",
          schema: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(false);
    });

    it("should reject schema with type other than object", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "test",
          strict: true,
          schema: {
            type: "array",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing properties in schema", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "test",
          strict: true,
          schema: {
            type: "object",
            required: [],
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing required in schema", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "test",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing additionalProperties in schema", () => {
      const result = responseFormatSchema.safeParse({
        type: "json_schema",
        json_schema: {
          name: "test",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      });

      expect(result.success).toBe(false);
    });
  });
});
