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

export function EmptyProjectList() {
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
        <CardDescription className="max-w-sm">
          Create your first tender estimate. Upload drawings, build takeoffs,
          and price the job in one workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-6">
        <Button asChild size="lg">
          <Link href="/projects/new">Create project</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
