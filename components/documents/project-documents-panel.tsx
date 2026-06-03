import { DocumentUploadZone } from "@/components/documents/document-upload-zone";
import { DrawingRegisterPanel } from "@/components/documents/drawing-register-panel";
import { DocumentsTable } from "@/components/documents/documents-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Document, DocumentPage } from "@/src/types/database";

type ProjectDocumentsPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
};

export function ProjectDocumentsPanel({
  projectId,
  documents,
  documentPages,
}: ProjectDocumentsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div id="project-document-upload">
        <DocumentUploadZone projectId={projectId} />
      </div>

      <DrawingRegisterPanel
        projectId={projectId}
        documents={documents}
        documentPages={documentPages}
      />

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
