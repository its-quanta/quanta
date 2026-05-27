"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { TenderPackA4Page } from "@/components/submission/tender-pack-a4-page";
import { TenderPackPageRender } from "@/components/submission/tender-pack-page-render";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildTenderPackDocument,
  type TenderPackSectionId,
} from "@/src/lib/submission/tender-pack-pages";
import type { TenderPackPreviewData } from "@/src/lib/submission/tender-pack-preview";
import type { OrganisationCurrency } from "@/src/types/database";

const ZOOM_LEVELS = [50, 75, 100, 125, 150] as const;

type TenderPackPreviewWorkspaceProps = {
  projectId: string;
  projectName: string;
  data: TenderPackPreviewData;
  currency: OrganisationCurrency;
};

export function TenderPackPreviewWorkspace({
  projectId,
  projectName,
  data,
  currency,
}: TenderPackPreviewWorkspaceProps) {
  const documentModel = useMemo(() => buildTenderPackDocument(data), [data]);
  const [activePageId, setActivePageId] = useState(documentModel.pages[0]?.id ?? "");
  const [zoom, setZoom] = useState<(typeof ZOOM_LEVELS)[number]>(100);

  const activePage =
    documentModel.pages.find((page) => page.id === activePageId) ??
    documentModel.pages[0];

  const activeSectionId = activePage?.sectionId ?? "cover";

  function goToSection(sectionId: TenderPackSectionId) {
    const firstPage = documentModel.pages.find(
      (page) => page.sectionId === sectionId
    );
    if (firstPage) {
      setActivePageId(firstPage.id);
    }
  }

  if (!activePage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">No preview content.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#E8EBF0]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tender pack preview
          </p>
          <h1 className="truncate text-base font-semibold text-foreground">
            {projectName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="hidden border-amber-500/40 bg-amber-500/10 text-amber-900 sm:inline-flex"
          >
            Draft preview · export coming soon
          </Badge>
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
            {ZOOM_LEVELS.map((level) => (
              <Button
                key={level}
                type="button"
                size="sm"
                variant={zoom === level ? "secondary" : "ghost"}
                className="h-7 px-2 font-mono text-xs tabular-nums"
                onClick={() => setZoom(level)}
              >
                {level}%
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/projects/${projectId}?tab=submission`}>Close</Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[15rem] shrink-0 flex-col border-r border-border bg-card sm:w-[17rem]">
          <nav className="shrink-0 border-b border-border p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Sections
            </p>
            <ul className="flex flex-col gap-0.5">
              {documentModel.sections.map((section) => {
                const isActive = section.id === activeSectionId;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => goToSection(section.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <span>{section.label}</span>
                      <span className="font-mono text-[10px] tabular-nums opacity-70">
                        {section.pageIds.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            <p className="mb-2 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Pages
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="flex flex-col gap-1.5">
                {documentModel.pages.map((page) => {
                  const selected = page.id === activePageId;
                  return (
                    <li key={page.id}>
                      <button
                        type="button"
                        onClick={() => setActivePageId(page.id)}
                        className={cn(
                          "flex w-full flex-col rounded-md border px-2 py-1.5 text-left transition-colors",
                          selected
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <span className="text-[10px] font-medium text-foreground">
                          {page.sectionLabel}
                        </span>
                        <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                          Page {page.pageNumber}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-auto p-6 sm:p-10">
          <div
            className="origin-top transition-transform duration-150"
            style={{
              transform: `scale(${zoom / 100})`,
              width: zoom < 100 ? `${10000 / zoom}%` : undefined,
            }}
          >
            <TenderPackA4Page page={activePage} data={data}>
              <TenderPackPageRender
                page={activePage}
                data={data}
                currency={currency}
              />
            </TenderPackA4Page>
          </div>
        </main>
      </div>
    </div>
  );
}
