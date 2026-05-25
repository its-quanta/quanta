import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PackageAssemblySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Package / Assembly Usage
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track how often standard packages and assemblies are applied across tenders.
        </p>
      </CardHeader>
      <CardContent>
        {/* TODO: Aggregate package_templates and assembly usage per organisation when libraries ship. */}
        <div className="rounded-lg border border-dashed border-border bg-background/60 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Package and assembly usage metrics will appear here once rate libraries
            are connected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
