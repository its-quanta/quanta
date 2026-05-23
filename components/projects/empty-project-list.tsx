import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Folder01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EmptyProjectListProps = {
  message?: string;
};

export function EmptyProjectList({
  message = "Create your first tender project to start building structured takeoffs, pricing schedules and exclusions.",
}: EmptyProjectListProps) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-[10px] bg-muted">
          <HugeiconsIcon
            icon={Folder01Icon}
            strokeWidth={1.75}
            className="size-6 text-muted-foreground"
          />
        </div>
        <CardTitle className="text-lg">No projects yet</CardTitle>
        <CardDescription className="max-w-md">{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-6">
        <Button asChild size="lg">
          <Link href="/projects/new">Create project</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
