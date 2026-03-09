import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Edit, Trash2, Calendar, MapPin, Video, Users, Tag,
  Settings, GripVertical, Check, X,
  ChevronDown, ChevronLeft, ChevronRight, Archive,
  /* ── Icônes disponibles pour les types ── */
  Zap, Star, Heart, BookOpen, Coffee, Sun, Moon, Music,
  Camera, Globe, Smile, Trophy, Target, Rocket, Leaf, Flame,
  Diamond, Crown, Gift, Clock, Utensils, ChefHat, Mic,
  Monitor, Mountain, Waves, Dumbbell, Brain, Lightbulb,
  Compass, Sparkles, GraduationCap, TreePine, Wine, Tent,
  Home, Bike, Sunset, Shirt, Bell, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ═══════════════ COACHING CONSTANTS ═══════════════ */
export const DURATION_PRESETS = [
  { minutes: 30, label: "30 min" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 h" },
  { minutes: 90, label: "1 h 30" },
  { minutes: 120, label: "2 h" },
];
const FR_DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FR_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/* ═══════════════ COACHING SECTION ═══════════════ */
function CoachingSection({
  extra,
  currency,
  onChange,
}: {
  extra: Record<string, any>;
  currency: string;
  onChange: (key: string, val: any) => void;
}) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const durations: Record<number, { enabled: boolean; price: number }> = extra.durations || {};
  const availableDays: number[] = extra.available_days ?? [0, 1, 2, 3, 4];
  const blockedDates: string[] = extra.blocked_dates || [];
  const timeStart: string = extra.available_time_start || "09:00";
  const timeEnd: string = extra.available_time_end || "18:00";

  const toggleDuration = (minutes: number, checked: boolean) => {
    const next = {
      ...durations,
      [minutes]: { enabled: checked, price: durations[minutes]?.price ?? 0 },
    };
    onChange("durations", next);
  };
  const setDurationPrice = (minutes: number, price: number) => {
    const next = {
      ...durations,
      [minutes]: { enabled: durations[minutes]?.enabled ?? true, price },
    };
    onChange("durations", next);
  };

  const toggleDay = (frIdx: number) => {
    const next = availableDays.includes(frIdx)
      ? availableDays.filter((d) => d !== frIdx)
      : [...availableDays, frIdx].sort();
    onChange("available_days", next);
  };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstFrIdx = ((new Date(calYear, calMonth, 1).getDay() + 6) % 7);

  const toggleBlockDate = (dateStr: string) => {
    const next = blockedDates.includes(dateStr)
      ? blockedDates.filter((d) => d !== dateStr)
      : [...blockedDates, dateStr];
    onChange("blocked_dates", next);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  return (
    <div className="space-y-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" /> Coaching 1:1 — Disponibilités &amp; tarifs
      </p>

      {/* ── Durées & tarifs ── */}
      <div className="space-y-2">
        <Label>Durées proposées</Label>
        <div className="space-y-2">
          {DURATION_PRESETS.map(({ minutes, label }) => {
            const d = durations[minutes];
            const enabled = d?.enabled ?? false;
            return (
              <div
                key={minutes}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2.5 transition-all",
                  enabled ? "border-primary/30 bg-background" : "border-border bg-background/50 opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => toggleDuration(minutes, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary shrink-0"
                />
                <span className="text-sm font-medium text-foreground w-14 shrink-0">{label}</span>
                {enabled ? (
                  <>
                    <Input
                      type="number"
                      min={0}
                      value={d?.price ?? 0}
                      onChange={(e) => setDurationPrice(minutes, Number(e.target.value))}
                      className="h-8 flex-1"
                      placeholder="Prix"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">{currency || "FCFA"}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">non proposée</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Plage horaire ── */}
      <div className="space-y-2">
        <Label>Plage horaire de disponibilité</Label>
        <div className="flex items-center gap-3">
          <Input
            type="time"
            value={timeStart}
            onChange={(e) => onChange("available_time_start", e.target.value)}
            className="h-9 w-32"
          />
          <span className="text-sm text-muted-foreground">→</span>
          <Input
            type="time"
            value={timeEnd}
            onChange={(e) => onChange("available_time_end", e.target.value)}
            className="h-9 w-32"
          />
        </div>
      </div>

      {/* ── Jours disponibles ── */}
      <div className="space-y-2">
        <Label>Jours de disponibilité</Label>
        <div className="flex gap-1.5 flex-wrap">
          {FR_DAYS_SHORT.map((day, frIdx) => (
            <button
              key={frIdx}
              type="button"
              onClick={() => toggleDay(frIdx)}
              className={cn(
                "h-9 w-12 rounded-lg text-xs font-semibold transition-all border",
                availableDays.includes(frIdx)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendrier — jours bloqués ── */}
      <div className="space-y-2">
        <Label>Jours bloqués (cliquer pour bloquer/débloquer)</Label>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Navigation mois */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {FR_MONTHS[calMonth]} {calYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Noms des jours */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/20">
            {FR_DAYS_SHORT.map((d) => (
              <div key={d} className="py-1.5 text-center text-[10px] font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Grille des jours */}
          <div className="grid grid-cols-7 p-1 gap-0.5">
            {Array.from({ length: firstFrIdx }).map((_, i) => (
              <div key={`e${i}`} className="h-8" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const jsDay = new Date(calYear, calMonth, day).getDay();
              const frIdx = (jsDay + 6) % 7;
              const isAvailDay = availableDays.includes(frIdx);
              const isBlocked = blockedDates.includes(dateStr);
              const todayStr = new Date().toISOString().slice(0, 10);
              const isPast = dateStr < todayStr;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => toggleBlockDate(dateStr)}
                  className={cn(
                    "h-8 text-xs font-medium transition-all flex items-center justify-center rounded-md",
                    isPast
                      ? "text-muted-foreground/30 cursor-default"
                      : isBlocked
                      ? "bg-destructive/20 text-destructive line-through hover:bg-destructive/30"
                      : isAvailDay
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Légende */}
          <div className="px-4 py-2 border-t border-border flex gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-primary/10 border border-primary/20" /> Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-destructive/20 border border-destructive/20" /> Bloqué
            </span>
          </div>
        </div>
        {blockedDates.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {blockedDates.length} jour{blockedDates.length > 1 ? "s" : ""} bloqué{blockedDates.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ ICON SYSTEM ═══════════════ */
export const ACTIVITY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Star, Heart, BookOpen, Coffee, Sun, Moon, Music,
  Camera, Globe, Smile, Trophy, Target, Rocket, Leaf, Flame,
  Diamond, Crown, Gift, Clock, Utensils, ChefHat, Mic,
  Monitor, Mountain, Waves, Dumbbell, Brain, Lightbulb,
  Compass, Sparkles, GraduationCap, TreePine, Wine, Tent,
  Home, Bike, Sunset, Shirt, Bell, Palette,
};

export function ActivityIcon({
  iconName,
  emoji,
  className = "h-5 w-5",
}: {
  iconName?: string | null;
  emoji?: string | null;
  className?: string;
}) {
  if (iconName && ACTIVITY_ICON_MAP[iconName]) {
    const Icon = ACTIVITY_ICON_MAP[iconName];
    return <Icon className={className} />;
  }
  return <span className="text-lg leading-none">{emoji || "📅"}</span>;
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
        {Object.keys(ACTIVITY_ICON_MAP).map((name) => {
          const Icon = ACTIVITY_ICON_MAP[name];
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={cn(
                "flex items-center justify-center rounded-lg p-2 transition-all hover:bg-primary/10",
                value === name
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
      {value && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Sélectionné : <span className="font-medium text-foreground">{value}</span>
        </p>
      )}
    </div>
  );
}

/* ═══════════════ TYPES ═══════════════ */
type ActivityType = {
  id: string;
  value: string;
  label: string;
  emoji: string;
  icon_name: string | null;
  sort_order: number;
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  price: number;
  currency: string | null;
  delivery_date: string | null;
  end_date: string | null;
  event_time: string | null;
  attendance_mode: string | null;
  venue: string | null;
  max_spots: number;
  spots_taken: number | null;
  status: string | null;
  cover_image_url: string | null;
  thumbnail_emoji: string | null;
  extra_config: Record<string, any> | null;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "",
  price: 0,
  currency: "FCFA",
  delivery_date: "",
  end_date: "",
  event_time: "",
  attendance_mode: "in-person",
  venue: "",
  online_link: "",
  max_spots: 0,
  thumbnail_emoji: "",
  cover_image_url: null as string | null,
  status: "active",
  extra_config: {} as Record<string, any>,
};

const EMPTY_TYPE_FORM = { value: "", label: "", emoji: "📅", icon_name: "", sort_order: 0 };

const DRESS_CODES = [
  { value: "", label: "Aucun dress code" },
  { value: "casual", label: "Décontracté" },
  { value: "smart_casual", label: "Smart casual" },
  { value: "formelle", label: "Tenue formelle" },
  { value: "soiree", label: "Tenue de soirée" },
];

/* ═══════════════════════════════════════════════════════════════ */
export default function AdminActivites() {
  /* ── Activités ── */
  const [activities, setActivities] = useState<Activity[]>([]);
  const [actLoading, setActLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPast, setShowPast] = useState(false);

  /* ── Types ── */
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [typeSaving, setTypeSaving] = useState(false);

  useEffect(() => { fetchTypes(); fetchActivities(); }, []);

  /* ─── Fetch ─── */
  const fetchTypes = async () => {
    setTypesLoading(true);
    const { data } = await supabase.from("activity_types" as any).select("*").order("sort_order");
    setTypes((data as ActivityType[]) || []);
    setTypesLoading(false);
  };

  const fetchActivities = async () => {
    setActLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, title, description, type, price, currency, delivery_date, end_date, event_time, attendance_mode, venue, max_spots, spots_taken, status, cover_image_url, thumbnail_emoji, extra_config")
      .order("created_at", { ascending: false });
    setActivities((data as any[]) || []);
    setActLoading(false);
  };

  /* ─── Activity CRUD ─── */
  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, type: types[0]?.value || "" });
    setDialogOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description || "",
      type: a.type || types[0]?.value || "",
      price: a.price,
      currency: a.currency || "FCFA",
      delivery_date: a.delivery_date ? a.delivery_date.slice(0, 10) : "",
      end_date: a.end_date ? a.end_date.slice(0, 10) : "",
      event_time: a.event_time || "",
      attendance_mode: a.attendance_mode || "in-person",
      venue: a.venue || "",
      online_link: (a.extra_config as any)?.online_link || "",
      max_spots: a.max_spots,
      thumbnail_emoji: a.thumbnail_emoji || "",
      cover_image_url: a.cover_image_url || null,
      status: a.status || "active",
      extra_config: (a.extra_config as Record<string, any>) || {},
    });
    setDialogOpen(true);
  };

  const setField = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));
  const setExtra = (key: string, val: any) => setForm((p) => ({ ...p, extra_config: { ...p.extra_config, [key]: val } }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return; }
    if (!form.type) { toast.error("Choisissez un type d'activité"); return; }
    setSaving(true);

    const isCoaching = form.type === "coaching";

    // Pour coaching : prix = minimum des durées actives (pour affichage "à partir de")
    const coachingMinPrice = isCoaching && form.extra_config.durations
      ? Math.min(
          ...Object.values(form.extra_config.durations as Record<string, { enabled: boolean; price: number }>)
            .filter((d) => d.enabled)
            .map((d) => d.price)
        ) || 0
      : 0;

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      price: isCoaching ? coachingMinPrice : (Number(form.price) || 0),
      currency: form.currency || "FCFA",
      delivery_date: isCoaching ? null : (form.delivery_date || null),
      end_date: form.type === "weekend" ? (form.end_date || null) : null,
      event_time: isCoaching ? null : (form.event_time || null),
      attendance_mode: form.attendance_mode,
      venue: form.attendance_mode !== "online" ? (form.venue.trim() || null) : null,
      max_spots: Number(form.max_spots) || 0,
      thumbnail_emoji: form.thumbnail_emoji || null,
      cover_image_url: form.cover_image_url || null,
      status: form.status,
      delivery_mode: "scheduled",
      extra_config: Object.keys(form.extra_config).length > 0 ? form.extra_config : null,
    };

    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success(editing ? "Activité mise à jour ✓" : "Activité créée ✓");
      setDialogOpen(false);
      fetchActivities();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette activité définitivement ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Activité supprimée"); fetchActivities(); }
  };

  const handleArchive = async (id: string) => {
    await supabase.from("products").update({ status: "draft" }).eq("id", id);
    toast.success("Activité archivée (brouillon)");
    fetchActivities();
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-covers").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("product-covers").getPublicUrl(path);
    setField("cover_image_url", urlData.publicUrl);
    setUploading(false);
    toast.success("Image uploadée ✓");
  };

  const toggleStatus = async (a: Activity) => {
    const next = a.status === "active" ? "draft" : "active";
    await supabase.from("products").update({ status: next }).eq("id", a.id);
    fetchActivities();
  };

  /* ─── Type CRUD ─── */
  const openCreateType = () => {
    setEditingType(null);
    setTypeForm({ ...EMPTY_TYPE_FORM, sort_order: types.length + 1 });
    setTypeDialogOpen(true);
  };

  const openEditType = (t: ActivityType) => {
    setEditingType(t);
    setTypeForm({ value: t.value, label: t.label, emoji: t.emoji, icon_name: t.icon_name || "", sort_order: t.sort_order });
    setTypeDialogOpen(true);
  };

  const slugify = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

  const handleSaveType = async () => {
    if (!typeForm.label.trim()) { toast.error("Le nom est requis"); return; }
    setTypeSaving(true);
    const payload = {
      value: slugify(typeForm.value || typeForm.label),
      label: typeForm.label.trim(),
      emoji: typeForm.emoji.trim() || "📅",
      icon_name: typeForm.icon_name || null,
      sort_order: Number(typeForm.sort_order) || 0,
    };
    const { error } = editingType
      ? await (supabase.from("activity_types" as any).update(payload).eq("id", editingType.id) as any)
      : await (supabase.from("activity_types" as any).insert(payload) as any);
    if (error) toast.error(error.message);
    else {
      toast.success(editingType ? "Type modifié ✓" : "Type créé ✓");
      setTypeDialogOpen(false);
      fetchTypes();
    }
    setTypeSaving(false);
  };

  const handleDeleteType = async (t: ActivityType) => {
    const used = activities.some((a) => a.type === t.value);
    if (used) { toast.error(`Ce type est utilisé par ${activities.filter(a => a.type === t.value).length} activité(s).`); return; }
    if (!confirm(`Supprimer le type "${t.label}" ?`)) return;
    const { error } = await (supabase.from("activity_types" as any).delete().eq("id", t.id) as any);
    if (error) toast.error(error.message);
    else { toast.success("Type supprimé"); fetchTypes(); }
  };

  /* ─── Helpers ─── */
  const typeRecord = Object.fromEntries(types.map((t) => [t.value, t]));
  const typeValues = types.map((t) => t.value);
  const filteredActivities = activities.filter((a) => a.type && typeValues.includes(a.type));

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = filteredActivities.filter(
    (a) => a.type === "coaching" || !a.delivery_date || a.delivery_date >= todayStr
  );
  const past = filteredActivities.filter(
    (a) => a.type !== "coaching" && a.delivery_date && a.delivery_date < todayStr
  );

  const getNightCount = (start: string, end: string) => {
    if (!start || !end) return null;
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    if (diff <= 0) return null;
    return Math.round(diff);
  };

  /* ── Render one activity card ── */
  const renderActivityCard = (a: Activity, isPast = false) => {
    const tInfo = typeRecord[a.type || ""];
    const spotsLeft = a.max_spots > 0 ? a.max_spots - (a.spots_taken || 0) : null;
    const nights = a.type === "weekend" ? getNightCount(a.delivery_date || "", a.end_date || "") : null;
    const isCoaching = a.type === "coaching";

    /* coaching duration labels */
    const coachingDurations = isCoaching && a.extra_config?.durations
      ? Object.entries(a.extra_config.durations as Record<string, { enabled: boolean; price: number }>)
          .filter(([, d]) => d.enabled)
          .map(([min, d]) => {
            const label = DURATION_PRESETS.find((p) => p.minutes === Number(min))?.label || `${min}min`;
            return `${label} · ${d.price.toLocaleString("fr-FR")} ${a.currency || "FCFA"}`;
          })
      : [];

    return (
      <div
        key={a.id}
        className={cn(
          "flex items-center gap-4 rounded-xl border bg-card p-4",
          isPast ? "border-border/50 opacity-75" : "border-border"
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary overflow-hidden">
          {a.cover_image_url
            ? <img src={a.cover_image_url} alt="" className="w-full h-full object-cover" />
            : tInfo ? <ActivityIcon iconName={tInfo.icon_name} emoji={tInfo.emoji} className="h-6 w-6" /> : <Calendar className="h-6 w-6" />
          }
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{a.title}</h3>
            {tInfo && (
              <Badge variant="secondary" className="text-xs shrink-0">{tInfo.label}</Badge>
            )}
            <Badge className={cn(
              "text-xs shrink-0",
              a.status === "active" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
            )}>
              {a.status === "active" ? "Actif" : "Brouillon"}
            </Badge>
            {isPast && (
              <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">Passée</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {isCoaching ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Sur réservation
              </span>
            ) : a.delivery_date ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(a.delivery_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                {a.end_date && ` → ${new Date(a.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                {nights && ` · ${nights} nuit${nights > 1 ? "s" : ""}`}
                {a.event_time && ` à ${a.event_time}`}
              </span>
            ) : null}
            {a.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.venue}</span>}
            {spotsLeft !== null && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {spotsLeft} place{spotsLeft > 1 ? "s" : ""}</span>}
            {isCoaching && coachingDurations.length > 0 ? (
              <span className="flex items-center gap-1 font-semibold text-primary flex-wrap">
                <Tag className="h-3 w-3 shrink-0" />
                {coachingDurations.join(" | ")}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-primary">
                <Tag className="h-3 w-3" />
                {a.price > 0 ? `${a.price.toLocaleString("fr-FR")} ${a.currency || "FCFA"}` : "Gratuit"}
              </span>
            )}
          </div>

          {/* Weekend extras */}
          {a.type === "weekend" && a.extra_config && (
            <div className="flex gap-2 flex-wrap">
              {(a.extra_config as any).accommodation_included && <Badge variant="outline" className="text-xs gap-1"><TreePine className="h-2.5 w-2.5" /> Hébergement</Badge>}
              {(a.extra_config as any).meals_included && <Badge variant="outline" className="text-xs gap-1"><Utensils className="h-2.5 w-2.5" /> Repas</Badge>}
              {(a.extra_config as any).transport_included && <Badge variant="outline" className="text-xs gap-1"><Rocket className="h-2.5 w-2.5" /> Transport</Badge>}
            </div>
          )}
          {/* Diner extras */}
          {a.type === "diner" && a.extra_config && (a.extra_config as any).dress_code && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shirt className="h-2.5 w-2.5" />
              {DRESS_CODES.find(d => d.value === (a.extra_config as any).dress_code)?.label || (a.extra_config as any).dress_code}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={a.status === "active"} onCheckedChange={() => toggleStatus(a)} />
          <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
          {!isPast && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
              title="Archiver"
              onClick={() => handleArchive(a.id)}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(a.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  /* ════════════════════════ UI ════════════════════════ */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activités</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Coaching, dîners, week-ends, masterclass — événements en direct</p>
      </div>

      <Tabs defaultValue="activites">
        <TabsList>
          <TabsTrigger value="activites"><Calendar className="h-4 w-4 mr-1.5" /> Activités</TabsTrigger>
          <TabsTrigger value="types"><Settings className="h-4 w-4 mr-1.5" /> Types d'activités</TabsTrigger>
        </TabsList>

        {/* ══ TAB ACTIVITÉS ══ */}
        <TabsContent value="activites" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openCreate} className="gap-2" disabled={types.length === 0}>
              <Plus className="h-4 w-4" /> Nouvelle activité
            </Button>
          </div>

          {types.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <span key={t.value} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  <ActivityIcon iconName={t.icon_name} emoji={t.emoji} className="h-3.5 w-3.5" />
                  {t.label}
                </span>
              ))}
            </div>
          )}

          {actLoading ? (
            <div className="animate-pulse text-center py-12 text-muted-foreground">Chargement…</div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <div className="text-4xl flex justify-center"><Target className="h-10 w-10 opacity-30" /></div>
              <p>{types.length === 0 ? 'Crée d\'abord un type dans l\'onglet "Types".' : "Aucune activité. Crée la première !"}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div className="space-y-3">
                  {upcoming.map((a) => renderActivityCard(a, false))}
                </div>
              )}

              {/* Past — collapsible */}
              {past.length > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowPast((v) => !v)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showPast ? "rotate-0" : "-rotate-90")} />
                    <span className="font-medium">Activités passées</span>
                    <Badge variant="secondary" className="text-xs">{past.length}</Badge>
                  </button>
                  {showPast && (
                    <div className="space-y-3 pl-4 border-l-2 border-border/50">
                      {past.map((a) => renderActivityCard(a, true))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══ TAB TYPES ══ */}
        <TabsContent value="types" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Catégories d'événements affichées dans le formulaire et sur le site.</p>
            <Button onClick={openCreateType} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> Nouveau type</Button>
          </div>

          {typesLoading ? (
            <div className="animate-pulse text-center py-10 text-muted-foreground">Chargement…</div>
          ) : types.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Settings className="h-10 w-10 mx-auto opacity-30" />
              <p>Aucun type. Crée le premier !</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8"></th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Icône</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clé</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Activités</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => {
                    const count = activities.filter((a) => a.type === t.value).length;
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground"><GripVertical className="h-4 w-4" /></td>
                        <td className="px-4 py-3 text-primary">
                          <ActivityIcon iconName={t.icon_name} emoji={t.emoji} className="h-5 w-5" />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{t.label}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.value}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">{count} activité{count !== 1 ? "s" : ""}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditType(t)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteType(t)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ══ Dialog : Activité ══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'activité" : "Nouvelle activité"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type d'activité</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <ActivityIcon iconName={t.icon_name} emoji={t.emoji} className="h-4 w-4" />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Titre */}
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ex: Coaching Business — Session janvier" />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} />
            </div>

            {/* Image de couverture */}
            <div className="space-y-1.5">
              <Label>Image de couverture</Label>
              {form.cover_image_url ? (
                <div className="relative rounded-xl overflow-hidden aspect-video border border-border group">
                  <img src={form.cover_image_url} alt="couverture" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="cursor-pointer rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-white text-xs font-medium transition-colors">
                      Changer
                      <input type="file" accept="image/*" className="sr-only" onChange={handleCoverUpload} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setField("cover_image_url", null)}
                      className="rounded-lg bg-destructive/70 hover:bg-destructive px-3 py-1.5 text-white text-xs font-medium transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <label className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                  uploading && "opacity-50 pointer-events-none"
                )}>
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-xs text-muted-foreground">Upload en cours…</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">Cliquer pour ajouter une image</span>
                      <span className="text-xs text-muted-foreground/60">JPG, PNG, WebP</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="sr-only" onChange={handleCoverUpload} disabled={uploading} />
                </label>
              )}
            </div>

            {/* ── Coaching section ── */}
            {form.type === "coaching" ? (
              <CoachingSection
                extra={form.extra_config}
                currency={form.currency}
                onChange={setExtra}
              />
            ) : (
              <>
                {/* Prix + Devise */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prix</Label>
                    <Input type="number" value={form.price} onChange={(e) => setField("price", e.target.value)} min={0} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Devise</Label>
                    <Input value={form.currency} onChange={(e) => setField("currency", e.target.value)} placeholder="FCFA" />
                  </div>
                </div>

                {/* ── Dates : Weekend = start + end, autres = date seule ── */}
                {form.type === "weekend" ? (
                  <div className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TreePine className="h-4 w-4 text-green-500" /> Week-end Détox — Dates &amp; séjour
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Date d'arrivée</Label>
                        <Input type="date" value={form.delivery_date} onChange={(e) => setField("delivery_date", e.target.value)} />
                        <p className="text-xs text-muted-foreground">Ex: vendredi soir</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date de départ</Label>
                        <Input type="date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} />
                        <p className="text-xs text-muted-foreground">Ex: dimanche après-midi</p>
                      </div>
                    </div>
                    {form.delivery_date && form.end_date && (() => {
                      const n = getNightCount(form.delivery_date, form.end_date);
                      return n && n > 0 ? (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          ✓ {n} nuit{n > 1 ? "s" : ""} · {n + 1} jour{n + 1 > 1 ? "s" : ""}
                        </p>
                      ) : null;
                    })()}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Heure d'arrivée</Label>
                        <Input type="time" value={form.event_time} onChange={(e) => setField("event_time", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Heure de départ</Label>
                        <Input type="time" value={form.extra_config.departure_time || ""} onChange={(e) => setExtra("departure_time", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lieu (nom du domaine / centre)</Label>
                      <Input value={form.venue} onChange={(e) => setField("venue", e.target.value)} placeholder="Domaine de Keur Moussa" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Adresse complète</Label>
                      <Input value={form.extra_config.address || ""} onChange={(e) => setExtra("address", e.target.value)} placeholder="Route de Kayar, 40 km de Dakar" />
                    </div>
                    <div className="space-y-2">
                      <Label>Inclus dans le prix</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: "accommodation_included", icon: <TreePine className="h-4 w-4" />, label: "Hébergement" },
                          { key: "meals_included", icon: <Utensils className="h-4 w-4" />, label: "Repas" },
                          { key: "transport_included", icon: <Rocket className="h-4 w-4" />, label: "Transport" },
                        ].map(({ key, icon, label }) => (
                          <label key={key} className={cn(
                            "flex flex-col items-center gap-1.5 rounded-xl border p-3 cursor-pointer transition-all text-xs font-medium",
                            form.extra_config[key] ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                          )}>
                            <input type="checkbox" className="sr-only" checked={!!form.extra_config[key]} onChange={(e) => setExtra(key, e.target.checked)} />
                            {icon}
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Programme détaillé</Label>
                      <Textarea
                        value={form.extra_config.programme || ""}
                        onChange={(e) => setExtra("programme", e.target.value)}
                        rows={5}
                        placeholder={"Vendredi soir\n18h00 — Arrivée et installation\n19h30 — Dîner de bienvenue\n\nSamedi\n08h00 — Petit-déjeuner\n09h00 — Session méditation…"}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input type="date" value={form.delivery_date} onChange={(e) => setField("delivery_date", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Heure</Label>
                      <Input type="time" value={form.event_time} onChange={(e) => setField("event_time", e.target.value)} />
                    </div>
                  </div>
                )}

                {/* ── Dîner avec le mentor ── */}
                {form.type === "diner" && (
                  <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-amber-500" /> Détails du dîner
                    </p>
                    <div className="space-y-1.5">
                      <Label>Nom du restaurant</Label>
                      <Input value={form.venue} onChange={(e) => setField("venue", e.target.value)} placeholder="Restaurant La Teranga" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Adresse</Label>
                      <Input value={form.extra_config.address || ""} onChange={(e) => setExtra("address", e.target.value)} placeholder="23 Avenue Léopold Sédar Senghor, Dakar" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Dress code</Label>
                      <Select value={form.extra_config.dress_code || ""} onValueChange={(v) => setExtra("dress_code", v)}>
                        <SelectTrigger><SelectValue placeholder="Aucun dress code" /></SelectTrigger>
                        <SelectContent>
                          {DRESS_CODES.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Menu / Carte</Label>
                      <Textarea
                        value={form.extra_config.menu || ""}
                        onChange={(e) => setExtra("menu", e.target.value)}
                        rows={4}
                        placeholder={"Menu 3 services :\n— Entrée : ...\n— Plat : ...\n— Dessert : ..."}
                      />
                    </div>
                    <label className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all",
                      form.extra_config.drinks_included ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    )}>
                      <input type="checkbox" className="sr-only" checked={!!form.extra_config.drinks_included} onChange={(e) => setExtra("drinks_included", e.target.checked)} />
                      <Wine className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Boissons incluses</p>
                        <p className="text-xs text-muted-foreground">Eau, soft, vin (selon formule)</p>
                      </div>
                      <div className={cn("ml-auto h-4 w-4 rounded border-2 flex items-center justify-center", form.extra_config.drinks_included ? "border-primary bg-primary" : "border-muted-foreground")}>
                        {form.extra_config.drinks_included && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                    </label>
                  </div>
                )}
              </>
            )}

            {/* ── Format (présentiel / en ligne / hybride) ── */}
            {form.type !== "weekend" && (
              <>
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <Select value={form.attendance_mode} onValueChange={(v) => setField("attendance_mode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-person"><span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Présentiel</span></SelectItem>
                      <SelectItem value="online"><span className="flex items-center gap-2"><Video className="h-4 w-4" /> En ligne</span></SelectItem>
                      <SelectItem value="hybrid"><span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Hybride</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.attendance_mode !== "online" && form.type !== "diner" && (
                  <div className="space-y-1.5">
                    <Label>Lieu / adresse</Label>
                    <Input value={form.venue} onChange={(e) => setField("venue", e.target.value)} placeholder="Dakar, Plateau — Salle XYZ" />
                  </div>
                )}
                {form.attendance_mode !== "in-person" && (
                  <div className="space-y-1.5">
                    <Label>Lien de visio</Label>
                    <Input value={form.online_link} onChange={(e) => setField("online_link", e.target.value)} placeholder="https://meet.google.com/..." />
                  </div>
                )}
              </>
            )}

            {/* Places + Emoji */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Places max <span className="text-muted-foreground font-normal text-xs">(0 = illimité)</span></Label>
                <Input type="number" value={form.max_spots} onChange={(e) => setField("max_spots", e.target.value)} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label>Emoji (optionnel)</Label>
                <Input value={form.thumbnail_emoji} onChange={(e) => setField("thumbnail_emoji", e.target.value)} placeholder="🎯" maxLength={2} />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Visible sur le site</p>
                <p className="text-xs text-muted-foreground">Brouillon = non visible au public</p>
              </div>
              <Switch checked={form.status === "active"} onCheckedChange={(v) => setField("status", v ? "active" : "draft")} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Annuler</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground">
                {saving ? "Sauvegarde…" : editing ? "Mettre à jour" : "Créer l'activité"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog : Type d'activité ══ */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? "Modifier le type" : "Nouveau type d'activité"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom affiché *</Label>
              <Input
                value={typeForm.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setTypeForm((p) => ({
                    ...p, label,
                    value: editingType ? p.value : slugify(label),
                  }));
                }}
                placeholder="Masterclass"
              />
            </div>

            {!editingType && (
              <div className="space-y-1.5">
                <Label>Clé technique</Label>
                <Input value={typeForm.value} onChange={(e) => setTypeForm((p) => ({ ...p, value: slugify(e.target.value) }))} placeholder="masterclass" className="font-mono text-xs" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={typeForm.sort_order} onChange={(e) => setTypeForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} min={0} />
            </div>

            <div className="space-y-1.5">
              <Label>Icône *</Label>
              <IconPicker value={typeForm.icon_name} onChange={(name) => setTypeForm((p) => ({ ...p, icon_name: name }))} />
            </div>

            {(typeForm.label || typeForm.icon_name) && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ActivityIcon iconName={typeForm.icon_name} emoji={typeForm.emoji} className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{typeForm.label || "Aperçu"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{typeForm.value || "cle"}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setTypeDialogOpen(false)} className="flex-1"><X className="h-4 w-4 mr-1" /> Annuler</Button>
              <Button onClick={handleSaveType} disabled={typeSaving} className="flex-1 bg-primary text-primary-foreground">
                <Check className="h-4 w-4 mr-1" />
                {typeSaving ? "Sauvegarde…" : editingType ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
