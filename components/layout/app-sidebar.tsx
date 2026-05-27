"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { useGlobalCommandOptional } from "@/components/command-palette/global-command-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const globalCommand = useGlobalCommandOptional();

  return (
    <aside className="flex h-full w-[244px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            Q
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Quanta
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors duration-150",
                isActive
                  ? "bg-background font-medium text-foreground ring-1 ring-border"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                strokeWidth={1.75}
                className="size-4 shrink-0"
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {globalCommand ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mb-3 w-full justify-start gap-2 text-muted-foreground"
            onClick={() => globalCommand.openCommandBar()}
          >
            <HugeiconsIcon icon={Search01Icon} className="size-4" />
            Search…
            <kbd className="ml-auto rounded border border-border px-1 text-[10px]">
              ⌘K
            </kbd>
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Estimating workspace for subcontractors.
        </p>
      </div>
    </aside>
  );
}
