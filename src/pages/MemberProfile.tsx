import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function MemberProfile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile) setFullName(profile.full_name || "");

      const { data: regs } = await supabase
        .from("registrations")
        .select("created_at, status, products(title, price, currency)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setHistory(regs || []);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour");
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour !");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "bg-muted text-muted-foreground" },
    paid: { label: "Payé", color: "bg-primary/20 text-primary" },
    confirmed: { label: "Confirmé", color: "bg-emerald-600/20 text-emerald-400" },
    rejected: { label: "Rejeté", color: "bg-destructive/20 text-destructive" },
  };

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link to="/member">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-foreground">Mon profil</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Profile info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="opacity-60" />
            </div>
            <Button onClick={saveProfile} disabled={saving}>Enregistrer</Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader><CardTitle className="text-base">Changer le mot de passe</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Confirmer</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} />
            </div>
            <Button onClick={changePassword} disabled={saving || !newPassword}>Mettre à jour</Button>
          </CardContent>
        </Card>

        {/* Purchase history */}
        <Card>
          <CardHeader><CardTitle className="text-base">Historique des achats</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun achat pour le moment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r: any, i: number) => {
                    const s = statusLabel[r.status] || statusLabel.pending;
                    return (
                      <TableRow key={i}>
                        <TableCell>{r.products?.title || "—"}</TableCell>
                        <TableCell>{r.products?.price?.toLocaleString()} {r.products?.currency || "XOF"}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>
                          <Badge className={`${s.color} border-0 hover:${s.color}`}>{s.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
