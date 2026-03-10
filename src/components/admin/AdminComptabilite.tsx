import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, Package, TrendingUp, CheckCircle, Clock } from "lucide-react";

type Transaction = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  product_title: string;
  product_price: number;
  product_currency: string;
};

type ProductStat = {
  title: string;
  count: number;
  total: number;
  currency: string;
};

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

function shortMonth(m: string) {
  const [y, mo] = m.split("-");
  const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

export default function AdminComptabilite() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: regs } = await supabase
      .from("registrations")
      .select("id, full_name, email, status, created_at, confirmed_at, product_id, amount")
      .in("status", ["confirmed", "paid"])
      .order("created_at", { ascending: false });

    if (regs && regs.length > 0) {
      const pids = [...new Set((regs as any[]).map((r: any) => r.product_id).filter(Boolean))];
      const prodMap: Record<string, any> = {};
      if (pids.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, title, currency")
          .in("id", pids);
        (prods || []).forEach((p: any) => { prodMap[p.id] = p; });
      }
      setTransactions(
        (regs as any[]).map((r: any) => ({
          ...r,
          product_title: prodMap[r.product_id]?.title || "—",
          product_price: r.amount ?? 0,
          product_currency: prodMap[r.product_id]?.currency || "FCFA",
        }))
      );
    } else {
      setTransactions([]);
    }

    setLoading(false);
  };

  /* ── Months available in data ── */
  const months = Array.from(
    new Set(transactions.map((t) => t.created_at.slice(0, 7)))
  )
    .sort()
    .reverse();

  /* ── Current / last month keys ── */
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  /* ── All-time confirmed (for global KPIs) ── */
  const allConfirmed = transactions.filter((t) => t.status === "confirmed");
  const totalAll = allConfirmed.reduce((s, t) => s + t.product_price, 0);
  const totalThisMonth = allConfirmed
    .filter((t) => t.created_at.startsWith(thisMonthKey))
    .reduce((s, t) => s + t.product_price, 0);
  const totalLastMonth = allConfirmed
    .filter((t) => t.created_at.startsWith(lastMonthKey))
    .reduce((s, t) => s + t.product_price, 0);

  /* ── Filtered view ── */
  const filtered =
    filterMonth === "all"
      ? transactions
      : transactions.filter((t) => t.created_at.startsWith(filterMonth));
  const filteredConfirmed = filtered.filter((t) => t.status === "confirmed");
  const filteredPending = filtered.filter((t) => t.status === "paid");
  const filteredTotal = filteredConfirmed.reduce((s, t) => s + t.product_price, 0);

  /* ── Stats by product (filtered) ── */
  const byProduct: Record<string, ProductStat> = {};
  filteredConfirmed.forEach((t) => {
    if (!byProduct[t.product_title])
      byProduct[t.product_title] = {
        title: t.product_title,
        count: 0,
        total: 0,
        currency: t.product_currency,
      };
    byProduct[t.product_title].count++;
    byProduct[t.product_title].total += t.product_price;
  });
  const productStats = Object.values(byProduct).sort((a, b) => b.total - a.total);
  const maxProductTotal = productStats[0]?.total || 1;

  /* ── Export CSV ── */
  const exportCSV = () => {
    const header = "Date,Nom,Email,Produit,Montant,Devise,Statut";
    const rows = filtered.map((t) =>
      [
        new Date(t.created_at).toLocaleDateString("fr-FR"),
        `"${t.full_name}"`,
        `"${t.email}"`,
        `"${t.product_title}"`,
        t.product_price,
        t.product_currency,
        t.status === "confirmed" ? "Confirmé" : "En attente validation",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comptabilite-${filterMonth === "all" ? "tout" : filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading)
    return (
      <div className="animate-pulse text-muted-foreground py-20 text-center">
        Chargement…
      </div>
    );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comptabilité</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Suivi des revenus et des transactions
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* ── Global KPI cards (always all-time) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Revenus totaux"
          value={`${totalAll.toLocaleString("fr-FR")} FCFA`}
          sub="Toutes périodes"
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-primary"
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <KpiCard
          label="Ce mois-ci"
          value={`${totalThisMonth.toLocaleString("fr-FR")} FCFA`}
          sub={shortMonth(thisMonthKey)}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-green-500"
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <KpiCard
          label="Mois précédent"
          value={`${totalLastMonth.toLocaleString("fr-FR")} FCFA`}
          sub={shortMonth(lastMonthKey)}
          icon={<Calendar className="h-4 w-4" />}
          color="text-foreground"
          iconColor="text-muted-foreground"
          iconBg="bg-muted"
        />
      </div>

      {/* ── Filter ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-52">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Toutes périodes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonth(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {filteredConfirmed.length} confirmée{filteredConfirmed.length > 1 ? "s" : ""} —{" "}
            <span className="font-semibold text-foreground">
              {filteredTotal.toLocaleString("fr-FR")} FCFA
            </span>
          </span>
          {filteredPending.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-orange-500" />
              {filteredPending.length} en attente
            </span>
          )}
        </div>
      </div>

      {/* ── Revenue by product ── */}
      {productStats.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">Revenus par produit</h2>
          </div>
          <div className="divide-y divide-border">
            {productStats.map((p) => {
              const pct = Math.round((p.total / maxProductTotal) * 100);
              return (
                <div key={p.title} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.count} vente{p.count > 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="font-bold text-primary">
                      {p.total.toLocaleString("fr-FR")} {p.currency}
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transactions table ── */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">Transactions</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Montant</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Aucune transaction pour cette période
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border last:border-0 ${
                      t.status === "paid" ? "bg-orange-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground">{t.email}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{t.product_title}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {t.product_price > 0
                        ? `${t.product_price.toLocaleString("fr-FR")} ${t.product_currency}`
                        : "Gratuit"}
                    </td>
                    <td className="px-4 py-3">
                      {t.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/15 text-green-500">
                          <CheckCircle className="h-3 w-3" />
                          Confirmé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-500/15 text-orange-500">
                          <Clock className="h-3 w-3" />
                          À valider
                        </span>
                      )}
                    </td>
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

/* ── KPI Card ── */
function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
