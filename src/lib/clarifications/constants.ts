import type { ClarificationTemplateType } from "@/src/types/database";

export const CLARIFICATION_STATUS_LABELS = {
  draft: "Draft",
  open: "Open",
  answered: "Answered",
  closed: "Closed",
} as const;

export const RFI_PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

export const EXCLUSION_CATEGORIES = [
  "trade",
  "temporary_works",
  "hours",
  "fire",
  "structure",
  "other",
] as const;

export const ASSUMPTION_CATEGORIES = [
  "site_access",
  "substrate",
  "working_hours",
  "conditions",
  "other",
] as const;

export type DefaultTemplateSeed = {
  type: ClarificationTemplateType;
  title: string;
  description: string;
  category: string;
};

export const DEFAULT_EXCLUSION_TEMPLATES: DefaultTemplateSeed[] = [
  {
    type: "exclusion",
    title: "Electrical by others",
    description: "All electrical supply, containment, and terminations by others.",
    category: "trade",
  },
  {
    type: "exclusion",
    title: "Structural steel excluded",
    description: "Structural steel supply and installation excluded from this tender.",
    category: "structure",
  },
  {
    type: "exclusion",
    title: "Temporary works excluded",
    description: "Scaffolding, hoarding, and temporary services excluded unless noted.",
    category: "temporary_works",
  },
  {
    type: "exclusion",
    title: "After-hours work excluded",
    description: "Works assumed during standard working hours only.",
    category: "hours",
  },
  {
    type: "exclusion",
    title: "Fire stopping excluded",
    description: "Penetration fire stopping and certification by others.",
    category: "fire",
  },
];

export const DEFAULT_ASSUMPTION_TEMPLATES: DefaultTemplateSeed[] = [
  {
    type: "assumption",
    title: "Site access unrestricted",
    description: "Unrestricted access to work areas during standard hours.",
    category: "site_access",
  },
  {
    type: "assumption",
    title: "Existing substrate suitable",
    description: "Substrate is sound, dry, and suitable to receive our work.",
    category: "substrate",
  },
  {
    type: "assumption",
    title: "Standard working hours assumed",
    description: "Monday to Friday, 7:00–17:00 unless stated otherwise.",
    category: "working_hours",
  },
  {
    type: "assumption",
    title: "Hidden conditions excluded",
    description: "No allowance for latent conditions or concealed services.",
    category: "conditions",
  },
];

export const DEFAULT_CLARIFICATION_TEMPLATES: DefaultTemplateSeed[] = [
  ...DEFAULT_EXCLUSION_TEMPLATES,
  ...DEFAULT_ASSUMPTION_TEMPLATES,
];
