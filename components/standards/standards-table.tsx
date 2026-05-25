"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";

import {
  StandardFormDialog,
  standardToFormValues,
} from "@/components/standards/standard-form-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  createStandardAction,
  deleteStandardAction,
  updateStandardAction,
} from "@/src/lib/standards/actions";
import { STANDARD_TYPES } from "@/src/lib/standards/constants";
import type { Standard } from "@/src/types/database";

function typeLabel(value: Standard["standard_type"]): string {
  return (
    STANDARD_TYPES.find((row) => row.value === value)?.label ?? value
  );
}

type StandardsTableProps = {
  initialStandards: Standard[];
};

export function StandardsTable({ initialStandards }: StandardsTableProps) {
  const router = useRouter();
  const [standards, setStandards] = useState(initialStandards);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Standard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Standard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStandards(initialStandards);
  }, [initialStandards]);

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    startTransition(async () => {
      const result = await deleteStandardAction(deleteTarget.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 px-6 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {standards.length} standard{standards.length === 1 ? "" : "s"}
        </p>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Add standard
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {standards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No standards yet. Add your first reference code to link on takeoff,
            assemblies, and pricing.
          </p>
          <Button type="button" className="mt-4" onClick={() => setAddOpen(true)}>
            Add first standard
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow>
                <TableHead scope="col">Reference</TableHead>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Type</TableHead>
                <TableHead scope="col">Trade</TableHead>
                <TableHead scope="col">Jurisdiction</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standards.map((standard) => (
                <TableRow key={standard.id}>
                  <TableCell className="font-mono text-sm">
                    {standard.reference_code}
                  </TableCell>
                  <TableCell className="font-medium">{standard.name}</TableCell>
                  <TableCell className="text-sm">
                    {typeLabel(standard.standard_type)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {standard.trade ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {standard.jurisdiction ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={standard.is_active ? "secondary" : "outline"}
                      className={
                        standard.is_active
                          ? "bg-emerald-500/10 text-emerald-800"
                          : ""
                      }
                    >
                      {standard.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(standard)}>
                          <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(standard)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
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

      <StandardFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add standard"
        description="Create a reusable reference for your organisation library."
        submitLabel="Add standard"
        onSubmit={createStandardAction}
        onSuccess={() => router.refresh()}
      />

      {editTarget ? (
        <StandardFormDialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
          title="Edit standard"
          description="Update reference details. Linked takeoff and pricing lines keep their links."
          submitLabel="Save changes"
          initialValues={standardToFormValues(editTarget)}
          onSubmit={(data) => updateStandardAction(editTarget.id, data)}
          onSuccess={() => router.refresh()}
        />
      ) : null}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete standard</DialogTitle>
            <DialogDescription>
              Remove {deleteTarget?.reference_code}? Links on takeoff and pricing
              will be removed.
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
