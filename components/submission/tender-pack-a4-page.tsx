"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { TenderPackPreviewData } from "@/src/lib/submission/tender-pack-preview";
import type { TenderPackVirtualPage } from "@/src/lib/submission/tender-pack-pages";

type TenderPackA4PageProps = {
  page: TenderPackVirtualPage;
  data: TenderPackPreviewData;
  children: ReactNode;
  className?: string;
};

export function TenderPackA4Page({
  page,
  data,
  children,
  className,
}: TenderPackA4PageProps) {
  return (
    <article
      className={cn(
        "flex aspect-[210/297] w-full max-w-[210mm] flex-col overflow-hidden bg-white text-[#0A0E1A] shadow-lg ring-1 ring-[#E5E8EE]",
        className
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E5E8EE] px-6 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#0A0E1A] text-[10px] font-bold tracking-tight text-white"
            aria-hidden
          >
            Q
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-[#0A0E1A]">
              {data.cover.projectName}
            </p>
            <p className="text-[9px] text-[#0A0E1A]/55">
              {data.cover.organisationName}
            </p>
          </div>
        </div>
        <div className="text-right text-[8px] leading-tight text-[#0A0E1A]/55">
          <p>Issue {formatShortDate(data.cover.issueDate)}</p>
          <p className="font-mono">{data.cover.revision}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">{children}</div>

      <footer className="flex shrink-0 items-center justify-between border-t border-[#E5E8EE] px-6 py-2 text-[8px] text-[#0A0E1A]/45">
        <span>Prepared in Quanta</span>
        <span className="font-mono tabular-nums">
          {page.sectionLabel} · {page.pageIndexInSection + 1}/
          {page.pageCountInSection}
        </span>
        <span className="font-mono tabular-nums">{page.pageNumber}</span>
      </footer>
    </article>
  );
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
