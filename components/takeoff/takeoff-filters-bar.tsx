"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MANUAL_TAKEOFF_STATUSES,
  selectClassName,
  TAKEOFF_TRADES,
} from "@/src/lib/takeoff/constants";
import { drawingReferenceSearchText } from "@/src/lib/takeoff/drawing-reference";
import type {
  Document,
  PricingItem,
  StandardLink,
  TakeoffItem,
  TakeoffItemAssembly,
} from "@/src/types/database";

export type WorkflowTakeoffFilter =
  | "all"
  | "no_package"
  | "no_pricing"
  | "no_drawing_reference"
  | "no_standards_linked"
  | "outstanding_review";

export type TakeoffFilters = {
  search: string;
  trade: string;
  status: string;
  reviewed: string;
  documentId: string;
  workflow: WorkflowTakeoffFilter;
};

export const defaultTakeoffFilters: TakeoffFilters = {
  search: "",
  trade: "all",
  status: "all",
  reviewed: "all",
  documentId: "all",
  workflow: "all",
};

type TakeoffFiltersBarProps = {
  filters: TakeoffFilters;
  onChange: (filters: TakeoffFilters) => void;
  documents: Document[];
  tradesInUse: string[];
  showWorkflowFilter?: boolean;
};

export function TakeoffFiltersBar({
  filters,
  onChange,
  documents,
  tradesInUse,
  showWorkflowFilter = false,
}: TakeoffFiltersBarProps) {
  const tradeOptions = Array.from(
    new Set([...TAKEOFF_TRADES, ...tradesInUse].sort())
  );

  function update<K extends keyof TakeoffFilters>(key: K, value: TakeoffFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
        <Label htmlFor="takeoff-search" className="text-xs">
          Search
        </Label>
        <Input
          id="takeoff-search"
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Item, drawing, sheet, detail, spec, notes…"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="takeoff-filter-trade" className="text-xs">
          Trade
        </Label>
        <select
          id="takeoff-filter-trade"
          className={selectClassName}
          value={filters.trade}
          onChange={(event) => update("trade", event.target.value)}
        >
          <option value="all">All trades</option>
          {tradeOptions.map((trade) => (
            <option key={trade} value={trade}>
              {trade}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="takeoff-filter-status" className="text-xs">
          Status
        </Label>
        <select
          id="takeoff-filter-status"
          className={selectClassName}
          value={filters.status}
          onChange={(event) => update("status", event.target.value)}
        >
          <option value="all">All statuses</option>
          {MANUAL_TAKEOFF_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
          <option value="ai_draft">AI draft</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="takeoff-filter-reviewed" className="text-xs">
          Reviewed
        </Label>
        <select
          id="takeoff-filter-reviewed"
          className={selectClassName}
          value={filters.reviewed}
          onChange={(event) => update("reviewed", event.target.value)}
        >
          <option value="all">All</option>
          <option value="yes">Reviewed</option>
          <option value="no">Unreviewed</option>
        </select>
      </div>

      {documents.length > 0 ? (
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="takeoff-filter-document" className="text-xs">
            Source document
          </Label>
          <select
            id="takeoff-filter-document"
            className={selectClassName}
            value={filters.documentId}
            onChange={(event) => update("documentId", event.target.value)}
          >
            <option value="all">All documents</option>
            <option value="none">No document linked</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.file_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showWorkflowFilter ? (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="takeoff-filter-workflow" className="text-xs">
            Workflow filter
          </Label>
          <select
            id="takeoff-filter-workflow"
            className={selectClassName}
            value={filters.workflow}
            onChange={(event) =>
              update("workflow", event.target.value as WorkflowTakeoffFilter)
            }
          >
            <option value="all">All lines</option>
            <option value="no_package">No package</option>
            <option value="no_pricing">No pricing</option>
            <option value="no_drawing_reference">No drawing reference</option>
            <option value="no_standards_linked">No standards linked</option>
            <option value="outstanding_review">Outstanding review</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}

function hasDrawingReference(item: TakeoffItem): boolean {
  if (item.drawing_reference?.trim()) {
    return true;
  }
  if (item.document_page_id) {
    return true;
  }
  if (item.sheet_number?.trim()) {
    return true;
  }
  return false;
}

export function applyWorkflowTakeoffFilter(
  items: TakeoffItem[],
  workflow: WorkflowTakeoffFilter,
  context: {
    takeoffAssemblies: TakeoffItemAssembly[];
    pricingItems: PricingItem[];
    standardLinks: StandardLink[];
  }
): TakeoffItem[] {
  if (workflow === "all") {
    return items;
  }

  const assemblyIds = new Set(
    context.takeoffAssemblies.map((row) => row.takeoff_item_id)
  );
  const pricedIds = new Set(
    context.pricingItems.map((row) => row.takeoff_item_id)
  );
  const standardsIds = new Set(
    context.standardLinks
      .filter((link) => link.entity_type === "takeoff_item")
      .map((link) => link.entity_id)
  );

  return items.filter((item) => {
    if (item.status === "excluded") {
      return false;
    }

    switch (workflow) {
      case "no_package":
        return !assemblyIds.has(item.id);
      case "no_pricing":
        return !pricedIds.has(item.id);
      case "no_drawing_reference":
        return !hasDrawingReference(item);
      case "no_standards_linked":
        return !standardsIds.has(item.id);
      case "outstanding_review":
        return !item.reviewed;
      default:
        return true;
    }
  });
}

export function filterTakeoffItems(
  items: TakeoffItem[],
  filters: TakeoffFilters,
  workflowContext?: {
    takeoffAssemblies: TakeoffItemAssembly[];
    pricingItems: PricingItem[];
    standardLinks: StandardLink[];
  }
): TakeoffItem[] {
  const query = filters.search.trim().toLowerCase();

  let filtered = items.filter((item) => {
    if (filters.trade !== "all" && item.trade !== filters.trade) {
      return false;
    }

    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    if (filters.reviewed === "yes" && !item.reviewed) {
      return false;
    }

    if (filters.reviewed === "no" && item.reviewed) {
      return false;
    }

    if (filters.documentId === "none" && item.source_document_id) {
      return false;
    }

    if (
      filters.documentId !== "all" &&
      filters.documentId !== "none" &&
      item.source_document_id !== filters.documentId
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    return drawingReferenceSearchText(item).includes(query);
  });

  if (filters.workflow !== "all" && workflowContext) {
    filtered = applyWorkflowTakeoffFilter(
      filtered,
      filters.workflow,
      workflowContext
    );
  }

  return filtered;
}
