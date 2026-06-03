import "server-only";

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";

import {
  fetchAvailableGenerateContentModels,
  getGeminiModelFallbackChain,
  normaliseGeminiModelId,
} from "@/src/lib/server/gemini";

const TEXT_TEST_TIMEOUT_MS = 30_000;

export const GEMINI_TEXT_TEST_FAILED_MESSAGE =
  "Gemini text request failed. Check billing, quota, API key, or model access.";

export const GEMINI_TEXT_TEST_SUCCESS_MESSAGE =
  "Gemini text request works. PDF payload/debugging is next.";

export type GeminiDiagnosticResult = {
  configured: boolean;
  availableModels: string[];
  selectedModel: string | null;
  textTestSuccess: boolean;
  errorStatus: number | null;
  errorMessage: string | null;
  diagnosticMessage: string;
};

async function runTextOnlyGenerateContentTest(
  apiKey: string,
  modelId: string
): Promise<
  | { ok: true; responseText: string }
  | { ok: false; status: number | null; message: string }
> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: normaliseGeminiModelId(modelId),
  });

  try {
    const result = await model.generateContent("Respond only with OK", {
      timeout: TEXT_TEST_TIMEOUT_MS,
    });
    const responseText = result.response.text().trim();
    return { ok: true, responseText };
  } catch (error) {
    if (error instanceof GoogleGenerativeAIAbortError) {
      return { ok: false, status: 408, message: error.message };
    }
    if (error instanceof GoogleGenerativeAIFetchError) {
      return {
        ok: false,
        status: error.status ?? null,
        message: error.message,
      };
    }
    if (error instanceof Error) {
      return { ok: false, status: null, message: error.message };
    }
    return { ok: false, status: null, message: String(error) };
  }
}

export async function runGeminiDiagnostic(): Promise<GeminiDiagnosticResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const configured = Boolean(apiKey);

  if (!configured || !apiKey) {
    return {
      configured: false,
      availableModels: [],
      selectedModel: null,
      textTestSuccess: false,
      errorStatus: null,
      errorMessage: "GEMINI_API_KEY is not set.",
      diagnosticMessage: GEMINI_TEXT_TEST_FAILED_MESSAGE,
    };
  }

  console.info("[gemini-diagnostics] starting (api key present, not logged)");

  const modelsList = await fetchAvailableGenerateContentModels(apiKey);

  if (!modelsList.ok) {
    console.error("[gemini-diagnostics] models_list_failed", {
      status: modelsList.status,
      messagePreview: modelsList.message.slice(0, 500),
    });
    return {
      configured: true,
      availableModels: [],
      selectedModel: null,
      textTestSuccess: false,
      errorStatus: modelsList.status,
      errorMessage: modelsList.message,
      diagnosticMessage: GEMINI_TEXT_TEST_FAILED_MESSAGE,
    };
  }

  const availableModels = modelsList.models.map(normaliseGeminiModelId);
  const modelChain = await getGeminiModelFallbackChain(apiKey);
  const selectedModel = modelChain[0]
    ? normaliseGeminiModelId(modelChain[0])
    : null;

  if (!selectedModel) {
    return {
      configured: true,
      availableModels,
      selectedModel: null,
      textTestSuccess: false,
      errorStatus: null,
      errorMessage: "No models with generateContent support were returned.",
      diagnosticMessage: GEMINI_TEXT_TEST_FAILED_MESSAGE,
    };
  }

  console.info("[gemini-diagnostics] selected model:", selectedModel);

  const textTest = await runTextOnlyGenerateContentTest(apiKey, selectedModel);

  if (!textTest.ok) {
    console.error("[gemini-diagnostics] text_test_failed", {
      model: selectedModel,
      status: textTest.status,
      messagePreview: textTest.message.slice(0, 500),
    });
    return {
      configured: true,
      availableModels,
      selectedModel,
      textTestSuccess: false,
      errorStatus: textTest.status,
      errorMessage: textTest.message,
      diagnosticMessage: GEMINI_TEXT_TEST_FAILED_MESSAGE,
    };
  }

  const textTestSuccess = textTest.responseText.length > 0;

  if (!textTestSuccess) {
    return {
      configured: true,
      availableModels,
      selectedModel,
      textTestSuccess: false,
      errorStatus: 200,
      errorMessage: "Model returned an empty response.",
      diagnosticMessage: GEMINI_TEXT_TEST_FAILED_MESSAGE,
    };
  }

  console.info("[gemini-diagnostics] text_test_ok", {
    model: selectedModel,
    responsePreview: textTest.responseText.slice(0, 50),
  });

  return {
    configured: true,
    availableModels,
    selectedModel,
    textTestSuccess: true,
    errorStatus: null,
    errorMessage: null,
    diagnosticMessage: GEMINI_TEXT_TEST_SUCCESS_MESSAGE,
  };
}
