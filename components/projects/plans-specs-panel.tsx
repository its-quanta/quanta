"use client";

import { useMemo } from "react";

import { DocumentAnalysisPanel } from "@/components/projects/document-analysis-panel";
import { ProjectDocumentsPanel } from "@/components/documents/project-documents-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Document, DocumentClassification, DocumentPage } from "@/src/types/database";

const DOCUMENT_GROUPS: {
  label: string;
  classifications: DocumentClassification[];
}[] = [
  { label: "Architectural", classifications: ["architectural_drawings"] },
  { label: "Structural", classifications: ["structural_drawings"] },
  { label: "Specification", classifications: ["specification", "scope_document"] },
  { label: "Schedules", classifications: ["schedule"] },
  { label: "Photos", classifications: ["photos_images"] },
  { label: "Other", classifications: ["other"] },
];

type PlansSpecsPanelProps = {
  projectId: string;
  documents: Document[];
  documentPages: DocumentPage[];
};

export function PlansSpecsPanel({
  projectId,
  documents,
  documentPages,
}: PlansSpecsPanelProps) {

  const documentsByGroup = useMemo(() => {
    return DOCUMENT_GROUPS.map((group) => {
      const groupDocs = documents.filter((doc) =>
        group.classifications.includes(doc.document_type)
      );
      return { ...group, documents: groupDocs, count: groupDocs.length };
    });
  }, [documents]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Plans &amp; specs</h2>
        <p className="text-sm text-muted-foreground">
          Upload and classify tender drawings, specifications, and schedules.
          Takeoff and AI review reference these documents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentAnalysisPanel
            projectId={projectId}
            documents={documents}
            documentPages={documentPages}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documentsByGroup.map((group) => (
          <Card key={group.label} size="sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{group.label}</CardTitle>
                {group.count === 0 ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 text-amber-900"
                  >
                    Missing
                  </Badge>
                ) : (
                  <Badge variant="outline">{group.count}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {group.documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No {group.label.toLowerCase()} documents uploaded.
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-xs">
                  {group.documents.slice(0, 4).map((doc) => (
                    <li key={doc.id} className="truncate text-foreground">
                      {doc.file_name}
                    </li>
                  ))}
                  {group.documents.length > 4 ? (
                    <li className="text-muted-foreground">
                      +{group.documents.length - 4} more
                    </li>
                  ) : null}
                </ul>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={group.count === 0 ? "default" : "outline"}
                  onClick={() =>
                    document
                      .getElementById("project-document-upload")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  Upload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={documents.length === 0}
                  onClick={() =>
                    document
                      .getElementById("project-document-upload")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectDocumentsPanel projectId={projectId} documents={documents} />
    </div>
  );
}
