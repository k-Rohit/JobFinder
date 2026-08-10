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

// deterministic accent var per role index
export const ROLE_VARS = [
  "var(--role-1)",
  "var(--role-2)",
  "var(--role-3)",
  "var(--role-4)",
  "var(--role-5)",
];

export function roleVar(i: number): string {
  return ROLE_VARS[((i % ROLE_VARS.length) + ROLE_VARS.length) % ROLE_VARS.length];
}

export function fitTone(score: number): string {
  if (score >= 60) return "var(--success)";
  if (score >= 40) return "var(--warning)";
  return "var(--muted-foreground)";
}
