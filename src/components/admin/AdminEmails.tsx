import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Product = { id: string; title: string };
type EmailLog = { id: string; to: string; subject: string; sent_at: string; status: "sent" | "error" };

export default function AdminEmails() {
  const [products, setProducts] = useState<Product[]>([]);
  const [targetProduct, setTargetProduct] = useState("all");
  const [targetEmail, setTargetEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<EmailLog[]>([]);

  useEffect(() => {
    supabase.from("products").select("id, title").order("title").then(({ data }) => {
      setProducts((data as any[]) || []);
    });
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("email_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);
    setHistory((data as any[]) || []);
  };

  /* Résout les destinataires selon la sélection */
  const resolveRecipients = async (): Promise<string[]> => {
    if (targetProduct === "specific") {
      if (!targetEmail.trim()) return [];
      return [targetEmail.trim()];
    }
    if (targetProduct === "all") {
      const { data } = await supabase.from("profiles").select("email").not("email", "is", null);
      return (data || []).map((p: any) => p.email).filter(Boolean);
    }
    // Par produit — membres ayant accès ou inscriptions confirmées
    const { data } = await supabase
      .from("registrations")
      .select("email")
      .eq("product_id", targetProduct)
      .eq("status", "confirmed");
    return (data || []).map((r: any) => r.email).filter(Boolean);
  };

  const toLabel = () => {
    if (targetProduct === "specific") return targetEmail || "—";
    if (targetProduct === "all") return "Tous les membres";
    return `Membres : ${products.find((p) => p.id === targetProduct)?.title || "produit"}`;
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Sujet et corps requis");
      return;
    }
    setSending(true);

    try {
      const recipients = await resolveRecipients();
      if (recipients.length === 0) {
        toast.error("Aucun destinataire trouvé");
        setSending(false);
        return;
      }

      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        ${body.trim().split("\n").map((line) => `<p style="margin:0 0 12px">${line}</p>`).join("")}
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="color:#888;font-size:12px">ZizCreatif · zizcreatif.dev</p>
      </div>`;

      const { error } = await supabase.functions.invoke("send-email", {
        body: { to: recipients, subject: subject.trim(), html },
      });

      const status = error ? "error" : "sent";

      // Persiste dans email_logs
      await supabase.from("email_logs").insert({
        to: toLabel(),
        subject: subject.trim(),
        status,
        recipients_count: recipients.length,
      } as any);

      if (error) {
        toast.error("Erreur lors de l'envoi");
      } else {
        toast.success(`Email envoyé à ${recipients.length} destinataire${recipients.length > 1 ? "s" : ""}`);
        setSubject("");
        setBody("");
      }

      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Erreur inconnue");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Emails</h1>

      <div className="rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Nouvel email</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Destinataires</Label>
            <Select value={targetProduct} onValueChange={setTargetProduct}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">Email spécifique ↓</SelectItem>
                <SelectItem value="all">Tous les membres</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>Membres : {p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {targetProduct === "specific" && (
            <div className="space-y-2">
              <Label>Email spécifique</Label>
              <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="email@exemple.com" type="email" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Sujet</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet de l'email" />
        </div>
        <div className="space-y-2">
          <Label>Corps</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Contenu de l'email…" />
        </div>

        <Button onClick={handleSend} disabled={sending} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Envoi en cours…" : "Envoyer"}
        </Button>
      </div>

      {/* Historique */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Historique des envois</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Aucun email envoyé pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destinataire</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sujet</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{h.to}</td>
                    <td className="px-4 py-3 text-foreground">{h.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(h.sent_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      {h.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-green-500 text-xs font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Envoyé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                          <AlertCircle className="h-3.5 w-3.5" /> Erreur
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
