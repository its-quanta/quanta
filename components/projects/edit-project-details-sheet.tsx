"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  updateProjectAction,
  type UpdateProjectState,
} from "@/src/lib/projects/actions";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type Project,
} from "@/src/types/database";
import { getProjectStatusLabel } from "@/components/projects/project-status-badge";

const selectClassName = cn(
  "h-8 w-full rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

type EditProjectDetailsSheetProps = {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

const initialState: UpdateProjectState = {};

export function EditProjectDetailsSheet({
  project,
  open,
  onOpenChange,
  onSaved,
}: EditProjectDetailsSheetProps) {
  const boundAction = updateProjectAction.bind(null, project.id);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      onSaved?.();
      onOpenChange(false);
    }
  }, [state.success, onOpenChange, onSaved]);

  const dueDateValue = project.tender_due_date
    ? project.tender_due_date.slice(0, 10)
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit project details</SheetTitle>
          <SheetDescription>
            Tender metadata used on exports, tender packs, and workspace headers.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-project-name">Project name</Label>
            <Input
              id="edit-project-name"
              name="name"
              required
              defaultValue={project.name}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-client-name">Client</Label>
            <Input
              id="edit-client-name"
              name="clientName"
              defaultValue={project.client_name ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-site-address">Address / location</Label>
            <Input
              id="edit-site-address"
              name="siteAddress"
              defaultValue={project.site_address ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-project-type">Project type</Label>
              <select
                id="edit-project-type"
                name="projectType"
                className={selectClassName}
                defaultValue={project.project_type ?? ""}
              >
                <option value="">Not set</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-trade-scope">Trade scope</Label>
              <Input
                id="edit-trade-scope"
                name="tradeScope"
                defaultValue={project.trade_scope ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-tender-due-date">Due date</Label>
              <Input
                id="edit-tender-due-date"
                name="tenderDueDate"
                type="date"
                defaultValue={dueDateValue}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-status">Tender status</Label>
              <select
                id="edit-status"
                name="status"
                className={selectClassName}
                defaultValue={project.status}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getProjectStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-estimated-value">Estimated value</Label>
            <Input
              id="edit-estimated-value"
              name="estimatedValue"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              defaultValue={
                project.estimated_value != null
                  ? String(project.estimated_value)
                  : ""
              }
              className="font-mono tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              name="notes"
              rows={4}
              defaultValue={project.notes ?? ""}
              placeholder="Internal notes for the estimating team"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save details"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
