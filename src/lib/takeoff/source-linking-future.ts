/**
 * Future AI takeoff source fields — not persisted in MVP.
 *
 * When implementing AI takeoff review, add columns to `takeoff_items` (example):
 *
 * ```sql
 * alter table public.takeoff_items
 *   add column if not exists ai_source_confidence numeric check (ai_source_confidence >= 0 and ai_source_confidence <= 1),
 *   add column if not exists source_bounding_box jsonb,
 *   add column if not exists source_page_coordinates jsonb,
 *   add column if not exists ai_extracted_text text,
 *   add column if not exists source_reasoning text;
 * ```
 *
 * `source_bounding_box` — normalised region on page (x, y, width, height) for highlight overlay.
 * `source_page_coordinates` — PDF point space or canvas coords for future page jump + highlight.
 */

/** Placeholder shape for AI-enriched source metadata (not stored yet). */
export type TakeoffSourceAiMetadata = {
  ai_source_confidence: number | null;
  source_bounding_box: SourceBoundingBox | null;
  source_page_coordinates: SourcePageCoordinates | null;
  ai_extracted_text: string | null;
  source_reasoning: string | null;
};

export type SourceBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Page index (1-based) when bounding box is page-scoped. */
  page_number?: number;
};

export type SourcePageCoordinates = {
  page_number: number;
  /** PDF user space or normalised points — define when implementing navigation. */
  points?: { x: number; y: number }[];
};
