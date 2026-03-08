/**
 * AdminCoachingSettings
 * Panneau de configuration pour les activités de type "coaching" :
 *  - Durées & tarifs (30min, 1h, etc.)
 *  - Disponibilités récurrentes (jours + plages horaires)
 *  - Dates bloquées (exceptions)
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, CalendarOff, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
type Duration = {
  id?: string;
  minutes: number;
  label: string;
  price: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
};

type Availability = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAYS_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const DEFAULT_DURATIONS: Omit<Duration, "id">[] = [
  { minutes: 30,  label: "30 minutes",  price: 0, currency: "FCFA", is_active: true, sort_order: 1 },
  { minutes: 60,  label: "1 heure",     price: 0, currency: "FCFA", is_active: true, sort_order: 2 },
  { minutes: 90,  label: "1h30",        price: 0, currency: "FCFA", is_active: false, sort_order: 3 },
  { minutes: 120, label: "2 heures",    price: 0, currency: "FCFA", is_active: false, sort_order: 4 },
];

export function AdminCoachingSettings({ productId }: { productId: string }) {
  /* ── Durées ── */
  const [durations, setDurations] = useState<Duration[]>([]);
  const [durLoading, setDurLoading] = useState(true);
  const [durSaving, setDurSaving] = useState(false);

  /* ── Disponibilités ── */
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [avLoading, setAvLoading] = useState(true);
  const [avSaving, setAvSaving] = useState(false);

  /* ── Dates bloquées ── */
  const [blockedDates, setBlockedDates] = useState<{ id?: string; blocked_date: string; reason: string }[]>([]);
  const [newBlocked, setNewBlocked] = useState({ date: "", reason: "" });
  const [bdSaving, setBdSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;
    fetchDurations();
    fetchAvailability();
    fetchBlockedDates();
  }, [productId]);

  /* ─── Fetch ─── */
  const fetchDurations = async () => {
    setDurLoading(true);
    const { data } = await (supabase as any)
      .from("coaching_durations")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    if (data && data.length > 0) {
      setDurations(data);
    } else {
      // First load: propose defaults
      setDurations(DEFAULT_DURATIONS as Duration[]);
    }
    setDurLoading(false);
  };

  const fetchAvailability = async () => {
    setAvLoading(true);
    const { data } = await (supabase as any)
      .from("coaching_availability")
      .select("*")
      .eq("product_id", productId)
      .order("day_of_week");
    setAvailability((data as Availability[]) || []);
    setAvLoading(false);
  };

  const fetchBlockedDates = async () => {
    const { data } = await (supabase as any)
      .from("coaching_blocked_dates")
      .select("*")
      .eq("product_id", productId)
      .order("blocked_date");
    setBlockedDates(data || []);
  };

  /* ─── Durées ─── */
  const updateDuration = (idx: number, field: keyof Duration, value: any) => {
    setDurations((prev) => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const addDuration = () => {
    setDurations((prev) => [
      ...prev,
      { minutes: 60, label: "1 heure", price: 0, currency: "FCFA", is_active: true, sort_order: prev.length + 1 },
    ]);
  };

  const removeDuration = (idx: number) => {
    setDurations((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveDurations = async () => {
    setDurSaving(true);
    // Delete all existing, then re-insert
    await (supabase as any).from("coaching_durations").delete().eq("product_id", productId);
    const rows = durations.map((d, i) => ({
      product_id: productId,
      minutes: Number(d.minutes),
      label: d.label.trim() || `${d.minutes} min`,
      price: Number(d.price) || 0,
      currency: d.currency || "FCFA",
      is_active: d.is_active,
      sort_order: i + 1,
    }));
    if (rows.length > 0) {
      const { error } = await (supabase as any).from("coaching_durations").insert(rows);
      if (error) { toast.error(error.message); setDurSaving(false); return; }
    }
    toast.success("Durées & tarifs sauvegardés ✓");
    fetchDurations();
    setDurSaving(false);
  };

  /* ─── Disponibilités ─── */
  const toggleDay = (day: number) => {
    const exists = availability.find((a) => a.day_of_week === day);
    if (exists) {
      setAvailability((prev) => prev.filter((a) => a.day_of_week !== day));
    } else {
      setAvailability((prev) => [
        ...prev,
        { day_of_week: day, start_time: "09:00", end_time: "18:00", is_active: true },
      ]);
    }
  };

  const updateAvailability = (day: number, field: "start_time" | "end_time", value: string) => {
    setAvailability((prev) =>
      prev.map((a) => a.day_of_week === day ? { ...a, [field]: value } : a)
    );
  };

  const saveAvailability = async () => {
    setAvSaving(true);
    await (supabase as any).from("coaching_availability").delete().eq("product_id", productId);
    const rows = availability.filter((a) => a.is_active).map((a) => ({
      product_id: productId,
      day_of_week: a.day_of_week,
      start_time: a.start_time,
      end_time: a.end_time,
      is_active: true,
    }));
    if (rows.length > 0) {
      const { error } = await (supabase as any).from("coaching_availability").insert(rows);
      if (error) { toast.error(error.message); setAvSaving(false); return; }
    }
    toast.success("Disponibilités sauvegardées ✓");
    setAvSaving(false);
  };

  /* ─── Dates bloquées ─── */
  const addBlockedDate = async () => {
    if (!newBlocked.date) { toast.error("Sélectionne une date"); return; }
    setBdSaving(true);
    const { error } = await (supabase as any).from("coaching_blocked_dates").insert({
      product_id: productId,
      blocked_date: newBlocked.date,
      reason: newBlocked.reason.trim() || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Date bloquée ajoutée ✓");
      setNewBlocked({ date: "", reason: "" });
      fetchBlockedDates();
    }
    setBdSaving(false);
  };

  const removeBlockedDate = async (id: string) => {
    await (supabase as any).from("coaching_blocked_dates").delete().eq("id", id);
    fetchBlockedDates();
  };

  /* ════════════════════════ UI ════════════════════════ */
  return (
    <div className="space-y-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 text-primary font-bold">
        <Clock className="h-4 w-4" />
        Configuration Coaching one-to-one
      </div>

      {/* ── Durées & Tarifs ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-foreground">Durées & tarifs</Label>
          <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={addDuration}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        {durLoading ? (
          <div className="animate-pulse h-10 rounded bg-muted" />
        ) : (
          <div className="space-y-2">
            {durations.map((d, idx) => (
              <div key={idx} className={cn(
                "flex items-center gap-2 rounded-lg border border-border bg-background p-3",
                !d.is_active && "opacity-50"
              )}>
                <Switch
                  checked={d.is_active}
                  onCheckedChange={(v) => updateDuration(idx, "is_active", v)}
                  className="shrink-0"
                />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Durée (min)</p>
                    <Input
                      type="number"
                      value={d.minutes}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        updateDuration(idx, "minutes", m);
                        // auto-label
                        if (m < 60) updateDuration(idx, "label", `${m} minutes`);
                        else if (m === 60) updateDuration(idx, "label", "1 heure");
                        else if (m % 60 === 0) updateDuration(idx, "label", `${m / 60} heures`);
                        else updateDuration(idx, "label", `${Math.floor(m / 60)}h${m % 60}`);
                      }}
                      className="h-8 text-sm"
                      min={15}
                      step={15}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Label affiché</p>
                    <Input
                      value={d.label}
                      onChange={(e) => updateDuration(idx, "label", e.target.value)}
                      className="h-8 text-sm"
                      placeholder="30 minutes"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Prix</p>
                    <Input
                      type="number"
                      value={d.price}
                      onChange={(e) => updateDuration(idx, "price", e.target.value)}
                      className="h-8 text-sm"
                      min={0}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Devise</p>
                    <Input
                      value={d.currency}
                      onChange={(e) => updateDuration(idx, "currency", e.target.value)}
                      className="h-8 text-sm"
                      placeholder="FCFA"
                    />
                  </div>
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => removeDuration(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button type="button" onClick={saveDurations} disabled={durSaving} size="sm" className="gap-2 bg-primary text-primary-foreground">
          <Save className="h-3.5 w-3.5" />
          {durSaving ? "Sauvegarde…" : "Sauvegarder les tarifs"}
        </Button>
      </div>

      <div className="border-t border-border/50" />

      {/* ── Disponibilités ── */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">Disponibilités hebdomadaires</Label>
        <p className="text-xs text-muted-foreground">Sélectionne les jours et plages horaires où tu es disponible.</p>

        {avLoading ? (
          <div className="animate-pulse h-20 rounded bg-muted" />
        ) : (
          <div className="space-y-3">
            {/* Day selector */}
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, idx) => {
                const active = availability.some((a) => a.day_of_week === idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xs font-semibold border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Time ranges for active days */}
            {availability.sort((a, b) => a.day_of_week - b.day_of_week).map((a) => (
              <div key={a.day_of_week} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                <span className="text-sm font-medium text-foreground w-20 shrink-0">{DAYS_FULL[a.day_of_week]}</span>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={a.start_time}
                    onChange={(e) => updateAvailability(a.day_of_week, "start_time", e.target.value)}
                    className="h-8 text-sm w-28"
                  />
                  <span className="text-muted-foreground text-xs">→</span>
                  <Input
                    type="time"
                    value={a.end_time}
                    onChange={(e) => updateAvailability(a.day_of_week, "end_time", e.target.value)}
                    className="h-8 text-sm w-28"
                  />
                </div>
              </div>
            ))}

            {availability.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Aucun jour sélectionné.</p>
            )}
          </div>
        )}

        <Button type="button" onClick={saveAvailability} disabled={avSaving} size="sm" className="gap-2 bg-primary text-primary-foreground">
          <Save className="h-3.5 w-3.5" />
          {avSaving ? "Sauvegarde…" : "Sauvegarder les disponibilités"}
        </Button>
      </div>

      <div className="border-t border-border/50" />

      {/* ── Dates bloquées ── */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarOff className="h-4 w-4 text-destructive" /> Dates d'indisponibilité (congés, exceptions)
        </Label>

        <div className="flex gap-2">
          <Input
            type="date"
            value={newBlocked.date}
            onChange={(e) => setNewBlocked((p) => ({ ...p, date: e.target.value }))}
            className="h-9 text-sm"
          />
          <Input
            value={newBlocked.reason}
            onChange={(e) => setNewBlocked((p) => ({ ...p, reason: e.target.value }))}
            placeholder="Motif (optionnel)"
            className="h-9 text-sm flex-1"
          />
          <Button type="button" onClick={addBlockedDate} disabled={bdSaving} size="sm" className="gap-1 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Bloquer
          </Button>
        </div>

        {blockedDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {blockedDates.map((b) => (
              <Badge
                key={b.id}
                variant="outline"
                className="gap-1.5 text-xs border-destructive/30 text-destructive pr-1"
              >
                <CalendarOff className="h-3 w-3" />
                {new Date(b.blocked_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                {b.reason && <span className="text-muted-foreground">— {b.reason}</span>}
                <button
                  type="button"
                  onClick={() => b.id && removeBlockedDate(b.id)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
