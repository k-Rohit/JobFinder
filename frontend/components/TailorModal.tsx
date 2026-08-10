"use client";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import type { Job, Tailored } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TailorModal({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Tailored | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const generate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.tailor(id));
      setFromCache(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!job) return;
    setData(null);
    setError(null);
    (async () => {
      try {
        setData(await api.getTailored(job.id));
        setFromCache(true);
      } catch {
        generate(job.id);
      }
    })();
  }, [job, generate]);

  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <div className="flex items-center gap-2 text-sm font-medium text-brand">
            <Sparkles className="size-4" /> Tailored résumé
          </div>
          <DialogTitle className="mt-0.5 line-clamp-1 text-lg">{job?.title}</DialogTitle>
          <DialogDescription>{job?.company}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[58vh] px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Sparkles className="size-7 animate-pulse text-brand" />
              <p>Asking GPT to tailor your résumé… ~20–40s</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              ⚠ {error}
            </div>
          )}
          {data && !loading && (
            <div className="space-y-4">
              {fromCache && (
                <p className="text-xs text-muted-foreground">
                  Previously generated ({new Date(data.created_at + "Z").toLocaleString()}).
                </p>
              )}
              {data.keywords?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium">ATS keywords woven in</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.keywords.map((k) => (
                      <span key={k} className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.changes?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium">What changed</p>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
                    {data.changes.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <p className="mb-1.5 text-sm font-medium">Preview</p>
                <pre className="max-h-72 overflow-auto rounded-xl border bg-muted/40 p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap">
                  {data.resume_md}
                </pre>
              </div>
            </div>
          )}
        </ScrollArea>

        {data && !loading && job && (
          <DialogFooter className="flex-row flex-wrap gap-2 border-t px-6 py-4 sm:justify-start">
            <a href={api.tailorDownloadUrl(job.id, "docx")} className={cn(buttonVariants(), "gap-2")}>
              <Download className="size-4" /> .docx
            </a>
            <a href={api.tailorDownloadUrl(job.id, "md")} className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}>
              <Download className="size-4" /> .md
            </a>
            <Button variant="ghost" onClick={() => generate(job.id)} className="gap-2">
              <RefreshCw className="size-4" /> Re-generate
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
