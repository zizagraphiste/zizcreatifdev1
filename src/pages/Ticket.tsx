import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Printer, CheckCircle, Sparkles } from "lucide-react";

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

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

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

  if (loading) return (
    <div style={{ background: "#F2EBD9" }} className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="text-sm"
        style={{ color: "#8B7355", fontFamily: "Georgia, serif" }}
      >
        Chargement du ticket…
      </motion.div>
    </div>
  );

  if (error || !ticket) return (
    <div style={{ background: "#F2EBD9" }} className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p style={{ color: "#8B7355" }} className="text-sm">Ticket introuvable.</p>
      <Link to="/member" className="text-sm underline" style={{ color: "#8B7355" }}>← Retour à mon espace</Link>
    </div>
  );

  const eventDate = ticket.session_date || ticket.product_delivery_date;
  const ref = ticket.id.slice(0, 8).toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600&display=swap');

        @media print {
          .no-print { display: none !important; }
          body { background: #F2EBD9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }

        .ticket-grain::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
        }
      `}</style>

      {/* Page */}
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#F2EBD9", fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Nav bar */}
        <div className="no-print flex items-center justify-between px-6 py-4">
          <Link
            to="/member"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "#8B7355" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Mon espace
          </Link>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#1a1a1a", color: "#F2EBD9" }}
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer
          </button>
        </div>

        {/* Hero text */}
        <div className="flex flex-col items-center px-6 pt-8 pb-10 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-sm font-medium mb-3 flex items-center gap-1.5"
            style={{ color: "#C9A227" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Accès confirmé
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a1a1a" }}
          >
            Ton accès t'attend.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
            className="text-base max-w-sm"
            style={{ color: "#7A6A52" }}
          >
            Tu viens d'obtenir l'accès à{" "}
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>{ticket.product_title}</span>.
          </motion.p>
        </div>

        {/* Ticket card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full px-4 pb-16"
          style={{ maxWidth: 560 }}
        >
          <div
            className="ticket-grain relative rounded-2xl overflow-visible"
            style={{
              background: "#FFFDF7",
              boxShadow: "0 8px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {/* ── Left accent band ── */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl"
              style={{ background: "linear-gradient(180deg, #C9A227 0%, #E8B84B 100%)" }}
            />

            {/* ── Header ── */}
            <div className="pl-8 pr-8 pt-7 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* Brand */}
                  <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#C9A227" }}>
                    Ziz<span style={{ color: "#B8966A" }}>creatif</span>.dev
                  </p>
                  <h2
                    className="text-xl font-bold leading-snug"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a1a1a" }}
                  >
                    {ticket.product_title}
                  </h2>
                  {ticket.product_type && (
                    <span
                      className="inline-block mt-1.5 text-xs font-medium capitalize rounded-full px-2.5 py-0.5"
                      style={{ background: "#F5EFE0", color: "#8B7355" }}
                    >
                      {ticket.product_type}
                    </span>
                  )}
                </div>
                {/* Status badge */}
                <div
                  className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "#EDFAF3", color: "#1a8a4a" }}
                >
                  <CheckCircle className="h-3 w-3" />
                  Confirmé
                </div>
              </div>
            </div>

            {/* ── Perforation ── */}
            <div className="relative flex items-center mx-0 my-1">
              {/* Left notch */}
              <div
                className="absolute -left-4 h-8 w-8 rounded-full"
                style={{ background: "#F2EBD9" }}
              />
              {/* Dashed line */}
              <div
                className="flex-1 mx-4 border-0"
                style={{ borderTop: "2px dashed #E5DDD0", margin: "0 20px" }}
              />
              {/* Right notch */}
              <div
                className="absolute -right-4 h-8 w-8 rounded-full"
                style={{ background: "#F2EBD9" }}
              />
            </div>

            {/* ── Details ── */}
            <div className="pl-8 pr-8 pt-5 pb-6 space-y-3.5">
              <DetailRow label="Bénéficiaire" value={ticket.full_name} />
              <DetailRow label="Email" value={ticket.email} />
              {ticket.phone && <DetailRow label="Téléphone" value={ticket.phone} />}

              <div
                className="my-1 border-0"
                style={{ borderTop: "1px solid #EDE5D8" }}
              />

              <DetailRow
                label="Montant"
                value={ticket.amount > 0 ? `${ticket.amount.toLocaleString("fr-FR")} ${ticket.product_currency}` : "Gratuit"}
                highlight
              />
              {eventDate && <DetailRow label="Date" value={fmt(eventDate)} />}
              {ticket.session_time && <DetailRow label="Heure" value={ticket.session_time} />}
              <DetailRow label="Inscription" value={fmt(ticket.created_at)} />
              {ticket.confirmed_at && <DetailRow label="Confirmé le" value={fmt(ticket.confirmed_at)} />}
            </div>

            {/* ── Footer bar ── */}
            <div
              className="pl-8 pr-8 py-4 flex items-center justify-between rounded-b-2xl"
              style={{ background: "#FAF5E9", borderTop: "1px solid #EDE5D8" }}
            >
              {/* Barcode visual */}
              <div className="flex gap-px items-end h-7">
                {[3,5,2,6,4,7,3,5,2,4,6,3,5,2,7,4,6,3,5,2].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: i % 3 === 0 ? 2 : 1,
                      height: `${(h / 7) * 100}%`,
                      background: "#C9A227",
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-semibold" style={{ color: "#1a1a1a" }}>{ref}</p>
                <p className="text-[10px]" style={{ color: "#B8966A" }}>zizcreatif.dev</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs shrink-0" style={{ color: "#A89070" }}>{label}</span>
      <span
        className={`text-right ${highlight ? "text-base font-bold" : "text-sm font-medium"}`}
        style={{ color: highlight ? "#1a1a1a" : "#3D3020" }}
      >
        {value}
      </span>
    </div>
  );
}
