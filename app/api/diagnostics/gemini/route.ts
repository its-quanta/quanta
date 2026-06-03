import { NextResponse } from "next/server";

import { runGeminiDiagnostic } from "@/src/lib/server/gemini-diagnostics";

/** Temporary Gemini connectivity diagnostic — remove when debugging is complete. */
export async function GET() {
  const result = await runGeminiDiagnostic();

  return NextResponse.json(result, {
    status: result.textTestSuccess ? 200 : 503,
  });
}
