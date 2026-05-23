import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CreateProjectForm() {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>New project</CardTitle>
        <CardDescription>
          Set up a tender workspace. Details will save once project persistence
          is connected.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-name">Project name</Label>
          <Input
            id="project-name"
            name="name"
            placeholder="Level 3 fitout — Smith Street"
            disabled
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-name">Client</Label>
          <Input
            id="client-name"
            name="client"
            placeholder="Client or main contractor"
            disabled
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              name="reference"
              placeholder="Job or tender number"
              disabled
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due-date">Tender due date</Label>
            <Input id="due-date" name="dueDate" type="date" disabled />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-3 border-t">
        <Button variant="outline" asChild>
          <Link href="/projects">Cancel</Link>
        </Button>
        <Button disabled title="Available when project database is connected">
          Create project
        </Button>
      </CardFooter>
    </Card>
  );
}
