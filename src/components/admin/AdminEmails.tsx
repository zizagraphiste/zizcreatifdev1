import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

type Product = { id: string; title: string };

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  sent_at: string;
};

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
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Sujet et corps requis");
      return;
    }
    setSending(true);

    // Simulated send — in production this would call an edge function
    await new Promise((r) => setTimeout(r, 1000));

    const log: EmailLog = {
      id: Date.now().toString(),
      to: targetProduct === "specific"
        ? targetEmail || "—"
        : targetProduct === "all"
        ? "Tous les membres"
        : `Membres de ${products.find((p) => p.id === targetProduct)?.title || "produit"}`,
      subject: subject.trim(),
      sent_at: new Date().toISOString(),
    };

    setHistory((prev) => [log, ...prev]);
    toast.success("Email envoyé (simulé)");
    setSubject("");
    setBody("");
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Emails</h1>

      <div className="rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Nouvel email</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Destinataires (produit)</Label>
            <Select value={targetProduct} onValueChange={setTargetProduct}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">Email spécifique ↓</SelectItem>
                <SelectItem value="all">Tous les membres</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>Membres: {p.title}</SelectItem>)}
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
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Contenu de l'email…" />
        </div>

        <Button onClick={handleSend} disabled={sending} className="gap-2">
          <Send className="h-4 w-4" />{sending ? "Envoi…" : "Envoyer"}
        </Button>
      </div>

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Historique des envois</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Aucun email envoyé.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destinataire</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sujet</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{h.to}</td>
                    <td className="px-4 py-3 text-foreground">{h.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(h.sent_at).toLocaleString("fr-FR")}</td>
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
