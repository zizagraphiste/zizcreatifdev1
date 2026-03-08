import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { Send, Clock } from "lucide-react";
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

type UserProfile = { full_name: string | null; avatar_url: string | null; created_at: string };
type AdminProfile = { full_name: string | null; avatar_url: string | null };

export default function MentorChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) fetchAll(); }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: prof }, { data: msgs }, { data: adminRoles }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, created_at").eq("id", user!.id).single(),
      supabase.from("mentor_messages").select("id, message, admin_reply, replied_at, created_at").eq("user_id", user!.id).order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1),
    ]);
    setUserProfile((prof as any) || null);
    setMessages((msgs as Message[]) || []);

    if ((adminRoles as any[])?.[0]?.user_id) {
      const { data: ap } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", (adminRoles as any[])[0].user_id).single();
      setAdminProfile((ap as any) || null);
    }
    setLoading(false);
  };

  const memberSince = userProfile?.created_at ? new Date(userProfile.created_at) : null;
  const totalAllowed = memberSince ? (differenceInMonths(new Date(), memberSince) + 1) * 4 : 4;
  const remaining = Math.max(0, totalAllowed - messages.length);
  const adminName = adminProfile?.full_name || "Mentor";

  const handleSend = async () => {
    if (!text.trim() || remaining <= 0) return;
    setSending(true);
    const { error } = await supabase.from("mentor_messages").insert({ user_id: user!.id, message: text.trim() });
    if (error) { toast.error(error.message); setSending(false); return; }
    setText("");
    setSending(false);
    fetchAll();
  };

  const fmt = (d: string) => format(new Date(d), "dd MMM · HH:mm", { locale: fr });

  return (
    <div className="flex flex-col">
      {/* Header — profil mentor */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-3">
          <AvatarCircle name={adminName} avatarUrl={adminProfile?.avatar_url} size="md" />
          <div>
            <p className="font-semibold text-foreground text-sm">{adminName}</p>
            <p className="text-xs text-muted-foreground">Ton mentor · disponible</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Clock className="h-3 w-3" />
          {remaining} message{remaining !== 1 ? "s" : ""} restant{remaining !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Conversation */}
      <div className="space-y-5 overflow-y-auto pb-4 max-h-[55vh] pr-1">
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse text-center py-8">Chargement…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground space-y-3">
            <div className="flex justify-center">
              <AvatarCircle name={adminName} avatarUrl={adminProfile?.avatar_url} size="lg" />
            </div>
            <p className="font-medium text-foreground text-sm">
              Bonjour {userProfile?.full_name?.split(" ")[0] || ""} 👋
            </p>
            <p className="text-xs max-w-xs mx-auto leading-relaxed">
              Pose ta question, partage ton blocage ou demande un conseil au mentor.
              Tu as <strong className="text-foreground">{remaining}</strong> messages disponibles.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="space-y-3">
              {/* Bulle utilisateur — droite */}
              <div className="flex items-end gap-2 justify-end">
                <div className="max-w-[78%]">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.message}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-right pr-1">
                    {fmt(m.created_at)}
                    {!m.admin_reply && <span className="ml-1.5 opacity-60">· En attente</span>}
                  </p>
                </div>
                <AvatarCircle name={userProfile?.full_name} avatarUrl={userProfile?.avatar_url} size="sm" />
              </div>

              {/* Bulle admin — gauche */}
              {m.admin_reply && (
                <div className="flex items-end gap-2">
                  <AvatarCircle name={adminName} avatarUrl={adminProfile?.avatar_url} size="sm" />
                  <div className="max-w-[78%]">
                    <p className="text-[10px] text-muted-foreground mb-1 ml-1 font-medium">{adminName}</p>
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{m.admin_reply}</p>
                    </div>
                    {m.replied_at && (
                      <p className="text-[10px] text-muted-foreground mt-1 ml-1">{fmt(m.replied_at)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Zone de saisie */}
      <div className="mt-4 pt-4 border-t border-border">
        {remaining <= 0 ? (
          <div className="rounded-xl bg-muted/40 border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Crédits épuisés. 4 messages/mois s'accumulent chaque mois depuis ton inscription.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <AvatarCircle name={userProfile?.full_name} avatarUrl={userProfile?.avatar_url} size="sm" className="mb-0.5 shrink-0" />
              <div className="flex-1 relative">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Écris ton message…"
                  rows={3}
                  className="resize-none pr-12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
                  }}
                />
                <Button
                  size="icon"
                  className="absolute bottom-2 right-2 h-8 w-8 bg-primary text-primary-foreground"
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              ⌘+Entrée pour envoyer · {remaining} message{remaining !== 1 ? "s" : ""} restant{remaining !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
