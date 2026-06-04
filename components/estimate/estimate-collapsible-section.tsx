"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type EstimateCollapsibleSectionProps = {
  id?: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function EstimateCollapsibleSection({
  id,
  title,
  summary,
  defaultOpen = true,
  children,
  className,
}: EstimateCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className={cn("border-t border-border pt-4", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {summary ? (
            <span className="max-w-[12rem] truncate font-mono tabular-nums">
              {summary}
            </span>
          ) : null}
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
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}
