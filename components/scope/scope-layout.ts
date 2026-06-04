/** Scope tab: document navigator | drawing viewer | context panel */
export const SCOPE_WORKSPACE_BODY_CLASS =
  "flex h-[min(820px,calc(100vh-13rem))] min-h-[640px] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-background";

export const SCOPE_NAVIGATOR_COLUMN_CLASS =
  "flex h-full w-[250px] shrink-0 flex-col overflow-hidden border-r border-border bg-card";

export const SCOPE_DRAWING_COLUMN_CLASS =
  "relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-muted/5";

export const SCOPE_CONTEXT_COLUMN_CLASS =
  "flex h-full w-[min(360px,32vw)] min-w-[300px] shrink-0 flex-col overflow-hidden border-l border-border bg-card";

/** Fullscreen overlay — drawing + context (no document navigator). */
export const SCOPE_FULLSCREEN_BODY_CLASS =
  "flex h-full min-h-0 flex-1 overflow-hidden";

export const SCOPE_FULLSCREEN_DRAWING_COLUMN_CLASS =
  "relative flex h-full min-h-0 min-w-0 flex-[0.76] flex-col overflow-hidden";

export const SCOPE_FULLSCREEN_CONTEXT_COLUMN_CLASS =
  "flex h-full min-h-0 min-w-0 flex-[0.24] flex-col overflow-hidden border-l border-border bg-card";
