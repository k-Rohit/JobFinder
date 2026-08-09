"use client";
import { motion } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  EyeOff,
  ExternalLink,
  Globe,
  MapPin,
  Sparkles,
  Clock,
  Wallet,
  Building2,
} from "lucide-react";
import type { Job } from "@/lib/types";
import { EXP_LABEL, ROLE_ACCENTS, cx, fitColor, relTime } from "@/lib/util";
import { Badge } from "./ui";

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
  const accent = ROLE_ACCENTS[roleIndex] || "var(--accent)";
  const saved = job.status === "saved";
  const applied = job.status === "applied";
  const hidden = job.status === "hidden";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cx(
        "group relative rounded-2xl border bg-surface p-5 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]",
        hidden && "opacity-55"
      )}
    >
      {/* accent rail */}
      <span
        className="absolute left-0 top-5 bottom-5 w-1 rounded-full"
        style={{
          background: applied
            ? "var(--green)"
            : saved
              ? "var(--amber)"
              : accent,
          opacity: applied || saved ? 1 : 0.35,
        }}
      />

      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="min-w-0">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-[17px] font-bold leading-snug text-ink transition hover:text-[var(--accent)]"
          >
            {job.title}
          </a>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold" style={{ color: accent }}>
            <Building2 size={14} className="shrink-0" />
            <span className="truncate">{job.company || "—"}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge color={(["accent", "violet", "green", "amber", "magenta", "red"][roleIndex] as never) || "accent"}>
            {roleLabel}
          </Badge>
          {job.favorite ? <Badge color="amber">⭐ Fav</Badge> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-2 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} /> {job.location}
        </span>
        {job.salary && (
          <span className="inline-flex items-center gap-1">
            <Wallet size={13} /> {job.salary}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {relTime(job.posted_at)}
        </span>
        <span className="font-bold" style={{ color: fitColor(job.fit_score) }}>
          {job.fit_score}% fit
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-2">
        <ModeBadge mode={job.work_mode} />
        {job.work_mode === "remote" && job.region === "local" && (
          <Badge color="accent">
            <MapPin size={11} /> {country}
          </Badge>
        )}
        {job.work_mode === "remote" && job.region === "global" && (
          <Badge color="green">
            <Globe size={11} /> Worldwide
          </Badge>
        )}
        <Badge color="muted">{EXP_LABEL[job.experience] || job.experience}</Badge>
        <span className="ml-auto text-[11px] font-medium text-faint">{job.source}</span>
      </div>

      {job.skills && (
        <div className="mt-3 flex flex-wrap gap-1.5 pl-2">
          {job.skills.split(",").slice(0, 12).map((s) => (
            <span
              key={s}
              className="rounded-lg border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-soft"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {job.description && (
        <p
          className="mt-3 pl-2 text-[13px] leading-relaxed text-muted"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {job.description.slice(0, 280)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 pl-2">
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#16a34a,#0f9d6f)" }}
        >
          Apply <ExternalLink size={14} />
        </a>
        <IconBtn active={saved} onClick={() => onStatus(job.id, saved ? "new" : "saved")}>
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          {saved ? "Saved" : "Save"}
        </IconBtn>
        <IconBtn active={applied} onClick={() => onStatus(job.id, applied ? "new" : "applied")}>
          <Check size={15} /> {applied ? "Applied" : "Applied?"}
        </IconBtn>
        <IconBtn onClick={() => onStatus(job.id, hidden ? "new" : "hidden")}>
          <EyeOff size={15} /> {hidden ? "Unhide" : "Hide"}
        </IconBtn>
        <button
          onClick={() => onTailor(job)}
          className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition hover:bg-[color-mix(in_srgb,var(--violet)_10%,transparent)]"
          style={{ color: "var(--violet)", borderColor: "color-mix(in srgb,var(--violet) 40%,transparent)" }}
        >
          <Sparkles size={15} /> Tailor résumé
        </button>
      </div>
    </motion.article>
  );
}

function IconBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "text-[var(--green)] [border-color:color-mix(in_srgb,var(--green)_45%,transparent)] bg-[color-mix(in_srgb,var(--green)_10%,transparent)]"
          : "text-ink-soft hover:border-[var(--accent)] hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { label: string; color: "green" | "red" | "amber" }> = {
    remote: { label: "Remote", color: "green" },
    hybrid: { label: "Hybrid", color: "red" },
    onsite: { label: "In office", color: "amber" },
  };
  const m = map[mode] || map.remote;
  return <Badge color={m.color}>{m.label}</Badge>;
}
