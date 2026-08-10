"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id="jf-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#jf-logo)" />
      <circle cx="27" cy="27" r="13" fill="none" stroke="#fff" strokeWidth="5" />
      <line x1="37" y1="37" x2="50" y2="50" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <rect x="20" y="25" width="14" height="9" rx="1.6" fill="#fff" />
      <path d="M24 25v-2.2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V25" fill="none" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[17px] font-semibold tracking-tight", className)}>
      Job<span className="brand-text">Finder</span>
    </span>
  );
}

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("jf-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };
  return { dark, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} className={className} aria-label="Toggle theme">
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
