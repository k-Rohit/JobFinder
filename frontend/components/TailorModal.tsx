"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Download, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Job, Tailored } from "@/lib/types";
import { Button } from "./ui";

export function TailorModal({
  job,
  onClose,
}: {
  job: Job | null;
  onClose: () => void;
}) {
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
        const cached = await api.getTailored(job.id);
        setData(cached);
        setFromCache(true);
      } catch {
        generate(job.id);
      }
    })();
  }, [job, generate]);

  return (
    <AnimatePresence>
      {job && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
            style={{ background: "var(--surface)" }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--violet)" }}>
                  <Sparkles size={15} /> Tailored résumé
                </div>
                <h3 className="mt-0.5 line-clamp-1 text-lg font-bold text-ink">{job.title}</h3>
                <p className="text-sm text-muted">{job.company}</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-16 text-muted">
                  <Sparkles size={26} className="animate-pulse" style={{ color: "var(--violet)" }} />
                  <p>Asking GPT to tailor your résumé… ~20–40s</p>
                </div>
              )}
              {error && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{ color: "var(--amber)", borderColor: "color-mix(in srgb,var(--amber) 40%,transparent)" }}
                >
                  ⚠ {error}
                </div>
              )}
              {data && !loading && (
                <div className="space-y-4">
                  {fromCache && (
                    <p className="text-xs text-muted">
                      Showing a previously generated version ({new Date(data.created_at + "Z").toLocaleString()}).
                    </p>
                  )}
                  {data.keywords?.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-sm font-semibold text-ink-soft">ATS keywords woven in</p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.keywords.map((k) => (
                          <span
                            key={k}
                            className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                            style={{ color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 14%,transparent)" }}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.changes?.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-sm font-semibold text-ink-soft">What changed</p>
                      <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">
                        {data.changes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-ink-soft">Preview</p>
                    <pre className="max-h-72 overflow-auto rounded-xl border bg-surface-2 p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
                      {data.resume_md}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {data && !loading && (
              <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4">
                <a
                  href={api.tailorDownloadUrl(job.id, "docx")}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#16a34a,#0f9d6f)" }}
                >
                  <Download size={15} /> .docx
                </a>
                <a
                  href={api.tailorDownloadUrl(job.id, "md")}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--accent-ink)] shadow-sm transition hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,var(--accent),var(--violet))" }}
                >
                  <Download size={15} /> .md
                </a>
                <Button variant="ghost" onClick={() => generate(job.id)}>
                  <RefreshCw size={15} /> Re-generate
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
