"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import {
  CLARIFICATION_STATUS_LABELS,
  DEFAULT_ASSUMPTION_TEMPLATES,
  DEFAULT_EXCLUSION_TEMPLATES,
  RFI_PRIORITY_LABELS,
} from "@/src/lib/clarifications/constants";
import {
  addClarificationFromDefaultTemplateAction,
  addClarificationFromTemplateAction,
  createClarificationAction,
  deleteClarificationAction,
  updateClarificationAction,
} from "@/src/lib/clarifications/actions";
import { formatDate } from "@/src/lib/format";
import type {
  ClarificationTemplate,
  ClarificationType,
  RfiPriority,
  TakeoffItem,
  TenderClarification,
} from "@/src/types/database";

const selectClassName = cn(
  "h-9 w-full rounded-md border border-input bg-input/20 px-2.5 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

type ClarificationSectionProps = {
  projectId: string;
  type: "exclusion" | "assumption" | "rfi";
  title: string;
  description: string;
  items: TenderClarification[];
  templates: ClarificationTemplate[];
  takeoffItems?: TakeoffItem[];
  sectionId: string;
};

export function ClarificationSection({
  projectId,
  type,
  title,
  description,
  items,
  templates,
  takeoffItems = [],
  sectionId,
}: ClarificationSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDrawingRef, setFormDrawingRef] = useState("");
  const [formTakeoffId, setFormTakeoffId] = useState("");
  const [formPriority, setFormPriority] = useState<RfiPriority>("medium");

  const typeTemplates = templates.filter((template) => template.type === type);
  const defaultTemplates =
    type === "exclusion"
      ? DEFAULT_EXCLUSION_TEMPLATES
      : type === "assumption"
        ? DEFAULT_ASSUMPTION_TEMPLATES
        : [];

  function refresh() {
    router.refresh();
  }

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await createClarificationAction(projectId, {
        type,
        title: formTitle,
        description: formDescription || null,
        category: formCategory || null,
        related_drawing: type === "rfi" ? formDrawingRef || null : null,
        related_takeoff_item_id:
          type === "rfi" && formTakeoffId ? formTakeoffId : null,
        priority: type === "rfi" ? formPriority : null,
        status: type === "rfi" ? "open" : "draft",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setFormTitle("");
      setFormDescription("");
      setFormCategory("");
      setFormDrawingRef("");
      setFormTakeoffId("");
      refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteClarificationAction(projectId, id);
      refresh();
    });
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateClarificationAction(projectId, id, {
        status: status as TenderClarification["status"],
      });
      refresh();
    });
  }

  function handleAddFromTemplate(templateId: string) {
    startTransition(async () => {
      const result = await addClarificationFromTemplateAction(
        projectId,
        templateId,
        type
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleAddFromDefault(index: number) {
    if (type === "rfi") {
      return;
    }
    startTransition(async () => {
      const result = await addClarificationFromDefaultTemplateAction(
        projectId,
        index,
        type
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <Card id={sectionId}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {type === "rfi" ? "RFIs" : `${type}s`} recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.category ? (
                        <Badge variant="outline">{item.category}</Badge>
                      ) : null}
                      <Badge variant="outline">
                        {CLARIFICATION_STATUS_LABELS[item.status]}
                      </Badge>
                      {item.priority ? (
                        <Badge variant="outline">
                          {RFI_PRIORITY_LABELS[item.priority]}
                        </Badge>
                      ) : null}
                      {type === "rfi" ? (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </span>
                      ) : null}
                    </div>
                    {item.related_drawing ? (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Drawing: {item.related_drawing}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {type === "rfi" ? (
                      <select
                        className={cn(selectClassName, "h-8 w-auto min-w-[7rem]")}
                        value={item.status}
                        disabled={isPending}
                        onChange={(event) =>
                          handleStatusChange(item.id, event.target.value)
                        }
                      >
                        {Object.entries(CLARIFICATION_STATUS_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(typeTemplates.length > 0 || defaultTemplates.length > 0) && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Add from template
            </p>
            <div className="flex flex-wrap gap-2">
              {typeTemplates.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAddFromTemplate(template.id)}
                >
                  {template.title}
                </Button>
              ))}
              {typeTemplates.length === 0 &&
                defaultTemplates.map((template, index) => (
                  <Button
                    key={template.title}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleAddFromDefault(index)}
                  >
                    {template.title}
                  </Button>
                ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Add {type === "rfi" ? "RFI" : type}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`${sectionId}-title`}>
                {type === "rfi" ? "Question" : "Title"}
              </Label>
              <Input
                id={`${sectionId}-title`}
                value={formTitle}
                onChange={(event) => setFormTitle(event.target.value)}
                placeholder={
                  type === "rfi"
                    ? "Partition detail unclear on A-302"
                    : "Electrical by others"
                }
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`${sectionId}-description`}>Description</Label>
              <Textarea
                id={`${sectionId}-description`}
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
                rows={2}
                placeholder="Detail for the tender pack"
              />
            </div>
            {type !== "rfi" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${sectionId}-category`}>Category</Label>
                <Input
                  id={`${sectionId}-category`}
                  value={formCategory}
                  onChange={(event) => setFormCategory(event.target.value)}
                  placeholder="trade"
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${sectionId}-drawing`}>Related drawing</Label>
                  <Input
                    id={`${sectionId}-drawing`}
                    value={formDrawingRef}
                    onChange={(event) => setFormDrawingRef(event.target.value)}
                    placeholder="A-302"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${sectionId}-takeoff`}>Related takeoff</Label>
                  <select
                    id={`${sectionId}-takeoff`}
                    className={selectClassName}
                    value={formTakeoffId}
                    onChange={(event) => setFormTakeoffId(event.target.value)}
                  >
                    <option value="">None</option>
                    {takeoffItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.trade} — {item.item_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${sectionId}-priority`}>Priority</Label>
                  <select
                    id={`${sectionId}-priority`}
                    className={selectClassName}
                    value={formPriority}
                    onChange={(event) =>
                      setFormPriority(event.target.value as RfiPriority)
                    }
                  >
                    {Object.entries(RFI_PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="w-fit"
            disabled={isPending || !formTitle.trim()}
            onClick={handleAdd}
          >
            {isPending ? "Saving…" : `Add ${type === "rfi" ? "RFI" : type}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
