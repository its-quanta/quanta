"use client";

import { useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

type InlineEditCellProps = {
  value: string;
  displayValue?: string;
  type?: "text" | "number";
  className?: string;
  inputClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  parse?: (raw: string) => string | number | null;
  onSave: (value: string | number) => Promise<{ error?: string } | void>;
};

export function InlineEditCell({
  value,
  displayValue,
  type = "text",
  className,
  inputClassName,
  align = "left",
  disabled = false,
  parse,
  onSave,
}: InlineEditCellProps) {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  function commit() {
    if (disabled || isPending) {
      return;
    }

    const trimmed = draft.trim();
    if (trimmed === value.trim()) {
      setIsEditing(false);
      return;
    }

    const parsed = parse ? parse(trimmed) : trimmed;
    if (parsed === null) {
      setError("Invalid value");
      setDraft(value);
      setIsEditing(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await onSave(parsed);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setDraft(value);
      }
      setIsEditing(false);
    });
  }

  if (isEditing) {
    return (
      <div className={cn("min-w-[4rem]", className)}>
        <input
          type={type}
          value={draft}
          autoFocus
          disabled={isPending}
          className={cn(
            "h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-sm tabular-nums outline-none",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            align === "right" && "text-right",
            inputClassName
          )}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(value);
              setIsEditing(false);
            }
          }}
        />
        {error ? (
          <p className="mt-0.5 text-xs text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "w-full rounded px-1 py-0.5 text-left text-sm transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        align === "right" && "text-right font-mono tabular-nums",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      onDoubleClick={() => !disabled && setIsEditing(true)}
      onClick={(event) => {
        if (event.detail === 2) {
          return;
        }
      }}
      title="Double-click to edit"
    >
      {(displayValue ?? value) || "—"}
    </button>
  );
}
