import { useEffect, useState, useRef } from "react";
import { Bell, CalendarClock, CreditCard, MessageCircle, Users, X, Package, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

// Définition des catégories avec icône, libellé, couleur
const CATEGORIES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  message: {
    label: "Messages",
    icon: <MessageCircle className="h-4 w-4" />,
    color: "text-blue-500",
  },
  product: {
    label: "Produits",
    icon: <Package className="h-4 w-4" />,
    color: "text-primary",
  },
  coaching: {
    label: "Coaching",
    icon: <CalendarClock className="h-4 w-4" />,
    color: "text-green-500",
  },
  payment_proof: {
    label: "Paiements",
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-orange-500",
  },
  registration: {
    label: "Inscriptions",
    icon: <Users className="h-4 w-4" />,
    color: "text-purple-500",
  },
};

function getCategoryInfo(type: string) {
  return CATEGORIES[type] ?? {
    label: "Général",
    icon: <Bell className="h-4 w-4" />,
    color: "text-muted-foreground",
  };
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unread = notifs.filter((n) => !n.read_at).length;

  const fetchNotifs = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs((data as any[]) || []);
  };

  useEffect(() => {
    fetchNotifs();

    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        fetchNotifs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifs.filter((n) => !n.read_at).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read_at) await markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  // Catégories présentes dans les notifs (pour les tabs)
  const presentTypes = Array.from(new Set(notifs.map((n) => n.type)));

  const tabs = [
    { key: "all", label: "Tout", count: unread },
    ...presentTypes.map((t) => ({
      key: t,
      label: getCategoryInfo(t).label,
      count: notifs.filter((n) => n.type === t && !n.read_at).length,
    })),
  ];

  const displayed = activeTab === "all" ? notifs : notifs.filter((n) => n.type === activeTab);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">
              Notifications {unread > 0 && <span className="text-red-500">({unread})</span>}
            </span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Tout lu
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs catégories */}
          {tabs.length > 1 && (
            <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.key !== "all" && (
                    <span className={getCategoryInfo(tab.key).color}>
                      {getCategoryInfo(tab.key).icon}
                    </span>
                  )}
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn(
                      "ml-0.5 rounded-full px-1 text-[10px] font-bold",
                      activeTab === tab.key ? "bg-white/20" : "bg-red-500 text-white"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {displayed.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucune notification</p>
              </div>
            ) : (
              displayed.map((n) => {
                const cat = getCategoryInfo(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors",
                      !n.read_at && "bg-primary/5"
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0", cat.color)}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug", !n.read_at ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read_at && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Utilitaire exporté pour créer des notifications admin depuis n'importe où */
export async function createAdminNotification(
  type: string,
  title: string,
  body?: string,
  link?: string
) {
  await supabase.from("notifications").insert({ type, title, body: body || null, link: link || null } as any);
}

/* Alias legacy — conservé pour compatibilité avec les anciens imports */
export const createNotification = createAdminNotification;

/* Notif membre (nouveau produit, coaching confirmé, etc.) */
export async function createMemberNotification(
  userId: string,
  category: string,
  title: string,
  body?: string,
  link?: string
) {
  await supabase.from("member_notifications" as any).insert({
    user_id: userId,
    category,
    title,
    body: body || null,
    link: link || null,
  });
}
