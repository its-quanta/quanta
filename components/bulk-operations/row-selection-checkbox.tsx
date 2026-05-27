"use client";

import { cn } from "@/lib/utils";

type RowSelectionCheckboxProps = {
  checked: boolean | "indeterminate";
  onChange: () => void;
  onClick?: (event: React.MouseEvent<HTMLInputElement>) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

export function RowSelectionCheckbox({
  checked,
  onChange,
  onClick,
  ariaLabel,
  disabled = false,
  className,
}: RowSelectionCheckboxProps) {
  const isIndeterminate = checked === "indeterminate";
  const isChecked = checked === true;

  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 rounded border border-input accent-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
      checked={isIndeterminate ? false : isChecked}
      ref={(element) => {
        if (element) {
          element.indeterminate = isIndeterminate;
        }
      }}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(event) => {
        event.stopPropagation();
        onChange();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    />
  );
}
