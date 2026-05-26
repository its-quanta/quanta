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
import {
  CLARIFICATION_STATUS_LABELS,
  RFI_PRIORITY_LABELS,
} from "@/src/lib/clarifications/constants";
import {
  createClarificationAction,
  deleteClarificationAction,
  updateClarificationAction,
} from "@/src/lib/clarifications/actions";
import { formatDate } from "@/src/lib/format";
import type { RfiPriority, TakeoffItem, TenderClarification } from "@/src/types/database";

const selectClassName = cn(
  "h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function priorityBadgeClass(priority: RfiPriority | null): string {
  if (priority === "high") {
    return "border-destructive/50 bg-destructive/10 text-destructive";
  }
  if (priority === "medium") {
    return "border-amber-500/50 bg-amber-500/10 text-amber-900";
  }
  return "border-border text-muted-foreground";
}

type RfisPanelProps = {
  projectId: string;
  items: TenderClarification[];
  takeoffItems: TakeoffItem[];
};

export function RfisPanel({ projectId, items, takeoffItems }: RfisPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [drawingRef, setDrawingRef] = useState("");
  const [takeoffId, setTakeoffId] = useState("");
  const [priority, setPriority] = useState<RfiPriority>("medium");

  const takeoffById = new Map(takeoffItems.map((item) => [item.id, item]));

  function refresh() {
    router.refresh();
  }

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await createClarificationAction(projectId, {
        type: "rfi",
        title,
        description: description || null,
        related_drawing: drawingRef || null,
        related_takeoff_item_id: takeoffId || null,
        priority,
        status: "open",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      setDrawingRef("");
      setTakeoffId("");
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

  function handleRemove(id: string) {
    startTransition(async () => {
      await deleteClarificationAction(projectId, id);
      refresh();
    });
  }

  return (
    <Card id="rfis" size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">RFIs</CardTitle>
        <CardDescription className="text-xs">
          {items.length} recorded · requests for information
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const linkedTakeoff = item.related_takeoff_item_id
                ? takeoffById.get(item.related_takeoff_item_id)
                : undefined;

              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/20 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                    {item.priority ? (
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 text-xs", priorityBadgeClass(item.priority))}
                      >
                        {RFI_PRIORITY_LABELS[item.priority]}
                      </Badge>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {CLARIFICATION_STATUS_LABELS[item.status]}
                    </Badge>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  {item.related_drawing ? (
                    <p className="font-mono text-xs">Drawing {item.related_drawing}</p>
                  ) : null}
                  {linkedTakeoff ? (
                    <p className="text-xs text-muted-foreground">
                      {linkedTakeoff.trade} — {linkedTakeoff.item_name}
                    </p>
                  ) : null}
                  <div className="flex gap-1 pt-1">
                    <select
                      className={cn(selectClassName, "w-auto min-w-0 flex-1")}
                      value={item.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    >
                      {Object.entries(CLARIFICATION_STATUS_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => handleRemove(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        <SubmissionCollapsible
          title="Add RFI"
          summary="Question, drawing, takeoff link"
          defaultOpen={items.length === 0}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="rfi-question" className="text-xs">
                Question
              </Label>
              <Input
                id="rfi-question"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="rfi-detail" className="text-xs">
                Detail
              </Label>
              <Textarea
                id="rfi-detail"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rfi-drawing" className="text-xs">
                Drawing
              </Label>
              <Input
                id="rfi-drawing"
                value={drawingRef}
                onChange={(e) => setDrawingRef(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rfi-priority" className="text-xs">
                Priority
              </Label>
              <select
                id="rfi-priority"
                className={selectClassName}
                value={priority}
                onChange={(e) => setPriority(e.target.value as RfiPriority)}
              >
                {Object.entries(RFI_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="rfi-takeoff" className="text-xs">
                Takeoff link
              </Label>
              <select
                id="rfi-takeoff"
                className={selectClassName}
                value={takeoffId}
                onChange={(e) => setTakeoffId(e.target.value)}
              >
                <option value="">None</option>
                {takeoffItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.trade} — {item.item_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="mt-3 w-fit"
            disabled={isPending || !title.trim()}
            onClick={handleAdd}
          >
            Save RFI
          </Button>
        </SubmissionCollapsible>
      </CardContent>
    </Card>
  );
}
