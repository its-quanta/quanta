import "server-only";

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import type { EnhancedGenerateContentResponse, ResponseSchema } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";

export const DEFAULT_GEMINI_MODEL = "models/gemini-2.5-flash";

/** Static fallbacks after GEMINI_MODEL — no legacy 1.5 models. */
export const GEMINI_STATIC_FALLBACK_MODELS = [
  "models/gemini-2.5-flash",
  "models/gemini-2.5-flash-lite",
  "models/gemini-2.0-flash",
] as const;

const MODELS_LIST_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_REQUEST_TIMEOUT_MS = 120_000;

let startupLogged = false;
let cachedModelChain: Promise<string[]> | null = null;

export function normaliseGeminiModelId(model: string): string {
  return model.replace(/^models\//, "").trim();
}

/** REST endpoints expect the `models/` prefix. */
export function toRestGeminiModelId(model: string): string {
  const trimmed = model.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

export function geminiModelIdsEqual(a: string, b: string): boolean {
  return normaliseGeminiModelId(a) === normaliseGeminiModelId(b);
}

type ListedModel = {
  name?: string;
  supportedGenerationMethods?: string[];
};

function modelSupportsGenerateContent(model: ListedModel): boolean {
  return (
    model.supportedGenerationMethods?.includes("generateContent") ?? false
  );
}

export async function fetchAvailableGenerateContentModels(
  apiKey: string
): Promise<
  | { ok: true; models: string[] }
  | { ok: false; status: number; message: string }
> {
  const models: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(MODELS_LIST_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      cache: "no-store",
    });

    const bodyText = await response.text().catch(() => "");

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: bodyText.slice(0, 2_000) || response.statusText,
      };
    }

    let parsed: {
      models?: ListedModel[];
      nextPageToken?: string;
    };

    try {
      parsed = JSON.parse(bodyText) as {
        models?: ListedModel[];
        nextPageToken?: string;
      };
    } catch {
      return {
        ok: false,
        status: response.status,
        message: "Could not parse models list response.",
      };
    }

    for (const model of parsed.models ?? []) {
      if (!model.name || !modelSupportsGenerateContent(model)) {
        continue;
      }
      const restId = toRestGeminiModelId(model.name);
      if (!models.some((existing) => geminiModelIdsEqual(existing, restId))) {
        models.push(restId);
      }
    }

    pageToken = parsed.nextPageToken;
  } while (pageToken);

  return { ok: true, models };
}

/**
 * Model chain:
 * 1. GEMINI_MODEL
 * 2. models/gemini-2.5-flash
 * 3. models/gemini-2.5-flash-lite
 * 4. models/gemini-2.0-flash
 * 5. first available generateContent model from listModels
 */
export async function resolveGeminiModelChain(
  apiKey: string
): Promise<string[]> {
  const configuredRaw = process.env.GEMINI_MODEL?.trim();
  const configured = configuredRaw
    ? toRestGeminiModelId(configuredRaw)
    : null;

  const listResult = await fetchAvailableGenerateContentModels(apiKey);
  const available = listResult.ok ? listResult.models : [];
  const availableIds = new Set(available.map(normaliseGeminiModelId));

  console.info(
    "[gemini] configured model:",
    configured ? normaliseGeminiModelId(configured) : "(not set)"
  );
  console.info(
    "[gemini] available generateContent models:",
    available.map(normaliseGeminiModelId)
  );

  const staticPriority: string[] = [
    ...(configured ? [configured] : []),
    ...GEMINI_STATIC_FALLBACK_MODELS,
  ];

  const chain: string[] = [];
  const seen = new Set<string>();

  const addUnique = (model: string) => {
    const id = normaliseGeminiModelId(model);
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    chain.push(toRestGeminiModelId(model));
  };

  if (listResult.ok) {
    if (configured && !availableIds.has(normaliseGeminiModelId(configured))) {
      console.warn(
        `Configured Gemini model unavailable: ${normaliseGeminiModelId(configured)}`
      );
    }

    for (const model of staticPriority) {
      if (availableIds.has(normaliseGeminiModelId(model))) {
        addUnique(model);
      }
    }

    const firstAvailable = available[0];
    if (firstAvailable) {
      addUnique(firstAvailable);
    }
  } else {
    console.warn("[gemini] model discovery failed:", {
      status: listResult.status,
      messagePreview: listResult.message.slice(0, 500),
    });

    for (const model of staticPriority) {
      addUnique(model);
    }
  }

  if (chain.length === 0 && available.length > 0) {
    addUnique(available[0]!);
  }

  console.info(
    "[gemini] selected model:",
    chain[0] ? normaliseGeminiModelId(chain[0]) : "(none)"
  );

  return chain;
}

export async function getGeminiModelFallbackChain(
  apiKey: string
): Promise<string[]> {
  if (!cachedModelChain) {
    cachedModelChain = resolveGeminiModelChain(apiKey);
  }
  return cachedModelChain;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function logGeminiConfigurationOnce(): void {
  if (startupLogged) {
    return;
  }
  startupLogged = true;
  console.info("[gemini] configured:", isGeminiConfigured() ? "yes" : "no");
  const configured = process.env.GEMINI_MODEL?.trim();
  if (configured) {
    console.info(
      "[gemini] GEMINI_MODEL env:",
      normaliseGeminiModelId(configured)
    );
  }
}

/** Throws if the API key is missing (server startup / call guard). */
export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Gemini API key missing");
  }
  return apiKey;
}

export type GeminiGenerateContentInput = {
  parts: Part[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: ResponseSchema;
  };
};

export type GeminiGenerateContentSuccess = {
  ok: true;
  model: string;
  text: string;
};

export type GeminiGenerateContentFailure = {
  ok: false;
  model: string;
  status?: number;
  message: string;
  timedOut: boolean;
};

export type GeminiGenerateContentResult =
  | GeminiGenerateContentSuccess
  | GeminiGenerateContentFailure;

function extractGeminiResponseText(
  response: EnhancedGenerateContentResponse
): string {
  try {
    const direct = response.text()?.trim();
    if (direct) {
      return direct;
    }
  } catch {
    // fall through to part extraction
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const textParts: string[] = [];

  for (const part of parts) {
    if (part && typeof part === "object" && "text" in part) {
      const text = part.text;
      if (typeof text === "string" && text.trim()) {
        textParts.push(text.trim());
      }
    }
  }

  const jsonLike = textParts.find(
    (part) => part.startsWith("{") || part.startsWith("[")
  );
  if (jsonLike) {
    return jsonLike;
  }

  return textParts.join("\n").trim();
}

function extractSdkErrorMessage(error: unknown): string {
  if (error instanceof GoogleGenerativeAIFetchError) {
    const detail = error.errorDetails
      ?.map((item) => JSON.stringify(item))
      .join("; ");
    return [error.message, detail].filter(Boolean).join(" — ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function generateGeminiContentWithFallback(
  input: GeminiGenerateContentInput
): Promise<GeminiGenerateContentResult> {
  logGeminiConfigurationOnce();

  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = await getGeminiModelFallbackChain(apiKey);

  if (modelsToTry.length === 0) {
    return {
      ok: false,
      model: configuredModelLabel(),
      message: "No Gemini models with generateContent support are available.",
      timedOut: false,
    };
  }

  let lastFailure: GeminiGenerateContentFailure | null = null;

  for (let index = 0; index < modelsToTry.length; index++) {
    const restModelName = modelsToTry[index]!;
    const sdkModelName = normaliseGeminiModelId(restModelName);
    const isFallback = index > 0;

    if (isFallback) {
      console.info("[gemini] fallback attempted:", sdkModelName);
    } else {
      console.info("[gemini] model attempted:", sdkModelName);
    }

    const model = genAI.getGenerativeModel({
      model: sdkModelName,
      generationConfig: {
        temperature: input.generationConfig?.temperature ?? 0.2,
        maxOutputTokens: input.generationConfig?.maxOutputTokens ?? 4096,
        responseMimeType:
          input.generationConfig?.responseMimeType ?? "application/json",
        ...(input.generationConfig?.responseSchema
          ? { responseSchema: input.generationConfig.responseSchema }
          : {}),
      },
    });

    try {
      const result = await model.generateContent(input.parts, {
        timeout: GEMINI_REQUEST_TIMEOUT_MS,
      });

      const text = extractGeminiResponseText(result.response);

      if (!text.trim()) {
        lastFailure = {
          ok: false,
          model: sdkModelName,
          status: 200,
          message: "Empty response from Gemini.",
          timedOut: false,
        };
        continue;
      }

      return { ok: true, model: sdkModelName, text };
    } catch (error) {
      const timedOut = error instanceof GoogleGenerativeAIAbortError;
      const status =
        error instanceof GoogleGenerativeAIFetchError ? error.status : undefined;
      const message = extractSdkErrorMessage(error);

      lastFailure = {
        ok: false,
        model: sdkModelName,
        status,
        message,
        timedOut,
      };

      if (timedOut) {
        break;
      }

      const lower = message.toLowerCase();
      const modelUnavailable =
        status === 404 ||
        (lower.includes("not found") && lower.includes("model")) ||
        lower.includes("is not found for api version");

      if (modelUnavailable && index < modelsToTry.length - 1) {
        console.warn(
          `[gemini] model unavailable for ${sdkModelName}, trying next fallback`
        );
        continue;
      }

      if (status === 401 || status === 403) {
        break;
      }

      if (modelUnavailable) {
        continue;
      }

      break;
    }
  }

  return (
    lastFailure ?? {
      ok: false,
      model: configuredModelLabel(),
      message: "Gemini request failed.",
      timedOut: false,
    }
  );
}

function configuredModelLabel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (configured) {
    return normaliseGeminiModelId(configured);
  }
  return normaliseGeminiModelId(DEFAULT_GEMINI_MODEL);
}

export function getGeminiSdkFailureDiagnostics(error: unknown): {
  status?: number;
  message: string;
  timedOut: boolean;
} {
  if (error instanceof GoogleGenerativeAIAbortError) {
    return { message: error.message, timedOut: true };
  }
  if (error instanceof GoogleGenerativeAIFetchError) {
    return {
      status: error.status,
      message: extractSdkErrorMessage(error),
      timedOut: false,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, timedOut: false };
  }
  return { message: String(error), timedOut: false };
}
