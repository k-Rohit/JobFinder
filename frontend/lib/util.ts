export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function relTime(iso: string): string {
  if (!iso) return "date unknown";
  const days = Math.floor((Date.now() - new Date(iso + "Z").getTime()) / 864e5);
  if (Number.isNaN(days)) return "date unknown";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export const EXP_LABEL: Record<string, string> = {
  entry: "Entry / Fresher",
  junior: "≤ 1 yr",
  stretch: "Stretch · 2–3 yrs",
  unspecified: "Exp. unspecified",
  senior: "Senior",
};

// deterministic accent per role index
export const ROLE_ACCENTS = [
  "var(--accent)",
  "var(--violet)",
  "var(--green)",
  "var(--amber)",
  "var(--magenta)",
  "var(--red)",
];

export function fitColor(score: number): string {
  if (score >= 60) return "var(--green)";
  if (score >= 40) return "var(--amber)";
  return "var(--muted)";
}
