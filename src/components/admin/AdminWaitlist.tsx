import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell, BellRing, ChevronDown, ChevronUp, Mail, Users,
  Clock, CheckCircle2, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type WaitlistEntry = {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  notified_at: string | null;
  created_at: string;
};

type ProductWithWaitlist = {
  id: string;
  title: string;
  type: string | null;
  status: string | null;
  waitlist_mode: boolean;
  entries: WaitlistEntry[];
};

export default function AdminWaitlist() {
  const [products, setProducts] = useState<ProductWithWaitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: entries } = await supabase
      .from("waitlist_entries" as any)
      .select("id, email, full_name, user_id, notified_at, created_at, product_id")
      .order("created_at", { ascending: false }) as any;

    const { data: prods } = await supabase
      .from("products")
      .select("id, title, type, status, waitlist_mode")
      .order("created_at", { ascending: false });

    if (!entries || !prods) { setLoading(false); return; }

    // Group entries by product
    const map: Record<string, WaitlistEntry[]> = {};
    for (const e of entries) {
      if (!map[e.product_id]) map[e.product_id] = [];
      map[e.product_id].push(e);
    }

    // Only keep products that have entries OR have waitlist_mode enabled
    const result: ProductWithWaitlist[] = prods
      .filter((p: any) => p.waitlist_mode || map[p.id]?.length > 0)
      .map((p: any) => ({ ...p, entries: map[p.id] || [] }));

    setProducts(result);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleWaitlist = async (productId: string, current: boolean) => {
    await supabase
      .from("products")
      .update({ waitlist_mode: !current } as any)
      .eq("id", productId);
    toast.success(!current ? "Liste d'attente activée" : "Liste d'attente désactivée");
    load();
  };

  const notifyAll = async (product: ProductWithWaitlist) => {
    const unnotified = product.entries.filter((e) => !e.notified_at);
    if (unnotified.length === 0) {
      toast.info("Tous les inscrits ont déjà été notifiés.");
      return;
    }
    setNotifying(product.id);
    let sent = 0;
    const productUrl = `${window.location.origin}/product/${product.id}`;
    for (const entry of unnotified) {
      const { data } = await supabase.functions.invoke("send-email", {
        body: {
          to: [entry.email],
          subject: `🎉 "${product.title}" est maintenant disponible !`,
          html: `<p>Bonjour${entry.full_name ? ` ${entry.full_name}` : ""} !</p>
<p>Tu t'étais inscrit(e) sur la liste d'attente pour <strong>${product.title}</strong>.</p>
<p>Bonne nouvelle : c'est maintenant disponible !</p>
<p><a href="${productUrl}" style="background:#d4a017;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px;">Accéder au produit</a></p>
<p style="margin-top:16px;color:#999;font-size:13px;">— L'équipe ZizCreatif</p>`,
        },
      });
      if (!data?.error) {
        await supabase
          .from("waitlist_entries" as any)
          .update({ notified_at: new Date().toISOString() })
          .eq("id", entry.id);
        sent++;
      }
    }
    setNotifying(null);
    toast.success(`${sent} email${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""} !`);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    );
  }

  const totalEntries = products.reduce((s, p) => s + p.entries.length, 0);
  const totalNotified = products.reduce(
    (s, p) => s + p.entries.filter((e) => e.notified_at).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Liste d'attente</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalEntries} inscrit{totalEntries !== 1 ? "s" : ""} au total
            {totalNotified > 0 && ` · ${totalNotified} notifié${totalNotified !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center gap-4 text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <BellRing className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">Aucune liste d'attente active</p>
            <p className="text-sm text-muted-foreground mt-1">
              Active la liste d'attente sur un produit dans "Produits" pour commencer à collecter des inscriptions.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const isExpanded = expanded === product.id;
            const pending = product.entries.filter((e) => !e.notified_at).length;
            const notified = product.entries.filter((e) => e.notified_at).length;

            return (
              <div
                key={product.id}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground truncate">{product.title}</p>
                      <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-xs">
                        {product.status === "active" ? "Actif" : product.status === "draft" ? "Brouillon" : "Fermé"}
                      </Badge>
                      {product.waitlist_mode && (
                        <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
                          Waitlist ON
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {product.entries.length} inscrit{product.entries.length !== 1 ? "s" : ""}
                      </span>
                      {pending > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <Clock className="h-3.5 w-3.5" /> {pending} en attente
                        </span>
                      )}
                      {notified > 0 && (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {notified} notifié{notified !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => toggleWaitlist(product.id, product.waitlist_mode)}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      {product.waitlist_mode ? "Désactiver" : "Activer"}
                    </Button>
                    {pending > 0 && (
                      <Button
                        size="sm"
                        className="text-xs gap-1"
                        disabled={notifying === product.id}
                        onClick={() => notifyAll(product)}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {notifying === product.id ? "Envoi…" : `Notifier (${pending})`}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpanded(isExpanded ? null : product.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Entries list */}
                {isExpanded && product.entries.length > 0 && (
                  <div className="border-t border-border divide-y divide-border">
                    {product.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 px-5 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {entry.full_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {entry.notified_at ? (
                            <span className="text-xs text-green-500 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Notifié le {format(new Date(entry.notified_at), "dd MMM", { locale: fr })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Inscrit le {format(new Date(entry.created_at), "dd MMM", { locale: fr })}
                            </span>
                          )}
                        </div>
                        <a
                          href={`mailto:${entry.email}`}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && product.entries.length === 0 && (
                  <div className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
                    Aucune inscription pour l'instant.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
