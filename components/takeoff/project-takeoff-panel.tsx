import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TakeoffSummary } from "@/components/takeoff/takeoff-summary";
import { TakeoffTable } from "@/components/takeoff/takeoff-table";
import type { Document, DocumentPage, TakeoffItem } from "@/src/types/database";

type ProjectTakeoffPanelProps = {
  projectId: string;
  items: TakeoffItem[];
  documents: Document[];
  documentPages: DocumentPage[];
};

export function ProjectTakeoffPanel({
  projectId,
  items,
  documents,
  documentPages,
}: ProjectTakeoffPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <TakeoffSummary items={items} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual takeoff workspace</CardTitle>
          <CardDescription>
            Build quantity lines from drawings and tender documents. Review each
            line before pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TakeoffTable
            projectId={projectId}
            items={items}
            documents={documents}
            documentPages={documentPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
