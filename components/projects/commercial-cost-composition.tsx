import type { CostComposition } from "@/src/lib/projects/commercial-metrics";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import type { OrganisationCurrency } from "@/src/types/database";

const COMPOSITION_LABELS: { key: keyof Omit<CostComposition, "total">; label: string }[] =
  [
    { key: "materials", label: "Materials" },
    { key: "labour", label: "Labour" },
    { key: "subcontractor", label: "Subcontractor" },
    { key: "plant", label: "Plant / equipment" },
    { key: "allowances", label: "Allowances" },
    { key: "other", label: "Other" },
  ];

type CommercialCostCompositionProps = {
  composition: CostComposition;
  currency: OrganisationCurrency;
};

export function CommercialCostComposition({
  composition,
  currency,
}: CommercialCostCompositionProps) {
  const total = composition.total;

  return (
    <ul className="flex flex-col gap-2">
      {COMPOSITION_LABELS.map(({ key, label }) => {
        const value = composition[key];
        const percent =
          total > 0 ? Math.round((value / total) * 1000) / 10 : null;

        return (
          <li key={key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="text-foreground">{label}</span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {percent !== null ? formatPercent(percent) : "—"} ·{" "}
                {formatCurrency(value, currency)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{
                  width: `${Math.min(100, percent ?? 0)}%`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
