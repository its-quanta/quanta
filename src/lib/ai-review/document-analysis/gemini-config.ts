export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

/** Ordered fallbacks after GEMINI_MODEL (deduped). */
export const GEMINI_MODEL_FALLBACK_CHAIN = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

/** Models that must not be used; skipped when set in GEMINI_MODEL. */
const BLOCKED_GEMINI_MODELS = new Set([
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-pro",
  "gemini-1.5-pro-latest",
]);

export function normaliseGeminiModelId(model: string): string {
  return model.replace(/^models\//, "").trim();
}

function isAllowedModel(model: string): boolean {
  const id = normaliseGeminiModelId(model);
  return id.length > 0 && !BLOCKED_GEMINI_MODELS.has(id);
}

/**
 * Fallback chain:
 * 1. process.env.GEMINI_MODEL (if allowed)
 * 2. gemini-1.5-flash
 * 3. gemini-1.5-pro
 */
export function getGeminiModelFallbackChain(): string[] {
  const chain: string[] = [];

  const add = (model: string) => {
    if (!isAllowedModel(model)) {
      return;
    }
    const id = normaliseGeminiModelId(model);
    if (!chain.includes(id)) {
      chain.push(id);
    }
  };

  const configured = process.env.GEMINI_MODEL?.trim();
  if (configured) {
    add(configured);
  }

  for (const fallback of GEMINI_MODEL_FALLBACK_CHAIN) {
    add(fallback);
  }

  if (chain.length === 0) {
    chain.push(DEFAULT_GEMINI_MODEL);
  }

  return chain;
}

export function buildGeminiGenerateContentUrl(model: string): string {
  const modelId = normaliseGeminiModelId(model);
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}

export const GEMINI_REQUEST_TIMEOUT_MS = 120_000;
