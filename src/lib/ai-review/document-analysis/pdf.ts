import { PDFDocument } from "pdf-lib";

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

/** Extract 1-based page numbers into a new PDF byte array. */
export async function extractPdfPages(
  bytes: Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = source.getPageCount();
  const indices = [
    ...new Set(
      pageNumbers
        .map((page) => page - 1)
        .filter((index) => index >= 0 && index < total)
    ),
  ].sort((a, b) => a - b);

  if (indices.length === 0) {
    throw new Error("Selected page range is outside this document.");
  }

  if (indices.length < pageNumbers.length) {
    throw new Error("Selected page range is outside this document.");
  }

  const target = await PDFDocument.create();
  const copied = await target.copyPages(source, indices);
  for (const page of copied) {
    target.addPage(page);
  }

  return target.save();
}

export function isPdfMimeType(mimeType: string | null | undefined): boolean {
  return (mimeType ?? "").toLowerCase() === "application/pdf";
}
