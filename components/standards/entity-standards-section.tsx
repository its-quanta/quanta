"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  linkStandardAction,
  unlinkStandardAction,
} from "@/src/lib/standards/actions";
import { STANDARD_TYPES } from "@/src/lib/standards/constants";
import type {
  Standard,
  StandardLinkEntityType,
  StandardLinkWithStandard,
} from "@/src/types/database";

type EntityStandardsSectionProps = {
  entityType: StandardLinkEntityType;
  entityId: string;
  entityLabel: string;
  projectId?: string | null;
  initialLinks: StandardLinkWithStandard[];
  availableStandards: Standard[];
};

export function EntityStandardsSection({
  entityType,
  entityId,
  entityLabel,
  projectId = null,
  initialLinks,
  availableStandards,
}: EntityStandardsSectionProps) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const linkedIds = new Set(links.map((link) => link.standard_id));
  const linkableStandards = availableStandards.filter(
    (standard) => standard.is_active && !linkedIds.has(standard.id)
  );

  function handleLink() {
    if (!selectedStandardId) {
      setError("Select a standard to link.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await linkStandardAction(
        selectedStandardId,
        entityType,
        entityId,
        projectId
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setSelectedStandardId("");
      router.refresh();
    });
  }

  function handleUnlink(linkId: string) {
    startTransition(async () => {
      const result = await unlinkStandardAction(linkId, projectId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Linked standards</CardTitle>
        <CardDescription>
          Citations for {entityLabel}. Manage the library in{" "}
          <Link href="/standards" className="text-primary hover:underline">
            Standards
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No standards linked yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-medium">
                    {link.standard.reference_code}
                  </p>
                  <p className="text-sm text-foreground">{link.standard.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {STANDARD_TYPES.find(
                      (t) => t.value === link.standard.standard_type
                    )?.label ?? link.standard.standard_type}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleUnlink(link.id)}
                >
                  Remove link
                </Button>
              </li>
            ))}
          </ul>
        )}

        {linkableStandards.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {availableStandards.length === 0
              ? "Add standards in the library first."
              : "All active standards are already linked."}
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Select
                value={selectedStandardId}
                onValueChange={setSelectedStandardId}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select standard" />
                </SelectTrigger>
                <SelectContent>
                  {linkableStandards.map((standard) => (
                    <SelectItem key={standard.id} value={standard.id}>
                      {standard.reference_code} — {standard.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !selectedStandardId}
              onClick={handleLink}
            >
              Link standard
            </Button>
          </div>
        )}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
