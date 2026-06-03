const RAW_LOG_MAX_LENGTH = 4_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GeminiSuggestion = {
  trade: string;
  description: string;
  quantity: number;
  unit: string;
  reasoning: string | null;
  confidence: number | null;
  source_document_id: string | null;
  page_number: number | null;
  drawing_reference: string | null;
  sheet_number: string | null;
};

export type ParseGeminiSuggestionsDebug = {
  rawTextLength: number;
  jsonParsed: boolean;
  suggestionsParsed: number;
  parseStrategy: string;
  dropped: Array<{ index: number; reason: string }>;
};

export type ParseGeminiSuggestionsResult =
  | { ok: true; suggestions: GeminiSuggestion[]; debug: ParseGeminiSuggestionsDebug }
  | { ok: false; rawText: string; debug: ParseGeminiSuggestionsDebug };

function clampConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return null;
  }
  if (n > 1) {
    return Math.max(0, Math.min(1, n / 100));
  }
  return Math.max(0, Math.min(1, n));
}

function safeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str ? str : null;
}

function safeQuantity(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) {
    return 0;
  }
  return n;
}

function safeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function safePageNumber(value: unknown): number | null {
  const n = safeNullableNumber(value);
  if (n == null || n <= 0) {
    return null;
  }
  return Math.floor(n);
}

function repairJsonText(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();

  const inlineBlock = cleaned.match(/```(?:json)?\s*\n([\s\S]*?)\n```/i);
  if (inlineBlock?.[1]) {
    return inlineBlock[1].trim();
  }

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
    cleaned = cleaned.replace(/\n?```\s*$/i, "");
  }

  return cleaned.trim();
}

function extractBalancedSegment(
  text: string,
  openChar: "{" | "[",
  closeChar: "}" | "]",
  startIndex: number
): string | null {
  if (text[startIndex] !== openChar) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

function extractJsonObject(text: string): string | null {
  const objStart = text.indexOf("{");
  if (objStart < 0) {
    return null;
  }
  return extractBalancedSegment(text, "{", "}", objStart);
}

function extractJsonArray(text: string): string | null {
  const arrStart = text.indexOf("[");
  if (arrStart < 0) {
    return null;
  }
  return extractBalancedSegment(text, "[", "]", arrStart);
}

function tryParseJson(text: string): unknown | undefined {
  const attempts = [text.trim(), repairJsonText(text)];

  for (const candidate of attempts) {
    if (!candidate) {
      continue;
    }
    try {
      return JSON.parse(candidate);
    } catch {
      // try next repair pass
    }
  }

  return undefined;
}

function unwrapJsonStrings(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const direct = tryParseJson(trimmed);
  if (direct !== undefined) {
    return unwrapJsonStrings(direct, depth + 1);
  }

  const objectSlice = extractJsonObject(trimmed);
  if (objectSlice) {
    const fromObject = tryParseJson(objectSlice);
    if (fromObject !== undefined) {
      return unwrapJsonStrings(fromObject, depth + 1);
    }
  }

  const arraySlice = extractJsonArray(trimmed);
  if (arraySlice) {
    const fromArray = tryParseJson(arraySlice);
    if (fromArray !== undefined) {
      return unwrapJsonStrings(fromArray, depth + 1);
    }
  }

  return value;
}

function buildJsonCandidates(text: string): string[] {
  const trimmed = text.trim();
  const unfenced = stripMarkdownFences(text);
  const candidates = new Set<string>();

  for (const base of [trimmed, unfenced, repairJsonText(trimmed), repairJsonText(unfenced)]) {
    if (!base) {
      continue;
    }
    candidates.add(base);
    const objectSlice = extractJsonObject(base);
    if (objectSlice) {
      candidates.add(objectSlice);
    }
    const arraySlice = extractJsonArray(base);
    if (arraySlice) {
      candidates.add(arraySlice);
    }
  }

  return [...candidates];
}

function parseJsonPayload(text: string): unknown | undefined {
  for (const candidate of buildJsonCandidates(text)) {
    const parsed = tryParseJson(candidate);
    if (parsed !== undefined) {
      return unwrapJsonStrings(parsed);
    }
  }

  return undefined;
}

function resolveDescription(record: Record<string, unknown>): string | null {
  return (
    safeString(record.description) ??
    safeString(record.item_name) ??
    safeString(record.name) ??
    safeString(record.title)
  );
}

function extractSuggestionsArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase();
    if (lower === "suggestions" || lower === "items" || lower === "results") {
      const value = record[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const nested = extractSuggestionsArray(value);
    if (nested) {
      return nested;
    }
  }

  if (resolveDescription(record)) {
    return [parsed];
  }

  return null;
}

function parseObjectSegments(containerText: string): unknown[] {
  const items: unknown[] = [];
  let index = 0;

  while (index < containerText.length) {
    const start = containerText.indexOf("{", index);
    if (start < 0) {
      break;
    }

    const segment = extractBalancedSegment(containerText, "{", "}", start);
    if (!segment) {
      break;
    }

    const parsed = tryParseJson(segment);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      items.push(parsed);
    }

    index = start + segment.length;
  }

  return items;
}

function extractSuggestionsArrayFromRawText(text: string): unknown[] | null {
  const cleaned = stripMarkdownFences(repairJsonText(text));

  for (const marker of ["suggestions", "items", "results"] as const) {
    const pattern = new RegExp(`"${marker}"\\s*:`, "i");
    const match = pattern.exec(cleaned);
    if (!match || match.index == null) {
      continue;
    }

    const arrayStart = cleaned.indexOf("[", match.index);
    if (arrayStart < 0) {
      continue;
    }

    const arraySegment = extractBalancedSegment(cleaned, "[", "]", arrayStart);
    if (!arraySegment) {
      const partialItems = parseObjectSegments(cleaned.slice(arrayStart));
      return partialItems.length > 0 ? partialItems : null;
    }

    const parsedArray = tryParseJson(arraySegment);
    if (Array.isArray(parsedArray)) {
      return parsedArray;
    }

    const lenientItems = parseObjectSegments(arraySegment.slice(1, -1));
    if (lenientItems.length > 0) {
      return lenientItems;
    }
  }

  const topLevelArray = extractJsonArray(cleaned);
  if (topLevelArray) {
    const parsedArray = tryParseJson(topLevelArray);
    if (Array.isArray(parsedArray)) {
      return parsedArray;
    }
    const lenientItems = parseObjectSegments(topLevelArray.slice(1, -1));
    if (lenientItems.length > 0) {
      return lenientItems;
    }
  }

  return null;
}

function resolveSourceDocumentId(
  value: unknown,
  fallbackDocumentId?: string
): string | null {
  const candidate = safeString(value);
  if (candidate && UUID_RE.test(candidate)) {
    return candidate;
  }
  return fallbackDocumentId ?? null;
}

function normaliseSuggestions(
  list: unknown[],
  fallbackDocumentId?: string
): { suggestions: GeminiSuggestion[]; dropped: Array<{ index: number; reason: string }> } {
  const dropped: Array<{ index: number; reason: string }> = [];
  const suggestions: GeminiSuggestion[] = [];

  list.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      dropped.push({ index, reason: "not_an_object" });
      return;
    }

    const record = raw as Record<string, unknown>;
    const description = resolveDescription(record);
    if (!description) {
      dropped.push({ index, reason: "missing_description" });
      return;
    }

    suggestions.push({
      trade: safeString(record.trade) ?? "General",
      description,
      quantity: safeQuantity(record.quantity),
      unit: safeString(record.unit) ?? "item",
      reasoning: safeString(record.reasoning),
      confidence: clampConfidence(record.confidence),
      source_document_id: resolveSourceDocumentId(
        record.source_document_id,
        fallbackDocumentId
      ),
      page_number: safePageNumber(record.page_number),
      drawing_reference: safeString(record.drawing_reference),
      sheet_number: safeString(record.sheet_number),
    });
  });

  return { suggestions, dropped };
}

/** Redact URLs and secrets before logging raw Gemini output. */
export function sanitizeGeminiRawForLog(rawText: string): string {
  return rawText
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[url-redacted]")
    .replace(/\bAIza[0-9A-Za-z\-_]{20,}\b/g, "[api-key-redacted]")
    .slice(0, RAW_LOG_MAX_LENGTH);
}

export function parseGeminiSuggestions(
  rawText: string,
  fallbackDocumentId?: string
): ParseGeminiSuggestionsResult {
  const trimmed = rawText.trim();
  const debugBase: ParseGeminiSuggestionsDebug = {
    rawTextLength: trimmed.length,
    jsonParsed: false,
    suggestionsParsed: 0,
    parseStrategy: "none",
    dropped: [],
  };

  if (!trimmed) {
    return { ok: false, rawText: trimmed, debug: debugBase };
  }

  let list: unknown[] | null = null;
  let parseStrategy = "none";

  const parsed = parseJsonPayload(trimmed);
  if (parsed !== undefined) {
    debugBase.jsonParsed = true;
    list = extractSuggestionsArray(parsed);
    if (list) {
      parseStrategy = "json_payload";
    }
  }

  if (!list) {
    list = extractSuggestionsArrayFromRawText(trimmed);
    if (list) {
      parseStrategy = debugBase.jsonParsed
        ? "raw_suggestions_array_fallback"
        : "raw_suggestions_array";
      debugBase.jsonParsed = true;
    }
  }

  if (!list) {
    return { ok: false, rawText: trimmed, debug: debugBase };
  }

  const normalised = normaliseSuggestions(list, fallbackDocumentId);

  debugBase.parseStrategy = parseStrategy;
  debugBase.suggestionsParsed = normalised.suggestions.length;
  debugBase.dropped = normalised.dropped;

  return {
    ok: true,
    suggestions: normalised.suggestions,
    debug: debugBase,
  };
}
