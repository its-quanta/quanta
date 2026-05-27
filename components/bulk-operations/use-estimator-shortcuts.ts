"use client";

import { useEffect } from "react";

type EstimatorShortcutsHandlers = {
  enabled?: boolean;
  onSearch?: () => void;
  onEditSelected?: () => void;
  onApplyPackage?: () => void;
  onMarkReviewed?: () => void;
  onDeleteSelected?: () => void;
  onEscape?: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export function useEstimatorShortcuts(handlers: EstimatorShortcutsHandlers) {
  const { enabled = true } = handlers;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape" && handlers.onEscape) {
          handlers.onEscape();
        }
        return;
      }

      if (event.key === "Escape" && handlers.onEscape) {
        event.preventDefault();
        handlers.onEscape();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "/" && handlers.onSearch) {
        event.preventDefault();
        handlers.onSearch();
        return;
      }

      if (key === "e" && handlers.onEditSelected) {
        event.preventDefault();
        handlers.onEditSelected();
        return;
      }

      if (key === "p" && handlers.onApplyPackage) {
        event.preventDefault();
        handlers.onApplyPackage();
        return;
      }

      if (key === "r" && handlers.onMarkReviewed) {
        event.preventDefault();
        handlers.onMarkReviewed();
        return;
      }

      if (key === "delete" && handlers.onDeleteSelected) {
        event.preventDefault();
        handlers.onDeleteSelected();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handlers]);
}
