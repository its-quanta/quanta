"use client";

import { ScopeReviewView, type ScopeWorkspaceProps } from "@/components/scope/scope-review-view";

export type { ScopeWorkspaceProps };

export function ScopeWorkspace(props: ScopeWorkspaceProps) {
  return <ScopeReviewView {...props} />;
}
