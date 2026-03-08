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
import { Plus, Edit, Trash2, Calendar, MapPin, Video, Users, Tag } from "lucide-react";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  { value: "masterclass", label: "Masterclass", emoji: "🎤" },
  { value: "coaching", label: "Coaching one-to-one", emoji: "🎯" },
  { value: "diner", label: "Dîner avec le mentor", emoji: "🍽️" },
  { value: "weekend", label: "Week-end Détox", emoji: "🌿" },
];

const typeInfo = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.value, t]));

type Activity = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  price: number;
  currency: string | null;
  delivery_date: string | null;
  event_time: string | null;
  attendance_mode: string | null;
  venue: string | null;
  max_spots: number;
  spots_taken: number | null;
  status: string | null;
  cover_image_url: string | null;
  thumbnail_emoji: string | null;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "coaching",
  price: 0,
  currency: "FCFA",
  delivery_date: "",
  event_time: "",
  attendance_mode: "in-person",
  venue: "",
  online_link: "",
  max_spots: 0,
  thumbnail_emoji: "",
  status: "active",
};

export default function AdminActivites() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, title, description, type, price, currency, delivery_date, event_time, attendance_mode, venue, max_spots, spots_taken, status, cover_image_url, thumbnail_emoji")
      .in("type", ["masterclass", "coaching", "diner", "weekend"])
      .order("created_at", { ascending: false });
    setActivities((data as any[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description || "",
      type: a.type || "coaching",
      price: a.price,
      currency: a.currency || "FCFA",
      delivery_date: a.delivery_date ? a.delivery_date.slice(0, 10) : "",
      event_time: a.event_time || "",
      attendance_mode: a.attendance_mode || "in-person",
      venue: a.venue || "",
      online_link: "",
      max_spots: a.max_spots,
      thumbnail_emoji: a.thumbnail_emoji || "",
      status: a.status || "active",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      price: Number(form.price) || 0,
      currency: form.currency || "FCFA",
      delivery_date: form.delivery_date || null,
      event_time: form.event_time || null,
      attendance_mode: form.attendance_mode,
      venue: form.venue.trim() || null,
      max_spots: Number(form.max_spots) || 0,
      thumbnail_emoji: form.thumbnail_emoji || null,
      status: form.status,
      delivery_mode: "scheduled",
    };

    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);

    if (error) { toast.error(error.message); }
    else {
      toast.success(editing ? "Activité mise à jour ✓" : "Activité créée ✓");
      setDialogOpen(false);
      fetchActivities();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette activité ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Supprimée"); fetchActivities(); }
  };

  const toggleStatus = async (a: Activity) => {
    const next = a.status === "active" ? "draft" : "active";
    await supabase.from("products").update({ status: next }).eq("id", a.id);
    fetchActivities();
  };

  const setFormField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activités</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Coaching, dîners, week-ends, masterclass — événements en direct
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Nouvelle activité
        </Button>
      </div>

      {/* Type pills legend */}
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_TYPES.map((t) => (
          <span
            key={t.value}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
          >
            {t.emoji} {t.label}
          </span>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="animate-pulse text-muted-foreground text-center py-12">Chargement…</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <p className="text-4xl">🎯</p>
          <p>Aucune activité. Crée la première !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => {
            const info = typeInfo[a.type || ""] || { emoji: "📅", label: a.type };
            const spotsLeft = a.max_spots > 0 ? a.max_spots - (a.spots_taken || 0) : null;
            return (
              <div
                key={a.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                {/* Emoji / cover */}
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {a.cover_image_url ? (
                    <img src={a.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    a.thumbnail_emoji || info.emoji
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{a.title}</h3>
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">
                      {info.emoji} {info.label}
                    </Badge>
                    <Badge
                      className={`text-xs shrink-0 ${
                        a.status === "active"
                          ? "bg-green-500/15 text-green-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.status === "active" ? "Actif" : "Brouillon"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {a.delivery_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(a.delivery_date).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                        {a.event_time && ` à ${a.event_time}`}
                      </span>
                    )}
                    {a.attendance_mode === "in-person" && a.venue ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {a.venue}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" /> En ligne
                      </span>
                    )}
                    {spotsLeft !== null && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {spotsLeft} place{spotsLeft > 1 ? "s" : ""} restante{spotsLeft > 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <Tag className="h-3 w-3" />
                      {a.price > 0 ? `${a.price.toLocaleString("fr-FR")} ${a.currency || "FCFA"}` : "Gratuit"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={a.status === "active"}
                    onCheckedChange={() => toggleStatus(a)}
                    title={a.status === "active" ? "Désactiver" : "Activer"}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'activité" : "Nouvelle activité"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type d'activité</Label>
              <Select value={form.type} onValueChange={(v) => setFormField("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setFormField("title", e.target.value)}
                placeholder="Ex: Coaching Business — Session janvier"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setFormField("description", e.target.value)}
                placeholder="Ce que les participants vont apprendre / vivre…"
                rows={3}
              />
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prix</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setFormField("price", e.target.value)}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setFormField("currency", e.target.value)}
                  placeholder="FCFA"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setFormField("delivery_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={form.event_time}
                  onChange={(e) => setFormField("event_time", e.target.value)}
                />
              </div>
            </div>

            {/* Attendance mode */}
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={form.attendance_mode} onValueChange={(v) => setFormField("attendance_mode", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-person">📍 Présentiel</SelectItem>
                  <SelectItem value="online">🎥 En ligne (visio)</SelectItem>
                  <SelectItem value="hybrid">🔀 Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Venue / Link */}
            <div className="space-y-1.5">
              <Label>
                {form.attendance_mode === "in-person" ? "Lieu / adresse" : "Lien de visio"}
              </Label>
              <Input
                value={form.attendance_mode !== "in-person" ? form.online_link : form.venue}
                onChange={(e) =>
                  setFormField(
                    form.attendance_mode !== "in-person" ? "online_link" : "venue",
                    e.target.value
                  )
                }
                placeholder={
                  form.attendance_mode !== "in-person"
                    ? "https://meet.google.com/..."
                    : "Dakar, Plateau — Salle XYZ"
                }
              />
            </div>

            {/* Max spots */}
            <div className="space-y-1.5">
              <Label>Nombre de places max <span className="text-muted-foreground font-normal">(0 = illimité)</span></Label>
              <Input
                type="number"
                value={form.max_spots}
                onChange={(e) => setFormField("max_spots", e.target.value)}
                min={0}
              />
            </div>

            {/* Emoji */}
            <div className="space-y-1.5">
              <Label>Emoji (si pas de photo)</Label>
              <Input
                value={form.thumbnail_emoji}
                onChange={(e) => setFormField("thumbnail_emoji", e.target.value)}
                placeholder="🎯"
                maxLength={2}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Visible sur le site</p>
                <p className="text-xs text-muted-foreground">Brouillon = non visible au public</p>
              </div>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(v) => setFormField("status", v ? "active" : "draft")}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Sauvegarde…" : editing ? "Mettre à jour" : "Créer l'activité"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
