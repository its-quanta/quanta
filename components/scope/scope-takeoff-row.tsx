"use client";

import { memo, useMemo } from "react";

import { InlineEditCell } from "@/components/bulk-operations/inline-edit-cell";
import { ScopeTakeoffReadinessBadge } from "@/components/scope/scope-takeoff-readiness-badge";
import type { ScopeTakeoffReadiness } from "@/components/scope/scope-takeoff-readiness";
import { formatTakeoffSourceRef } from "@/components/scope/scope-review-utils";
import { cn } from "@/lib/utils";
import { updateTakeoffItemAction } from "@/src/lib/takeoff/actions";
import type { TakeoffItem } from "@/src/types/database";

export type ScopeTakeoffRowProps = {
  item: TakeoffItem;
  documentName: string | null;
  selected: boolean;
  readiness: ScopeTakeoffReadiness;
  projectId: string;
  onSelect: (itemId: string) => void;
  onItemUpdated: (itemId: string, patch: Partial<TakeoffItem>) => void;
};

export const ScopeTakeoffRow = memo(function ScopeTakeoffRow({
  item,
  documentName,
  selected,
  readiness,
  projectId,
  onSelect,
  onItemUpdated,
}: ScopeTakeoffRowProps) {
  const sourceRef = useMemo(
    () =>
      formatTakeoffSourceRef(item, documentName, {
        includePage: !selected,
      }),
    [item, documentName, selected]
  );

  const description =
    item.description?.trim() || item.item_name?.trim() || "Untitled line";

  async function saveField(patch: Parameters<typeof updateTakeoffItemAction>[2]) {
    const result = await updateTakeoffItemAction(item.id, projectId, patch);
    if (!result.error) {
      onItemUpdated(item.id, patch as Partial<TakeoffItem>);
    }
    return result;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "box-border flex max-h-[6.75rem] min-h-[6.75rem] cursor-pointer flex-col overflow-hidden rounded-md border px-2.5 py-2",
        selected
          ? "border-sky-400/80 bg-sky-50/90 dark:border-sky-500/50 dark:bg-sky-950/30"
          : "border-border bg-card hover:border-border/80 hover:bg-muted/10"
      )}
      onClick={() => onSelect(item.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item.id);
        }
      }}
    >
      <div
        className="flex min-h-0 min-w-0 items-start gap-1.5"
        onClick={(event) => event.stopPropagation()}
      >
        <InlineEditCell
          value={description}
          className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground"
          inputClassName="text-sm"
          onSave={async (value) => {
            const text = String(value).trim();
            if (!text) {
              return { error: "Description is required." };
            }
            return saveField({
              description: text,
              item_name: text,
            });
          }}
        />
        <ScopeTakeoffReadinessBadge readiness={readiness} />
      </div>

      <div
        className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        <InlineEditCell
          value={item.trade}
          className="max-w-[5.5rem] shrink-0 truncate"
          onSave={async (value) =>
            saveField({ trade: String(value).trim() || "General" })
          }
        />
        <span className="shrink-0" aria-hidden>
          ·
        </span>
        <InlineEditCell
          value={String(item.quantity)}
          align="right"
          type="number"
          className="w-14 shrink-0 font-mono tabular-nums"
          parse={(raw) => {
            const parsed = Number(raw);
            if (Number.isNaN(parsed) || parsed < 0) {
              return null;
            }
            return parsed;
          }}
          onSave={async (value) => saveField({ quantity: Number(value) })}
        />
        <InlineEditCell
          value={item.unit}
          className="w-12 shrink-0 font-mono uppercase"
          onSave={async (value) =>
            saveField({ unit: String(value).trim() || "each" })
          }
        />
      </div>

      <div
        className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        <InlineEditCell
          value={item.drawing_reference?.trim() ?? ""}
          displayValue={item.drawing_reference?.trim() || "Drawing ref"}
          className="min-w-0 max-w-[42%] truncate"
          onSave={async (value) =>
            saveField({
              drawing_reference: String(value).trim() || null,
            })
          }
        />
        <span className="shrink-0" aria-hidden>
          ·
        </span>
        <InlineEditCell
          value={item.page_number != null ? String(item.page_number) : ""}
          displayValue={
            item.page_number != null ? `p. ${item.page_number}` : "Page"
          }
          className="w-12 shrink-0 font-mono tabular-nums"
          type="number"
          parse={(raw) => {
            if (!raw.trim()) {
              return null;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed) || parsed <= 0) {
              return null;
            }
            return parsed;
          }}
          onSave={async (value) =>
            saveField({
              page_number:
                value === null || value === "" ? null : Number(value),
            })
          }
        />
        <span className="min-w-0 flex-1 truncate" title={sourceRef}>
          {sourceRef}
        </span>
      </div>
    </div>
  );
});
