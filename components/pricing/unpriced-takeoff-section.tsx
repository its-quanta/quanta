"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TakeoffItem } from "@/src/types/database";

type UnpricedTakeoffSectionProps = {
  items: TakeoffItem[];
  onAddPricing: (takeoffItemId: string) => void;
  onApplyPackage?: (takeoffItemId: string) => void;
  canApplyPackage?: boolean;
};

export function UnpricedTakeoffSection({
  items,
  onAddPricing,
  onApplyPackage,
  canApplyPackage = false,
}: UnpricedTakeoffSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Unpriced takeoff items</CardTitle>
        <CardDescription>
          {items.length} line{items.length === 1 ? "" : "s"} still need pricing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {item.item_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.trade} ·{" "}
                  <span className="font-mono tabular-nums">
                    {item.quantity} {item.unit}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{item.status.replace("_", " ")}</Badge>
                {canApplyPackage && onApplyPackage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onApplyPackage(item.id)}
                  >
                    Apply package
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAddPricing(item.id)}
                >
                  Add pricing
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
