"use client";
import {
  Briefcase,
  CheckCircle2,
  Link2,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AppConfig, Job, StatusResponse } from "@/lib/types";
import { cx, ROLE_ACCENTS } from "@/lib/util";
import { JobCard } from "@/components/JobCard";
import { LinksDrawer } from "@/components/LinksDrawer";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { TailorModal } from "@/components/TailorModal";

export default function Page() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  // filters
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [exp, setExp] = useState("");
  const [mode, setMode] = useState("");
  const [source, setSource] = useState("");
  const [statusF, setStatusF] = useState("");
  const [sort, setSort] = useState("date");

  // drawers
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);

  const tracking = useRef(false);

  const loadJobs = useCallback(async () => {
    setJobs(await api.jobs(true));
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    loadAll();
  }, [loadAll]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("jf-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  const trackRefresh = useCallback(async () => {
    if (tracking.current) return;
    tracking.current = true;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
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

  const refresh = async () => {
    try {
      await api.refresh();
      trackRefresh();
    } catch (e) {
      setError((e as Error).message);
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

  const roleIndex = useCallback(
    (key: string) => config?.roles.findIndex((r) => r.key === key) ?? 0,
    [config]
  );
  const roleLabel = useCallback(
    (key: string) => config?.roles.find((r) => r.key === key)?.label || key,
    [config]
  );

  const sources = useMemo(() => [...new Set(jobs.map((j) => j.source))].sort(), [jobs]);

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    const out = jobs.filter((j) => {
      if (role === "__fav__") {
        if (!j.favorite) return false;
      } else if (role && j.role !== role) return false;
      if (exp && j.experience !== exp) return false;
      if (mode === "remote-local") {
        if (!(j.work_mode === "remote" && j.region === "local")) return false;
      } else if (mode && j.work_mode !== mode) return false;
      if (source && j.source !== source) return false;
      if (statusF ? j.status !== statusF : j.status === "hidden") return false;
      if (query && !(j.title + " " + j.company + " " + j.skills).toLowerCase().includes(query))
        return false;
      return true;
    });
    out.sort((a, b) =>
      sort === "fit"
        ? b.fit_score - a.fit_score
        : (b.posted_at || "").localeCompare(a.posted_at || "")
    );
    return out;
  }, [jobs, role, q, exp, mode, source, statusF, sort]);

  const today = new Date().toISOString().slice(0, 10);
  const active = jobs.filter((j) => j.status !== "hidden");
  const stats = [
    { label: "Active jobs", value: active.length, icon: <Briefcase size={16} />, color: 0 },
    { label: "New today", value: jobs.filter((j) => (j.fetched_at || "").startsWith(today)).length, icon: <TrendingUp size={16} />, color: 2 },
    ...(config?.roles.slice(0, 2).map((r, i) => ({
      label: r.label,
      value: active.filter((j) => j.role === r.key).length,
      icon: <Target size={16} />,
      color: i === 0 ? 0 : 1,
    })) || []),
    { label: "Applied", value: jobs.filter((j) => j.status === "applied").length, icon: <CheckCircle2 size={16} />, color: 2 },
    { label: "Saved", value: jobs.filter((j) => j.status === "saved").length, icon: <Sparkles size={16} />, color: 3 },
  ];

  const roleTabs = [
    { key: "", label: "All roles" },
    ...(config?.roles || []),
    ...(config?.favorite_companies?.length ? [{ key: "__fav__", label: "⭐ Fav. companies" }] : []),
  ];

  const lastRefresh = status?.refreshing
    ? `Refreshing${status.progress ? ` · ${status.progress.current} (${status.progress.done + 1}/${status.progress.total})` : "…"}`
    : status?.at
      ? `Updated ${new Date(status.at + "Z").toLocaleString()} · ${status.matched} matches`
      : "First fetch running…";

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-[248px] flex-col border-r bg-surface px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <Logo />
          <div>
            <div className="text-[17px] font-extrabold tracking-tight text-ink">
              Job<span style={{ color: "var(--accent)" }}>Finder</span>
            </div>
            <div className="text-[11px] text-muted">Data &amp; AI roles</div>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          <NavItem icon={<RefreshCw size={17} className={status?.refreshing ? "animate-spin" : ""} />} label={status?.refreshing ? "Refreshing…" : "Refresh now"} onClick={refresh} disabled={status?.refreshing} highlight />
          <NavItem icon={<Target size={17} />} label="Search profile" onClick={() => setProfileOpen(true)} />
          <NavItem icon={<Settings size={17} />} label="Settings" onClick={() => setSettingsOpen(true)} />
          <NavItem icon={<Link2 size={17} />} label="Job-board links" onClick={() => setLinksOpen(true)} />
        </nav>

        <div className="mt-auto space-y-3">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-[var(--accent)]"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Light" : "Dark"} mode
          </button>
          <p className="px-2 text-[11px] leading-relaxed text-faint">{lastRefresh}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:pl-[248px]">
        <div className="mx-auto max-w-[1180px] px-5 py-7 pb-24">
          {/* Mobile header */}
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-lg font-extrabold text-ink">Job<span style={{ color: "var(--accent)" }}>Finder</span></span>
            </div>
            <div className="flex gap-1.5">
              <IconOnly onClick={refresh}><RefreshCw size={18} className={status?.refreshing ? "animate-spin" : ""} /></IconOnly>
              <IconOnly onClick={() => setProfileOpen(true)}><Target size={18} /></IconOnly>
              <IconOnly onClick={() => setSettingsOpen(true)}><Settings size={18} /></IconOnly>
              <IconOnly onClick={toggleTheme}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconOnly>
            </div>
          </div>

          {/* Title */}
          <header className="mb-6 hidden items-end justify-between gap-4 lg:flex">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">
                {config ? config.roles.map((r) => r.label).join(" · ") : "Loading…"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                Remote + Hybrid + In-office{config ? ` (${config.onsite_cities.join(", ")})` : ""}
                {config ? ` · last ${config.max_age_days} days` : ""}
              </p>
            </div>
          </header>

          {error && (
            <div
              className="mb-6 rounded-xl border px-4 py-3 text-sm"
              style={{ color: "var(--red)", borderColor: "color-mix(in srgb,var(--red) 40%,transparent)" }}
            >
              Couldn&apos;t reach the backend at <b>{api ? process.env.NEXT_PUBLIC_API_BASE : ""}</b>. Make sure it&apos;s
              running. ({error})
            </div>
          )}

          {/* Stats */}
          <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {stats.map((s, i) => (
              <StatCard key={i} {...s} loading={loading} />
            ))}
          </section>

          {/* Role tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {roleTabs.map((t, i) => {
              const activeTab = role === t.key;
              const isFav = t.key === "__fav__";
              return (
                <button
                  key={t.key || "all"}
                  onClick={() => setRole(t.key)}
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    activeTab
                      ? "text-white shadow-sm"
                      : "border bg-surface text-ink-soft hover:border-[var(--accent)]"
                  )}
                  style={
                    activeTab
                      ? {
                          background: isFav
                            ? "linear-gradient(135deg,var(--amber),var(--magenta))"
                            : `linear-gradient(135deg,var(--accent),var(--violet))`,
                        }
                      : undefined
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Filter bar */}
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, company, skills…"
                className="w-full rounded-xl border bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition placeholder:text-faint focus:border-[var(--accent)]"
              />
            </div>
            <Select value={exp} onChange={setExp} opts={[["", "Experience: all"], ["entry", "Entry / fresher"], ["junior", "≤ 1 year"], ["stretch", "Stretch 2–3 yrs"], ["senior", "Senior"], ["unspecified", "Unspecified"]]} />
            <Select value={mode} onChange={setMode} opts={[["", "Mode: all"], ["remote", "Remote"], ["remote-local", `Remote · ${config?.country || "local"} only`], ["hybrid", "Hybrid"], ["onsite", "In office"]]} />
            <Select value={source} onChange={setSource} opts={[["", "Source: all"], ...sources.map((s) => [s, s] as [string, string])]} />
            <Select value={statusF} onChange={setStatusF} opts={[["", "Status: active"], ["new", "New"], ["saved", "Saved"], ["applied", "Applied"], ["hidden", "Hidden"]]} />
            <Select value={sort} onChange={setSort} opts={[["date", "Newest"], ["fit", "Best fit"]]} />
          </div>

          <p className="mb-4 text-[13px] text-faint">
            {filtered.length} job{filtered.length === 1 ? "" : "s"} shown
          </p>

          {/* Job list */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-44 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-surface py-20 text-center">
              <div className="text-4xl">{jobs.length ? "🔍" : "⏳"}</div>
              <p className="mt-3 text-muted">
                {jobs.length
                  ? "No jobs match these filters. Try clearing them or hit Refresh."
                  : "Fetching jobs from 12 boards — this page updates automatically…"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
              {filtered.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  roleIndex={Math.max(0, roleIndex(j.role))}
                  roleLabel={roleLabel(j.role)}
                  country={config?.country || ""}
                  onStatus={setJobStatus}
                  onTailor={setTailorJob}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} onSaved={loadAll} />
      <LinksDrawer open={linksOpen} onClose={() => setLinksOpen(false)} config={config} />
      <TailorModal job={tailorJob} onClose={() => setTailorJob(null)} />
    </div>
  );
}

function StatCard({ label, value, icon, color, loading }: { label: string; value: number; icon: React.ReactNode; color: number; loading: boolean }) {
  const accent = ROLE_ACCENTS[color] || "var(--accent)";
  return (
    <div className="rounded-2xl border bg-surface p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
        >
          {icon}
        </span>
      </div>
      <div className="text-[26px] font-extrabold leading-none tracking-tight text-ink">
        {loading ? "—" : value}
      </div>
      <div className="mt-1 truncate text-[12.5px] text-muted">{label}</div>
    </div>
  );
}

function NavItem({ icon, label, onClick, disabled, highlight }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60",
        highlight
          ? "text-white [background:linear-gradient(135deg,var(--accent),var(--violet))] hover:brightness-110 shadow-sm"
          : "text-ink-soft hover:bg-surface-2 hover:text-ink"
      )}
    >
      {icon} {label}
    </button>
  );
}

function IconOnly({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid h-10 w-10 place-items-center rounded-xl border bg-surface text-ink-soft transition hover:border-[var(--accent)]">
      {children}
    </button>
  );
}

function Select({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border bg-surface px-3 py-2.5 text-[13px] font-medium text-ink-soft outline-none transition focus:border-[var(--accent)]"
    >
      {opts.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" className="shrink-0">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#lg)" />
      <circle cx="27" cy="27" r="13" fill="none" stroke="#fff" strokeWidth="5" />
      <line x1="37" y1="37" x2="50" y2="50" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <rect x="20" y="25" width="14" height="9" rx="1.6" fill="#fff" />
      <path d="M24 25v-2.2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V25" fill="none" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}
