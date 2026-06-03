export const ANALYSIS_ERRORS = {
  noDocumentSelected: "Select a document first.",
  noPagesSelected: "Select pages to analyse.",
  tooManyPages: "Select 10 pages or fewer for this release.",
  unsupportedFileType: "Unsupported file type. Use PDF, PNG, or JPG.",
  storagePathMissing: "Storage path missing. Re-upload this document.",
  couldNotDownload: "Could not download document.",
  couldNotExtractPages: "Could not extract selected pages.",
  pdfExtractionFailed: "PDF extraction failed.",
  uploadFailed: "Upload failed. Try again.",
  previewFailed: "Preview failed.",
  analysisFailed: "Analysis failed.",
  suggestionsSaveFailed:
    "Gemini returned suggestions, but Quanta could not save them. Try again or re-run analysis.",
  analysisSessionExpired:
    "Your session expired before analysis could finish. Sign in again and retry.",
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
    "Gemini responded, but Quanta could not read the response. Try one page or a more specific trade focus.",
  geminiInvalidResponse: "Gemini returned invalid response.",
  geminiRequestFailed: "Gemini request failed. Check server logs for details.",
  geminiAnalysisFailedWithLogs:
    "Gemini request failed. Check server logs for details.",
  emptySuggestions:
    "Analysis completed, but no suggestions were found.",
  batchTooLarge:
    "Selected batch is too large (25 MB limit). Select fewer pages.",
  selectPagesForLargeFile:
    "This file is too large to analyse in full. Select specific pages to analyse.",
} as const;
