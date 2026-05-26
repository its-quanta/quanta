type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function logClarificationError(
  context: string,
  error: SupabaseLikeError
): void {
  console.error(
    `[tender_clarifications] ${context}:`,
    error.message,
    error.details ?? "",
    error.hint ?? "",
    error.code ?? ""
  );
}

export function userFacingClarificationError(error: SupabaseLikeError): string {
  const message = error.message ?? "Unknown error";

  if (
    /could not find the table|schema cache|PGRST205/i.test(message)
  ) {
    return "Clarifications are not available. Ensure tender_clarifications exists in Supabase.";
  }

  if (/column/i.test(message)) {
    return "Could not save clarification. Database columns may not match the app — check tender_clarifications schema.";
  }

  if (/row-level security|permission denied|42501/i.test(message)) {
    return "You do not have permission to save clarifications for this project.";
  }

  if (/foreign key|violates foreign key/i.test(message)) {
    return "Linked takeoff or project could not be found.";
  }

  return "Could not save clarification. Try again or refresh the page.";
}
