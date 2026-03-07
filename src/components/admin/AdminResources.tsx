import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, FileText, Link2, Code2, Eye, GripVertical, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

type Product = { id: string; title: string };
type Resource = {
  id: string;
  product_id: string;
  title: string;
  type: string;
  file_path: string | null;
  external_url: string | null;
  sort_order: number;
  is_free: boolean;
  created_at: string;
};

export default function AdminResources() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState("pdf");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isFree, setIsFree] = useState(false);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { if (selectedProduct) fetchResources(); }, [selectedProduct]);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, title").order("title");
    setProducts((data as any[]) || []);
    setLoading(false);
  };

  const fetchResources = async () => {
    const { data } = await supabase
      .from("resources")
      .select("*")
      .eq("product_id", selectedProduct)
      .order("sort_order", { ascending: true });
    setResources((data as any[]) || []);
  };

  const handleAdd = async () => {
    if (!selectedProduct) { toast.error("Sélectionne un produit"); return; }
    if (!title.trim()) { toast.error("Le titre est requis"); return; }

    setUploading(true);
    let filePath: string | null = null;

    if (type !== "link" && file) {
      const ext = file.name.split(".").pop();
      const path = `${selectedProduct}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("resources").upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (error) { toast.error(error.message); setUploading(false); return; }
      filePath = path;
    }

    const nextOrder = resources.length > 0 ? Math.max(...resources.map(r => r.sort_order)) + 1 : 0;

    const { error } = await supabase.from("resources").insert({
      product_id: selectedProduct,
      title: title.trim(),
      type,
      file_path: filePath,
      external_url: type === "link" ? externalUrl.trim() : null,
      sort_order: nextOrder,
      is_free: isFree,
    });

    if (error) { toast.error(error.message); setUploading(false); return; }
    toast.success("Ressource ajoutée");
    setTitle("");
    setExternalUrl("");
    setFile(null);
    setIsFree(false);
    setUploading(false);
    fetchResources();
  };

  const handlePreview = async (r: Resource) => {
    if (r.type === "link" && r.external_url) {
      window.open(r.external_url, "_blank");
      return;
    }
    if (!r.file_path) { toast.error("Pas de fichier associé"); return; }
    const { data, error } = await supabase.storage.from("resources").createSignedUrl(r.file_path, 3600);
    if (error || !data?.signedUrl) { toast.error("Erreur génération URL"); return; }

    if (r.type === "html5") {
      try {
        const res = await fetch(data.signedUrl);
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } catch {
        toast.error("Erreur lecture du fichier");
      }
    } else {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleDelete = async (r: Resource) => {
    if (!confirm(`Supprimer "${r.title}" ?`)) return;
    if (r.file_path) {
      await supabase.storage.from("resources").remove([r.file_path]);
    }
    await supabase.from("resources").delete().eq("id", r.id);
    toast.success("Ressource supprimée");
    fetchResources();
  };

  const toggleFree = async (r: Resource) => {
    await supabase.from("resources").update({ is_free: !r.is_free }).eq("id", r.id);
    fetchResources();
  };

  const moveResource = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= resources.length) return;
    const a = resources[index];
    const b = resources[target];
    await Promise.all([
      supabase.from("resources").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("resources").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchResources();
  };

  const typeIcon = (t: string) => {
    if (t === "pdf") return <FileText className="h-4 w-4 text-red-400" />;
    if (t === "html5") return <Code2 className="h-4 w-4 text-blue-400" />;
    return <Link2 className="h-4 w-4 text-primary" />;
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ressources (Modules)</h1>

      {/* Product selector */}
      <div className="space-y-2">
        <Label>Produit</Label>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
          <SelectContent>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedProduct && (
        <>
          {/* Add form */}
          <div className="rounded-xl border border-border p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Ajouter un module</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Module 1 - Introduction" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="html5">HTML5</SelectItem>
                    <SelectItem value="link">Lien externe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === "link" ? (
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Fichier</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isFree} onCheckedChange={setIsFree} id="is-free" />
              <Label htmlFor="is-free" className="text-sm">Module gratuit (accessible sans achat)</Label>
            </div>
            <Button onClick={handleAdd} disabled={uploading} className="gap-2">
              <Plus className="h-4 w-4" />{uploading ? "Upload…" : "Ajouter"}
            </Button>
          </div>

          {/* Resource list */}
          <div className="space-y-2">
            {resources.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">Aucun module pour ce produit.</p>
            ) : resources.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveResource(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                    <button onClick={() => moveResource(i, 1)} disabled={i === resources.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono w-6 text-center">{i + 1}</span>
                  {typeIcon(r.type)}
                  <div>
                    <p className="font-medium text-foreground text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.type === "link" ? r.external_url : r.file_path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFree(r)}
                    className={`gap-1 text-xs ${r.is_free ? "text-green-500" : "text-muted-foreground"}`}
                    title={r.is_free ? "Gratuit" : "Payant"}
                  >
                    {r.is_free ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {r.is_free ? "Gratuit" : "Payant"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handlePreview(r)} title="Prévisualiser">
                    <Eye className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
