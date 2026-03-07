import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Pencil, Trash2, ImagePlus, Users, Clock, MapPin, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Category = { id: string; name: string };

type Formation = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  max_spots: number;
  spots_taken: number;
  status: string;
  delivery_date: string | null;
  cover_image_url: string | null;
  created_at: string;
  category_id: string | null;
  attendance_mode: string | null;
  venue: string | null;
  online_link: string | null;
  event_time: string | null;
  date_mode: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  price: 0,
  max_spots: 10,
  status: "draft" as string,
  delivery_date: undefined as Date | undefined,
  cover_image_url: null as string | null,
  category_id: null as string | null,
  attendance_mode: "online" as string,
  venue: "",
  online_link: "",
  event_time: "",
  date_mode: "waitlist" as string,
  conditions: "",
};

export default function AdminFormations() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchFormations(); fetchCategories(); }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories((data as Category[]) || []);
  };

  const fetchFormations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("type", "formation")
      .order("created_at", { ascending: false });
    setFormations((data as any[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (f: Formation) => {
    setEditing(f.id);
    // Extract conditions from description (after separator)
    const parts = (f.description || "").split("\n---CONDITIONS---\n");
    setForm({
      title: f.title,
      description: parts[0] || "",
      price: f.price,
      max_spots: f.max_spots,
      status: f.status || "draft",
      delivery_date: f.delivery_date ? new Date(f.delivery_date) : undefined,
      cover_image_url: f.cover_image_url || null,
      category_id: f.category_id || null,
      attendance_mode: f.attendance_mode || "online",
      venue: f.venue || "",
      online_link: f.online_link || "",
      event_time: f.event_time || "",
      date_mode: f.date_mode || "waitlist",
      conditions: parts[1] || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Seules les images sont acceptées"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-covers").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("product-covers").getPublicUrl(path);
    setForm({ ...form, cover_image_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Image uploadée");
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return; }

    // Combine description + conditions
    const fullDescription = form.conditions.trim()
      ? `${form.description.trim()}\n---CONDITIONS---\n${form.conditions.trim()}`
      : form.description.trim() || null;

    const payload: any = {
      title: form.title.trim(),
      description: fullDescription,
      type: "formation",
      thumbnail_emoji: "🎓",
      price: form.price,
      max_spots: form.max_spots,
      status: form.status,
      delivery_mode: "scheduled",
      delivery_date: form.date_mode === "fixed" && form.delivery_date ? form.delivery_date.toISOString() : null,
      cover_image_url: form.cover_image_url,
      category_id: form.category_id,
      attendance_mode: form.attendance_mode,
      venue: (form.attendance_mode === "in_person" || form.attendance_mode === "hybrid") ? form.venue.trim() || null : null,
      online_link: (form.attendance_mode === "online" || form.attendance_mode === "hybrid") ? form.online_link.trim() || null : null,
      event_time: form.event_time.trim() || null,
      date_mode: form.date_mode,
      currency: "XOF",
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Formation modifiée");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Formation créée");
    }
    setDialogOpen(false);
    fetchFormations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette formation ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Formation supprimée");
    fetchFormations();
  };

  const toggleStatus = async (f: Formation) => {
    const next = f.status === "active" ? "draft" : "active";
    const { error } = await supabase.from("products").update({ status: next }).eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Formation ${next === "active" ? "activée" : "désactivée"}`);
    fetchFormations();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      active: "bg-green-500/15 text-green-500",
      closed: "bg-destructive/15 text-destructive",
    };
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[s] || map.draft}`}>{s === "draft" ? "Brouillon" : s === "active" ? "Actif" : "Fermé"}</span>;
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formations</h1>
          <p className="text-sm text-muted-foreground">Gérer les formations à venir (liste d'attente ou date fixe)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouvelle formation</Button>
      </div>

      {/* Formations grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {formations.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <p>Aucune formation créée</p>
            <p className="text-sm mt-1">Clique sur "Nouvelle formation" pour commencer</p>
          </div>
        ) : formations.map((f) => {
          const descParts = (f.description || "").split("\n---CONDITIONS---\n");
          const hasConditions = descParts.length > 1;
          return (
            <div key={f.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {f.cover_image_url ? (
                <img src={f.cover_image_url} alt={f.title} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-muted flex items-center justify-center text-4xl">🎓</div>
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground">{f.title}</h3>
                  {statusBadge(f.status)}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{descParts[0]}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {f.spots_taken}/{f.max_spots} places
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {f.date_mode === "waitlist" ? "Liste d'attente" : f.delivery_date ? format(new Date(f.delivery_date), "dd MMM yyyy", { locale: fr }) : "Date fixe"}
                  </Badge>
                  {f.attendance_mode && (
                    <Badge variant="outline" className="gap-1">
                      {f.attendance_mode === "online" ? "En ligne" : f.attendance_mode === "hybrid" ? "Hybride" : "Présentiel"}
                    </Badge>
                  )}
                  {hasConditions && (
                    <Badge variant="secondary" className="gap-1">📋 Conditions</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-bold text-primary">{f.price.toLocaleString("fr-FR")} FCFA</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(f)}>
                      <span className="text-xs">{f.status === "active" ? "Off" : "On"}</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cover */}
            <div className="space-y-2">
              <Label>Image de couverture</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "relative cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden",
                  form.cover_image_url ? "h-40" : "h-28 flex items-center justify-center"
                )}
              >
                {form.cover_image_url ? (
                  <img src={form.cover_image_url} alt="Couverture" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground space-y-1">
                    <ImagePlus className="h-8 w-8 mx-auto" />
                    <p className="text-xs">{uploading ? "Upload en cours…" : "Ajouter une image"}</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {form.cover_image_url && (
                <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setForm({ ...form, cover_image_url: null })}>
                  Supprimer l'image
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Accompagnement VibeCoding — Premier SaaS" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Décris la formation, ce que les participants vont apprendre…" />
            </div>
            <div className="space-y-2">
              <Label>Conditions d'acceptation</Label>
              <Textarea value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} rows={3} placeholder="Ex: Avoir un ordinateur, être motivé, disponible 2h/jour…" />
              <p className="text-xs text-muted-foreground">Ces conditions seront affichées sur la page produit avant l'inscription.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix FCFA</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Places max</Label>
                <Input type="number" min={1} value={form.max_spots} onChange={(e) => setForm({ ...form, max_spots: parseInt(e.target.value) || 1 })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date mode */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label className="font-semibold text-foreground">Planification</Label>
              <RadioGroup value={form.date_mode} onValueChange={(v) => setForm({ ...form, date_mode: v })}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="waitlist" id="dm-waitlist" />
                  <Label htmlFor="dm-waitlist" className="cursor-pointer">Liste d'attente (démarre quand c'est plein)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="fixed" id="dm-fixed" />
                  <Label htmlFor="dm-fixed" className="cursor-pointer">Date fixe</Label>
                </div>
              </RadioGroup>
              {form.date_mode === "fixed" && (
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !form.delivery_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.delivery_date ? format(form.delivery_date, "dd MMMM yyyy", { locale: fr }) : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.delivery_date} onSelect={(d) => setForm({ ...form, delivery_date: d })} locale={fr} /></PopoverContent>
                  </Popover>
                </div>
              )}
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} placeholder="Ex: 18h00 - 20h00 GMT" />
              </div>
            </div>

            {/* Attendance mode */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label className="font-semibold text-foreground">Mode de participation</Label>
              <RadioGroup value={form.attendance_mode} onValueChange={(v) => setForm({ ...form, attendance_mode: v })}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="online" id="fa-online" />
                  <Label htmlFor="fa-online" className="cursor-pointer">En ligne</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="in_person" id="fa-inperson" />
                  <Label htmlFor="fa-inperson" className="cursor-pointer">En présentiel</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="hybrid" id="fa-hybrid" />
                  <Label htmlFor="fa-hybrid" className="cursor-pointer">Hybride</Label>
                </div>
              </RadioGroup>
              {(form.attendance_mode === "in_person" || form.attendance_mode === "hybrid") && (
                <div className="space-y-2">
                  <Label>Lieu</Label>
                  <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Ex: Dakar, Almadies" />
                </div>
              )}
              {(form.attendance_mode === "online" || form.attendance_mode === "hybrid") && (
                <div className="space-y-2">
                  <Label>Lien en ligne</Label>
                  <Input value={form.online_link} onChange={(e) => setForm({ ...form, online_link: e.target.value })} placeholder="https://meet.google.com/..." />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} className="w-full">{editing ? "Enregistrer" : "Créer la formation"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
