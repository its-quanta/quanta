import { DocumentUploadZone } from "@/components/documents/document-upload-zone";
import { DocumentsTable } from "@/components/documents/documents-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Document } from "@/src/types/database";

type ProjectDocumentsPanelProps = {
  projectId: string;
  documents: Document[];
};

export function ProjectDocumentsPanel({
  projectId,
  documents,
}: ProjectDocumentsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <DocumentUploadZone projectId={projectId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project documents</CardTitle>
          <CardDescription>
            {documents.length === 0
              ? "Uploaded tender files appear here."
              : `${documents.length} document${documents.length === 1 ? "" : "s"} on this project.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsTable documents={documents} projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
