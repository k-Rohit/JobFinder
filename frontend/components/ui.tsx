"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cx } from "@/lib/util";

export function Badge({
  children,
  color = "muted",
  soft = true,
}: {
  children: React.ReactNode;
  color?: "accent" | "violet" | "green" | "amber" | "red" | "magenta" | "muted";
  soft?: boolean;
}) {
  const map: Record<string, string> = {
    accent: "var(--accent)",
    violet: "var(--violet)",
    green: "var(--green)",
    amber: "var(--amber)",
    red: "var(--red)",
    magenta: "var(--magenta)",
    muted: "var(--muted)",
  };
  const c = map[color];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={
        soft
          ? { color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }
          : { color: "var(--accent-ink)", background: c }
      }
    >
      {children}
    </span>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="glass absolute right-0 top-0 h-full overflow-y-auto border-l shadow-2xl"
            style={{ width: `min(${width}px, 100vw)`, background: "var(--surface)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
          >
            <div
              className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-6 py-5"
              style={{ background: "var(--surface)" }}
            >
              <div>
                <h2 className="text-lg font-bold text-ink">{title}</h2>
                {subtitle && (
                  <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-semibold text-ink-soft">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-faint focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]";

export function Button({
  children,
  variant = "ghost",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100";
  const variants: Record<string, string> = {
    primary:
      "text-[var(--accent-ink)] shadow-sm hover:brightness-110 [background:linear-gradient(135deg,var(--accent),var(--violet))]",
    ghost:
      "border text-ink-soft hover:border-[var(--accent)] hover:text-ink bg-surface",
    soft: "text-ink-soft bg-surface-2 hover:bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-2))]",
    danger:
      "border text-[var(--red)] hover:bg-[color-mix(in_srgb,var(--red)_10%,transparent)]",
  };
  return (
    <button className={cx(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}
