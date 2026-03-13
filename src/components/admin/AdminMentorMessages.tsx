import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { MessageCircle, Reply, Check, Send, ChevronDown, ChevronUp } from "lucide-react";
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
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null; profession: string | null };
};

type AdminProfile = { full_name: string | null; avatar_url: string | null };

export default function AdminMentorMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchMessages();
    if (user) fetchAdminProfile();
  }, [user]);

  const fetchAdminProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
    setAdminProfile((data as any) || null);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mentor_messages")
      .select("*, profiles(full_name, email, avatar_url, profession)")
      .order("created_at", { ascending: false });
    setMessages((data as any[]) || []);
    setLoading(false);
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    const { error } = await supabase
      .from("mentor_messages")
      .update({ admin_reply: replyText.trim(), replied_at: new Date().toISOString(), admin_id: user?.id || null } as any)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Réponse envoyée ✓");
    setReplyingTo(null);
    setReplyText("");
    fetchMessages();
  };

  const adminName = adminProfile?.full_name || user?.email?.split("@")[0] || "Admin";
  const fmt = (d: string) => format(new Date(d), "dd MMM · HH:mm", { locale: fr });
  const pending = messages.filter((m) => !m.admin_reply);
  const answered = messages.filter((m) => m.admin_reply);

  if (loading) return <div className="py-20 text-center text-muted-foreground animate-pulse">Chargement…</div>;

  const threadProps = (m: MentorMessage) => ({
    m, adminName, adminProfile,
    replyingTo, replyText,
    expanded: expanded[m.id] ?? !m.admin_reply,
    fmt,
    onToggle: () => setExpanded((p) => ({ ...p, [m.id]: !p[m.id] })),
    onStartReply: () => { setReplyingTo(m.id); setReplyText(m.admin_reply || ""); setTimeout(() => replyRef.current?.focus(), 50); },
    onCancelReply: () => setReplyingTo(null),
    onChangeReply: setReplyText,
    onSendReply: () => handleReply(m.id),
    replyRef: replyingTo === m.id ? replyRef : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages Mentor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Réponds aux questions de tes membres</p>
        </div>
        <div className="flex gap-2">
          {pending.length > 0 && <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30">{pending.length} en attente</Badge>}
          <Badge variant="secondary">{messages.length} total</Badge>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucun message reçu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((m) => <MessageThread key={m.id} {...threadProps(m)} />)}
          {answered.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-2 list-none select-none">
                <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
                {answered.length} message{answered.length > 1 ? "s" : ""} répondu{answered.length > 1 ? "s" : ""}
              </summary>
              <div className="space-y-3 mt-2">
                {answered.map((m) => <MessageThread key={m.id} {...threadProps(m)} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function MessageThread({ m, adminName, adminProfile, replyingTo, replyText, expanded, fmt, onToggle, onStartReply, onCancelReply, onChangeReply, onSendReply, replyRef }: {
  m: MentorMessage; adminName: string; adminProfile: AdminProfile | null;
  replyingTo: string | null; replyText: string; expanded: boolean;
  fmt: (d: string) => string;
  onToggle: () => void; onStartReply: () => void; onCancelReply: () => void;
  onChangeReply: (v: string) => void; onSendReply: () => void;
  replyRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const userName = m.profiles?.full_name || "Membre";
  const profession = m.profiles?.profession;
  const isReplying = replyingTo === m.id;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${m.admin_reply ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
      {/* En-tête cliquable */}
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left" onClick={onToggle}>
        <AvatarCircle name={userName} avatarUrl={m.profiles?.avatar_url} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{userName}</span>
            {profession && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                {profession}
              </span>
            )}
            <span className="text-xs text-muted-foreground truncate hidden sm:block">{m.profiles?.email}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{m.message.slice(0, 80)}{m.message.length > 80 ? "…" : ""}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {m.admin_reply
            ? <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs"><Check className="h-3 w-3 mr-1" />Répondu</Badge>
            : <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30 text-xs">En attente</Badge>}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Conversation dépliée */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* Message membre */}
          <div className="flex items-end gap-3 pt-3">
            <AvatarCircle name={userName} avatarUrl={m.profiles?.avatar_url} size="sm" />
            <div className="max-w-[80%]">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] text-muted-foreground font-medium">{userName}</p>
                {profession && <p className="text-[10px] text-primary/70 font-medium">· {profession}</p>}
              </div>
              <div className="bg-muted/40 rounded-2xl rounded-bl-sm px-4 py-3 border border-border">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.message}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{fmt(m.created_at)}</p>
            </div>
          </div>

          {/* Réponse admin (si déjà répondu et pas en train de modifier) */}
          {m.admin_reply && !isReplying && (
            <div className="flex items-end gap-3 justify-end">
              <div className="max-w-[80%]">
                <p className="text-[10px] text-muted-foreground mb-1 font-medium text-right">{adminName} (moi)</p>
                <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.admin_reply}</p>
                </div>
                {m.replied_at && <p className="text-[10px] text-muted-foreground mt-1 text-right">{fmt(m.replied_at)}</p>}
              </div>
              <AvatarCircle name={adminName} avatarUrl={adminProfile?.avatar_url} size="sm" />
            </div>
          )}

          {/* Zone de saisie réponse */}
          {isReplying ? (
            <div className="flex items-end gap-3 justify-end">
              <div className="flex-1 max-w-[85%] space-y-2">
                <Textarea
                  ref={replyRef}
                  value={replyText}
                  onChange={(e) => onChangeReply(e.target.value)}
                  placeholder="Écrire ta réponse…"
                  rows={4}
                  className="resize-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSendReply(); } }}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={onCancelReply}>Annuler</Button>
                  <Button size="sm" onClick={onSendReply} disabled={!replyText.trim()} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" /> Envoyer
                  </Button>
                </div>
              </div>
              <AvatarCircle name={adminName} avatarUrl={adminProfile?.avatar_url} size="sm" />
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onStartReply} className="gap-2">
                <Reply className="h-3.5 w-3.5" />
                {m.admin_reply ? "Modifier la réponse" : "Répondre"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
