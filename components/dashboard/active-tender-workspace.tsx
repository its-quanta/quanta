import Link from "next/link";

import {
  getProjectStatusLabel,
  ProjectStatusBadge,
} from "@/components/projects/project-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercent } from "@/src/lib/format";
import {
  getTenderRiskLabel,
  type ActiveTenderRow,
  type TenderRiskLevel,
} from "@/src/lib/dashboard/stats";
import { cn } from "@/lib/utils";

type ActiveTenderWorkspaceProps = {
  tenders: ActiveTenderRow[];
};

const RISK_BADGE_CLASS: Record<TenderRiskLevel, string> = {
  none: "border-transparent bg-muted text-muted-foreground",
  low: "border-primary/20 bg-primary/5 text-primary",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  high: "border-amber-500/40 bg-amber-500/15 text-amber-800",
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function ActiveTenderWorkspace({ tenders }: ActiveTenderWorkspaceProps) {
  if (tenders.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No active tenders. Create a project to start your pipeline.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead scope="col">Tender</TableHead>
              <TableHead scope="col">Stage</TableHead>
              <TableHead scope="col" className="text-right">
                Pricing %
              </TableHead>
              <TableHead scope="col">Risk</TableHead>
              <TableHead scope="col">Due</TableHead>
              <TableHead scope="col" className="text-right">
                Value
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenders.map((tender) => (
              <TableRow key={tender.id}>
                <TableCell>
                  <Link
                    href={`/projects/${tender.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {tender.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={tender.stage} />
                  <span className="sr-only">{getProjectStatusLabel(tender.stage)}</span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatPercent(tender.pricingPercent)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-normal",
                      RISK_BADGE_CLASS[tender.risk]
                    )}
                  >
                    {getTenderRiskLabel(tender.risk)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {formatDate(tender.dueDate)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(tender.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
