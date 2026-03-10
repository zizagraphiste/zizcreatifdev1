import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Phone, Clock, UserRound, Mail, MessageCircle, CalendarDays, ShoppingBag, Ban, CalendarClock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { differenceInMonths } from "date-fns";

const DURATIONS = [
  { label: "15 jours", value: "15d" },
  { label: "1 mois",   value: "1m" },
  { label: "3 mois",   value: "3m" },
  { label: "Définitif", value: "permanent" },
];

const RESTORE_DURATIONS = [
  { label: "15 jours",        value: "15d" },
  { label: "1 mois",          value: "1m" },
  { label: "3 mois",          value: "3m" },
  { label: "Illimité",        value: "permanent" },
];

function addDuration(duration: string): Date | null {
  const now = new Date();
  if (duration === "15d") return new Date(now.setDate(now.getDate() + 15));
  if (duration === "1m")  return new Date(now.setMonth(now.getMonth() + 1));
  if (duration === "3m")  return new Date(now.setMonth(now.getMonth() + 3));
  return null; // permanent
}

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  payment_screenshot_url: string | null;
  product_id: string;
  user_id: string | null;
  product_title: string;
  product_type: string;
  product_delivery_mode: string;
  product_delivery_date: string | null;
  product_price: number;
  product_currency: string;
  session_date: string | null;
  session_time: string | null;
  revoked_until: string | null;
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
  // Fiche contact
  const [contactInfo, setContactInfo] = useState<any | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  // Révocation
  const [revokeTarget, setRevokeTarget] = useState<Registration | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeDuration, setRevokeDuration] = useState("permanent");
  // Restauration avec durée
  const [restoreTarget, setRestoreTarget] = useState<Registration | null>(null);
  const [restoreDuration, setRestoreDuration] = useState("permanent");
  // Reprogrammation coaching
  const [rescheduleTarget, setRescheduleTarget] = useState<Registration | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: regs }, { data: prods }] = await Promise.all([
      supabase.from("registrations").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, title, type, delivery_mode, delivery_date, price, currency"),
    ]);

    const prodMap = Object.fromEntries((prods || []).map((p: any) => [p.id, p]));
    setProducts((prods as any[]) || []);
    setRegistrations(
      ((regs as any[]) || []).map((r: any) => ({
        ...r,
        product_title: prodMap[r.product_id]?.title || "—",
        product_type: prodMap[r.product_id]?.type || "",
        product_delivery_mode: prodMap[r.product_id]?.delivery_mode || "auto",
        product_delivery_date: prodMap[r.product_id]?.delivery_date || null,
        product_price: r.amount ?? prodMap[r.product_id]?.price ?? 0,
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

  const restoreRegistration = async () => {
    if (!restoreTarget) return;
    setProcessingId(restoreTarget.id);
    const { error } = await supabase
      .from("registrations")
      .update({ status: "confirmed", revoked_until: null } as any)
      .eq("id", restoreTarget.id);
    if (error) { toast.error(error.message); setProcessingId(null); return; }

    if (restoreTarget.user_id) {
      const availableAt = restoreTarget.product_delivery_mode === "scheduled" && restoreTarget.product_delivery_date
        ? restoreTarget.product_delivery_date
        : new Date().toISOString();
      const expiresAt = addDuration(restoreDuration);
      await supabase.from("access_grants").insert({
        user_id: restoreTarget.user_id,
        product_id: restoreTarget.product_id,
        available_at: availableAt,
        ...(expiresAt ? { expires_at: expiresAt.toISOString() } : {}),
      } as any).select();
    }

    const durationLabel = RESTORE_DURATIONS.find(d => d.value === restoreDuration)?.label || "";
    toast.success(`Accès restauré${restoreDuration !== "permanent" ? ` pour ${durationLabel}` : " définitivement"}`);
    setRestoreTarget(null);
    setRestoreDuration("permanent");
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

  const openContact = async (reg: Registration) => {
    setContactLoading(true);
    setContactInfo({ loading: true, reg });

    const [profileRes, mentorRes, regsRes] = await Promise.all([
      reg.user_id
        ? supabase.from("profiles").select("full_name, email, phone, avatar_url, created_at").eq("id", reg.user_id).single()
        : Promise.resolve({ data: null }),
      reg.user_id
        ? supabase.from("mentor_messages").select("id", { count: "exact" }).eq("user_id", reg.user_id)
        : Promise.resolve({ data: null, count: 0 }),
      supabase.from("registrations").select("id, status, product_id").eq("email", reg.email),
    ]);

    const profile = profileRes.data as any;
    const msgCount = (mentorRes as any).count ?? 0;
    const memberSince = profile?.created_at ? new Date(profile.created_at) : new Date(reg.created_at);
    const months = differenceInMonths(new Date(), memberSince);
    const totalCredits = (months + 1) * 4;
    const creditsLeft = Math.max(0, totalCredits - msgCount);

    const allRegs = (regsRes.data as any[]) || [];
    const confirmedCount = allRegs.filter(r => r.status === "confirmed").length;

    setContactInfo({
      reg,
      profile,
      msgCount,
      creditsLeft,
      totalInscriptions: allRegs.length,
      confirmedInscriptions: confirmedCount,
      memberSince,
    });
    setContactLoading(false);
  };

  const revokeRegistration = async () => {
    if (!revokeTarget) return;
    setProcessingId(revokeTarget.id);

    const revokedUntilDate = addDuration(revokeDuration);
    const { error } = await supabase
      .from("registrations")
      .update({
        status: "revoked",
        revoked_until: revokedUntilDate ? revokedUntilDate.toISOString().slice(0, 10) : null,
      } as any)
      .eq("id", revokeTarget.id);
    if (error) { toast.error(error.message); setProcessingId(null); return; }

    // Remove access grant
    if (revokeTarget.user_id) {
      await supabase.from("access_grants").delete()
        .eq("user_id", revokeTarget.user_id)
        .eq("product_id", revokeTarget.product_id);
    }

    // Email avec durée
    const durationLabel = DURATIONS.find(d => d.value === revokeDuration)?.label || "";
    const durationText = revokeDuration !== "permanent"
      ? `<p>Durée de la révocation : <strong>${durationLabel}</strong>${revokedUntilDate ? ` (jusqu'au ${revokedUntilDate.toLocaleDateString("fr-FR")})` : ""}</p>`
      : "";
    await supabase.functions.invoke("send-email", {
      body: {
        to: revokeTarget.email,
        subject: `Votre accès a été révoqué — ${revokeTarget.product_title}`,
        html: `<p>Bonjour ${revokeTarget.full_name},</p>
<p>Votre accès à <strong>${revokeTarget.product_title}</strong> a été révoqué.</p>
${durationText}
${revokeReason ? `<p><strong>Motif :</strong> ${revokeReason}</p>` : ""}
<p>Pour toute question, répondez à cet email.</p>
<p>Cordialement,<br/>L'équipe ZizCreatif</p>`,
      },
    });

    toast.success(`Accès révoqué${revokeDuration !== "permanent" ? ` pour ${durationLabel}` : " définitivement"}`);
    setRevokeTarget(null);
    setRevokeReason("");
    setRevokeDuration("permanent");
    setProcessingId(null);
    fetchData();
  };

  const rescheduleSession = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    setProcessingId(rescheduleTarget.id);

    const { error } = await supabase
      .from("registrations")
      .update({ session_date: rescheduleDate, session_time: rescheduleTime } as any)
      .eq("id", rescheduleTarget.id);
    if (error) { toast.error(error.message); setProcessingId(null); return; }

    // Email notification to client
    const dateLabel = new Date(rescheduleDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    await supabase.functions.invoke("send-email", {
      body: {
        to: rescheduleTarget.email,
        subject: `Votre séance a été reprogrammée — ${rescheduleTarget.product_title}`,
        html: `<p>Bonjour ${rescheduleTarget.full_name},</p>
<p>Votre séance de coaching <strong>${rescheduleTarget.product_title}</strong> a été reprogrammée.</p>
<p><strong>Nouvelle date :</strong> ${dateLabel} à ${rescheduleTime}</p>
<p>Si vous avez des questions, répondez à cet email.</p>
<p>À bientôt,<br/>L'équipe ZizCreatif</p>`,
      },
    });

    toast.success("✅ Séance reprogrammée et client notifié !");
    setRescheduleTarget(null);
    setRescheduleDate("");
    setRescheduleTime("");
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

  const statusBadge = (r: Registration) => {
    const map: Record<string, { bg: string; label: string }> = {
      pending:   { bg: "bg-muted text-muted-foreground", label: "En attente" },
      paid:      { bg: "bg-orange-500/15 text-orange-500", label: "🔔 À valider" },
      confirmed: { bg: "bg-green-500/15 text-green-500", label: "Confirmé" },
      rejected:  { bg: "bg-destructive/15 text-destructive", label: "Rejeté" },
      revoked:   { bg: "bg-purple-500/15 text-purple-500", label: r.revoked_until ? `Révoqué jusqu'au ${new Date(r.revoked_until).toLocaleDateString("fr-FR")}` : "Révoqué définitivement" },
    };
    const s = map[r.status] || map.pending;
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
            <SelectItem value="revoked">Révoqué</SelectItem>
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
                className={`border-b border-border last:border-0 ${r.status === "paid" ? "bg-orange-500/5" : ""} ${r.status === "revoked" ? "opacity-60" : ""}`}
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
                  {r.notes && (
                    <div className="mt-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs text-foreground whitespace-pre-wrap max-w-xs">
                      <span className="font-semibold text-primary">🎯 Points coaching :</span>
                      <br />{r.notes}
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
                <td className="px-4 py-3">{statusBadge(r)}</td>
                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Fiche contact */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openContact(r)}
                      className="text-muted-foreground hover:text-foreground p-1.5"
                      title="Fiche contact"
                    >
                      <UserRound className="h-4 w-4" />
                    </Button>

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

                    {/* Validate buttons for "paid" status */}
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

                    {/* Reschedule button for confirmed coaching */}
                    {r.status === "confirmed" && r.product_type === "coaching" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={processingId === r.id}
                        onClick={() => {
                          setRescheduleTarget(r);
                          setRescheduleDate(r.session_date || "");
                          setRescheduleTime(r.session_time || "");
                        }}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-500/10 p-1.5"
                        title="Reprogrammer la séance"
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Revoke button for confirmed */}
                    {r.status === "confirmed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={processingId === r.id}
                        onClick={() => { setRevokeTarget(r); setRevokeReason(""); }}
                        className="text-purple-500 hover:text-purple-700 hover:bg-purple-500/10 p-1.5"
                        title="Révoquer l'accès"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Restore button for revoked */}
                    {r.status === "revoked" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={processingId === r.id}
                        onClick={() => { setRestoreTarget(r); setRestoreDuration("permanent"); }}
                        className="text-green-600 hover:text-green-700 hover:bg-green-500/10 p-1.5"
                        title="Restaurer l'accès"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Proof Modal */}
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

      {/* Fiche contact Dialog */}
      <Dialog open={!!contactInfo} onOpenChange={() => setContactInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Fiche contact
            </DialogTitle>
          </DialogHeader>
          {contactInfo && !contactInfo.loading && (
            <div className="space-y-4 pt-1">
              {/* Name */}
              <div>
                <p className="text-lg font-semibold text-foreground">{contactInfo.reg.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Membre depuis le {new Date(contactInfo.memberSince).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>

              {/* Contact infos */}
              <div className="space-y-2.5">
                <a
                  href={`mailto:${contactInfo.reg.email}`}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{contactInfo.reg.email}</span>
                </a>

                {contactInfo.reg.phone ? (
                  <a
                    href={`tel:${contactInfo.reg.phone}`}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm text-foreground">{contactInfo.reg.phone}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 opacity-50">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Aucun téléphone renseigné</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <MessageCircle className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{contactInfo.creditsLeft}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Messages mentor restants</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <ShoppingBag className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{contactInfo.confirmedInscriptions}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Achats confirmés</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <CalendarDays className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{contactInfo.totalInscriptions}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Total inscriptions</p>
                </div>
              </div>

              {!contactInfo.reg.user_id && (
                <p className="text-xs text-muted-foreground italic text-center">
                  Inscription sans compte — données limitées
                </p>
              )}
            </div>
          )}
          {contactInfo?.loading && (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Chargement…</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Révocation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={() => { setRevokeTarget(null); setRevokeReason(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Ban className="h-5 w-5" />
              Révoquer l'inscription
            </DialogTitle>
          </DialogHeader>
          {revokeTarget && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="font-medium text-foreground">{revokeTarget.full_name}</p>
                <p className="text-sm text-muted-foreground">{revokeTarget.product_title}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                Cette action supprime l'accès au produit et passe le statut en <strong>Révoqué</strong>.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Motif <span className="text-muted-foreground font-normal">(optionnel — envoyé par email)</span>
                </label>
                <Textarea
                  placeholder="Ex : Demande de remboursement acceptée, comportement contraire aux CGU…"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Durée de la révocation</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setRevokeDuration(d.value)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        revokeDuration === d.value
                          ? "border-purple-600 bg-purple-600/10 text-purple-600 font-medium"
                          : "border-border text-muted-foreground hover:border-purple-400"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeReason(""); setRevokeDuration("permanent"); }}>
                  Annuler
                </Button>
                <Button
                  onClick={revokeRegistration}
                  disabled={processingId === revokeTarget.id}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  <Ban className="h-4 w-4" />
                  {processingId === revokeTarget.id ? "…" : "Confirmer la révocation"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={() => { setRescheduleTarget(null); setRescheduleDate(""); setRescheduleTime(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <CalendarClock className="h-5 w-5" />
              Reprogrammer la séance
            </DialogTitle>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="font-medium text-foreground">{rescheduleTarget.full_name}</p>
                <p className="text-sm text-muted-foreground">{rescheduleTarget.product_title}</p>
                {rescheduleTarget.session_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Actuel : {new Date(rescheduleTarget.session_date).toLocaleDateString("fr-FR")} à {rescheduleTarget.session_time || "—"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nouvelle date</label>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Heure</label>
                  <Input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Un email de confirmation sera automatiquement envoyé à {rescheduleTarget.email}.
              </p>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setRescheduleTarget(null); setRescheduleDate(""); setRescheduleTime(""); }}>
                  Annuler
                </Button>
                <Button
                  onClick={rescheduleSession}
                  disabled={processingId === rescheduleTarget.id || !rescheduleDate || !rescheduleTime}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <CalendarClock className="h-4 w-4" />
                  {processingId === rescheduleTarget.id ? "…" : "Reprogrammer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restauration Dialog */}
      <Dialog open={!!restoreTarget} onOpenChange={() => { setRestoreTarget(null); setRestoreDuration("permanent"); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <RotateCcw className="h-5 w-5" />
              Restaurer l'accès
            </DialogTitle>
          </DialogHeader>
          {restoreTarget && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="font-medium text-foreground">{restoreTarget.full_name}</p>
                <p className="text-sm text-muted-foreground">{restoreTarget.product_title}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                Choisissez la durée pendant laquelle l'accès sera rétabli.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Durée de la restauration</label>
                <div className="grid grid-cols-2 gap-2">
                  {RESTORE_DURATIONS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setRestoreDuration(d.value)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        restoreDuration === d.value
                          ? "border-green-600 bg-green-600/10 text-green-600 font-medium"
                          : "border-border text-muted-foreground hover:border-green-400"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setRestoreTarget(null); setRestoreDuration("permanent"); }}>
                  Annuler
                </Button>
                <Button
                  onClick={restoreRegistration}
                  disabled={processingId === restoreTarget.id}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {processingId === restoreTarget.id ? "…" : "Restaurer l'accès"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
