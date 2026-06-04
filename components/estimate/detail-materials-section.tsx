"use client";

import { useMemo, useState } from "react";

import { BuildUpLineRemoveButton } from "@/components/estimate/build-up-line-remove-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency, formatQuantity } from "@/src/lib/format";
import {
  filterMaterialsForTakeoff,
  isGeneratedBuildUpLine,
  sumMaterialCost,
} from "@/src/lib/estimate/build-up-totals";
import { deleteProjectMaterialItemsAction } from "@/src/lib/estimate-generation/actions";
import type { ProjectMaterialItem } from "@/src/types/database";

/** No create/update material line server action exists yet. */
export const MATERIAL_LINE_EDITING_ENABLED = false;

type DetailMaterialsSectionProps = {
  projectId: string;
  takeoffItemId: string;
  materialItems: ProjectMaterialItem[];
  onError?: (message: string) => void;
  className?: string;
};

export function DetailMaterialsSection({
  projectId,
  takeoffItemId,
  materialItems,
  onError,
  className,
}: DetailMaterialsSectionProps) {
  const [showDraftRow, setShowDraftRow] = useState(false);

  const lines = useMemo(
    () => filterMaterialsForTakeoff(materialItems, takeoffItemId),
    [materialItems, takeoffItemId]
  );

  const total = useMemo(() => sumMaterialCost(lines), [lines]);

  return (
    <div className={cn("space-y-3", className)}>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No material lines generated.
        </p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => {
            const generated = isGeneratedBuildUpLine(line.pricing_source);
            return (
              <li
                key={line.id}
                className="rounded-md border border-border bg-muted/20 px-2.5 py-2"
              >
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                        {line.material_name}
                      </p>
                      <LineSourceBadge
                        pricingSource={line.pricing_source}
                        generated={generated}
                      />
                    </div>
                    <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Qty</dt>
                        <dd className="font-mono tabular-nums">
                          {formatQuantity(line.quantity)} {line.unit}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Rate</dt>
                        <dd className="font-mono tabular-nums">
                          {formatCurrency(line.cost_rate)}
                        </dd>
                      </div>
                      <div className="col-span-2 flex justify-between gap-2 border-t border-border/60 pt-1">
                        <dt className="text-muted-foreground">Total</dt>
                        <dd className="font-mono tabular-nums font-medium">
                          {formatCurrency(line.total_cost)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <BuildUpLineRemoveButton
                    projectId={projectId}
                    itemId={line.id}
                    ariaLabel={`Remove material line ${line.material_name}`}
                    onRemove={deleteProjectMaterialItemsAction}
                    onError={onError}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">Total materials</span>
        <span className="font-mono tabular-nums font-medium">
          {formatCurrency(total)}
        </span>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => setShowDraftRow((value) => !value)}
        >
          + Add material line
        </Button>

        {showDraftRow ? (
          <div className="space-y-2 rounded-md border border-dashed border-border p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Description"
                className="col-span-2 h-8 text-sm"
                disabled={!MATERIAL_LINE_EDITING_ENABLED}
              />
              <Input
                placeholder="Qty"
                className="h-8 text-sm"
                disabled={!MATERIAL_LINE_EDITING_ENABLED}
              />
              <Input
                placeholder="Unit"
                className="h-8 text-sm"
                disabled={!MATERIAL_LINE_EDITING_ENABLED}
              />
              <Input
                placeholder="Cost rate"
                className="col-span-2 h-8 text-sm"
                disabled={!MATERIAL_LINE_EDITING_ENABLED}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Manual material editing coming next.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LineSourceBadge({
  pricingSource,
  generated,
}: {
  pricingSource: ProjectMaterialItem["pricing_source"];
  generated: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 font-normal",
        generated
          ? "border-blue-500/30 bg-blue-500/10 text-blue-800"
          : "border-slate-500/30 bg-slate-500/10 text-slate-700"
      )}
    >
      {generated ? "Generated" : "Manual"}
    </Badge>
  );
}
