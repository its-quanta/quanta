"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type BulkValueSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  inputType?: "text" | "number";
  selectedCount: number;
  onApply: (value: string) => Promise<{ error?: string; message?: string }>;
  onSuccess?: (message: string) => void;
  onComplete?: () => void;
};

export function BulkValueSheet({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  inputType = "text",
  selectedCount,
  onApply,
  onSuccess,
  onComplete,
}: BulkValueSheetProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await onApply(value);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      onSuccess?.(result.message ?? "Updated.");
      onComplete?.();
      onOpenChange(false);
      setValue("");
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {description} ({selectedCount} selected)
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-value-input">{label}</Label>
              <Input
                id="bulk-value-input"
                type={inputType}
                value={value}
                placeholder={placeholder}
                onChange={(event) => setValue(event.target.value)}
                disabled={isPending}
              />
            </div>
            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>
          <SheetFooter className="border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !value.trim()}>
              {isPending ? "Applying…" : "Apply"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
