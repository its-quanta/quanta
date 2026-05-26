export type ProfileRole = "owner" | "admin" | "estimator" | "viewer";

export const PROFILE_ROLES: ProfileRole[] = [
  "owner",
  "admin",
  "estimator",
  "viewer",
];

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  organisation_id: string | null;
  role: ProfileRole | null;
  created_at?: string;
  updated_at?: string;
};

export type OrganisationProfile = Profile & {
  organisation_id: string;
  role: ProfileRole;
};

export type OrganisationCurrency = "NZD" | "AUD" | "GBP" | "USD" | "EUR";

export type OrganisationCountry =
  | "new_zealand"
  | "australia"
  | "united_kingdom"
  | "united_states"
  | "europe"
  | "other";

export type Organisation = {
  id: string;
  name: string;
  country: OrganisationCountry | null;
  currency: OrganisationCurrency | null;
  tax_rate: number | null;
  default_margin_percentage: number | null;
  default_markup_percentage: number | null;
  default_labour_cost_rate: number | null;
  default_labour_charge_rate: number | null;
  created_at?: string;
  updated_at?: string;
};

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type OrganisationInvite = {
  id: string;
  organisation_id: string;
  token: string;
  email: string | null;
  role: ProfileRole;
  status: InviteStatus;
  invited_by: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at?: string;
};

export type ProjectStatus =
  | "draft"
  | "in_review"
  | "submitted"
  | "won"
  | "lost"
  | "archived";

export type Project = {
  id: string;
  organisation_id: string;
  name: string;
  client_name: string | null;
  site_address: string | null;
  project_type: string | null;
  trade_scope: string | null;
  tender_due_date: string | null;
  status: ProjectStatus;
  notes: string | null;
  estimated_value: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const PROJECT_STATUSES: ProjectStatus[] = [
  "draft",
  "in_review",
  "submitted",
  "won",
  "lost",
  "archived",
];

export const PROJECT_TYPES = [
  "Fitout",
  "Refurbishment",
  "New build",
  "Demolition",
  "Joinery package",
  "Ceiling package",
  "Flooring package",
  "Specialist install",
  "Other",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export type DocumentProcessingStatus = "pending" | "ready" | "failed";

export type DocumentClassification =
  | "architectural_drawings"
  | "structural_drawings"
  | "specification"
  | "schedule"
  | "scope_document"
  | "photos_images"
  | "other";

export type Document = {
  id: string;
  organisation_id: string;
  project_id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  document_type: DocumentClassification;
  page_count: number | null;
  processing_status: DocumentProcessingStatus;
  ai_summary: string | null;
  uploaded_by: string | null;
  created_at: string;
};

/** Indexed page/sheet within an uploaded document (for structured takeoff links). */
export type DocumentPage = {
  id: string;
  organisation_id: string;
  document_id: string;
  page_number: number;
  sheet_number: string | null;
  sheet_title: string | null;
  created_at: string;
  updated_at: string;
};

export type TakeoffItemStatus =
  | "draft"
  | "ai_draft"
  | "needs_review"
  | "reviewed"
  | "priced"
  | "excluded";

export type TakeoffItem = {
  id: string;
  organisation_id: string;
  project_id: string;
  source_document_id: string | null;
  document_page_id: string | null;
  trade: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  drawing_reference: string | null;
  page_number: number | null;
  sheet_number: string | null;
  detail_reference: string | null;
  specification_reference: string | null;
  confidence_score: number | null;
  ai_generated: boolean;
  reviewed: boolean;
  status: TakeoffItemStatus;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TakeoffItemUpdate = Partial<
  Pick<
    TakeoffItem,
    | "source_document_id"
    | "document_page_id"
    | "trade"
    | "item_name"
    | "description"
    | "quantity"
    | "unit"
    | "drawing_reference"
    | "page_number"
    | "sheet_number"
    | "detail_reference"
    | "specification_reference"
    | "notes"
    | "status"
    | "reviewed"
  >
>;

export type TakeoffItemAssembly = {
  id: string;
  organisation_id: string;
  project_id: string;
  takeoff_item_id: string;
  assembly_package_id: string;
  quantity: number;
  unit: string;
  calculated_cost: number;
  calculated_sell: number;
  calculated_margin: number;
  created_at: string;
  updated_at: string;
};

export type TakeoffItemAssemblyWithPackage = TakeoffItemAssembly & {
  assembly_package: {
    id: string;
    name: string;
    unit: string;
    is_active: boolean;
  };
};

export type ApplyAssemblyPackageInput = {
  takeoff_item_id: string;
  assembly_package_id: string;
  quantity: number;
  unit: string;
  replace_existing_pricing?: boolean;
};

export type PricingMethod =
  | "m2"
  | "sqm"
  | "lm"
  | "m3"
  | "each"
  | "item"
  | "hour"
  | "day"
  | "allowance"
  | "package"
  | "subcontractor_quote"
  | "custom";

export type PricingItem = {
  id: string;
  organisation_id: string;
  project_id: string;
  takeoff_item_id: string;
  pricing_method: PricingMethod;
  quantity: number;
  unit: string;
  cost_rate: number;
  total_cost: number;
  markup_percentage: number | null;
  margin_percentage: number | null;
  sell_rate: number;
  sell_rate_overridden: boolean;
  total_sell: number;
  gross_profit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PricingItemInput = {
  takeoff_item_id: string;
  pricing_method: PricingMethod;
  quantity: number;
  unit: string;
  cost_rate: number;
  markup_percentage?: number | null;
  margin_percentage?: number | null;
  sell_rate?: number | null;
  sell_rate_overridden?: boolean;
  notes?: string | null;
};

export type PricingItemUpdate = Partial<
  Omit<PricingItemInput, "takeoff_item_id">
>;

export type LabourRate = {
  id: string;
  organisation_id: string;
  name: string;
  role: string | null;
  unit: string;
  cost_rate: number;
  charge_rate: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type LabourRateInput = {
  name: string;
  role?: string | null;
  unit?: string;
  cost_rate?: number;
  charge_rate?: number;
  notes?: string | null;
  is_active?: boolean;
};

export type LabourRateUpdate = Partial<LabourRateInput>;

export type MaterialRate = {
  id: string;
  organisation_id: string;
  name: string;
  supplier: string | null;
  unit: string;
  cost_rate: number;
  waste_percent: number;
  category: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MaterialRateInput = {
  name: string;
  supplier?: string | null;
  unit?: string;
  cost_rate?: number;
  waste_percent?: number;
  category?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type MaterialRateUpdate = Partial<MaterialRateInput>;

export type SupplierRate = {
  id: string;
  organisation_id: string;
  supplier: string;
  /** Normalised from `item` or `item_name` in the database. */
  item: string;
  unit: string;
  rate: number;
  category: string | null;
  /** Normalised from `rate_updated_date` or `updated_date`. */
  rate_updated_date: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SupplierRateInput = {
  supplier: string;
  item: string;
  unit?: string;
  rate?: number;
  category?: string | null;
  rate_updated_date?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type SupplierRateUpdate = Partial<SupplierRateInput>;

export type SubcontractorRate = {
  id: string;
  organisation_id: string;
  trade: string;
  supplier: string | null;
  rate_basis: string;
  rate: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SubcontractorRateInput = {
  trade: string;
  supplier?: string | null;
  rate_basis?: string;
  rate?: number;
  notes?: string | null;
  is_active?: boolean;
};

export type SubcontractorRateUpdate = Partial<SubcontractorRateInput>;

export type RateLibraryKind =
  | "labour"
  | "material"
  | "supplier"
  | "subcontractor";

export type RecentRateChange = {
  id: string;
  kind: RateLibraryKind;
  label: string;
  detail: string | null;
  updated_at: string;
};

export type AssemblyPackageItemType =
  | "material"
  | "labour"
  | "plant"
  | "subcontractor"
  | "allowance";

export type AssemblyPackage = {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  trade: string | null;
  unit: string;
  default_cost_rate: number;
  default_sell_rate: number;
  default_markup_percentage: number | null;
  default_margin_percentage: number | null;
  standard_reference: string | null;
  specification_reference: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AssemblyPackageItem = {
  id: string;
  organisation_id: string;
  assembly_package_id: string;
  item_type: AssemblyPackageItemType;
  item_name: string;
  quantity_per_unit: number;
  unit: string;
  wastage_percentage: number;
  cost_rate: number;
  sell_rate: number | null;
  total_cost_per_unit: number;
  notes: string | null;
  created_at: string;
};

export type AssemblyPackageWithCount = AssemblyPackage & {
  component_count: number;
};

export type AssemblyPackageInput = {
  name: string;
  description?: string | null;
  trade?: string | null;
  unit?: string;
  default_markup_percentage?: number | null;
  default_margin_percentage?: number | null;
  standard_reference?: string | null;
  specification_reference?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type AssemblyPackageUpdate = Partial<AssemblyPackageInput>;

export type AssemblyPackageItemInput = {
  item_type: AssemblyPackageItemType;
  item_name: string;
  quantity_per_unit?: number;
  unit?: string;
  wastage_percentage?: number;
  cost_rate?: number;
  sell_rate?: number | null;
  notes?: string | null;
};

export type AssemblyPackageItemUpdate = Partial<AssemblyPackageItemInput>;

export type EstimatePricingSource = "assembly" | "assembly_package" | "manual";

export type ProjectMaterialItem = {
  id: string;
  organisation_id: string;
  project_id: string;
  takeoff_item_id: string;
  assembly_package_id: string;
  source_package_name: string;
  material_name: string;
  quantity: number;
  unit: string;
  cost_rate: number;
  total_cost: number;
  wastage_percent: number;
  supplier: string | null;
  pricing_source: EstimatePricingSource;
  reviewed: boolean;
  created_at: string;
};

export type ProjectLabourItem = {
  id: string;
  organisation_id: string;
  project_id: string;
  takeoff_item_id: string;
  assembly_package_id: string;
  source_package_name: string;
  labour_name: string;
  hours: number;
  unit: string;
  cost_rate: number;
  charge_rate: number;
  total_cost: number;
  total_sell: number;
  pricing_source: EstimatePricingSource;
  reviewed: boolean;
  created_at: string;
};

export type StandardType =
  | "nz_standard"
  | "building_code"
  | "specification"
  | "manufacturer_guide"
  | "drawing"
  | "custom";

export type StandardLinkEntityType =
  | "takeoff_item"
  | "assembly_package"
  | "pricing_item";

export type Standard = {
  id: string;
  organisation_id: string;
  reference_code: string;
  name: string;
  standard_type: StandardType;
  trade: string | null;
  jurisdiction: string | null;
  description: string | null;
  notes: string | null;
  source_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StandardInput = {
  reference_code: string;
  name: string;
  standard_type?: StandardType;
  trade?: string | null;
  jurisdiction?: string | null;
  description?: string | null;
  notes?: string | null;
  source_url?: string | null;
  is_active?: boolean;
};

export type StandardUpdate = Partial<StandardInput>;

export type StandardLink = {
  id: string;
  organisation_id: string;
  standard_id: string;
  entity_type: StandardLinkEntityType;
  entity_id: string;
  project_id: string | null;
  created_at: string;
};

export type StandardLinkWithStandard = StandardLink & {
  standard: Standard;
};

export type ClarificationType =
  | "exclusion"
  | "assumption"
  | "rfi"
  | "clarification"
  | "risk"
  | "note";

export type ClarificationTemplateType = "exclusion" | "assumption";

export type ClarificationStatus = "draft" | "open" | "answered" | "closed";

export type RfiPriority = "low" | "medium" | "high";

export type ClarificationTemplate = {
  id: string;
  organisation_id: string;
  type: ClarificationTemplateType;
  title: string;
  description: string | null;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

export type TenderClarification = {
  id: string;
  organisation_id: string;
  project_id: string;
  type: ClarificationType;
  title: string;
  description: string | null;
  category: string | null;
  status: ClarificationStatus;
  priority: RfiPriority | null;
  related_drawing: string | null;
  related_takeoff_item_id: string | null;
  ai_generated: boolean;
  reviewed: boolean;
  created_at: string;
  updated_at?: string;
};

export type TenderClarificationInput = {
  type: ClarificationType;
  title: string;
  description?: string | null;
  category?: string | null;
  status?: ClarificationStatus;
  priority?: RfiPriority | null;
  related_drawing?: string | null;
  related_takeoff_item_id?: string | null;
  reviewed?: boolean;
};

export type TenderClarificationUpdate = Partial<TenderClarificationInput>;
