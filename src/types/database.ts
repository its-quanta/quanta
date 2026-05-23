export type ProfileRole = "owner" | "member";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  organisation_id: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type Organisation = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
