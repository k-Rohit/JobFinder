"use client";
import { CheckCircle2, FileText, KeyRound, Search, Upload, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import type { ResumeMeta, Settings } from "@/lib/types";

export function SettingsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
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
    if (!f) return toast.error("Choose a PDF, DOCX, TXT or MD file first.");
    setBusy("resume");
    try {
      await api.uploadResume(f);
      await reload();
      toast.success("Résumé uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const save = async (which: "openai" | "jsearch") => {
    const key = which === "openai" ? openaiKey : jsearchKey;
    if (!key.trim()) return;
    setBusy(which);
    try {
      await (which === "openai" ? api.setOpenAiKey(key.trim()) : api.setJsearchKey(key.trim()));
      which === "openai" ? setOpenaiKey("") : setJsearchKey("");
      await reload();
      toast.success("Key saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Résumé tailoring &amp; extra data sources</SheetDescription>
        </SheetHeader>

        <div className="space-y-7 px-4 pb-8">
          <Section icon={<FileText className="size-4" />} title="Your résumé" ok={!!resume?.filename}
            status={resume?.filename || "none uploaded"}>
            <div className="flex items-center gap-2">
              <Input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="h-9" />
              <Button size="sm" variant="secondary" onClick={upload} disabled={busy === "resume"} className="gap-1.5">
                <Upload className="size-4" /> Upload
              </Button>
            </div>
          </Section>

          <Section icon={<KeyRound className="size-4" />} title="OpenAI API key" ok={!!settings?.openai_key_set}
            status={settings?.openai_key_set ? `saved (…${settings.openai_key_hint})` : "not set"}>
            <div className="flex items-center gap-2">
              <Input type="password" placeholder="sk-…" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
              <Button size="sm" variant="secondary" onClick={() => save("openai")} disabled={busy === "openai"}>Save</Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Stored on your backend, used only for résumé tailoring.</p>
          </Section>

          <Section icon={<Search className="size-4" />} title="JSearch key" ok={!!settings?.jsearch_key_set}
            status={settings?.jsearch_key_set ? "Indeed + Naukri on" : "optional"}>
            <div className="flex items-center gap-2">
              <Input type="password" placeholder="RapidAPI key" value={jsearchKey} onChange={(e) => setJsearchKey(e.target.value)} />
              <Button size="sm" variant="secondary" onClick={() => save("jsearch")} disabled={busy === "jsearch"}>Save</Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Adds Indeed + Naukri + Glassdoor via RapidAPI.</p>
          </Section>

          <div className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <Zap className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>Upload your résumé once, then hit <b className="text-foreground">Tailor</b> on any job — GPT rewrites it with that job&apos;s ATS keywords and you download .docx or .md.</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon, title, status, ok, children }: {
  icon: React.ReactNode; title: string; status: string; ok: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{icon}</span> {title}
        </Label>
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: ok ? "var(--success)" : "var(--muted-foreground)" }}>
          {ok && <CheckCircle2 className="size-3.5" />} {status}
        </span>
      </div>
      {children}
    </div>
  );
}
