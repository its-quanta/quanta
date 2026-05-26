"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type SubmissionCollapsibleProps = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function SubmissionCollapsible({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: SubmissionCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[10px] border border-border bg-card",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {summary ? <span className="hidden sm:inline">{summary}</span> : null}
          <span
            className={cn(
              "inline-block transition-transform duration-150",
              open && "rotate-180"
            )}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-3">{children}</div>
      ) : null}
    </div>
  );
}
