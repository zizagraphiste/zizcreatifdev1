import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type PromoCode = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  applies_to_type: string | null;
  max_uses: number;
  times_used: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

const emptyForm = {
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  applies_to_type: null as string | null,
  max_uses: 0,
  active: true,
  expires_at: "",
};

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchCodes(); }, []);

  const fetchCodes = async () => {
    setLoading(true);
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes((data as any[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: PromoCode) => {
    setEditing(c.id);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      applies_to_type: c.applies_to_type,
      max_uses: c.max_uses,
      active: c.active,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Le code est requis"); return; }
    if (form.discount_value <= 0) { toast.error("La remise doit être > 0"); return; }

    const payload: any = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      applies_to_type: form.applies_to_type,
      max_uses: form.max_uses,
      active: form.active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase.from("promo_codes").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Code promo modifié");
    } else {
      const { error } = await supabase.from("promo_codes").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Code promo créé");
    }
    setDialogOpen(false);
    fetchCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce code promo ?")) return;
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Code supprimé");
    fetchCodes();
  };

  const toggleActive = async (c: PromoCode) => {
    const { error } = await supabase.from("promo_codes").update({ active: !c.active }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    fetchCodes();
  };

  const typeLabels: Record<string, string> = { guide: "Guide", masterclass: "Masterclass", app: "App", book: "Livre", formation: "Formation" };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Codes promo</h1>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouveau code</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remise</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">S'applique à</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Utilisations</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actif</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun code promo</td></tr>
            ) : codes.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono font-bold text-foreground">{c.code}</td>
                <td className="px-4 py-3 text-foreground">
                  {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value.toLocaleString("fr-FR")} FCFA`}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.applies_to_type ? typeLabels[c.applies_to_type] || c.applies_to_type : "Tous"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.times_used}{c.max_uses > 0 ? `/${c.max_uses}` : " / ∞"}</td>
                <td className="px-4 py-3">
                  <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le code" : "Nouveau code promo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: PROMO20" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de remise</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input type="number" min={1} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>S'applique au type de produit</Label>
              <Select value={form.applies_to_type || "all"} onValueChange={(v) => setForm({ ...form, applies_to_type: v === "all" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="masterclass">Masterclass</SelectItem>
                  <SelectItem value="formation">Formation</SelectItem>
                  <SelectItem value="book">Livre</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Utilisations max (0 = illimité)</Label>
                <Input type="number" min={0} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Expire le</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Actif</Label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? "Enregistrer" : "Créer le code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
