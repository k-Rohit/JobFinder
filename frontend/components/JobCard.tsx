"use client";
import {
  Bookmark,
  BookmarkCheck,
  Building2,
  Check,
  Clock,
  ExternalLink,
  EyeOff,
  Globe,
  MapPin,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Job } from "@/lib/types";
import { EXP_LABEL, fitTone, relTime, roleVar } from "@/lib/util";
import { cn } from "@/lib/utils";

function Tone({
  children,
  tone,
  strong,
}: {
  children: React.ReactNode;
  tone: string;
  strong?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={
        strong
          ? { color: "var(--brand-foreground)", background: tone }
          : { color: tone, background: `color-mix(in oklch, ${tone} 14%, transparent)` }
      }
    >
      {children}
    </span>
  );
}

const MODE_TONE: Record<string, string> = {
  remote: "var(--success)",
  hybrid: "var(--rose)",
  onsite: "var(--warning)",
};
const MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "In office",
};

export function JobCard({
  job,
  roleIndex,
  roleLabel,
  country,
  onStatus,
  onTailor,
}: {
  job: Job;
  roleIndex: number;
  roleLabel: string;
  country: string;
  onStatus: (id: string, status: string) => void;
  onTailor: (job: Job) => void;
}) {
  const tone = roleVar(roleIndex);
  const saved = job.status === "saved";
  const applied = job.status === "applied";
  const hidden = job.status === "hidden";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:shadow-lg hover:shadow-black/5",
        hidden && "opacity-55"
      )}
    >
      <span
        className="absolute left-0 top-5 bottom-5 w-1 rounded-full transition-all"
        style={{
          background: applied ? "var(--success)" : saved ? "var(--warning)" : tone,
          opacity: applied || saved ? 1 : 0.4,
        }}
      />

      <div className="flex items-start justify-between gap-3 pl-2.5">
        <div className="min-w-0">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight transition-colors hover:text-brand"
          >
            {job.title}
          </a>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium" style={{ color: tone }}>
            <Building2 className="size-3.5 shrink-0" />
            <span className="truncate">{job.company || "—"}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Tone tone={tone}>{roleLabel}</Tone>
          {job.favorite ? (
            <Tone tone="var(--warning)">
              <Star className="size-2.5" fill="currentColor" /> Fav
            </Tone>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 pl-2.5 text-[12.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" /> {job.location}
        </span>
        {job.salary && (
          <span className="inline-flex items-center gap-1">
            <Wallet className="size-3.5" /> {job.salary}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {relTime(job.posted_at)}
        </span>
        <span className="font-semibold" style={{ color: fitTone(job.fit_score) }}>
          {job.fit_score}% fit
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-2.5">
        <Tone tone={MODE_TONE[job.work_mode] || MODE_TONE.remote}>
          {MODE_LABEL[job.work_mode] || "Remote"}
        </Tone>
        {job.work_mode === "remote" && job.region === "local" && (
          <Tone tone="var(--info)">
            <MapPin className="size-2.5" /> {country}
          </Tone>
        )}
        {job.work_mode === "remote" && job.region === "global" && (
          <Tone tone="var(--success)">
            <Globe className="size-2.5" /> Worldwide
          </Tone>
        )}
        <span className="text-[11px] text-muted-foreground/70">{EXP_LABEL[job.experience] || job.experience}</span>
        <span className="ml-auto text-[11px] font-medium text-muted-foreground/60">{job.source}</span>
      </div>

      {job.skills && (
        <div className="mt-3 flex flex-wrap gap-1.5 pl-2.5">
          {job.skills.split(",").slice(0, 10).map((s) => (
            <span key={s} className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 pl-2.5">
        <a href={job.url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          Apply <ExternalLink className="size-3.5" />
        </a>
        <IconAction active={saved} label={saved ? "Saved" : "Save"} onClick={() => onStatus(job.id, saved ? "new" : "saved")}>
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </IconAction>
        <IconAction active={applied} label={applied ? "Applied" : "Mark applied"} onClick={() => onStatus(job.id, applied ? "new" : "applied")}>
          <Check className="size-4" />
        </IconAction>
        <IconAction label={hidden ? "Unhide" : "Hide"} onClick={() => onStatus(job.id, hidden ? "new" : "hidden")}>
          <EyeOff className="size-4" />
        </IconAction>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onTailor(job)}
          className="ml-auto gap-1.5 border-brand/40 text-brand hover:bg-brand/10 hover:text-brand"
        >
          <Sparkles className="size-3.5" /> Tailor
        </Button>
      </div>
    </article>
  );
}

function IconAction({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("size-9", active && "text-emerald-600 dark:text-emerald-400")}
    >
      {children}
    </Button>
  );
}
