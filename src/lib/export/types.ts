import type { OrganisationCurrency } from "@/src/types/database";
import type { OrganisationSettingsSnapshot } from "@/src/lib/organisations/settings";
import type { PricingItemWithTakeoff } from "@/src/lib/pricing/queries";
import type {
  Document,
  Project,
  ProjectLabourItem,
  ProjectMaterialItem,
  TakeoffItem,
  TakeoffItemAssemblyWithPackage,
  TenderClarification,
} from "@/src/types/database";

export type ExportType =
  | "pricing"
  | "materials"
  | "labour"
  | "commercial"
  | "clarifications"
  | "full-pack";

export type ExportTypeMeta = {
  id: ExportType;
  title: string;
  description: string;
  fileLabel: string;
};

export const EXPORT_TYPES: ExportTypeMeta[] = [
  {
    id: "pricing",
    title: "Pricing schedule",
    description: "Priced takeoff lines with rates, totals, and drawing references.",
    fileLabel: "Pricing",
  },
  {
    id: "materials",
    title: "Materials schedule",
    description: "Generated material build-up from packages and takeoff.",
    fileLabel: "Materials",
  },
  {
    id: "labour",
    title: "Labour schedule",
    description: "Labour allowances with cost and charge rates.",
    fileLabel: "Labour",
  },
  {
    id: "commercial",
    title: "Commercial summary",
    description: "Tender totals, coverage metrics, risk flags, and trade breakdown.",
    fileLabel: "Commercial",
  },
  {
    id: "clarifications",
    title: "Tender clarifications",
    description: "Exclusions, assumptions, RFIs, and clarifications.",
    fileLabel: "Clarifications",
  },
  {
    id: "full-pack",
    title: "Tender full pack",
    description: "Multi-sheet workbook with summary, pricing, materials, labour, and more.",
    fileLabel: "FullPack",
  },
];

export type ExportProjectData = {
  project: Project;
  currency: OrganisationCurrency;
  organisationSettings: OrganisationSettingsSnapshot;
  pricingItems: PricingItemWithTakeoff[];
  takeoffItems: TakeoffItem[];
  takeoffAssemblies: TakeoffItemAssemblyWithPackage[];
  materialItems: ProjectMaterialItem[];
  labourItems: ProjectLabourItem[];
  clarifications: TenderClarification[];
  documents: Document[];
  scopeGapsTotal: number;
  exclusionsDraftedPercent: number | null;
};

export type ExportSheetDefinition = {
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  currencyColumnIndexes?: number[];
  percentColumnIndexes?: number[];
  marginPercentColumnIndex?: number;
  riskFlagRowIndexes?: number[];
};

export type BuiltExport = {
  fileName: string;
  rowCount: number;
  sheets: ExportSheetDefinition[];
};

export type StoredExportMeta = {
  exportedAt: string;
  rowCount: number;
  sizeBytes: number;
};
