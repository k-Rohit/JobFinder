"use client";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AppConfig } from "@/lib/types";

const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "LinkedIn & Indeed (entry, 24h)",
    links: [
      { label: "LinkedIn · Data Engineer", href: "https://www.linkedin.com/jobs/search/?keywords=data%20engineer&f_E=1%2C2&f_WT=2%2C3&f_TPR=r86400" },
      { label: "LinkedIn · AI / LLM", href: "https://www.linkedin.com/jobs/search/?keywords=AI%20engineer%20OR%20LLM%20OR%20generative%20AI&f_E=1%2C2&f_WT=2%2C3&f_TPR=r86400" },
      { label: "Indeed · Data Engineer", href: "https://www.indeed.com/jobs?q=data+engineer+entry+level&sc=0kf%3Aattr(DSQF7)%3B&fromage=1" },
      { label: "Indeed · AI / LLM", href: "https://www.indeed.com/jobs?q=%22AI+engineer%22+OR+%22LLM%22+entry+level&sc=0kf%3Aattr(DSQF7)%3B&fromage=1" },
    ],
  },
  {
    title: "India boards",
    links: [
      { label: "Naukri · Data Engineer", href: "https://www.naukri.com/data-engineer-jobs?experience=1&jobAge=7" },
      { label: "Naukri · AI Engineer", href: "https://www.naukri.com/ai-engineer-jobs?experience=1&jobAge=7" },
      { label: "Naukri · GenAI / LLM", href: "https://www.naukri.com/generative-ai-jobs?experience=1&jobAge=7" },
      { label: "Indeed India · Data Eng", href: "https://in.indeed.com/jobs?q=data+engineer&l=India&fromage=7" },
      { label: "Foundit (Monster)", href: "https://www.foundit.in/search/data-engineer-jobs" },
      { label: "Cutshort", href: "https://cutshort.io/jobs/data-engineer-jobs" },
      { label: "Hirist", href: "https://hirist.tech/search/data-engineer-jobs" },
    ],
  },
  {
    title: "Global remote",
    links: [
      { label: "Wellfound · Data Engineer", href: "https://wellfound.com/role/r/data-engineer" },
      { label: "Wellfound · ML / AI", href: "https://wellfound.com/role/r/machine-learning-engineer" },
      { label: "YC Jobs · ML / AI", href: "https://www.ycombinator.com/jobs/role/machine-learning-engineer" },
      { label: "Remote Rocketship", href: "https://www.remoterocketship.com/jobs?search=data+engineer&seniority=Entry-level" },
    ],
  },
];

export function LinksDrawer({
  open,
  onOpenChange,
  config,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: AppConfig | null;
}) {
  const favs = (config?.favorite_companies || []).filter((c) => c.careers);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Job-board links</SheetTitle>
          <SheetDescription>Boards without a public API — opens their own results</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          {favs.length > 0 && (
            <Group title="Favourite companies" links={favs.map((c) => ({ label: c.name, href: c.careers }))} />
          )}
          {GROUPS.map((g) => (
            <Group key={g.title} {...g} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Group({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:text-brand">
            {l.label} <ExternalLink className="size-3" />
          </a>
        ))}
      </div>
    </div>
  );
}
