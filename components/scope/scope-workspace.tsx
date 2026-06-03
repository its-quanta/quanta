"use client";

import { ScopeReviewView, type ScopeWorkspaceProps } from "@/components/scope/scope-review-view";

export type { ScopeWorkspaceProps };

export function ScopeWorkspace(props: ScopeWorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ScopeReviewView {...props} />
    </div>
  );
}
