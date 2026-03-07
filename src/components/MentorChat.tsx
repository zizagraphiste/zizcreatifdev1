import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";

type Message = {
  id: string;
  message: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export default function MentorChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [memberSince, setMemberSince] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user!.id)
      .single();
    if (data) setMemberSince(new Date(data.created_at));
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mentor_messages")
      .select("id, message, admin_reply, replied_at, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setMessages((data as Message[]) || []);
    setLoading(false);
  };

  // Calculate remaining credits: 4/month accumulating since signup
  const totalAllowed = memberSince
    ? (differenceInMonths(new Date(), memberSince) + 1) * 4
    : 4;
  const totalUsed = messages.length;
  const remaining = Math.max(0, totalAllowed - totalUsed);

  const handleSend = async () => {
    if (!text.trim() || remaining <= 0) return;
    setSending(true);
    const { error } = await supabase
      .from("mentor_messages")
      .insert({ user_id: user!.id, message: text.trim() });
    if (error) { toast.error(error.message); setSending(false); return; }
    toast.success("Message envoyé au mentor !");
    setText("");
    setSending(false);
    fetchMessages();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Parler au Mentor
        </h2>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {remaining} message{remaining !== 1 ? "s" : ""} restant{remaining !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Send form */}
      <Card className="border-primary/20">
        <CardContent className="pt-6 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={remaining > 0 ? "Pose ta question au mentor, partage ton problème ou demande un conseil mindset..." : "Tu as utilisé tous tes messages ce mois-ci. Tes crédits se renouvellent chaque mois."}
            rows={4}
            disabled={remaining <= 0}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              4 messages/mois · Les crédits non utilisés s'accumulent
            </p>
            <Button onClick={handleSend} disabled={!text.trim() || remaining <= 0 || sending} className="gap-2">
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message history */}
      {loading ? (
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      ) : messages.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>Tu n'as pas encore envoyé de message.</p>
          <p className="text-sm mt-1">Profite de tes {remaining} crédits pour poser une question !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <Card key={m.id} className="border-border">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                  {m.admin_reply ? (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/15 text-xs">
                      Répondu
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">En attente</Badge>
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap">{m.message}</p>
                {m.admin_reply && (
                  <div className="rounded-lg bg-primary/5 p-4 border-l-4 border-primary">
                    <p className="text-xs text-primary font-semibold mb-1">Réponse du mentor</p>
                    <p className="text-foreground whitespace-pre-wrap">{m.admin_reply}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
