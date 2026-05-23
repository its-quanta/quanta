import Link from "next/link";

import { Button } from "@/components/ui/button";

type TenderCommandHeaderProps = {
  welcomeName: string;
};

export function TenderCommandHeader({ welcomeName }: TenderCommandHeaderProps) {
  return (
    <section className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm text-muted-foreground">Tender Command Centre</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {welcomeName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track tenders, pricing progress, risks and upcoming deadlines.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href="/projects/new">Create project</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/projects">View projects</Link>
        </Button>
      </div>
    </section>
  );
}
