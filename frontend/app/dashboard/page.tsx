"use client";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  SearchX,
  Settings,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Logo, ThemeToggle, Wordmark } from "@/components/brand";
import { JobCard } from "@/components/JobCard";
import { LinksDrawer } from "@/components/LinksDrawer";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { TailorModal } from "@/components/TailorModal";
import { api } from "@/lib/api";
import type { AppConfig, Job, StatusResponse } from "@/lib/types";
import { roleVar } from "@/lib/util";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [exp, setExp] = useState(ALL);
  const [mode, setMode] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [sort, setSort] = useState("date");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);

  const tracking = useRef(false);

  const loadJobs = useCallback(async () => setJobs(await api.jobs(true)), []);

  const trackRefresh = useCallback(async () => {
    if (tracking.current) return;
    tracking.current = true;
    try {
      for (;;) {
        const st = await api.status();
        setStatus(st);
        if (!st.refreshing) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      await loadJobs();
    } finally {
      tracking.current = false;
    }
  }, [loadJobs]);

  const loadAll = useCallback(async () => {
    try {
      const [cfg, js, st] = await Promise.all([api.config(), api.jobs(true), api.status()]);
      setConfig(cfg);
      setJobs(js);
      setStatus(st);
      setError(null);
      if (st.refreshing) trackRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [trackRefresh]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = async () => {
    try {
      await api.refresh();
      toast("Refresh started", { description: "Pulling from all sources…" });
      trackRefresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const setJobStatus = async (id: string, s: string) => {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, status: s as Job["status"] } : j)));
    try {
      await api.setStatus(id, s);
    } catch {
      loadJobs();
    }
  };

  const roleIndex = useCallback((k: string) => config?.roles.findIndex((r) => r.key === k) ?? 0, [config]);
  const roleLabel = useCallback((k: string) => config?.roles.find((r) => r.key === k)?.label || k, [config]);
  const sources = useMemo(() => [...new Set(jobs.map((j) => j.source))].sort(), [jobs]);

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    const out = jobs.filter((j) => {
      if (role === "__fav__") {
        if (!j.favorite) return false;
      } else if (role && j.role !== role) return false;
      if (exp !== ALL && j.experience !== exp) return false;
      if (mode === "remote-local") {
        if (!(j.work_mode === "remote" && j.region === "local")) return false;
      } else if (mode !== ALL && j.work_mode !== mode) return false;
      if (source !== ALL && j.source !== source) return false;
      if (statusF !== ALL ? j.status !== statusF : j.status === "hidden") return false;
      if (query && !(j.title + " " + j.company + " " + j.skills).toLowerCase().includes(query)) return false;
      return true;
    });
    out.sort((a, b) =>
      sort === "fit" ? b.fit_score - a.fit_score : (b.posted_at || "").localeCompare(a.posted_at || "")
    );
    return out;
  }, [jobs, role, q, exp, mode, source, statusF, sort]);

  const today = new Date().toISOString().slice(0, 10);
  const active = jobs.filter((j) => j.status !== "hidden");
  const stats = [
    { label: "Active jobs", value: active.length, icon: Briefcase, tone: 0 },
    { label: "New today", value: jobs.filter((j) => (j.fetched_at || "").startsWith(today)).length, icon: TrendingUp, tone: 2 },
    ...(config?.roles.slice(0, 2).map((r, i) => ({
      label: r.label, value: active.filter((j) => j.role === r.key).length, icon: Target, tone: i,
    })) || []),
    { label: "Applied", value: jobs.filter((j) => j.status === "applied").length, icon: CheckCircle2, tone: 2 },
    { label: "Saved", value: jobs.filter((j) => j.status === "saved").length, icon: Star, tone: 3 },
  ];

  const roleTabs = [
    { key: "", label: "All roles" },
    ...(config?.roles || []),
    ...(config?.favorite_companies?.length ? [{ key: "__fav__", label: "Favourites" }] : []),
  ];

  const lastRefresh = status?.refreshing
    ? `Refreshing · ${status.progress?.current ?? ""} ${status.progress ? `(${status.progress.done + 1}/${status.progress.total})` : ""}`
    : status?.at
      ? `Updated ${new Date(status.at + "Z").toLocaleString()}`
      : "First fetch running…";

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <Wordmark className="hidden sm:inline" />
          </Link>
          <span className="ml-1 hidden truncate text-xs text-muted-foreground md:inline">{lastRefresh}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setProfileOpen(true)} aria-label="Search profile">
              <Target className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setLinksOpen(true)} aria-label="Job-board links">
              <Link2 className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <Settings className="size-4" />
            </Button>
            <ThemeToggle />
            <Button onClick={refresh} disabled={status?.refreshing} size="sm" className="ml-1 gap-1.5">
              <RefreshCw className={cn("size-4", status?.refreshing && "animate-spin")} />
              <span className="hidden sm:inline">{status?.refreshing ? "Refreshing" : "Refresh"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {config ? config.roles.map((r) => r.label).join(" · ") : "Loading…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Remote + Hybrid + In-office{config ? ` (${config.onsite_cities.join(", ")})` : ""}
            {config ? ` · last ${config.max_age_days} days` : ""}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn&apos;t reach the backend at <b>{api ? process.env.NEXT_PUBLIC_API_BASE : ""}</b>. Make sure it&apos;s running. ({error})
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map((s, i) => (
            <div key={i} className="rounded-2xl border bg-card p-4 transition-all hover:shadow-md hover:shadow-black/5">
              <span
                className="mb-2 inline-flex size-8 items-center justify-center rounded-lg"
                style={{ color: roleVar(s.tone), background: `color-mix(in oklch, ${roleVar(s.tone)} 13%, transparent)` }}
              >
                <s.icon className="size-4" />
              </span>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">{loading ? "—" : s.value}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Role tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {roleTabs.map((t) => {
            const activeTab = role === t.key;
            const fav = t.key === "__fav__";
            return (
              <button
                key={t.key || "all"}
                onClick={() => setRole(t.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all",
                  activeTab
                    ? "text-white shadow-sm"
                    : "border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground"
                )}
                style={
                  activeTab
                    ? {
                        background: fav
                          ? "linear-gradient(135deg,var(--warning),var(--rose))"
                          : "linear-gradient(135deg,var(--brand),var(--brand-2))",
                      }
                    : undefined
                }
              >
                {fav && <Star className="mr-1 inline size-3.5 -translate-y-px" fill="currentColor" />}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, company, skills…" className="pl-9" />
          </div>
          <FilterSelect value={exp} onChange={setExp} placeholder="Experience"
            opts={[[ALL, "All experience"], ["entry", "Entry / fresher"], ["junior", "≤ 1 year"], ["stretch", "Stretch 2–3 yrs"], ["senior", "Senior"], ["unspecified", "Unspecified"]]} />
          <FilterSelect value={mode} onChange={setMode} placeholder="Mode"
            opts={[[ALL, "All modes"], ["remote", "Remote"], ["remote-local", `Remote · ${config?.country || "local"}`], ["hybrid", "Hybrid"], ["onsite", "In office"]]} />
          <FilterSelect value={source} onChange={setSource} placeholder="Source"
            opts={[[ALL, "All sources"], ...sources.map((s) => [s, s] as [string, string])]} />
          <FilterSelect value={statusF} onChange={setStatusF} placeholder="Status"
            opts={[[ALL, "Active"], ["new", "New"], ["saved", "Saved"], ["applied", "Applied"], ["hidden", "Hidden"]]} />
          <FilterSelect value={sort} onChange={setSort} placeholder="Sort"
            opts={[["date", "Newest"], ["fit", "Best fit"]]} />
        </div>

        <p className="mb-4 text-[13px] text-muted-foreground">
          {filtered.length} job{filtered.length === 1 ? "" : "s"} shown
        </p>

        {loading ? (
          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border bg-card py-20 text-center">
            {jobs.length ? (
              <SearchX className="size-9 text-muted-foreground/60" strokeWidth={1.5} />
            ) : (
              <Loader2 className="size-9 animate-spin text-brand" strokeWidth={1.75} />
            )}
            <p className="mt-3 text-muted-foreground">
              {jobs.length ? "No jobs match these filters." : "Fetching jobs — this updates automatically…"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
            {filtered.map((j) => (
              <JobCard key={j.id} job={j} roleIndex={Math.max(0, roleIndex(j.role))} roleLabel={roleLabel(j.role)}
                country={config?.country || ""} onStatus={setJobStatus} onTailor={setTailorJob} />
            ))}
          </div>
        )}
      </main>

      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProfileDrawer open={profileOpen} onOpenChange={setProfileOpen} onSaved={loadAll} />
      <LinksDrawer open={linksOpen} onOpenChange={setLinksOpen} config={config} />
      <TailorModal job={tailorJob} onClose={() => setTailorJob(null)} />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  opts,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  opts: [string, string][];
  placeholder: string;
}) {
  const label = opts.find(([v]) => v === value)?.[1] ?? placeholder;
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? value)}>
      <SelectTrigger size="sm" className="w-auto min-w-32">
        <span className="truncate">{label}</span>
      </SelectTrigger>
      <SelectContent>
        {opts.map(([v, l]) => (
          <SelectItem key={v} value={v}>{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
