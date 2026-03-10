import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, CheckCircle } from "lucide-react";

type TicketData = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  amount: number;
  product_title: string;
  product_type: string | null;
  product_currency: string;
  product_delivery_date: string | null;
  session_date: string | null;
  session_time: string | null;
};

export default function Ticket() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!registrationId) return;
    (async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, full_name, email, phone, status, created_at, confirmed_at, amount, product_id, session_date, session_time")
        .eq("id", registrationId)
        .single();

      if (error || !data) { setError("Ticket introuvable."); setLoading(false); return; }

      const { data: prod } = await supabase
        .from("products")
        .select("title, type, currency, delivery_date")
        .eq("id", (data as any).product_id)
        .single();

      setTicket({
        id: (data as any).id,
        full_name: (data as any).full_name,
        email: (data as any).email,
        phone: (data as any).phone,
        status: (data as any).status,
        created_at: (data as any).created_at,
        confirmed_at: (data as any).confirmed_at,
        amount: (data as any).amount || 0,
        product_title: (prod as any)?.title || "—",
        product_type: (prod as any)?.type || null,
        product_currency: (prod as any)?.currency || "FCFA",
        product_delivery_date: (prod as any)?.delivery_date || null,
        session_date: (data as any).session_date,
        session_time: (data as any).session_time,
      });
      setLoading(false);
    })();
  }, [registrationId]);

  const print = () => window.print();

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground animate-pulse">Chargement…</div>;
  if (error || !ticket) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-muted-foreground">{error || "Erreur"}</p>
      <Link to="/member"><Button variant="outline">Retour</Button></Link>
    </div>
  );

  const isConfirmed = ticket.status === "confirmed";

  return (
    <>
      {/* Print styles injected in-component */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .ticket-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      {/* Top bar — hidden on print */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-border bg-background">
        <Link to="/member" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Mon espace
        </Link>
        <Button onClick={print} className="gap-2">
          <Download className="h-4 w-4" /> Télécharger / Imprimer
        </Button>
      </div>

      {/* Ticket */}
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6 py-12">
        <div className="ticket-card w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden" style={{ fontFamily: "system-ui, sans-serif" }}>
          {/* Header band */}
          <div className="bg-[hsl(32,95%,44%)] px-8 py-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-black tracking-tight">Ziz<span className="opacity-70">creatif</span></span>
              {isConfirmed && (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 rounded-full px-3 py-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Confirmé
                </span>
              )}
            </div>
            <p className="text-lg font-bold leading-snug">{ticket.product_title}</p>
            {ticket.product_type && (
              <p className="text-sm opacity-80 capitalize mt-0.5">{ticket.product_type}</p>
            )}
          </div>

          {/* Perforated line */}
          <div className="flex items-center px-4 py-0">
            <div className="h-6 w-6 rounded-full bg-muted/30 -ml-7 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-muted mx-2" />
            <div className="h-6 w-6 rounded-full bg-muted/30 -mr-7 shrink-0" />
          </div>

          {/* Details */}
          <div className="px-8 py-6 space-y-4 text-sm">
            <Row label="Nom" value={ticket.full_name} />
            <Row label="Email" value={ticket.email} />
            {ticket.phone && <Row label="Téléphone" value={ticket.phone} />}
            <div className="border-t border-dashed border-gray-200 pt-4 mt-4 space-y-4">
              <Row label="Montant payé" value={ticket.amount > 0 ? `${ticket.amount.toLocaleString("fr-FR")} ${ticket.product_currency}` : "Gratuit"} bold />
              {(ticket.session_date || ticket.product_delivery_date) && (
                <Row label="Date" value={fmt(ticket.session_date || ticket.product_delivery_date)} />
              )}
              {ticket.session_time && <Row label="Heure" value={ticket.session_time} />}
              <Row label="Inscription" value={fmt(ticket.created_at)} />
              {ticket.confirmed_at && <Row label="Confirmé le" value={fmt(ticket.confirmed_at)} />}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">Réf. {ticket.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-gray-400">zizcreatif.dev</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`text-right text-gray-800 ${bold ? "font-bold text-base" : ""}`}>{value}</span>
    </div>
  );
}
