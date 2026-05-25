"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete02Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";

import { AssemblyActiveBadge } from "@/components/assemblies/assembly-active-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import {
  deactivateAssemblyPackageAction,
  deleteAssemblyPackageAction,
} from "@/src/lib/assemblies/actions";
import type { AssemblyPackageWithCount } from "@/src/types/database";

type AssemblyListTableProps = {
  packages: AssemblyPackageWithCount[];
};

function displayMargin(pkg: AssemblyPackageWithCount): string {
  if (pkg.default_margin_percentage != null && pkg.default_margin_percentage > 0) {
    return formatPercent(pkg.default_margin_percentage);
  }
  return "—";
}

function displayMarkup(pkg: AssemblyPackageWithCount): string {
  if (pkg.default_markup_percentage != null && pkg.default_markup_percentage > 0) {
    return formatPercent(pkg.default_markup_percentage);
  }
  return "—";
}

export function AssemblyListTable({ packages }: AssemblyListTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AssemblyPackageWithCount | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDeactivate(pkg: AssemblyPackageWithCount) {
    startTransition(async () => {
      setError(null);
      const result = await deactivateAssemblyPackageAction(pkg.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteAssemblyPackageAction(deleteTarget.id);
      if (result.error) {
        setError(result.error);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Reusable priced build-ups per unit of measure for your organisation.
        </p>
        <Button asChild size="sm">
          <Link href="/templates/new">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} className="size-4" />
            Create assembly
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No assemblies yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first package to reuse materials, labour, and allowances
            across tenders.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/templates/new">Create assembly</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost rate</TableHead>
                <TableHead className="text-right">Sell rate</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead className="text-right">Markup %</TableHead>
                <TableHead className="text-right">Components</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <Link
                      href={`/templates/${pkg.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {pkg.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {pkg.trade ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {pkg.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(pkg.default_cost_rate)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(pkg.default_sell_rate)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {displayMargin(pkg)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {displayMarkup(pkg)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {pkg.component_count}
                  </TableCell>
                  <TableCell>
                    <AssemblyActiveBadge isActive={pkg.is_active} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" type="button">
                          <span className="sr-only">Actions</span>
                          <HugeiconsIcon
                            icon={Edit02Icon}
                            strokeWidth={1.75}
                            className="size-4"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/templates/${pkg.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        {pkg.is_active ? (
                          <DropdownMenuItem onClick={() => handleDeactivate(pkg)}>
                            Deactivate
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(pkg)}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            strokeWidth={1.75}
                            className="size-4"
                          />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete assembly</DialogTitle>
            <DialogDescription>
              Permanently remove &quot;{deleteTarget?.name}&quot; and all
              components? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
