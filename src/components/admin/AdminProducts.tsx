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
import { CalendarIcon, Plus, Pencil, Trash2, ImagePlus, Share2, Copy, Check, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import QRCode from "react-qr-code";

type Category = { id: string; name: string };

type Product = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  price: number;
  currency: string;
  max_spots: number;
  spots_taken: number;
  status: string;
  delivery_mode: string;
  delivery_date: string | null;
  thumbnail_emoji: string;
  cover_image_url: string | null;
  created_at: string;
  category_id: string | null;
  attendance_mode: string | null;
  venue: string | null;
  online_link: string | null;
  event_time: string | null;
  date_mode: string | null;
  slug: string | null;
};

const slugify = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const emptyForm = {
  title: "",
  description: "",
  type: "guide" as string,
  thumbnail_emoji: "📘",
  price: 0,
  max_spots: 0,
  status: "draft" as string,
  delivery_mode: "auto" as string,
  delivery_date: undefined as Date | undefined,
  cover_image_url: null as string | null,
  category_id: null as string | null,
  attendance_mode: "online" as string,
  venue: "",
  online_link: "",
  event_time: "",
  date_mode: "fixed" as string,
  slug: "",
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories((data as Category[]) || []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").neq("type", "formation").order("created_at", { ascending: false });
    setProducts((data as any[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p.id);
    setForm({
      title: p.title,
      description: p.description || "",
      type: p.type || "guide",
      thumbnail_emoji: p.thumbnail_emoji || "📘",
      price: p.price,
      max_spots: p.max_spots,
      status: p.status || "draft",
      delivery_mode: p.delivery_mode || "auto",
      delivery_date: p.delivery_date ? new Date(p.delivery_date) : undefined,
      cover_image_url: p.cover_image_url || null,
      category_id: p.category_id || null,
      attendance_mode: p.attendance_mode || "online",
      venue: p.venue || "",
      online_link: p.online_link || "",
      event_time: p.event_time || "",
      date_mode: p.date_mode || "fixed",
      slug: p.slug || "",
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
    if (form.delivery_mode === "scheduled" && form.date_mode === "fixed" && !form.delivery_date) { toast.error("La date de livraison est requise"); return; }

    const finalSlug = form.slug.trim() ? slugify(form.slug.trim()) : slugify(form.title.trim());

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      thumbnail_emoji: form.thumbnail_emoji || "📦",
      price: form.price,
      max_spots: form.max_spots,
      status: form.status,
      delivery_mode: form.delivery_mode,
      delivery_date: form.delivery_mode === "scheduled" && form.date_mode === "fixed" && form.delivery_date ? form.delivery_date.toISOString() : null,
      cover_image_url: form.cover_image_url,
      category_id: form.category_id,
      attendance_mode: form.attendance_mode,
      venue: (form.attendance_mode === "in_person" || form.attendance_mode === "hybrid") ? form.venue.trim() || null : null,
      online_link: (form.attendance_mode === "online" || form.attendance_mode === "hybrid") ? form.online_link.trim() || null : null,
      event_time: form.event_time.trim() || null,
      date_mode: form.date_mode,
      slug: finalSlug || null,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Produit modifié");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Produit créé");
    }
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Produit supprimé");
    fetchProducts();
  };

  const toggleStatus = async (p: Product) => {
    const next = p.status === "active" ? "draft" : "active";
    const { error } = await supabase.from("products").update({ status: next }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Produit ${next === "active" ? "activé" : "désactivé"}`);
    fetchProducts();
  };

  const getShareUrl = (p: Product) => {
    const base = window.location.origin;
    return p.slug ? `${base}/p/${p.slug}` : `${base}/product/${p.id}`;
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Lien copié !");
  };

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.download = `qr-${shareProduct?.slug || shareProduct?.id}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const typeLabels: Record<string, string> = { guide: "Guide", app: "App", book: "Livre", formation: "Formation" };
  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      active: "bg-green-500/15 text-green-500",
      closed: "bg-destructive/15 text-destructive",
    };
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[s] || map.draft}`}>{s === "draft" ? "Brouillon" : s === "active" ? "Actif" : "Fermé"}</span>;
  };

  const showAttendanceFields = form.type === "formation";

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Produits</h1>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouveau produit</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prix</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Places</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun produit</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  <div className="flex items-center gap-3">
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt={p.title} className="w-10 h-10 rounded-md object-cover" />
                    ) : (
                      <span className="text-2xl">{p.thumbnail_emoji}</span>
                    )}
                    <div>
                      <span className="truncate max-w-[180px] block">{p.title}</span>
                      {p.slug && <span className="text-xs text-muted-foreground">/p/{p.slug}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{typeLabels[p.type || ""] || p.type}</td>
                <td className="px-4 py-3 text-foreground">{p.price === 0 ? "Gratuit" : `${p.price.toLocaleString("fr-FR")} ${p.currency}`}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.max_spots === 0 ? `${p.spots_taken} / ∞` : `${p.spots_taken}/${p.max_spots}`}</td>
                <td className="px-4 py-3">{statusBadge(p.status)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button variant="ghost" size="icon" title="Partager" onClick={() => setShareProduct(p)}><Share2 className="h-4 w-4 text-primary" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleStatus(p)}>
                    <span className="text-xs">{p.status === "active" ? "Off" : "On"}</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Share / QR Code Modal */}
      <Dialog open={!!shareProduct} onOpenChange={(o) => !o && setShareProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Partager — {shareProduct?.title}
            </DialogTitle>
          </DialogHeader>
          {shareProduct && (() => {
            const url = getShareUrl(shareProduct);
            return (
              <div className="space-y-5">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white">
                  <QRCode id="qr-code-svg" value={url} size={180} />
                </div>

                {/* Lien copiable */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Lien public</Label>
                  <div className="flex gap-2">
                    <Input value={url} readOnly className="text-xs font-mono" />
                    <Button size="icon" variant="outline" onClick={() => copyLink(url)}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Boutons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={downloadQR}>
                    <Download className="h-3.5 w-3.5" /> Télécharger QR
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={() => copyLink(url)}>
                    <Copy className="h-3.5 w-3.5" /> Copier le lien
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cover image upload */}
            <div className="space-y-2">
              <Label>Image de couverture</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "relative cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden",
                  form.cover_image_url ? "h-40" : "h-32 flex items-center justify-center"
                )}
              >
                {form.cover_image_url ? (
                  <img src={form.cover_image_url} alt="Couverture" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground space-y-1">
                    <ImagePlus className="h-8 w-8 mx-auto" />
                    <p className="text-xs">{uploading ? "Upload en cours…" : "Cliquer pour ajouter une image"}</p>
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
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })}
                placeholder="Ex: Masterclass Figma"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label>Slug (URL personnalisée)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">/p/</span>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="auto-généré depuis le titre"
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">Lien partageable : {window.location.origin}/p/{form.slug || "…"}</p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="book">Livre</SelectItem>
                    <SelectItem value="app">App</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix FCFA (0 = gratuit)</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Places max (0 = illimité)</Label>
                <Input type="number" min={0} value={form.max_spots} onChange={(e) => setForm({ ...form, max_spots: parseInt(e.target.value) || 0 })} />
              </div>
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

            {/* Attendance mode for formation */}
            {showAttendanceFields && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Label className="text-foreground font-semibold">Mode de participation</Label>
                <RadioGroup value={form.attendance_mode} onValueChange={(v) => setForm({ ...form, attendance_mode: v })}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="online" id="att-online" />
                    <Label htmlFor="att-online" className="cursor-pointer">En ligne</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="in_person" id="att-inperson" />
                    <Label htmlFor="att-inperson" className="cursor-pointer">En présentiel</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="hybrid" id="att-hybrid" />
                    <Label htmlFor="att-hybrid" className="cursor-pointer">Hybride</Label>
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
                <div className="space-y-2">
                  <Label>Heure précise</Label>
                  <Input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
                </div>
              </div>
            )}

            {/* Delivery date */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label className="text-foreground font-semibold">Accès au contenu</Label>
              <RadioGroup value={form.delivery_mode} onValueChange={(v) => setForm({ ...form, delivery_mode: v })}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="auto" id="auto" className="mt-1" />
                  <div>
                    <Label htmlFor="auto" className="font-medium cursor-pointer">Automatiquement après paiement</Label>
                    <p className="text-xs text-muted-foreground">L'accès est activé dès confirmation du paiement.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="scheduled" id="scheduled" className="mt-1" />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="scheduled" className="font-medium cursor-pointer">À une date précise</Label>
                    {form.delivery_mode === "scheduled" && (
                      <div className="space-y-3">
                        <RadioGroup value={form.date_mode} onValueChange={(v) => setForm({ ...form, date_mode: v })}>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="fixed" id="date-fixed" />
                            <Label htmlFor="date-fixed" className="text-sm cursor-pointer">Date fixe</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="when_full" id="date-full" />
                            <Label htmlFor="date-full" className="text-sm cursor-pointer">Quand c'est plein</Label>
                          </div>
                        </RadioGroup>
                        {form.date_mode === "fixed" && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.delivery_date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.delivery_date ? format(form.delivery_date, "PPP", { locale: fr }) : "Choisir une date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={form.delivery_date} onSelect={(d) => setForm({ ...form, delivery_date: d })} initialFocus className="p-3 pointer-events-auto" />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={uploading}>
              {editing ? "Enregistrer" : "Créer le produit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
