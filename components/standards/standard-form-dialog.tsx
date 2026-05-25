"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  STANDARD_JURISDICTIONS,
  STANDARD_TRADES,
  STANDARD_TYPES,
} from "@/src/lib/standards/constants";
import type { Standard, StandardInput, StandardType } from "@/src/types/database";

export type StandardFormValues = {
  reference_code: string;
  name: string;
  standard_type: StandardType;
  trade: string;
  jurisdiction: string;
  description: string;
  notes: string;
  source_url: string;
  is_active: boolean;
};

export const defaultStandardFormValues: StandardFormValues = {
  reference_code: "",
  name: "",
  standard_type: "custom",
  trade: "",
  jurisdiction: "",
  description: "",
  notes: "",
  source_url: "",
  is_active: true,
};

export function standardToFormValues(standard: Standard): StandardFormValues {
  return {
    reference_code: standard.reference_code,
    name: standard.name,
    standard_type: standard.standard_type,
    trade: standard.trade ?? "",
    jurisdiction: standard.jurisdiction ?? "",
    description: standard.description ?? "",
    notes: standard.notes ?? "",
    source_url: standard.source_url ?? "",
    is_active: standard.is_active,
  };
}

export function parseStandardForm(
  values: StandardFormValues
): { data?: StandardInput; error?: string } {
  if (!values.reference_code.trim()) {
    return { error: "Reference code is required." };
  }
  if (!values.name.trim()) {
    return { error: "Name is required." };
  }

  return {
    data: {
      reference_code: values.reference_code.trim(),
      name: values.name.trim(),
      standard_type: values.standard_type,
      trade: values.trade.trim() || null,
      jurisdiction: values.jurisdiction.trim() || null,
      description: values.description.trim() || null,
      notes: values.notes.trim() || null,
      source_url: values.source_url.trim() || null,
      is_active: values.is_active,
    },
  };
}

type StandardFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialValues?: StandardFormValues;
  submitLabel: string;
  onSubmit: (data: StandardInput) => Promise<{ error?: string }>;
  onSuccess?: () => void;
};

export function StandardFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValues = defaultStandardFormValues,
  submitLabel,
  onSubmit,
  onSuccess,
}: StandardFormDialogProps) {
  const [form, setForm] = useState<StandardFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(initialValues);
      setError(null);
    }
  }, [open, initialValues]);

  function update<K extends keyof StandardFormValues>(
    key: K,
    value: StandardFormValues[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseStandardForm(form);

    if (parsed.error || !parsed.data) {
      setError(parsed.error ?? "Invalid form.");
      return;
    }

    setError(null);
    const data = parsed.data;
    startTransition(async () => {
      const result = await onSubmit(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="standard-reference">Reference code</Label>
              <Input
                id="standard-reference"
                value={form.reference_code}
                onChange={(e) => update("reference_code", e.target.value)}
                placeholder="NZS 3604"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="standard-name">Name</Label>
              <Input
                id="standard-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="standard-type">Type</Label>
              <Select
                value={form.standard_type}
                onValueChange={(value) =>
                  update("standard_type", value as StandardType)
                }
                disabled={isPending}
              >
                <SelectTrigger id="standard-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="standard-jurisdiction">Jurisdiction</Label>
              <Select
                value={form.jurisdiction || "__none__"}
                onValueChange={(value) =>
                  update(
                    "jurisdiction",
                    value === "__none__" ? "" : value
                  )
                }
                disabled={isPending}
              >
                <SelectTrigger id="standard-jurisdiction">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {STANDARD_JURISDICTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="standard-trade">Trade</Label>
              <Select
                value={form.trade || "__none__"}
                onValueChange={(value) =>
                  update("trade", value === "__none__" ? "" : value)
                }
                disabled={isPending}
              >
                <SelectTrigger id="standard-trade">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {STANDARD_TRADES.map((trade) => (
                    <SelectItem key={trade} value={trade}>
                      {trade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="standard-description">Description</Label>
              <Textarea
                id="standard-description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={2}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="standard-url">Source URL</Label>
              <Input
                id="standard-url"
                type="url"
                value={form.source_url}
                onChange={(e) => update("source_url", e.target.value)}
                placeholder="https://"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="standard-notes">Notes</Label>
              <Textarea
                id="standard-notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={2}
                disabled={isPending}
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
