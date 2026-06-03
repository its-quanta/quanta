"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EditProjectDetailsSheet } from "@/components/projects/edit-project-details-sheet";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import { useOrganisationCurrency } from "@/components/layout/organisation-settings-provider";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { Project } from "@/src/types/database";

type ProjectWorkspaceHeaderProps = {
  project: Project;
};

function MetaItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate text-sm text-foreground ${mono ? "font-mono tabular-nums" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

export function ProjectWorkspaceHeader({ project }: ProjectWorkspaceHeaderProps) {
  const router = useRouter();
  const currency = useOrganisationCurrency();
  const [editOpen, setEditOpen] = useState(false);

  const location =
    project.site_address?.trim() ||
    [project.project_type, project.trade_scope].filter(Boolean).join(" · ") ||
    "—";

  return (
    <>
      <header className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MetaItem
                label="Client"
                value={project.client_name?.trim() || "—"}
              />
              <MetaItem label="Location" value={location} />
              <MetaItem
                label="Trade scope"
                value={project.trade_scope?.trim() || "—"}
              />
              <MetaItem
                label="Due date"
                value={
                  project.tender_due_date
                    ? formatDate(project.tender_due_date)
                    : "—"
                }
              />
              <MetaItem
                label="Project type"
                value={project.project_type?.trim() || "—"}
              />
              <MetaItem
                label="Estimated value"
                value={formatCurrency(project.estimated_value, currency)}
                mono
              />
            </dl>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setEditOpen(true)}
          >
            Edit project details
          </Button>
        </div>
      </header>

      <EditProjectDetailsSheet
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
