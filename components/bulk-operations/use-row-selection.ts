"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type UseRowSelectionOptions = {
  /** When false, selection is cleared. Use to reset on workspace change. */
  enabled?: boolean;
};

export function useRowSelection(options: UseRowSelectionOptions = {}) {
  const { enabled = true } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const lastAnchorRef = useRef<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastAnchorRef.current = null;
  }, []);

  const isSelected = useCallback(
    (id: string) => enabled && selectedIds.has(id),
    [enabled, selectedIds]
  );

  const toggleId = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectRange = useCallback((orderedIds: string[], fromId: string, toId: string) => {
    const start = orderedIds.indexOf(fromId);
    const end = orderedIds.indexOf(toId);
    if (start === -1 || end === -1) {
      return;
    }
    const [lo, hi] = start < end ? [start, end] : [end, start];
    const rangeIds = orderedIds.slice(lo, hi + 1);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const rangeId of rangeIds) {
        next.add(rangeId);
      }
      return next;
    });
  }, []);

  const handleRowSelect = useCallback(
    (id: string, orderedVisibleIds: string[], event?: React.MouseEvent) => {
      if (!enabled) {
        return;
      }

      if (event?.shiftKey && lastAnchorRef.current) {
        selectRange(orderedVisibleIds, lastAnchorRef.current, id);
        lastAnchorRef.current = id;
        return;
      }

      toggleId(id);
      lastAnchorRef.current = id;
    },
    [enabled, selectRange, toggleId]
  );

  const selectAllVisible = useCallback((visibleIds: string[]) => {
    if (!enabled || visibleIds.length === 0) {
      return;
    }
    setSelectedIds((current) => {
      const allSelected = visibleIds.every((id) => current.has(id));
      if (allSelected) {
        const next = new Set(current);
        for (const id of visibleIds) {
          next.delete(id);
        }
        return next;
      }
      const next = new Set(current);
      for (const id of visibleIds) {
        next.add(id);
      }
      return next;
    });
  }, [enabled]);

  const selectedCount = selectedIds.size;

  const getHeaderCheckboxState = useCallback(
    (visibleIds: string[]): boolean | "indeterminate" => {
      if (visibleIds.length === 0) {
        return false;
      }
      const selectedVisible = visibleIds.filter((id) => selectedIds.has(id));
      if (selectedVisible.length === 0) {
        return false;
      }
      if (selectedVisible.length === visibleIds.length) {
        return true;
      }
      return "indeterminate";
    },
    [selectedIds]
  );

  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

  return {
    selectedIds,
    selectedIdList,
    selectedCount,
    isSelected,
    handleRowSelect,
    selectAllVisible,
    clearSelection,
    getHeaderCheckboxState,
  };
}
