import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Phone, Clock } from "lucide-react";
import { toast } from "sonner";

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  payment_screenshot_url: string | null;
  product_id: string;
  user_id: string | null;
  product_title: string;
  product_delivery_mode: string;
  product_delivery_date: string | null;
  product_price: number;
  product_currency: string;
};

type Product = {
  id: string;
  title: string;
  delivery_mode: string;
  delivery_date: string | null;
};

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofRegId, setProofRegId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: regs }, { data: prods }] = await Promise.all([
      supabase.from("registrations").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, title, delivery_mode, delivery_date, price, currency"),
    ]);

    const prodMap = Object.fromEntries((prods || []).map((p: any) => [p.id, p]));
    setProducts((prods as any[]) || []);
    setRegistrations(
      ((regs as any[]) || []).map((r: any) => ({
        ...r,
        product_title: prodMap[r.product_id]?.title || "—",
        product_delivery_mode: prodMap[r.product_id]?.delivery_mode || "auto",
        product_delivery_date: prodMap[r.product_id]?.delivery_date || null,
        product_price: prodMap[r.product_id]?.price || 0,
        product_currency: prodMap[r.product_id]?.currency || "FCFA",
      }))
    );
    setLoading(false);
  };

  const confirmRegistration = async (reg: Registration) => {
    setProcessingId(reg.id);
    const { error: regError } = await supabase
      .from("registrations")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", reg.id);
    if (regError) { toast.error(regError.message); setProcessingId(null); return; }

    // Create access grant (only if user has an account)
    if (reg.user_id) {
      const availableAt = reg.product_delivery_mode === "scheduled" && reg.product_delivery_date
        ? reg.product_delivery_date
        : new Date().toISOString();
      const { error: grantError } = await supabase.from("access_grants").insert({
        user_id: reg.user_id,
        product_id: reg.product_id,
        available_at: availableAt,
      });
      if (grantError && !grantError.message.includes("duplicate")) {
        toast.error(grantError.message);
        setProcessingId(null);
        return;
      }
    }

    toast.success("✅ Accès activé !");
    setProofUrl(null);
    setProofRegId(null);
    setProcessingId(null);
    fetchData();
  };

  const rejectRegistration = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from("registrations").update({ status: "rejected" }).eq("id", id);
    if (error) { toast.error(error.message); setProcessingId(null); return; }
    toast.success("Inscription rejetée");
    setProofUrl(null);
    setProofRegId(null);
    setProcessingId(null);
    fetchData();
  };

  const filtered = registrations.filter((r) => {
    if (filterProduct !== "all" && r.product_id !== filterProduct) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.full_name.toLowerCase().includes(q) &&
        !r.email.toLowerCase().includes(q) &&
        !(r.phone || "").includes(q)
      ) return false;
    }
    return true;
  });

  const pendingCount = registrations.filter(r => r.status === "paid").length;

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      pending: { bg: "bg-muted text-muted-foreground", label: "En attente" },
      paid:    { bg: "bg-orange-500/15 text-orange-500", label: "🔔 À valider" },
      confirmed: { bg: "bg-green-500/15 text-green-500", label: "Confirmé" },
      rejected:  { bg: "bg-destructive/15 text-destructive", label: "Rejeté" },
    };
    const s = map[status] || map.pending;
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg}`}>{s.label}</span>;
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inscriptions & Paiements</h1>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 text-orange-500 px-3 py-1 text-sm font-semibold">
            <Clock className="h-3.5 w-3.5" />
            {pendingCount} paiement{pendingCount > 1 ? "s" : ""} à valider
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tous les produits" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="paid">À valider</SelectItem>
            <SelectItem value="confirmed">Confirmé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Rechercher nom / email / tél…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Montant</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune inscription</td>
              </tr>
            ) : filtered.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-border last:border-0 ${r.status === "paid" ? "bg-orange-500/5" : ""}`}
              >
                {/* Client */}
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                  {r.phone && (
                    <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>
                    </div>
                  )}
                </td>
                {/* Produit */}
                <td className="px-4 py-3 text-foreground">{r.product_title}</td>
                {/* Montant */}
                <td className="px-4 py-3 font-semibold text-primary">
                  {r.product_price > 0 ? `${r.product_price.toLocaleString("fr-FR")} ${r.product_currency}` : "Gratuit"}
                </td>
                {/* Date */}
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </td>
                {/* Statut */}
                <td className="px-4 py-3">{statusBadge(r.status)}</td>
                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Show proof if exists */}
                    {r.payment_screenshot_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setProofUrl(r.payment_screenshot_url); setProofRegId(r.id); }}
                        className="text-xs"
                      >
                        Preuve
                      </Button>
                    )}
                    {/* Validate button for "paid" status */}
                    {r.status === "paid" && (
                      <>
                        <Button
                          size="sm"
                          disabled={processingId === r.id}
                          onClick={() => rejectRegistration(r.id)}
                          className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 gap-1"
                          variant="ghost"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          disabled={processingId === r.id}
                          onClick={() => confirmRegistration(r)}
                          className="bg-green-600 hover:bg-green-700 text-white gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {processingId === r.id ? "…" : "Valider"}
                        </Button>
                      </>
                    )}
                    {/* Manual confirm for pending */}
                    {r.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={processingId === r.id}
                        onClick={() => confirmRegistration(r)}
                        className="border-primary/30 text-primary hover:bg-primary/10"
                      >
                        {processingId === r.id ? "…" : "Confirmer"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Proof Modal (backward compat) */}
      <Dialog open={!!proofUrl} onOpenChange={() => { setProofUrl(null); setProofRegId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Preuve de paiement</DialogTitle></DialogHeader>
          {proofUrl && (
            <img src={proofUrl} alt="Preuve de paiement" className="w-full rounded-lg border border-border" />
          )}
          {proofRegId && (
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => rejectRegistration(proofRegId)}
                disabled={processingId === proofRegId}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Rejeter ✗
              </Button>
              <Button
                onClick={() => {
                  const reg = registrations.find((r) => r.id === proofRegId);
                  if (reg) confirmRegistration(reg);
                }}
                disabled={processingId === proofRegId}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Confirmer ✓
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
