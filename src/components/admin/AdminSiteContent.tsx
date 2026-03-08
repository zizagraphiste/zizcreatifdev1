import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, ImagePlus, Trash2 } from "lucide-react";

type ContentItem = {
  id: string;
  key: string;
  value: string;
  type: string;
  label: string | null;
  section: string | null;
  sort_order: number;
};

const SECTION_LABELS: Record<string, string> = {
  hero: "🏠 Hero (en-tête)",
  value_props: "✨ Blocs de valeur",
  catalogue: "📦 Catalogue",
  cta: "🚀 Appel à l'action",
  footer: "📝 Footer",
};

const SECTION_ORDER = ["hero", "value_props", "catalogue", "cta", "footer"];

function FocalPointPicker({ imageUrl, value, onChange }: { imageUrl: string; value: string; onChange: (pos: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [x, y] = (value || "50 50").split(" ").map(Number);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const py = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onChange(`${px} ${py}`);
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Clique sur l'image pour définir le point focal</p>
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative cursor-crosshair rounded-xl overflow-hidden border border-border aspect-video"
      >
        <img src={imageUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${x}% ${y}%` }} />
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white bg-primary/80 shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">Position : {x}% / {y}%</p>
    </div>
  );
}

function ImageUploadField({ itemKey, value, onChange }: { itemKey: string; value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Seules les images sont acceptées"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("L'image ne doit pas dépasser 5 MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `site/${itemKey}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("product-covers").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("product-covers").getPublicUrl(path);
    onChange(urlData.publicUrl);
    setUploading(false);
    toast.success("Image uploadée ✓");
  };

  const isHero = itemKey.startsWith("hero");

  return (
    <div className="space-y-3">
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className="relative cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden group"
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Couverture"
              className={isHero ? "w-full aspect-video object-cover" : "w-full h-48 object-cover"}
            />
            {/* Overlay au hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <ImagePlus className="h-5 w-5" />
                Changer l'image
              </div>
            </div>
          </>
        ) : (
          <div className={`${isHero ? "aspect-video" : "h-32"} flex flex-col items-center justify-center text-muted-foreground gap-2`}>
            <ImagePlus className="h-8 w-8" />
            <p className="text-xs">{uploading ? "Upload en cours…" : "Cliquer pour ajouter une image"}</p>
            {isHero && <p className="text-[11px] opacity-60">Format recommandé : 1920 × 1080 px</p>}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <p className="text-sm text-primary font-medium animate-pulse">Upload en cours…</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      {value && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {isHero ? "Aperçu en proportion 16:9 (taille réelle sur desktop)" : ""}
          </p>
          <Button variant="ghost" size="sm" className="text-xs text-destructive gap-1" onClick={() => onChange("")}>
            <Trash2 className="h-3 w-3" /> Supprimer l'image
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminSiteContent() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from("site_content")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error("Erreur de chargement du contenu");
      return;
    }
    setItems((data as ContentItem[]) || []);
    setLoading(false);
  };

  const handleChange = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (item: ContentItem) => {
    return edited[item.key] ?? item.value;
  };

  const hasChanges = Object.keys(edited).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(edited).map(([key, value]) =>
        supabase.from("site_content").update({ value }).eq("key", key)
      );
      const results = await Promise.all(updates);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        toast.error("Erreur lors de la sauvegarde");
      } else {
        toast.success("Contenu mis à jour !");
        setEdited({});
        fetchContent();
      }
    } finally {
      setSaving(false);
    }
  };

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section] || section,
    items: items.filter((i) => i.section === section),
  })).filter((g) => g.items.length > 0);

  if (loading) {
    return <p className="text-muted-foreground animate-pulse p-6">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contenu de la page d'accueil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modifie les textes et images affichés sur la page publique.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      {grouped.map((group) => (
        <Card key={group.section}>
          <CardHeader>
            <CardTitle className="text-lg">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.items.map((item) => (
              <div key={item.key} className="space-y-1.5">
                <Label htmlFor={item.key} className="text-sm font-medium">
                  {item.label || item.key}
                </Label>
                {item.type === "textarea" ? (
                  <Textarea
                    id={item.key}
                    value={getValue(item)}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    rows={3}
                    className="resize-y"
                  />
                ) : item.type === "image" ? (
                  <div className="space-y-2">
                    <Input
                      id={item.key}
                      value={getValue(item)}
                      onChange={(e) => handleChange(item.key, e.target.value)}
                      placeholder="URL de l'image"
                    />
                    {getValue(item) && (
                      <img
                        src={getValue(item)}
                        alt={item.label || ""}
                        className="h-20 rounded border border-border object-cover"
                      />
                    )}
                  </div>
                ) : item.type === "image_upload" ? (
                  <ImageUploadField
                    itemKey={item.key}
                    value={getValue(item)}
                    onChange={(url) => handleChange(item.key, url)}
                  />
                ) : item.type === "focal_point" ? (
                  (() => {
                    const heroImg = items.find((i) => i.key === "hero_cover_image");
                    const imgUrl = heroImg ? getValue(heroImg) : "";
                    return (
                      <FocalPointPicker
                        imageUrl={imgUrl}
                        value={getValue(item)}
                        onChange={(pos) => handleChange(item.key, pos)}
                      />
                    );
                  })()
                ) : (
                  <Input
                    id={item.key}
                    value={getValue(item)}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
