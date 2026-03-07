import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Reply, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type MentorMessage = {
  id: string;
  user_id: string;
  message: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null };
};

export default function AdminMentorMessages() {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mentor_messages")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    setMessages((data as any[]) || []);
    setLoading(false);
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    const { error } = await supabase
      .from("mentor_messages")
      .update({ admin_reply: replyText.trim(), replied_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Réponse envoyée");
    setReplyingTo(null);
    setReplyText("");
    fetchMessages();
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground animate-pulse">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Parler au Mentor</h1>
        <Badge variant="secondary" className="text-sm">
          {messages.filter(m => !m.admin_reply).length} en attente
        </Badge>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun message reçu pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`rounded-xl border p-5 space-y-3 ${m.admin_reply ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">{m.profiles?.full_name || "Membre"}</p>
                  <p className="text-xs text-muted-foreground">{m.profiles?.email} · {format(new Date(m.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}</p>
                </div>
                {m.admin_reply ? (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/15">
                    <Check className="h-3 w-3 mr-1" /> Répondu
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30 hover:bg-orange-500/15">
                    En attente
                  </Badge>
                )}
              </div>

              <p className="text-foreground whitespace-pre-wrap">{m.message}</p>

              {m.admin_reply && (
                <div className="rounded-lg bg-muted/50 p-4 border-l-4 border-primary">
                  <p className="text-xs text-muted-foreground mb-1">Ta réponse · {m.replied_at && format(new Date(m.replied_at), "dd MMM yyyy", { locale: fr })}</p>
                  <p className="text-foreground whitespace-pre-wrap">{m.admin_reply}</p>
                </div>
              )}

              {!m.admin_reply && replyingTo !== m.id && (
                <Button variant="outline" size="sm" onClick={() => { setReplyingTo(m.id); setReplyText(""); }} className="gap-2">
                  <Reply className="h-4 w-4" /> Répondre
                </Button>
              )}

              {replyingTo === m.id && (
                <div className="space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Écrire ta réponse..."
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleReply(m.id)} disabled={!replyText.trim()}>Envoyer</Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
