"use client";

import { memo, useMemo } from "react";

import { ScopeTakeoffCompactRow } from "@/components/scope/scope-takeoff-compact-row";
import { resolveScopeTakeoffReadiness } from "@/components/scope/scope-takeoff-readiness";
import { VirtualList } from "@/components/ui/virtual-list";
import type {
  Document,
  PricingItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

export type ScopeTakeoffQueueProps = {
  items: TakeoffItem[];
  visibleItems: TakeoffItem[];
  selectedItemId: string | null;
  documentsById: ReadonlyMap<string, Document>;
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  pricingItems: PricingItem[];
  onSelectItem: (itemId: string) => void;
};

const LIST_HEADER = (
  <div className="grid h-7 shrink-0 grid-cols-[3.5rem_1fr_3rem_2.5rem_2rem_auto] gap-1 border-b border-border bg-muted/30 px-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    <span>Trade</span>
    <span>Description</span>
    <span className="text-right">Qty</span>
    <span>Dwg#</span>
    <span>Pg</span>
    <span className="text-right">Status</span>
  </div>
);

export const ScopeTakeoffQueue = memo(function ScopeTakeoffQueue({
  items,
  visibleItems,
  selectedItemId,
  documentsById,
  takeoffAssemblies,
  pricingItems,
  onSelectItem,
}: ScopeTakeoffQueueProps) {
  const assemblyByTakeoffId = useMemo(
    () =>
      new Map(
        takeoffAssemblies.map((row) => [row.takeoff_item_id, row] as const)
      ),
    [takeoffAssemblies]
  );

  const pricingByTakeoffId = useMemo(
    () =>
      new Map(pricingItems.map((row) => [row.takeoff_item_id, row] as const)),
    [pricingItems]
  );

  const lineCount = items.length;

  return (
    <>
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Takeoff lines</h3>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {lineCount}
          </p>
        </div>
      </div>
      {LIST_HEADER}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
            <p className="text-sm font-medium">No takeoff lines yet</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Accept suggestions to add quantity lines here.
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
            No lines match the current trade filter.
          </div>
        ) : (
          <VirtualList
            items={visibleItems}
            estimateSize={32}
            className="min-h-0 flex-1 overflow-y-auto"
            getItemKey={(item) => item.id}
            renderItem={(item) => (
              <ScopeTakeoffCompactRow
                item={item}
                documentsById={documentsById}
                selected={item.id === selectedItemId}
                readiness={resolveScopeTakeoffReadiness(
                  item.id,
                  assemblyByTakeoffId,
                  pricingByTakeoffId
                )}
                onSelect={onSelectItem}
              />
            )}
          />
        )}
      </div>
    </>
  );
});
