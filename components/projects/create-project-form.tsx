"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createProjectAction,
  type CreateProjectState,
} from "@/src/lib/projects/actions";
import { PROJECT_TYPES } from "@/src/types/database";

const initialState: CreateProjectState = {};

const selectClassName = cn(
  "h-7 w-full rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

export function CreateProjectForm() {
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    initialState
  );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New tender project</CardTitle>
        <CardDescription>
          Set up a workspace for takeoffs, pricing, exclusions and export.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Level 3 fitout — Smith Street"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientName">Client name</Label>
            <Input
              id="clientName"
              name="clientName"
              placeholder="Client or main contractor"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteAddress">Address</Label>
            <Input
              id="siteAddress"
              name="siteAddress"
              placeholder="Site address"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="projectType">Project type</Label>
              <select
                id="projectType"
                name="projectType"
                className={selectClassName}
                defaultValue=""
              >
                <option value="" disabled>
                  Select type
                </option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tradeScope">Trade scope</Label>
              <Input
                id="tradeScope"
                name="tradeScope"
                placeholder="e.g. Suspended ceilings, partitions"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenderDueDate">Due date</Label>
            <Input id="tenderDueDate" name="tenderDueDate" type="date" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Internal notes, scope reminders, or tender references"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-between gap-3 border-t">
          <Button variant="outline" asChild>
            <Link href="/projects">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create project"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
