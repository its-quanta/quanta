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

export type Organisation = {
  id: string;
  name: string;
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
