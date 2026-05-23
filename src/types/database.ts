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
