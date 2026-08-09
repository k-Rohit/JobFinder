import type {
  AppConfig,
  Job,
  Profile,
  ResumeMeta,
  Settings,
  StatusResponse,
  Tailored,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:8787";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json())?.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  jobs: (includeHidden = true) =>
    req<{ jobs: Job[] }>(`/api/jobs?include_hidden=${includeHidden}`).then(
      (d) => d.jobs
    ),
  status: () => req<StatusResponse>(`/api/status`),
  config: () => req<AppConfig>(`/api/config`),
  refresh: () => req<{ status: string }>(`/api/refresh`, { method: "POST" }),
  setStatus: (id: string, status: string) =>
    req(`/api/jobs/status`, {
      method: "POST",
      body: JSON.stringify({ id, status }),
    }),

  settings: () => req<Settings>(`/api/settings`),
  resumeMeta: () => req<ResumeMeta>(`/api/resume`),
  uploadResume: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<ResumeMeta>(`/api/resume`, { method: "POST", body: fd });
  },
  setOpenAiKey: (key: string) =>
    req(`/api/settings/openai-key`, {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
  setJsearchKey: (key: string) =>
    req(`/api/settings/jsearch-key`, {
      method: "POST",
      body: JSON.stringify({ key }),
    }),

  getProfile: () => req<Profile>(`/api/profile`),
  saveProfile: (p: Record<string, unknown>) =>
    req<{ ok: boolean; roles: string[] }>(`/api/profile`, {
      method: "POST",
      body: JSON.stringify(p),
    }),

  getTailored: (id: string) =>
    req<Tailored>(`/api/jobs/${encodeURIComponent(id)}/tailor`),
  tailor: (id: string) =>
    req<Tailored>(`/api/jobs/${encodeURIComponent(id)}/tailor`, {
      method: "POST",
    }),
  tailorDownloadUrl: (id: string, fmt: "docx" | "md") =>
    `${API_BASE}/api/jobs/${encodeURIComponent(id)}/tailor/download?fmt=${fmt}`,
};
