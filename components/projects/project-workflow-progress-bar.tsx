"use client";

import { cn } from "@/lib/utils";
import type { WorkspaceStepStatus } from "@/src/lib/projects/workspace-steps";
import type { WorkspaceTabValue } from "@/src/lib/scope-gaps/types";

const STEP_TAB: Record<string, WorkspaceTabValue> = {
  documents: "documents",
  scope: "scope",
  estimate: "estimate",
  commercial: "commercial",
  submit: "submission",
};

type ProjectWorkflowProgressBarProps = {
  steps: WorkspaceStepStatus[];
  activeTab: WorkspaceTabValue;
  onNavigateStep: (tab: WorkspaceTabValue) => void;
};

export function ProjectWorkflowProgressBar({
  steps,
  activeTab,
  onNavigateStep,
}: ProjectWorkflowProgressBarProps) {
  return (
    <nav
      aria-label="Estimator workflow"
      className="rounded-lg border border-border bg-card px-3 py-3 sm:px-4"
    >
      <ol className="grid gap-3 sm:grid-cols-5">
        {steps.map((step, index) => {
          const tab = STEP_TAB[step.id];
          const isActive = tab === activeTab;

          const statusLabel =
            step.status === "complete"
              ? "Complete"
              : step.status === "blocked"
                ? "Blocked"
                : step.status === "in_progress"
                  ? "In progress"
                  : "Not started";

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                onClick={() => tab && onNavigateStep(tab)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left transition-colors",
                  isActive
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : "hover:bg-muted/50"
                )}
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] tabular-nums",
                      step.status === "complete" &&
                        "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
                      step.status === "blocked" &&
                        "border-destructive/30 bg-destructive/5 text-destructive",
                      step.status !== "complete" &&
                        step.status !== "blocked" &&
                        "border-border bg-muted/30"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="font-medium text-foreground">{step.label}</span>
                </span>
                <div className="pl-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {step.progressPercent !== null
                        ? `${Math.round(step.progressPercent)}%`
                        : "—"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        step.status === "complete" &&
                          "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
                        step.status === "blocked" &&
                          "border-destructive/30 bg-destructive/5 text-destructive",
                        step.status === "in_progress" &&
                          "border-amber-500/30 bg-amber-500/10 text-amber-900",
                        step.status === "not_started" &&
                          "border-border bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {statusLabel}
                    </span>
                    {step.issueCount !== null && step.issueCount > 0 ? (
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {step.issueCount} issue{step.issueCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground">
                    {step.detail}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
