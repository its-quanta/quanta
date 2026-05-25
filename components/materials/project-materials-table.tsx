"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import { EstimateReviewBadge } from "@/components/estimate/estimate-review-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reviewProjectMaterialItemAction } from "@/src/lib/estimate-generation/actions";
import { formatCurrency, formatQuantity } from "@/src/lib/format";
import type { ProjectMaterialItem } from "@/src/types/database";

const ALL_FILTER = "__all__";

type ProjectMaterialsTableProps = {
  projectId: string;
  items: ProjectMaterialItem[];
};

export function ProjectMaterialsTable({
  projectId,
  items: initialItems,
}: ProjectMaterialsTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [packageFilter, setPackageFilter] = useState(ALL_FILTER);
  const [supplierFilter, setSupplierFilter] = useState(ALL_FILTER);
  const [reviewFilter, setReviewFilter] = useState(ALL_FILTER);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const packageOptions = useMemo(() => {
    const names = new Set(items.map((item) => item.source_package_name));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const supplierOptions = useMemo(() => {
    const suppliers = new Set(
      items
        .map((item) => item.supplier?.trim())
        .filter((value): value is string => Boolean(value))
    );
    return [...suppliers].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        packageFilter !== ALL_FILTER &&
        item.source_package_name !== packageFilter
      ) {
        return false;
      }
      if (supplierFilter !== ALL_FILTER) {
        const supplier = item.supplier?.trim() || "—";
        if (supplier !== supplierFilter) {
          return false;
        }
      }
      if (reviewFilter === "outstanding" && item.reviewed) {
        return false;
      }
      if (reviewFilter === "reviewed" && !item.reviewed) {
        return false;
      }
      return true;
    });
  }, [items, packageFilter, supplierFilter, reviewFilter]);

  function handleReview(itemId: string) {
    startTransition(async () => {
      const result = await reviewProjectMaterialItemAction(itemId, projectId);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      setActionError(null);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No materials generated yet. Apply an assembly package with material
          components to a takeoff item.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="space-y-2">
          <Label htmlFor="materials-package-filter">Package</Label>
          <Select value={packageFilter} onValueChange={setPackageFilter}>
            <SelectTrigger
              id="materials-package-filter"
              className="w-full min-w-[12rem]"
            >
              <SelectValue placeholder="All packages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All packages</SelectItem>
              {packageOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="materials-supplier-filter">Supplier</Label>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger
              id="materials-supplier-filter"
              className="w-full min-w-[12rem]"
            >
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All suppliers</SelectItem>
              {supplierOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="materials-review-filter">Review</Label>
          <Select value={reviewFilter} onValueChange={setReviewFilter}>
            <SelectTrigger
              id="materials-review-filter"
              className="w-full min-w-[12rem]"
            >
              <SelectValue placeholder="All lines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All lines</SelectItem>
              <SelectItem value="outstanding">Outstanding review</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <TableRow>
              <TableHead scope="col">Material</TableHead>
              <TableHead scope="col">Quantity</TableHead>
              <TableHead scope="col">Unit</TableHead>
              <TableHead scope="col">Cost rate</TableHead>
              <TableHead scope="col">Total cost</TableHead>
              <TableHead scope="col">Supplier</TableHead>
              <TableHead scope="col">Package source</TableHead>
              <TableHead scope="col">Reviewed</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No material lines match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.material_name}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatQuantity(item.quantity)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.unit}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatCurrency(item.cost_rate)}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatCurrency(item.total_cost)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.supplier?.trim() || "—"}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                    {item.source_package_name}
                  </TableCell>
                  <TableCell>
                    <EstimateReviewBadge reviewed={item.reviewed} />
                  </TableCell>
                  <TableCell className="text-right">
                    {!item.reviewed ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReview(item.id)}
                      >
                        <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                        Review
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
