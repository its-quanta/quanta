"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SubmissionCollapsible } from "@/components/submission/submission-collapsible";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DEFAULT_ASSUMPTION_TEMPLATES } from "@/src/lib/clarifications/constants";
import {
  addClarificationFromDefaultTemplateAction,
  addClarificationFromTemplateAction,
  createClarificationAction,
  deleteClarificationAction,
} from "@/src/lib/clarifications/actions";
import type {
  ClarificationTemplate,
  TenderClarification,
} from "@/src/types/database";

type TemplateOption = {
  id: string;
  title: string;
  source: "org" | "default";
  templateId?: string;
  defaultIndex?: number;
};

type AssumptionsPanelProps = {
  projectId: string;
  items: TenderClarification[];
  templates: ClarificationTemplate[];
};

export function AssumptionsPanel({
  projectId,
  items,
  templates,
}: AssumptionsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const orgTemplates = templates.filter((t) => t.type === "assumption");
  const templateOptions: TemplateOption[] = [
    ...orgTemplates.map((t) => ({
      id: t.id,
      title: t.title,
      source: "org" as const,
      templateId: t.id,
    })),
    ...DEFAULT_ASSUMPTION_TEMPLATES.map((t, index) => ({
      id: `default-${index}`,
      title: t.title,
      source: "default" as const,
      defaultIndex: index,
    })),
  ];

  const addedTitles = new Set(items.map((i) => i.title.toLowerCase()));

  function refresh() {
    router.refresh();
  }

  function addFromTemplate(option: TemplateOption) {
    setError(null);
    startTransition(async () => {
      const result =
        option.source === "org" && option.templateId
          ? await addClarificationFromTemplateAction(
              projectId,
              option.templateId,
              "assumption"
            )
          : await addClarificationFromDefaultTemplateAction(
              projectId,
              option.defaultIndex ?? 0,
              "assumption"
            );
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleCustomAdd() {
    setError(null);
    startTransition(async () => {
      const result = await createClarificationAction(projectId, {
        type: "assumption",
        title,
        description: description || null,
        status: "draft",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      refresh();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await deleteClarificationAction(projectId, id);
      refresh();
    });
  }

  return (
    <Card id="assumptions" size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Assumptions</CardTitle>
        <CardDescription className="text-xs">
          {items.length} recorded · conditions assumed in pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-md border border-border bg-muted/20 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    disabled={isPending}
                    onClick={() => handleRemove(item.id)}
                  >
                    Remove
                  </Button>
                </div>
                {item.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <SubmissionCollapsible
          title="Add assumption"
          summary="Templates or custom line"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {templateOptions.map((option) => {
                const isAdded = addedTitles.has(option.title.toLowerCase());
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isPending || isAdded}
                    onClick={() => addFromTemplate(option)}
                    className={cn(
                      "rounded-md border border-border p-2 text-left text-xs transition-colors hover:bg-muted/30",
                      "disabled:opacity-50",
                      isAdded && "border-emerald-500/40"
                    )}
                  >
                    <span className="font-medium">{option.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assumption-title" className="text-xs">
                  Title
                </Label>
                <Input
                  id="assumption-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assumption-desc" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="assumption-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              {error ? (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="w-fit"
                disabled={isPending || !title.trim()}
                onClick={handleCustomAdd}
              >
                Save assumption
              </Button>
            </div>
          </div>
        </SubmissionCollapsible>
      </CardContent>
    </Card>
  );
}
