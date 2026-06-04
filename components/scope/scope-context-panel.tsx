"use client";

import { memo, type ReactNode } from "react";

import { ScopeSelectedItemInspector } from "@/components/scope/scope-selected-item-inspector";
import { ScopeToolbar } from "@/components/scope/scope-toolbar";
import type { ScopePanelMode } from "@/components/scope/scope-panel-mode";
import type { ScopeTakeoffReadiness } from "@/components/scope/scope-takeoff-readiness";
import type {
  AiReviewItem,
  Document,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
} from "@/src/types/database";

type ScopeContextPanelProps = {
  panelMode: ScopePanelMode;
  onPanelModeChange: (mode: ScopePanelMode) => void;
  pendingSuggestionCount: number;
  takeoffLineCount: number;
  items: AiReviewItem[];
  tradeOptions: string[];
  tradeFilter: string | null;
  onTradeFilterChange: (trade: string | null) => void;
  onApproveHigh: (ids: string[]) => Promise<{ error: string | null }>;
  list: ReactNode;
  projectId: string;
  documentsById: ReadonlyMap<string, Document>;
  selectedSuggestion: AiReviewItem | null;
  selectedTakeoff: TakeoffItem | null;
  takeoffAssembly: TakeoffItemAssemblyWithPackage | null;
  takeoffReadiness: ScopeTakeoffReadiness | null;
  actionPending: boolean;
  onAccept: () => void;
  onAdjust: () => void;
  onReject: () => void;
  onTakeoffUpdated: (itemId: string, patch: Partial<TakeoffItem>) => void;
};

export const ScopeContextPanel = memo(function ScopeContextPanel({
  panelMode,
  onPanelModeChange,
  pendingSuggestionCount,
  takeoffLineCount,
  items,
  tradeOptions,
  tradeFilter,
  onTradeFilterChange,
  onApproveHigh,
  list,
  projectId,
  documentsById,
  selectedSuggestion,
  selectedTakeoff,
  takeoffAssembly,
  takeoffReadiness,
  actionPending,
  onAccept,
  onAdjust,
  onReject,
  onTakeoffUpdated,
}: ScopeContextPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col">
      <ScopeToolbar
        panelMode={panelMode}
        onPanelModeChange={onPanelModeChange}
        pendingSuggestionCount={pendingSuggestionCount}
        takeoffLineCount={takeoffLineCount}
        items={items}
        tradeOptions={tradeOptions}
        tradeFilter={tradeFilter}
        onTradeFilterChange={onTradeFilterChange}
        onApproveHigh={onApproveHigh}
      />

      <div className="flex min-h-0 flex-[1.1] flex-col overflow-hidden">{list}</div>

      <div className="flex min-h-0 max-h-[42%] flex-1 flex-col overflow-hidden">
        <ScopeSelectedItemInspector
          projectId={projectId}
          documentsById={documentsById}
          suggestion={panelMode === "suggestions" ? selectedSuggestion : null}
          takeoff={panelMode === "takeoff" ? selectedTakeoff : null}
          takeoffAssembly={takeoffAssembly}
          takeoffReadiness={takeoffReadiness}
          actionPending={actionPending}
          onAccept={onAccept}
          onAdjust={onAdjust}
          onReject={onReject}
          onTakeoffUpdated={onTakeoffUpdated}
        />
      </div>
    </aside>
  );
});
