import Link from "next/link";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { Project } from "@/src/types/database";

type ProjectTableProps = {
  projects: Project[];
};

export function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead scope="col">Project</TableHead>
            <TableHead scope="col">Client</TableHead>
            <TableHead scope="col">Type</TableHead>
            <TableHead scope="col">Trade scope</TableHead>
            <TableHead scope="col">Due date</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col" className="text-right">
              Est. value
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="hover:bg-muted/20">
              <TableCell className="font-medium">
                <Link
                  href={`/projects/${project.id}`}
                  className="hover:text-primary"
                >
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>{project.client_name ?? "—"}</TableCell>
              <TableCell>{project.project_type ?? "—"}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {project.trade_scope ?? "—"}
              </TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatDate(project.tender_due_date)}
              </TableCell>
              <TableCell>
                <ProjectStatusBadge status={project.status} />
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(project.estimated_value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
