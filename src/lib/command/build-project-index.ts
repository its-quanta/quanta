import type { CommandIndexEntry } from "@/src/lib/command/types";
import type {
  Document,
  PricingItem,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TenderClarification,
} from "@/src/types/database";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";

function joinSearch(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part) => part && String(part).trim())
    .map((part) => String(part).trim())
    .join(" ");
}

export function buildProjectCommandIndex(input: {
  projectId: string;
  projectName: string;
  takeoffItems: TakeoffItem[];
  pricingItems: PricingItemWithTakeoff[] | PricingItem[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  clarifications: TenderClarification[];
  documents: Document[];
}): CommandIndexEntry[] {
  const { projectId, projectName } = input;
  const entries: CommandIndexEntry[] = [];

  for (const item of input.takeoffItems) {
    entries.push({
      id: `takeoff-${item.id}`,
      kind: "takeoff",
      label: item.item_name,
      subtitle: `${item.trade} · ${projectName}`,
      projectId,
      entityId: item.id,
      href: `/projects/${projectId}?tab=takeoff`,
      searchText: joinSearch([
        item.item_name,
        item.trade,
        item.description,
        item.drawing_reference,
        item.sheet_number,
        item.specification_reference,
        item.notes,
        projectName,
      ]),
    });
  }

  for (const item of input.pricingItems) {
    const takeoffName =
      "takeoff_item" in item
        ? item.takeoff_item.item_name
        : input.takeoffItems.find((row) => row.id === item.takeoff_item_id)
            ?.item_name;
    entries.push({
      id: `pricing-${item.id}`,
      kind: "pricing",
      label: takeoffName ? `Pricing · ${takeoffName}` : "Pricing line",
      subtitle: projectName,
      projectId,
      entityId: item.id,
      href: `/projects/${projectId}?tab=commercial&priceTakeoff=${item.takeoff_item_id}`,
      searchText: joinSearch([
        takeoffName,
        item.pricing_method,
        item.notes,
        projectName,
      ]),
    });
  }

  for (const item of input.materialItems) {
    entries.push({
      id: `material-${item.id}`,
      kind: "material",
      label: item.material_name,
      subtitle: `${item.source_package_name} · ${projectName}`,
      projectId,
      entityId: item.id,
      href: `/projects/${projectId}?tab=build-up`,
      searchText: joinSearch([
        item.material_name,
        item.supplier,
        item.source_package_name,
        item.unit,
        projectName,
      ]),
    });
  }

  for (const item of input.labourItems) {
    entries.push({
      id: `labour-${item.id}`,
      kind: "labour",
      label: item.labour_name,
      subtitle: `${item.source_package_name} · ${projectName}`,
      projectId,
      entityId: item.id,
      href: `/projects/${projectId}?tab=build-up`,
      searchText: joinSearch([
        item.labour_name,
        item.source_package_name,
        item.unit,
        projectName,
      ]),
    });
  }

  for (const item of input.clarifications) {
    const kind =
      item.type === "rfi"
        ? "rfi"
        : item.type === "exclusion"
          ? "exclusion"
          : item.type === "assumption"
            ? "assumption"
            : "clarification";
    entries.push({
      id: `clarification-${item.id}`,
      kind,
      label: item.title,
      subtitle: `${item.type} · ${projectName}`,
      projectId,
      entityId: item.id,
      href: `/projects/${projectId}?tab=submission`,
      searchText: joinSearch([
        item.title,
        item.description,
        item.category,
        item.related_drawing,
        item.type,
        projectName,
      ]),
    });
  }

  for (const doc of input.documents) {
    entries.push({
      id: `document-${doc.id}`,
      kind: "document",
      label: doc.file_name,
      subtitle: `${doc.document_type ?? "Document"} · ${projectName}`,
      projectId,
      entityId: doc.id,
      href: `/projects/${projectId}?tab=plans-specs`,
      searchText: joinSearch([
        doc.file_name,
        doc.document_type,
        doc.ai_summary,
        projectName,
      ]),
    });
  }

  return entries;
}
