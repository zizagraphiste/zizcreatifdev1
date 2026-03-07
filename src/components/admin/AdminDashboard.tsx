import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

type KPIs = {
  totalRevenue: number;
  activeMembers: number;
  activeProducts: number;
  pendingRegistrations: number;
};

type Registration = {
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
  const [kpis, setKpis] = useState<KPIs>({ totalRevenue: 0, activeMembers: 0, activeProducts: 0, pendingRegistrations: 0 });
  const [recentRegs, setRecentRegs] = useState<Registration[]>([]);
  const [alerts, setAlerts] = useState<CapacityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Revenue from confirmed registrations
    const { data: confirmedRegs } = await supabase
      .from("registrations")
      .select("product_id")
      .eq("status", "confirmed");

    let totalRevenue = 0;
    if (confirmedRegs && confirmedRegs.length > 0) {
      const productIds = [...new Set(confirmedRegs.map((r: any) => r.product_id))];
      const { data: prods } = await supabase.from("products").select("id, price").in("id", productIds);
      if (prods) {
        const priceMap = Object.fromEntries(prods.map((p: any) => [p.id, p.price]));
        totalRevenue = confirmedRegs.reduce((sum: number, r: any) => sum + (priceMap[r.product_id] || 0), 0);
      }
    }

    // Active members
    const { count: activeMembers } = await supabase.from("profiles").select("id", { count: "exact", head: true });

    // Active products
    const { count: activeProducts } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active");

    // Pending registrations
    const { count: pendingRegistrations } = await supabase.from("registrations").select("id", { count: "exact", head: true }).eq("status", "pending");

    setKpis({
      totalRevenue,
      activeMembers: activeMembers || 0,
      activeProducts: activeProducts || 0,
      pendingRegistrations: pendingRegistrations || 0,
    });

    // Recent registrations
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, full_name, email, status, created_at, product_id")
      .order("created_at", { ascending: false })
      .limit(10);

    if (regs && regs.length > 0) {
      const pids = [...new Set(regs.map((r: any) => r.product_id))];
      const { data: prods } = await supabase.from("products").select("id, title").in("id", pids);
      const titleMap = Object.fromEntries((prods || []).map((p: any) => [p.id, p.title]));
      setRecentRegs(regs.map((r: any) => ({ ...r, product_title: titleMap[r.product_id] || "—" })));
    }

    // Capacity alerts (>80%)
    const { data: products } = await supabase.from("products").select("id, title, spots_taken, max_spots").eq("status", "active");
    if (products) {
      setAlerts(
        products
          .filter((p: any) => p.max_spots > 0 && (p.spots_taken / p.max_spots) >= 0.8)
          .map((p: any) => ({ ...p, pct: Math.round((p.spots_taken / p.max_spots) * 100) }))
      );
    }

    setLoading(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      paid: "bg-primary/15 text-primary",
      confirmed: "bg-green-500/15 text-green-500",
      rejected: "bg-destructive/15 text-destructive",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      paid: "À vérifier",
      confirmed: "Confirmé",
      rejected: "Rejeté",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || map.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>;
  }

  const kpiCards = [
    { label: "Revenus confirmés", value: `${kpis.totalRevenue.toLocaleString("fr-FR")} FCFA` },
    { label: "Membres actifs", value: kpis.activeMembers },
    { label: "Produits actifs", value: kpis.activeProducts },
    { label: "Inscriptions en attente", value: kpis.pendingRegistrations },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-primary/30 bg-card p-5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Capacity alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
              <span className="text-foreground">
                <strong>{a.title}</strong> — {a.pct}% de capacité ({a.spots_taken}/{a.max_spots} places)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent registrations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Dernières inscriptions</h2>
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
                  <tr key={r.id} className="border-b border-border last:border-0">
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
