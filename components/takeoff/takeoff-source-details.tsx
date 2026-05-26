"use client";

import Link from "next/link";

import { TakeoffStatusBadge } from "@/components/takeoff/takeoff-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildDrawingReferenceContext,
  formatDrawingReferencePrimary,
} from "@/src/lib/takeoff/drawing-reference";
import type {
  Document,
  DocumentPage,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type TakeoffSourceDetailsProps = {
  item: TakeoffItem;
  documents: Document[];
  documentPages: DocumentPage[];
  assembly: TakeoffItemAssemblyWithPackage | null;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export function TakeoffSourceDetails({
  item,
  documents,
  documentPages,
  assembly,
}: TakeoffSourceDetailsProps) {
  const context = buildDrawingReferenceContext(documents, documentPages);
  const sourceDocument = item.source_document_id
    ? documents.find((doc) => doc.id === item.source_document_id)
    : undefined;

  const linkedPage = item.document_page_id
    ? documentPages.find((page) => page.id === item.document_page_id)
    : undefined;

  const displayPageNumber =
    item.page_number ?? linkedPage?.page_number ?? null;

  const displaySheetNumber =
    item.sheet_number?.trim() ||
    linkedPage?.sheet_number?.trim() ||
    null;

  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{item.item_name}</CardTitle>
        <CardDescription>
          {item.trade} · {item.quantity} {item.unit}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Quantity" value={`${item.quantity} ${item.unit}`} />
          <DetailRow label="Trade" value={item.trade} />
          <DetailRow
            label="Drawing reference"
            value={formatDrawingReferencePrimary(item, context)}
          />
          <DetailRow label="Sheet number" value={displaySheetNumber} />
          <DetailRow
            label="Page number"
            value={
              displayPageNumber !== null ? String(displayPageNumber) : null
            }
          />
          <DetailRow label="Detail reference" value={item.detail_reference} />
          <DetailRow
            label="Specification reference"
            value={item.specification_reference}
          />
          <DetailRow
            label="Source document"
            value={sourceDocument?.file_name ?? null}
          />
        </dl>

        {item.description?.trim() ? (
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="mt-1 text-sm text-foreground">{item.description}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <TakeoffStatusBadge status={item.status} />
          <Badge
            variant="outline"
            className={
              item.reviewed
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/30 bg-amber-500/10 text-amber-800"
            }
          >
            {item.reviewed ? "Reviewed" : "Not reviewed"}
          </Badge>
          {item.ai_generated ? (
            <Badge variant="outline" className="text-muted-foreground">
              AI draft
            </Badge>
          ) : null}
        </div>

        {assembly ? (
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Package applied</p>
            <Link
              href={`/templates/${assembly.assembly_package_id}`}
              className="mt-1 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {assembly.assembly_package.name}
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No package applied.</p>
        )}

        {/* Future: surface TakeoffSourceAiMetadata when columns exist — see source-linking-future.ts */}
      </CardContent>
    </Card>
  );
}
