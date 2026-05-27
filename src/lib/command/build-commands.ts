import { entryToOpenResult, groupLabelForKind } from "@/src/lib/command/search";
import type {
  CommandIndexEntry,
  CommandResult,
  CommandWorkspaceContext,
} from "@/src/lib/command/types";
import type { StoredCommandItem } from "@/src/lib/command/types";

export function buildNavigationCommands(
  workspace: CommandWorkspaceContext | null
): CommandResult[] {
  const projectId = workspace?.projectId;
  const base: CommandResult[] = [
    {
      id: "nav-dashboard",
      action: "navigate",
      label: "Open dashboard",
      group: "Navigate",
      keywords: "dashboard home",
    },
    {
      id: "nav-projects",
      action: "navigate",
      label: "Open projects",
      group: "Navigate",
      keywords: "projects tender",
    },
    {
      id: "nav-templates",
      action: "navigate",
      label: "Open methodologies library",
      group: "Navigate",
      keywords: "packages templates methodology",
    },
    {
      id: "nav-standards",
      action: "navigate",
      label: "Open standards library",
      group: "Navigate",
      keywords: "standards nzs code",
    },
    {
      id: "nav-rates",
      action: "navigate",
      label: "Open rates library",
      group: "Navigate",
      keywords: "rates labour material supplier",
    },
    {
      id: "nav-imports",
      action: "navigate",
      label: "Open imports",
      group: "Navigate",
      keywords: "import csv bulk",
    },
  ];

  if (!projectId || !workspace) {
    return base;
  }

  return [
    ...base,
    {
      id: "nav-takeoff",
      action: "navigate",
      label: "Open takeoff",
      hint: workspace.projectName,
      group: "Navigate",
      keywords: "takeoff tender inputs",
    },
    {
      id: "nav-plans",
      action: "navigate",
      label: "Open plans & specs",
      hint: workspace.projectName,
      group: "Navigate",
      keywords: "plans specs documents drawings",
    },
    {
      id: "nav-scope",
      action: "navigate",
      label: "Open build up",
      hint: workspace.projectName,
      group: "Navigate",
      keywords: "build up materials labour scope",
    },
    {
      id: "nav-commercial",
      action: "navigate",
      label: "Open commercial",
      hint: workspace.projectName,
      group: "Navigate",
      keywords: "commercial pricing",
    },
    {
      id: "nav-submission",
      action: "navigate",
      label: "Open submission",
      hint: workspace.projectName,
      group: "Navigate",
      keywords: "submission export tender pack",
    },
    {
      id: "nav-ai-review",
      action: "navigate",
      label: "Open AI review",
      hint: workspace.projectName,
      group: "Navigate",
      keywords: "ai review",
    },
  ];
}

export function buildCreateCommands(
  workspace: CommandWorkspaceContext | null
): CommandResult[] {
  const projectId = workspace?.projectId;
  const items: CommandResult[] = [
    {
      id: "create-project",
      action: "create",
      label: "Create project",
      group: "Create",
      keywords: "new project tender",
    },
    {
      id: "create-package",
      action: "create",
      label: "Create methodology",
      group: "Create",
      keywords: "new package methodology template",
    },
    {
      id: "create-standard",
      action: "create",
      label: "Create standard",
      group: "Create",
      keywords: "new standard reference",
    },
  ];

  if (projectId) {
    items.push(
      {
        id: "create-takeoff",
        action: "create",
        label: "Create takeoff item",
        hint: workspace?.projectName,
        group: "Create",
        keywords: "new takeoff line quantity",
      },
      {
        id: "create-rfi",
        action: "create",
        label: "Create RFI",
        hint: workspace?.projectName,
        group: "Create",
        keywords: "rfi clarification question",
      },
      {
        id: "create-exclusion",
        action: "create",
        label: "Create exclusion",
        hint: workspace?.projectName,
        group: "Create",
        keywords: "exclusion clarification",
      },
      {
        id: "create-assumption",
        action: "create",
        label: "Create assumption",
        hint: workspace?.projectName,
        group: "Create",
        keywords: "assumption clarification",
      }
    );
  }

  return items;
}

export function buildContextCommands(
  workspace: CommandWorkspaceContext | null
): CommandResult[] {
  if (!workspace?.takeoffItem) {
    return [];
  }

  const { takeoffItem, projectName } = workspace;

  return [
    {
      id: "ctx-apply-package",
      action: "apply",
      label: "Apply methodology",
      hint: takeoffItem.itemName,
      group: "Context",
      keywords: "apply package methodology",
    },
    {
      id: "ctx-open-source",
      action: "open",
      label: "Open source",
      hint: takeoffItem.itemName,
      group: "Context",
      keywords: "source document drawing",
    },
    {
      id: "ctx-relationships",
      action: "open",
      label: "Open relationships",
      hint: takeoffItem.itemName,
      group: "Context",
      keywords: "relationships evidence",
    },
    {
      id: "ctx-materials",
      action: "review",
      label: "Review materials",
      hint: projectName,
      group: "Context",
      keywords: "materials build-up",
    },
    {
      id: "ctx-labour",
      action: "review",
      label: "Review labour",
      hint: projectName,
      group: "Context",
      keywords: "labour build-up",
    },
    {
      id: "ctx-pricing",
      action: "open",
      label: "Open pricing",
      hint: takeoffItem.itemName,
      group: "Context",
      keywords: "pricing commercial",
    },
  ];
}

export function entriesToActionResults(
  entries: CommandIndexEntry[]
): CommandResult[] {
  const results: CommandResult[] = [];

  for (const entry of entries) {
    results.push(entryToOpenResult(entry, "open"));

    if (entry.kind === "package") {
      results.push({
        ...entryToOpenResult(entry, "apply"),
        id: `${entry.id}-apply`,
        action: "apply",
        label: `Apply ${entry.label}`,
      });
    }

    if (entry.kind === "takeoff" && entry.projectId && entry.entityId) {
      results.push({
        id: `${entry.id}-pricing`,
        action: "open",
        label: `Open pricing · ${entry.label}`,
        hint: entry.subtitle,
        group: groupLabelForKind(entry.kind),
        entry,
        pinKey: `${entry.kind}:${entry.projectId}:${entry.entityId}`,
      });
    }
  }

  return results;
}

export function filterCommands(
  commands: CommandResult[],
  query: string
): CommandResult[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return commands;
  }

  return commands.filter((cmd) => {
    const haystack = `${cmd.label} ${cmd.hint ?? ""} ${cmd.keywords ?? ""} ${cmd.group}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function buildResultsFromStored(
  items: StoredCommandItem[],
  group: "Pinned" | "Recent"
): CommandResult[] {
  return items.map((item) => ({
    id: `stored-${group}-${item.pinKey}`,
    action: "open" as const,
    label: item.label,
    hint: item.subtitle,
    group,
    pinKey: item.pinKey,
  }));
}
