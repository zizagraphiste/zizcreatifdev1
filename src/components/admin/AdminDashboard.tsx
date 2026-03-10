import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, TrendingUp, Users, Package, Clock, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type KPIs = {
  totalRevenue: number;
  activeMembers: number;
  activeProducts: number;
  paidCount: number;
};

type PaidReg = {
  id: string;
  full_name: string;
  email: string;
  product_title: string;
  product_price: number;
  product_currency: string;
  created_at: string;
  user_id: string | null;
  product_id: string;
  product_delivery_mode: string;
  product_delivery_date: string | null;
  payment_screenshot_url: string | null;
};

type RecentReg = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  product_title: string;
};

type CapacityAlert = {
  id: string;
  title: string;
  spots_taken: number;
  max_spots: number;
  pct: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIs>({ totalRevenue: 0, activeMembers: 0, activeProducts: 0, paidCount: 0 });
  const [paidRegs, setPaidRegs] = useState<PaidReg[]>([]);
  const [recentRegs, setRecentRegs] = useState<RecentReg[]>([]);
  const [alerts, setAlerts] = useState<CapacityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);

    const [
      { data: confirmedRegs },
      { count: activeMembers },
      { count: activeProducts },
      { data: paidData },
      { data: regs },
      { data: products },
    ] = await Promise.all([
      supabase.from("registrations").select("amount").eq("status", "confirmed"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("registrations").select("id, full_name, email, product_id, amount, created_at, user_id, payment_screenshot_url").eq("status", "paid").order("created_at", { ascending: false }),
      supabase.from("registrations").select("id, full_name, email, status, created_at, product_id").order("created_at", { ascending: false }).limit(8),
      supabase.from("products").select("id, title, status, spots_taken, max_spots, delivery_mode, delivery_date, price, currency").eq("status", "active"),
    ]);

    const prodMap = Object.fromEntries((products || []).map((p: any) => [p.id, p]));

    // Revenue: sum of amount field directly
    const totalRevenue = (confirmedRegs || []).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);

    // Paid registrations enriched with product info
    const enrichedPaid: PaidReg[] = (paidData || []).map((r: any) => ({
      ...r,
      product_title: prodMap[r.product_id]?.title || "—",
      product_price: r.amount ?? prodMap[r.product_id]?.price ?? 0,
      product_currency: prodMap[r.product_id]?.currency || "FCFA",
      product_delivery_mode: prodMap[r.product_id]?.delivery_mode || "auto",
      product_delivery_date: prodMap[r.product_id]?.delivery_date || null,
    }));

    // Recent regs enriched
    const enrichedRecent: RecentReg[] = (regs || []).map((r: any) => ({
      ...r,
      product_title: prodMap[r.product_id]?.title || "—",
    }));

    // Capacity alerts
    const capacityAlerts: CapacityAlert[] = (products || [])
      .filter((p: any) => p.max_spots > 0 && (p.spots_taken / p.max_spots) >= 0.8)
      .map((p: any) => ({ ...p, pct: Math.round((p.spots_taken / p.max_spots) * 100) }));

    setKpis({ totalRevenue, activeMembers: activeMembers || 0, activeProducts: activeProducts || 0, paidCount: enrichedPaid.length });
    setPaidRegs(enrichedPaid);
    setRecentRegs(enrichedRecent);
    setAlerts(capacityAlerts);
    setLoading(false);
  };

  const confirmReg = async (reg: PaidReg) => {
    setProcessingId(reg.id);
    const { error } = await supabase.from("registrations").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", reg.id);
    if (error) { toast.error(error.message); setProcessingId(null); return; }

    if (reg.user_id) {
      const availableAt = reg.product_delivery_mode === "scheduled" && reg.product_delivery_date
        ? reg.product_delivery_date
        : new Date().toISOString();
      await supabase.from("access_grants").insert({ user_id: reg.user_id, product_id: reg.product_id, available_at: availableAt });
    }
    toast.success("✅ Accès activé !");
    setProcessingId(null);
    fetchData();
  };

  const rejectReg = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from("registrations").update({ status: "rejected" }).eq("id", id);
    if (error) { toast.error(error.message); setProcessingId(null); return; }
    toast.success("Inscription rejetée");
    setProcessingId(null);
    fetchData();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      pending:   { bg: "bg-muted text-muted-foreground", label: "En attente" },
      paid:      { bg: "bg-orange-500/15 text-orange-500", label: "🔔 À valider" },
      confirmed: { bg: "bg-green-500/15 text-green-500", label: "Confirmé" },
      rejected:  { bg: "bg-destructive/15 text-destructive", label: "Rejeté" },
      revoked:   { bg: "bg-purple-500/15 text-purple-500", label: "Révoqué" },
    };
    const s = map[status] || map.pending;
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg}`}>{s.label}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>;
  }

  const kpiCards = [
    {
      label: "Revenus confirmés",
      value: `${kpis.totalRevenue.toLocaleString("fr-FR")} FCFA`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "/admin/comptabilite",
    },
    {
      label: "Membres inscrits",
      value: kpis.activeMembers,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/admin/registrations",
    },
    {
      label: "Produits actifs",
      value: kpis.activeProducts,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/products",
    },
    {
      label: "Paiements à valider",
      value: kpis.paidCount,
      icon: Clock,
      color: kpis.paidCount > 0 ? "text-orange-500" : "text-muted-foreground",
      bg: kpis.paidCount > 0 ? "bg-orange-500/10" : "bg-muted/30",
      href: "/admin/registrations",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => navigate(kpi.href)}
            className="rounded-xl border border-border bg-card p-5 space-y-3 text-left hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <span>Voir détails</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>

      {/* À traiter — paiements en attente */}
      {paidRegs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              À traiter
              <span className="inline-flex items-center rounded-full bg-orange-500/15 text-orange-500 px-2 py-0.5 text-xs font-bold">
                {paidRegs.length}
              </span>
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/registrations")} className="text-xs gap-1">
              Tout voir <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 divide-y divide-border overflow-hidden">
            {paidRegs.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.product_title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-primary text-sm">
                    {r.product_price > 0 ? `${r.product_price.toLocaleString("fr-FR")} ${r.product_currency}` : "Gratuit"}
                  </p>
                  {r.payment_screenshot_url && (
                    <a href={r.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">
                      Voir preuve
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={processingId === r.id}
                    onClick={() => rejectReg(r.id)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    title="Rejeter"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    disabled={processingId === r.id}
                    onClick={() => confirmReg(r)}
                    className="h-8 bg-green-600 hover:bg-green-700 text-white px-3 text-xs gap-1"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {processingId === r.id ? "…" : "Valider"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capacity alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate("/admin/products")}
              className="w-full flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-left hover:bg-primary/10 transition-colors"
            >
              <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
              <span className="text-foreground flex-1">
                <strong>{a.title}</strong> — {a.pct}% de capacité ({a.spots_taken}/{a.max_spots} places)
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {/* Recent registrations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Dernières inscriptions</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/registrations")} className="text-xs gap-1">
            Tout voir <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentRegs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucune inscription</td></tr>
              ) : (
                recentRegs.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate("/admin/registrations")}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{r.product_title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
