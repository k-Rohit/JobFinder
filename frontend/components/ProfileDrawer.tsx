"use client";
import { Plus, Save, Target, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProfileRole } from "@/lib/types";
import { Button, Drawer, Field, inputCls } from "./ui";

export function ProfileDrawer({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roles, setRoles] = useState<ProfileRole[]>([]);
  const [country, setCountry] = useState("");
  const [cities, setCities] = useState("");
  const [age, setAge] = useState(7);
  const [maxExp, setMaxExp] = useState(3);
  const [favs, setFavs] = useState("");
  const [local, setLocal] = useState(true);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const p = await api.getProfile();
      setRoles(p.roles.length ? p.roles : [{ label: "", keywords: "" }]);
      setCountry(p.country);
      setCities(p.onsite_cities);
      setAge(p.max_age_days);
      setMaxExp(p.max_experience_years);
      setFavs(p.favorite_companies);
      setLocal(p.require_local_eligibility);
      setStatus(null);
    })();
  }, [open]);

  const setRole = (i: number, patch: Partial<ProfileRole>) =>
    setRoles((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    const clean = roles.filter((r) => r.label.trim() && r.keywords.trim());
    if (!clean.length) {
      setStatus({ msg: "Add at least one role with a label and keywords.", ok: false });
      return;
    }
    setSaving(true);
    setStatus({ msg: "Saving…", ok: true });
    try {
      const res = await api.saveProfile({
        roles: clean,
        country,
        onsite_cities: cities,
        max_age_days: age,
        max_experience_years: maxExp,
        favorite_companies: favs,
        require_local_eligibility: local,
      });
      setStatus({ msg: `Saved: ${res.roles.join(", ")}. Hit Refresh for fresh results.`, ok: true });
      onSaved();
    } catch (e) {
      setStatus({ msg: (e as Error).message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Search profile" subtitle="What jobs this portal hunts for">
      <div className="space-y-6">
        <p className="rounded-xl border bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-muted">
          Change what&apos;s tracked — e.g. add <b className="text-ink-soft">Data Analyst</b>. Saves instantly; hit
          Refresh afterwards to pull fresh results.
        </p>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
            <Target size={15} /> Roles to look for
          </div>
          <div className="space-y-2">
            {roles.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputCls + " max-w-[42%]"}
                  placeholder="Label (Data Analyst)"
                  value={r.label}
                  onChange={(e) => setRole(i, { label: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="keywords: data analyst, bi analyst"
                  value={r.keywords}
                  onChange={(e) => setRole(i, { keywords: e.target.value })}
                />
                <button
                  onClick={() => setRoles((rs) => rs.filter((_, j) => j !== i))}
                  className="rounded-lg border p-2 text-[var(--red)] transition hover:bg-[color-mix(in_srgb,var(--red)_10%,transparent)]"
                  aria-label="Remove role"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="soft" className="mt-2" onClick={() => setRoles((r) => [...r, { label: "", keywords: "" }])}>
            <Plus size={15} /> Add role
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="🌍 Country (remote eligibility)">
            <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
          </Field>
          <Field label="🏢 Office cities">
            <input className={inputCls} value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Bangalore, Pune" />
          </Field>
          <Field label="📅 Max age (days)">
            <input className={inputCls} type="number" min={1} max={90} value={age} onChange={(e) => setAge(+e.target.value)} />
          </Field>
          <Field label="🧑‍💼 Max experience (yrs)">
            <input className={inputCls} type="number" min={0} max={20} value={maxExp} onChange={(e) => setMaxExp(+e.target.value)} />
          </Field>
        </div>

        <Field label="⭐ Favourite companies">
          <input className={inputCls} value={favs} onChange={(e) => setFavs(e.target.value)} placeholder="Meesho, Swiggy, Zomato, …" />
        </Field>

        <label className="flex items-center gap-2.5 text-sm font-medium text-ink-soft">
          <input type="checkbox" checked={local} onChange={(e) => setLocal(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]" />
          Only show remote jobs open to my country
        </label>

        <div className="flex items-center gap-3 border-t pt-4">
          <Button variant="primary" onClick={save} disabled={saving}>
            <Save size={15} /> Save profile
          </Button>
          {status && (
            <span className="text-sm" style={{ color: status.ok ? "var(--green)" : "var(--amber)" }}>
              {status.msg}
            </span>
          )}
        </div>
      </div>
    </Drawer>
  );
}
