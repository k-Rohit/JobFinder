"use client";
import { ExternalLink } from "lucide-react";
import type { AppConfig } from "@/lib/types";
import { Drawer } from "./ui";

const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "LinkedIn & Indeed (entry, last 24h)",
    links: [
      { label: "LinkedIn · Data Engineer", href: "https://www.linkedin.com/jobs/search/?keywords=data%20engineer&f_E=1%2C2&f_WT=2%2C3&f_TPR=r86400" },
      { label: "LinkedIn · AI / LLM", href: "https://www.linkedin.com/jobs/search/?keywords=AI%20engineer%20OR%20LLM%20OR%20generative%20AI&f_E=1%2C2&f_WT=2%2C3&f_TPR=r86400" },
      { label: "Indeed · Data Engineer (remote)", href: "https://www.indeed.com/jobs?q=data+engineer+entry+level&sc=0kf%3Aattr(DSQF7)%3B&fromage=1" },
      { label: "Indeed · AI / LLM (remote)", href: "https://www.indeed.com/jobs?q=%22AI+engineer%22+OR+%22LLM%22+entry+level&sc=0kf%3Aattr(DSQF7)%3B&fromage=1" },
    ],
  },
  {
    title: "India boards",
    links: [
      { label: "Naukri · Data Engineer (1yr, 7d)", href: "https://www.naukri.com/data-engineer-jobs?experience=1&jobAge=7" },
      { label: "Naukri · AI Engineer (1yr, 7d)", href: "https://www.naukri.com/ai-engineer-jobs?experience=1&jobAge=7" },
      { label: "Naukri · GenAI / LLM", href: "https://www.naukri.com/generative-ai-jobs?experience=1&jobAge=7" },
      { label: "Indeed India · Data Eng (remote, 7d)", href: "https://in.indeed.com/jobs?q=data+engineer&l=India&fromage=7&sc=0kf%3Aattr(DSQF7)%3B" },
      { label: "Foundit (Monster India)", href: "https://www.foundit.in/search/data-engineer-jobs" },
      { label: "Cutshort · Data Engineer", href: "https://cutshort.io/jobs/data-engineer-jobs" },
      { label: "Hirist · Data Engineer", href: "https://hirist.tech/search/data-engineer-jobs" },
    ],
  },
  {
    title: "Global remote boards",
    links: [
      { label: "Wellfound · Data Engineer", href: "https://wellfound.com/role/r/data-engineer" },
      { label: "Wellfound · ML / AI", href: "https://wellfound.com/role/r/machine-learning-engineer" },
      { label: "YC Jobs · ML / AI", href: "https://www.ycombinator.com/jobs/role/machine-learning-engineer" },
      { label: "Remote Rocketship · Entry Data Eng", href: "https://www.remoterocketship.com/jobs?search=data+engineer&seniority=Entry-level" },
      { label: "FlexJobs · Data Engineer", href: "https://www.flexjobs.com/search?searchkeyword=data+engineer" },
    ],
  },
];

export function LinksDrawer({
  open,
  onClose,
  config,
}: {
  open: boolean;
  onClose: () => void;
  config: AppConfig | null;
}) {
  const favs = (config?.favorite_companies || []).filter((c) => c.careers);
  return (
    <Drawer open={open} onClose={onClose} title="One-click job searches" subtitle="Boards without a public API — opens their own results">
      <div className="space-y-6">
        {favs.length > 0 && (
          <Group title="⭐ Favourite companies' careers" links={favs.map((c) => ({ label: c.name, href: c.careers }))} />
        )}
        {GROUPS.map((g) => (
          <Group key={g.title} title={g.title} links={g.links} />
        ))}
      </div>
    </Drawer>
  );
}

function Group({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border bg-surface-2 px-3.5 py-1.5 text-[13px] font-medium text-ink-soft transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {l.label} <ExternalLink size={12} />
          </a>
        ))}
      </div>
    </div>
  );
}
