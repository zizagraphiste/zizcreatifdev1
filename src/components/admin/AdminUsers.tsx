import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { Phone, Mail, Briefcase, CalendarDays, ShoppingBag, Search, ChevronDown, ChevronUp, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  profession: string | null;
  avatar_url: string | null;
  created_at: string;
  onboarding_completed: boolean;
  order_count: number;
  total_spent: number;
  currency: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // Profils avec agrégat commandes via jointure manuelle
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone, profession, avatar_url, created_at, onboarding_completed")
      .order("created_at", { ascending: false });

    if (!profiles) { setLoading(false); return; }

    // Pour chaque profil on récupère les commandes confirmées
    const { data: regs } = await supabase
      .from("registrations")
      .select("user_id, status, amount, currency")
      .in("status", ["confirmed", "paid"]);

    // Récupérer les emails depuis auth (via profiles email si disponible)
    const { data: authUsers } = await supabase
      .from("profiles")
      .select("id")
      .limit(1); // just to test connection

    // Chercher emails dans registrations
    const { data: regEmails } = await supabase
      .from("registrations")
      .select("user_id, email")
      .not("user_id", "is", null);

    const emailMap: Record<string, string> = {};
    (regEmails || []).forEach((r: any) => {
      if (r.user_id && r.email) emailMap[r.user_id] = r.email;
    });

    const rows: UserRow[] = profiles.map((p: any) => {
      const userRegs = (regs || []).filter((r: any) => r.user_id === p.id);
      const totalSpent = userRegs.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const currency = userRegs[0]?.currency || "FCFA";
      return {
        id: p.id,
        full_name: p.full_name,
        email: emailMap[p.id] || null,
        phone: p.phone,
        profession: p.profession,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        onboarding_completed: p.onboarding_completed ?? false,
        order_count: userRegs.length,
        total_spent: totalSpent,
        currency,
      };
    });

    setUsers(rows);
    setLoading(false);
  };

  const fetchOrders = async (userId: string) => {
    if (orders[userId]) return;
    const { data } = await supabase
      .from("registrations")
      .select("id, status, amount, currency, created_at, product_title")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setOrders((prev) => ({ ...prev, [userId]: data || [] }));
  };

  const toggle = async (userId: string) => {
    if (expanded === userId) { setExpanded(null); return; }
    setExpanded(userId);
    await fetchOrders(userId);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.profession || "").toLowerCase().includes(q)
    );
  });

  const fmt = (d: string) => format(new Date(d), "dd MMM yyyy", { locale: fr });

  const statusColor = (s: string) => {
    if (s === "confirmed") return "bg-emerald-500/15 text-emerald-600";
    if (s === "paid") return "bg-blue-500/15 text-blue-600";
    if (s === "pending") return "bg-orange-500/15 text-orange-600";
    if (s === "revoked") return "bg-red-500/15 text-red-600";
    return "bg-muted text-muted-foreground";
  };

  const statusLabel = (s: string) => {
    if (s === "confirmed") return "Confirmé";
    if (s === "paid") return "Payé";
    if (s === "pending") return "En attente";
    if (s === "revoked") return "Révoqué";
    return s;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tous les membres de la communauté</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users className="h-3.5 w-3.5 mr-1.5" />
          {users.length} membre{users.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, téléphone, profession…"
          className="pl-9"
        />
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Membres total", value: users.length, color: "text-primary" },
          { label: "Onboarding complété", value: users.filter((u) => u.onboarding_completed).length, color: "text-emerald-600" },
          { label: "Avec commandes", value: users.filter((u) => u.order_count > 0).length, color: "text-blue-600" },
          { label: "Sans commande", value: users.filter((u) => u.order_count === 0).length, color: "text-muted-foreground" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-card p-4">
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun utilisateur trouvé.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-2xl border bg-card overflow-hidden transition-all">
              {/* Row cliquable */}
              <button
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                onClick={() => toggle(u.id)}
              >
                <AvatarCircle name={u.full_name || "Membre"} avatarUrl={u.avatar_url} size="sm" />

                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  {/* Identité */}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {u.full_name || <span className="text-muted-foreground italic">Sans nom</span>}
                    </p>
                    {u.profession && (
                      <p className="text-xs text-primary/80 font-medium truncate">{u.profession}</p>
                    )}
                    {!u.onboarding_completed && (
                      <span className="inline-block mt-0.5 text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-500/10 px-1.5 rounded">
                        Onboarding incomplet
                      </span>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="hidden sm:block min-w-0 space-y-0.5">
                    {u.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 shrink-0" /> {u.email}
                      </p>
                    )}
                    {u.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <a href={`tel:${u.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{u.phone}</a>
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-3 justify-end">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <CalendarDays className="h-3 w-3" /> {fmt(u.created_at)}
                      </p>
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1 justify-end">
                        <ShoppingBag className="h-3 w-3" />
                        {u.order_count} commande{u.order_count > 1 ? "s" : ""}
                        {u.total_spent > 0 && <span className="text-primary ml-1">· {u.total_spent.toLocaleString("fr-FR")} {u.currency}</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {expanded === u.id
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {/* Détail déplié */}
              {expanded === u.id && (
                <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                  {/* Contact mobile */}
                  <div className="sm:hidden space-y-1">
                    {u.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> {u.email}</p>}
                    {u.phone && <p className="text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" /><a href={`tel:${u.phone}`} className="text-primary">{u.phone}</a></p>}
                  </div>

                  {/* Historique commandes */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" /> Historique commandes
                    </p>
                    {(orders[u.id] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Aucune commande.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(orders[u.id] || []).map((o: any) => (
                          <div key={o.id} className="flex items-center gap-3 text-xs rounded-lg bg-muted/30 px-3 py-2">
                            <span className="flex-1 font-medium truncate">{o.product_title || "—"}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(o.status)}`}>
                              {statusLabel(o.status)}
                            </span>
                            <span className="text-muted-foreground shrink-0">{fmt(o.created_at)}</span>
                            {o.amount > 0 && (
                              <span className="font-bold text-primary shrink-0">
                                {o.amount.toLocaleString("fr-FR")} {o.currency || "FCFA"}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
