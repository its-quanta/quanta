"use client";

import { memo } from "react";

import { InlineEditCell } from "@/components/bulk-operations/inline-edit-cell";
import {
  formatDrawingRefLine,
  resolveSuggestionDrawingRef,
  resolveTakeoffDrawingRef,
} from "@/components/scope/scope-drawing-references";
import { ScopeTakeoffReadinessBadge } from "@/components/scope/scope-takeoff-readiness-badge";
import type { ScopeTakeoffReadiness } from "@/components/scope/scope-takeoff-readiness";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_REVIEW_STATUS_LABELS } from "@/src/lib/ai-review/constants";
import { formatQuantity } from "@/src/lib/format";
import { updateTakeoffItemAction } from "@/src/lib/takeoff/actions";
import type {
  AiReviewItem,
  Document,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ScopeSelectedItemInspectorProps = {
  projectId: string;
  documentsById: ReadonlyMap<string, Document>;
  suggestion: AiReviewItem | null;
  takeoff: TakeoffItem | null;
  takeoffAssembly: TakeoffItemAssemblyWithPackage | null;
  takeoffReadiness: ScopeTakeoffReadiness | null;
  actionPending: boolean;
  onAccept: () => void;
  onAdjust: () => void;
  onReject: () => void;
  onTakeoffUpdated: (itemId: string, patch: Partial<TakeoffItem>) => void;
};

function InspectorField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-foreground">{children}</dd>
    </div>
  );
}

export const ScopeSelectedItemInspector = memo(function ScopeSelectedItemInspector({
  projectId,
  documentsById,
  suggestion,
  takeoff,
  takeoffAssembly,
  takeoffReadiness,
  actionPending,
  onAccept,
  onAdjust,
  onReject,
  onTakeoffUpdated,
}: ScopeSelectedItemInspectorProps) {
  if (!suggestion && !takeoff) {
    return (
      <div className="flex h-full min-h-[10rem] flex-col items-center justify-center border-t border-border px-4 py-6 text-center">
        <p className="text-sm font-medium text-foreground">No item selected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a suggestion or takeoff line to inspect drawing context and details.
        </p>
      </div>
    );
  }

  if (suggestion) {
    const ref = resolveSuggestionDrawingRef(suggestion, documentsById);
    return (
      <div className="flex min-h-0 flex-col border-t border-border">
        <div className="shrink-0 border-b border-border px-3 py-2">
          <h3 className="text-xs font-semibold text-foreground">Selected suggestion</h3>
          <p className="text-[10px] text-muted-foreground">{formatDrawingRefLine(ref)}</p>
        </div>
        <dl className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto px-3 py-2">
          <InspectorField label="Description" className="col-span-2">
            <span className="line-clamp-3">{suggestion.description}</span>
          </InspectorField>
          <InspectorField label="Trade">{suggestion.trade}</InspectorField>
          <InspectorField label="Quantity">
            <span className="font-mono tabular-nums">
              {formatQuantity(suggestion.quantity)} {suggestion.unit}
            </span>
          </InspectorField>
          <InspectorField label="Drawing number">
            <span className="font-mono">{ref.drawing_number ?? "—"}</span>
          </InspectorField>
          <InspectorField label="Drawing name">
            <span className="truncate">{ref.drawing_name ?? "—"}</span>
          </InspectorField>
          <InspectorField label="Page">
            <span className="font-mono tabular-nums">
              {ref.page_number ?? "—"}
            </span>
          </InspectorField>
          <InspectorField label="Package">
            <span className="text-muted-foreground">—</span>
          </InspectorField>
          <InspectorField label="Status">
            {AI_REVIEW_STATUS_LABELS[suggestion.status]}
          </InspectorField>
        </dl>
        <div className="flex shrink-0 gap-1.5 border-t border-border px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 flex-1 text-xs"
            disabled={actionPending}
            onClick={onReject}
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 flex-1 text-xs"
            disabled={actionPending}
            onClick={onAdjust}
          >
            Adjust
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={actionPending}
            onClick={onAccept}
          >
            Accept
          </Button>
        </div>
      </div>
    );
  }

  if (!takeoff) {
    return null;
  }

  const ref = resolveTakeoffDrawingRef(takeoff, documentsById);

  async function saveTakeoff(
    patch: Parameters<typeof updateTakeoffItemAction>[2]
  ) {
    const result = await updateTakeoffItemAction(takeoff!.id, projectId, patch);
    if (!result.error) {
      onTakeoffUpdated(takeoff!.id, patch as Partial<TakeoffItem>);
    }
    return result;
  }

  return (
    <div className="flex min-h-0 flex-col border-t border-border">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-foreground">Selected takeoff</h3>
          {takeoffReadiness ? (
            <ScopeTakeoffReadinessBadge readiness={takeoffReadiness} />
          ) : null}
        </div>
        <p className="text-[10px] text-muted-foreground">{formatDrawingRefLine(ref)}</p>
      </div>
      <dl className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto px-3 py-2">
        <InspectorField label="Description" className="col-span-2">
          <InlineEditCell
            value={takeoff.description?.trim() || takeoff.item_name}
            className="text-xs"
            onSave={async (value) => {
              const text = String(value).trim();
              if (!text) {
                return { error: "Description is required." };
              }
              return saveTakeoff({ description: text, item_name: text });
            }}
          />
        </InspectorField>
        <InspectorField label="Trade">
          <InlineEditCell
            value={takeoff.trade}
            onSave={async (value) =>
              saveTakeoff({ trade: String(value).trim() || "General" })
            }
          />
        </InspectorField>
        <InspectorField label="Quantity">
          <InlineEditCell
            value={String(takeoff.quantity)}
            type="number"
            className="font-mono tabular-nums"
            parse={(raw) => {
              const parsed = Number(raw);
              return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
            }}
            onSave={async (value) => saveTakeoff({ quantity: Number(value) })}
          />
        </InspectorField>
        <InspectorField label="Unit">
          <InlineEditCell
            value={takeoff.unit}
            onSave={async (value) =>
              saveTakeoff({ unit: String(value).trim() || "each" })
            }
          />
        </InspectorField>
        <InspectorField label="Drawing number">
          <InlineEditCell
            value={ref.drawing_number ?? ""}
            displayValue={ref.drawing_number ?? "—"}
            className="font-mono"
            onSave={async (value) =>
              saveTakeoff({
                drawing_reference: String(value).trim() || null,
              })
            }
          />
        </InspectorField>
        <InspectorField label="Drawing name">
          <span className="truncate">{ref.drawing_name ?? "—"}</span>
        </InspectorField>
        <InspectorField label="Page">
          <InlineEditCell
            value={takeoff.page_number != null ? String(takeoff.page_number) : ""}
            displayValue={
              takeoff.page_number != null ? String(takeoff.page_number) : "—"
            }
            type="number"
            className="font-mono tabular-nums"
            parse={(raw) => {
              if (!raw.trim()) {
                return null;
              }
              const parsed = Number(raw);
              return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
            }}
            onSave={async (value) =>
              saveTakeoff({
                page_number:
                  value === null || value === "" ? null : Number(value),
              })
            }
          />
        </InspectorField>
        <InspectorField label="Package">
          {takeoffAssembly?.assembly_package.name ?? (
            <span className="text-muted-foreground">Not applied</span>
          )}
        </InspectorField>
        <InspectorField label="Status">{takeoff.status.replace(/_/g, " ")}</InspectorField>
      </dl>
    </div>
  );
});
