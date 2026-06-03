"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildContextCommands,
  buildCreateCommands,
  buildNavigationCommands,
  buildResultsFromStored,
  entriesToActionResults,
  filterCommands,
} from "@/src/lib/command/build-commands";
import { searchCommandIndex } from "@/src/lib/command/search";
import {
  getPinnedItems,
  getRecentItems,
  isPinned,
  recordRecentItem,
  storedItemFromEntry,
  togglePinnedItem,
} from "@/src/lib/command/storage";
import type {
  CommandIndexEntry,
  CommandResult,
  CommandWorkspaceContext,
} from "@/src/lib/command/types";

type GlobalCommandBarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: string;
  entries: CommandIndexEntry[];
  workspace: CommandWorkspaceContext | null;
};

const ACTION_LABELS: Record<CommandResult["action"], string> = {
  open: "Open",
  edit: "Edit",
  apply: "Apply",
  create: "Create",
  review: "Review",
  assign: "Assign",
  export: "Export",
  navigate: "Go",
  pin: "Pin",
};

function RunnableRow({
  command,
  active,
  index,
  showPin,
  pinned,
  onSelect,
  onPin,
  onMouseEnter,
}: {
  command: CommandResult;
  active: boolean;
  index: number;
  showPin: boolean;
  pinned: boolean;
  onSelect: () => void;
  onPin: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md",
          active && "bg-muted"
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-2 text-left text-sm"
          onMouseEnter={onMouseEnter}
          onClick={onSelect}
        >
          <span className="min-w-0 truncate">{command.label}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-normal">
              {ACTION_LABELS[command.action]}
            </Badge>
            {command.hint ? (
              <span className="max-w-[8rem] truncate text-xs text-muted-foreground">
                {command.hint}
              </span>
            ) : null}
          </span>
        </button>
        {showPin && command.pinKey ? (
          <button
            type="button"
            className="mr-1 shrink-0 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            title={pinned ? "Unpin" : "Pin"}
            onClick={(event) => {
              event.stopPropagation();
              onPin();
            }}
          >
            {pinned ? "Unpin" : "Pin"}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function GlobalCommandBar({
  open,
  onOpenChange,
  organisationId,
  entries,
  workspace,
}: GlobalCommandBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pinsVersion, setPinsVersion] = useState(0);

  const pinned = useMemo(
    () => getPinnedItems(organisationId),
    [organisationId, pinsVersion]
  );
  const recent = useMemo(
    () => getRecentItems(organisationId),
    [organisationId, open]
  );

  const staticCommands = useMemo(() => {
    const navigation = buildNavigationCommands(workspace);
    const create = buildCreateCommands(workspace);
    const context = buildContextCommands(workspace);
    return [...context, ...create, ...navigation];
  }, [workspace]);

  const displayedCommands = useMemo(() => {
    const q = query.trim();

    if (q) {
      const matchedEntries = searchCommandIndex(entries, q, 30);
      const fromEntries = entriesToActionResults(matchedEntries);
      const fromStatic = filterCommands(staticCommands, q);
      const combined = [...fromEntries, ...fromStatic];
      const seen = new Set<string>();
      return combined.filter((cmd) => {
        if (seen.has(cmd.id)) {
          return false;
        }
        seen.add(cmd.id);
        return true;
      });
    }

    return [
      ...buildResultsFromStored(pinned, "Pinned"),
      ...buildResultsFromStored(recent, "Recent"),
      ...buildContextCommands(workspace),
      ...buildCreateCommands(workspace),
      ...buildNavigationCommands(workspace),
    ];
  }, [query, entries, staticCommands, workspace, pinned, recent]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
  }, [onOpenChange]);

  const runCommand = useCallback(
    (command: CommandResult) => {
      const entry = command.entry;

      if (entry) {
        recordRecentItem(
          organisationId,
          storedItemFromEntry({
            kind: entry.kind,
            id: entry.id,
            label: entry.label,
            subtitle: entry.subtitle,
            href: entry.href,
            projectId: entry.projectId,
            entityId: entry.entityId,
          })
        );
      }

      if (command.id.startsWith("nav-")) {
        if (command.id === "nav-dashboard") {
          router.push("/dashboard");
        } else if (command.id === "nav-projects") {
          router.push("/projects");
        } else if (command.id === "nav-templates") {
          router.push("/templates");
        } else if (command.id === "nav-standards") {
          router.push("/standards");
        } else if (command.id === "nav-rates") {
          router.push("/rates");
        } else if (command.id === "nav-imports") {
          router.push("/imports");
        } else if (workspace) {
          if (command.id === "nav-takeoff" || command.id === "nav-ai-review") {
            workspace.navigateTab("scope");
          } else if (command.id === "nav-plans") {
            workspace.navigateTab("documents");
          } else if (command.id === "nav-scope") {
            workspace.navigateTab("estimate");
          } else if (command.id === "nav-commercial") {
            workspace.navigateTab("commercial");
          } else if (command.id === "nav-submission") {
            workspace.navigateTab("submission");
          }
        }
        close();
        return;
      }

      if (command.id.startsWith("create-")) {
        if (command.id === "create-project") {
          router.push("/projects/new");
        } else if (command.id === "create-package") {
          router.push("/templates/new");
        } else if (command.id === "create-standard") {
          router.push("/standards");
        } else if (workspace?.projectId) {
          workspace.navigateTab("submission");
          if (command.id === "create-takeoff") {
            workspace.navigateTab("scope");
            workspace.onFocusTakeoffSearch?.();
          }
        }
        close();
        return;
      }

      if (command.id.startsWith("ctx-") && workspace) {
        if (command.id === "ctx-apply-package") {
          workspace.onApplyPackage?.();
          workspace.navigateTab("scope");
        } else if (
          (command.id === "ctx-open-source" ||
            command.id === "ctx-relationships") &&
          workspace.takeoffItem?.id
        ) {
          window.dispatchEvent(
            new CustomEvent("quanta:open-relationships", {
              detail: { takeoffItemId: workspace.takeoffItem.id },
            })
          );
        } else if (command.id === "ctx-materials") {
          workspace.navigateTab("estimate");
        } else if (command.id === "ctx-labour") {
          workspace.navigateTab("estimate");
        } else if (command.id === "ctx-pricing" && workspace.takeoffItem) {
          workspace.navigateTab("commercial", {
            priceTakeoff: workspace.takeoffItem.id,
          });
        }
        close();
        return;
      }

      if (command.action === "apply" && entry?.kind === "package" && entry.href) {
        if (workspace?.onApplyPackage) {
          workspace.onApplyPackage();
          workspace.navigateTab("scope");
        } else if (entry.href) {
          router.push(entry.href);
        }
        close();
        return;
      }

      if (entry?.href) {
        if (
          entry.kind === "takeoff" &&
          command.id.endsWith("-pricing") &&
          entry.projectId &&
          entry.entityId
        ) {
          router.push(
            `/projects/${entry.projectId}?tab=commercial&priceTakeoff=${entry.entityId}`
          );
        } else {
          router.push(entry.href);
        }
        close();
        return;
      }

      if (command.pinKey) {
        const stored = [...pinned, ...recent].find(
          (row) => row.pinKey === command.pinKey
        );
        if (stored?.href) {
          router.push(stored.href);
          close();
        }
      }
    },
    [close, organisationId, pinned, recent, router, workspace]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) =>
          displayedCommands.length === 0
            ? 0
            : (index + 1) % displayedCommands.length
        );
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) =>
          displayedCommands.length === 0
            ? 0
            : (index - 1 + displayedCommands.length) %
              displayedCommands.length
        );
      }
      if (event.key === "Enter" && displayedCommands[activeIndex]) {
        event.preventDefault();
        runCommand(displayedCommands[activeIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, displayedCommands, open, runCommand]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandResult[]>();
    for (const cmd of displayedCommands) {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return [...map.entries()];
  }, [displayedCommands]);

  let rowIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-base">Command bar</DialogTitle>
          <DialogDescription className="sr-only">
            Search projects, takeoff, packages, and run actions. Ctrl+K or Cmd+K.
          </DialogDescription>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or type a command…"
            className="mt-2"
            autoFocus
          />
          {workspace?.takeoffItem ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Context:{" "}
              <span className="font-medium text-foreground">
                {workspace.takeoffItem.itemName}
              </span>
              {" · "}
              {workspace.takeoffItem.trade}
            </p>
          ) : workspace?.projectName ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Project:{" "}
              <span className="font-medium text-foreground">
                {workspace.projectName}
              </span>
            </p>
          ) : null}
        </DialogHeader>

        <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
          {displayedCommands.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No results. Try a trade name, package, drawing ref, or RFI.
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {group}
                </p>
                <ul>
                  {items.map((cmd) => {
                    rowIndex += 1;
                    const index = rowIndex;
                    const canPin = Boolean(cmd.entry ?? cmd.pinKey);
                    return (
                      <RunnableRow
                        key={cmd.id}
                        command={cmd}
                        active={index === activeIndex}
                        index={index}
                        showPin={canPin}
                        pinned={
                          cmd.pinKey
                            ? isPinned(organisationId, cmd.pinKey)
                            : false
                        }
                        onSelect={() => runCommand(cmd)}
                        onMouseEnter={() => setActiveIndex(index)}
                        onPin={() => {
                          if (!cmd.entry && !cmd.pinKey) {
                            return;
                          }
                          const stored = cmd.entry
                            ? storedItemFromEntry({
                                kind: cmd.entry.kind,
                                id: cmd.entry.id,
                                label: cmd.entry.label,
                                subtitle: cmd.entry.subtitle,
                                href: cmd.entry.href,
                                projectId: cmd.entry.projectId,
                                entityId: cmd.entry.entityId,
                              })
                            : [...pinned, ...recent].find(
                                (row) => row.pinKey === cmd.pinKey
                              );
                          if (stored) {
                            togglePinnedItem(organisationId, stored);
                            setPinsVersion((v) => v + 1);
                          }
                        }}
                      />
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <kbd className="rounded border border-border px-1">↑↓</kbd> navigate ·{" "}
          <kbd className="rounded border border-border px-1">Enter</kbd> run ·{" "}
          <kbd className="rounded border border-border px-1">Esc</kbd> close ·{" "}
          <kbd className="rounded border border-border px-1">⌘K</kbd> toggle
        </div>
      </DialogContent>
    </Dialog>
  );
}
