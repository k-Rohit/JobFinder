"use client";
import { Ban, Briefcase, CalendarClock, Globe, type LucideIcon, Plus, Save, Star, Target, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import type { ProfileRole } from "@/lib/types";

export function ProfileDrawer({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [roles, setRoles] = useState<ProfileRole[]>([]);
  const [country, setCountry] = useState("");
  const [cities, setCities] = useState("");
  const [exclude, setExclude] = useState("");
  const [age, setAge] = useState(7);
  const [maxExp, setMaxExp] = useState(3);
  const [favs, setFavs] = useState("");
  const [local, setLocal] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const p = await api.getProfile();
      setRoles(p.roles.length ? p.roles : [{ label: "", keywords: "" }]);
      setCountry(p.country);
      setCities(p.onsite_cities);
      setExclude(p.exclude_locations || "");
      setAge(p.max_age_days);
      setMaxExp(p.max_experience_years);
      setFavs(p.favorite_companies);
      setLocal(p.require_local_eligibility);
    })();
  }, [open]);

  const setRole = (i: number, patch: Partial<ProfileRole>) =>
    setRoles((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    const clean = roles.filter((r) => r.label.trim() && r.keywords.trim());
    if (!clean.length) return toast.error("Add at least one role with a label and keywords.");
    setSaving(true);
    try {
      const res = await api.saveProfile({
        roles: clean,
        country,
        onsite_cities: cities,
        exclude_locations: exclude,
        max_age_days: age,
        max_experience_years: maxExp,
        favorite_companies: favs,
        require_local_eligibility: local,
      });
      toast.success(`Saved: ${res.roles.join(", ")}`, { description: "Hit Refresh to pull fresh results." });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Search profile</SheetTitle>
          <SheetDescription>What jobs this portal hunts for</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <div>
            <Label className="flex items-center gap-2 text-sm">
              <Target className="size-4" /> Roles to look for
            </Label>
            <div className="mt-2 space-y-2">
              {roles.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="max-w-[40%]" placeholder="Data Analyst" value={r.label}
                    onChange={(e) => setRole(i, { label: e.target.value })} />
                  <Input placeholder="keywords: data analyst, bi analyst" value={r.keywords}
                    onChange={(e) => setRole(i, { keywords: e.target.value })} />
                  <Button size="icon" variant="ghost" className="size-9 shrink-0 text-destructive"
                    onClick={() => setRoles((rs) => rs.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="secondary" className="mt-2 gap-1.5"
              onClick={() => setRoles((r) => [...r, { label: "", keywords: "" }])}>
              <Plus className="size-4" /> Add role
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldInput icon={Globe} label="Country" value={country} onChange={setCountry} placeholder="India" />
            <FieldInput icon={Briefcase} label="Office cities" value={cities} onChange={setCities} placeholder="Bangalore, Pune" />
            <FieldInput icon={Ban} label="Exclude locations" value={exclude} onChange={setExclude} placeholder="Chennai, Noida" />
            <div className="grid grid-cols-2 gap-3">
              <FieldNum icon={CalendarClock} label="Max age" value={age} onChange={setAge} />
              <FieldNum icon={UserRound} label="Max yrs" value={maxExp} onChange={setMaxExp} />
            </div>
          </div>

          <FieldInput icon={Star} label="Favourite companies" value={favs} onChange={setFavs} placeholder="Meesho, Swiggy, Zomato" />

          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3.5 py-3">
            <Label htmlFor="local" className="text-sm">Only remote jobs open to my country</Label>
            <Switch id="local" checked={local} onCheckedChange={setLocal} />
          </div>

          <Button onClick={save} disabled={saving} className="w-full gap-2">
            <Save className="size-4" /> Save profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldInput({ icon: Icon, label, value, onChange, placeholder }: {
  icon: LucideIcon; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function FieldNum({ icon: Icon, label, value, onChange }: { icon: LucideIcon; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </Label>
      <Input type="number" value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}
