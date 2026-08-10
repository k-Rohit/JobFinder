import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  FileText,
  Filter,
  Globe2,
  Layers,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Logo, ThemeToggle, Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Layers,
    title: "12+ sources, one board",
    body: "RemoteOK, We Work Remotely, Remotive, LinkedIn, Indeed, Naukri (via Firecrawl) and more — deduped and ranked in a single view.",
  },
  {
    icon: MapPin,
    title: "Location-aware filtering",
    body: "Remote worldwide, hybrid, or in-office in exactly the cities you choose. Exclude the ones you don't want in a click.",
  },
  {
    icon: Globe2,
    title: "Eligibility, not just keywords",
    body: "Keeps remote roles open to your country, drops the ones that explicitly rule it out. India-first out of the box.",
  },
  {
    icon: Sparkles,
    title: "AI résumé tailoring",
    body: "Upload once, then rewrite your résumé per job with the right ATS keywords — never inventing experience. Download .docx or .md.",
  },
  {
    icon: Star,
    title: "Track favourite companies",
    body: "Follow specific employers' Data & AI openings in a dedicated tab, pulled straight from their careers boards.",
  },
  {
    icon: CalendarClock,
    title: "Fresh, every day",
    body: "Automatic daily refresh with only postings from the last week, so you're never applying to a stale listing.",
  },
];

const STATS = [
  { value: "12+", label: "job sources" },
  { value: "100+", label: "roles per refresh" },
  { value: "45+", label: "skills detected" },
  { value: "Daily", label: "auto-refresh" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <Wordmark />
          </div>
          <nav className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
              Open dashboard <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 h-[520px]" />
        <div className="relative mx-auto max-w-3xl px-5 pt-20 pb-16 text-center sm:pt-28">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 rounded-full border border-border/70 px-3 py-1 text-xs font-medium animate-fade-up"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Updated daily · Data &amp; AI roles
          </Badge>

          <h1
            className="animate-fade-up text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Every <span className="brand-text">Data &amp; AI</span> job worth
            applying to, in one place.
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            JobFinder pulls entry-level Data Engineer and AI / LLM roles from a
            dozen boards, filters them to your profile and city, and tailors your
            résumé for each one.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-7 text-base")}>
              Open the dashboard <ArrowRight className="size-4" />
            </Link>
            <a href="https://github.com/k-Rohit/JobFinder" target="_blank" rel="noreferrer"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 gap-2 px-7 text-base")}>
              View on GitHub
            </a>
          </div>

          <div
            className="animate-fade-up mx-auto mt-14 grid max-w-lg grid-cols-4 gap-4"
            style={{ animationDelay: "240ms" }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview strip */}
      <section className="mx-auto max-w-5xl px-5">
        <div className="rounded-2xl border bg-card p-2 shadow-xl shadow-black/5">
          <div className="rounded-xl border bg-background p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-400/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="ml-2 h-6 flex-1 rounded-md bg-muted" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { t: "Data Engineer", c: "Goldman Sachs", m: "In office", loc: "Bengaluru", tone: "var(--role-1)" },
                { t: "GenAI Engineer", c: "NTT DATA", m: "Remote", loc: "Worldwide", tone: "var(--role-2)" },
                { t: "ML Engineer", c: "Swiggy", m: "In office", loc: "Bengaluru", tone: "var(--role-2)" },
                { t: "Analytics Engineer", c: "Barclays", m: "Hybrid", loc: "Pune", tone: "var(--role-1)" },
              ].map((j) => (
                <div key={j.t} className="relative overflow-hidden rounded-xl border bg-card p-4">
                  <span className="absolute left-0 top-4 bottom-4 w-1 rounded-full" style={{ background: j.tone }} />
                  <div className="pl-2">
                    <div className="font-semibold">{j.t}</div>
                    <div className="text-sm" style={{ color: j.tone }}>{j.c}</div>
                    <div className="mt-2 flex gap-1.5">
                      <Badge variant="secondary" className="text-[11px]">{j.m}</Badge>
                      <Badge variant="secondary" className="text-[11px]">{j.loc}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for a focused job hunt
          </h2>
          <p className="mt-3 text-muted-foreground">
            Not another endless feed. A curated board that already knows what
            you&apos;re looking for.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
            >
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl border bg-background text-brand transition-colors group-hover:brand-gradient group-hover:text-white">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl border brand-gradient px-8 py-16 text-center text-white">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative">
            <Filter className="mx-auto mb-4 size-8 opacity-90" />
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop scrolling ten job boards.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Set your roles and cities once. JobFinder does the rest, every day.
            </p>
            <Link href="/dashboard"
              className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "mt-8 h-12 gap-2 px-7 text-base text-foreground")}>
              Open the dashboard <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span>JobFinder</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="size-3.5" /> Data &amp; AI roles, curated daily.
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5" />
            <a className="hover:text-foreground" href="https://github.com/k-Rohit/JobFinder" target="_blank" rel="noreferrer">
              Open source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
