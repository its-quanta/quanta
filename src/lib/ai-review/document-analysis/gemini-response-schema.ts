import { SchemaType, type ResponseSchema } from "@google/generative-ai";

/** Structured output schema for document analysis suggestions. */
export const GEMINI_SUGGESTIONS_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    suggestions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          trade: { type: SchemaType.STRING, nullable: true },
          description: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER, nullable: true },
          unit: { type: SchemaType.STRING, nullable: true },
          drawing_reference: { type: SchemaType.STRING, nullable: true },
          sheet_number: { type: SchemaType.STRING, nullable: true },
          page_number: { type: SchemaType.INTEGER, nullable: true },
          reasoning: { type: SchemaType.STRING, nullable: true },
          confidence: { type: SchemaType.NUMBER, nullable: true },
        },
        required: ["description"],
      },
    },
  },
  required: ["suggestions"],
};
