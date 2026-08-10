export type WorkMode = "remote" | "hybrid" | "onsite";
export type Region = "local" | "global" | string;
export type Experience =
  | "entry"
  | "junior"
  | "stretch"
  | "unspecified"
  | "senior"
  | string;
export type Status = "new" | "saved" | "applied" | "hidden";

export interface Job {
  id: string;
  source: string;
  title: string;
  company: string;
  url: string;
  location: string;
  work_mode: WorkMode;
  region: Region;
  role: string;
  experience: Experience;
  salary: string;
  skills: string;
  description: string;
  posted_at: string;
  fetched_at: string;
  fit_score: number;
  status: Status;
  favorite: number;
}

export interface RoleMeta {
  key: string;
  label: string;
}

export interface AppConfig {
  roles: RoleMeta[];
  country: string;
  onsite_cities: string[];
  max_age_days: number;
  require_local_eligibility: boolean;
  favorite_companies: { name: string; careers: string }[];
}

export interface RefreshProgress {
  current: string;
  done: number;
  total: number;
}

export interface StatusResponse {
  status?: string;
  at?: string;
  matched?: number;
  new?: number;
  refreshing?: boolean;
  progress?: RefreshProgress;
  sources?: Record<string, { fetched: number; matched: number; error?: string }>;
}

export interface Settings {
  openai_key_set: boolean;
  openai_key_hint: string | null;
  jsearch_key_set: boolean;
}

export interface ResumeMeta {
  filename: string | null;
  uploaded_at?: string;
  chars?: number;
}

export interface ProfileRole {
  label: string;
  keywords: string;
}

export interface Profile {
  roles: ProfileRole[];
  country: string;
  onsite_cities: string;
  exclude_locations: string;
  comfortable_years: number;
  max_experience_years: number;
  max_age_days: number;
  require_local_eligibility: boolean;
  favorite_companies: string;
}

export interface Tailored {
  job_id: string;
  resume_md: string;
  keywords: string[];
  changes: string[];
  created_at: string;
}
