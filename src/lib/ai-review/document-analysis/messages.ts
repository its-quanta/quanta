export const ANALYSIS_ERRORS = {
  noDocumentSelected: "Select a document first.",
  noPagesSelected: "Select pages to analyse.",
  tooManyPages: "Select 10 pages or fewer for this release.",
  unsupportedFileType: "Unsupported file type. Use PDF, PNG, or JPG.",
  storagePathMissing: "Storage path missing. Re-upload this document.",
  couldNotDownload: "Could not download document.",
  couldNotExtractPages: "Could not extract selected pages.",
  pageRangeOutsideDocument: "Selected page range is outside this document.",
  geminiKeyMissing: "Gemini API key missing.",
  geminiKeyInvalid: "Gemini API key invalid.",
  geminiModelUnavailable:
    "Gemini model unavailable. Check GEMINI_MODEL in .env.local or use a model available to your API key.",
  pdfNotPrepared: "Selected PDF pages could not be prepared.",
  batchEmpty: "Selected page batch is empty.",
  geminiFormatRejected: "Gemini rejected the document format.",
  geminiTimeout: "Gemini request timed out. Try fewer pages.",
  geminiParseFailed:
    "Gemini response could not be parsed into review suggestions.",
  geminiAnalysisFailedWithLogs:
    "Gemini analysis failed. Check server logs for details.",
  emptySuggestions:
    "Analysis completed, but no review suggestions were found. Try selecting more relevant pages such as floor plans, schedules, or specifications.",
  batchTooLarge:
    "Selected batch is too large (25 MB limit). Select fewer pages.",
  selectPagesForLargeFile:
    "This file is too large to analyse in full. Select specific pages to analyse.",
} as const;
