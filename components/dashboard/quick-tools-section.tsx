import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calculator01Icon,
  FileEditIcon,
  FolderAddIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const QUICK_TOOLS = [
  {
    title: "Start New Tender",
    description: "Create a project workspace.",
    href: "/projects/new",
    icon: FolderAddIcon,
    enabled: true,
  },
  {
    title: "Upload Documents",
    description: "Open a project to attach drawings and specs.",
    href: "/projects",
    icon: Upload01Icon,
    enabled: true,
  },
  {
    title: "Create Takeoff",
    description: "Build quantity lines in a project workspace.",
    href: "/projects",
    icon: FileEditIcon,
    enabled: true,
  },
  {
    title: "Build Pricing Schedule",
    description: "Price materials and labour in a project.",
    href: "/projects",
    icon: Calculator01Icon,
    enabled: true,
  },
  {
    title: "Generate Exclusions",
    description: "Record exclusions and assumptions per tender.",
    href: "/projects",
    icon: FileEditIcon,
    enabled: true,
  },
  {
    title: "Export Tender Pack",
    description: "Export when pricing and clarifications are complete.",
    href: "/projects",
    icon: Upload01Icon,
    enabled: true,
  },
] as const;

export function QuickToolsSection() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium text-foreground">Quick tools</h2>
        <p className="text-sm text-muted-foreground">
          Common tender tasks from one place.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {QUICK_TOOLS.map((tool) => (
          <Card key={tool.title} size="sm">
            <CardHeader className="gap-2 pb-2">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={tool.icon}
                  strokeWidth={1.75}
                  className="size-4 text-muted-foreground"
                />
                <CardTitle className="text-sm">{tool.title}</CardTitle>
              </div>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={tool.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
