"use client";
import { CheckCircle2, FileText, KeyRound, Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ResumeMeta, Settings } from "@/lib/types";
import { Button, Drawer, Field, inputCls } from "./ui";

export function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [resume, setResume] = useState<ResumeMeta | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [jsearchKey, setJsearchKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    try {
      const [s, r] = await Promise.all([api.settings(), api.resumeMeta()]);
      setSettings(s);
      setResume(r);
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    if (open) reload();
  }, [open]);

  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return alert("Choose a PDF, DOCX, TXT or MD file first.");
    setBusy("resume");
    try {
      await api.uploadResume(f);
      await reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const saveOpenAi = async () => {
    if (!openaiKey.trim()) return;
    setBusy("openai");
    try {
      await api.setOpenAiKey(openaiKey.trim());
      setOpenaiKey("");
      await reload();
    } finally {
      setBusy(null);
    }
  };
  const saveJsearch = async () => {
    if (!jsearchKey.trim()) return;
    setBusy("jsearch");
    try {
      await api.setJsearchKey(jsearchKey.trim());
      setJsearchKey("");
      await reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Settings" subtitle="Résumé tailoring & data sources">
      <div className="space-y-7">
        <section className="space-y-3">
          <Row icon={<FileText size={16} />} title="Your résumé" ok={!!resume?.filename}
            status={resume?.filename ? `${resume.filename}` : "none uploaded"} />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md"
              className="flex-1 rounded-xl border bg-surface-2 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-white" />
            <Button variant="soft" onClick={upload} disabled={busy === "resume"}>
              <Upload size={15} /> Upload
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <Row icon={<KeyRound size={16} />} title="OpenAI API key" ok={!!settings?.openai_key_set}
            status={settings?.openai_key_set ? `saved (…${settings.openai_key_hint})` : "not set"} />
          <Field label="" hint="stored on your backend, used only for résumé tailoring">
            <div className="flex items-center gap-2">
              <input className={inputCls} type="password" placeholder="sk-…" value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)} />
              <Button variant="soft" onClick={saveOpenAi} disabled={busy === "openai"}>Save</Button>
            </div>
          </Field>
        </section>

        <section className="space-y-3">
          <Row icon={<Search size={16} />} title="JSearch key (optional)" ok={!!settings?.jsearch_key_set}
            status={settings?.jsearch_key_set ? "Indeed + Naukri enabled" : "not set"} />
          <Field label="" hint="RapidAPI key — adds Indeed + Naukri + Glassdoor results">
            <div className="flex items-center gap-2">
              <input className={inputCls} type="password" placeholder="RapidAPI key" value={jsearchKey}
                onChange={(e) => setJsearchKey(e.target.value)} />
              <Button variant="soft" onClick={saveJsearch} disabled={busy === "jsearch"}>Save</Button>
            </div>
          </Field>
        </section>

        <p className="rounded-xl border bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-muted">
          Upload your résumé once, then hit <b className="text-ink-soft">Tailor résumé</b> on any job — GPT rewrites it
          with that job&apos;s ATS keywords (never inventing experience) and you download it as .docx or .md.
        </p>
      </div>
    </Drawer>
  );
}

function Row({ icon, title, status, ok }: { icon: React.ReactNode; title: string; status: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-muted">{icon}</span> {title}
      </div>
      <span
        className="inline-flex items-center gap-1 text-xs font-medium"
        style={{ color: ok ? "var(--green)" : "var(--amber)" }}
      >
        {ok && <CheckCircle2 size={13} />} {status}
      </span>
    </div>
  );
}
