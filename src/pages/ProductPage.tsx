import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Lock, Unlock, ExternalLink, Download,
  BookOpen, ClipboardCheck, MapPin, Video, Calendar, Clock,
  UserCheck, Users, ImageOff, Share2, Copy, Check,
  Utensils, TreePine, Rocket, Wine, Shirt, Moon,
} from "lucide-react";
import { GuestCheckoutDialog } from "@/components/GuestCheckoutDialog";
import { CoachingBookingWidget, type CoachingPreselected } from "@/components/CoachingBookingWidget";
import { DRESS_CODES } from "@/constants/activities";

type Product = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_emoji: string | null;
  cover_image_url: string | null;
  price: number;
  currency: string | null;
  max_spots: number;
  spots_taken: number | null;
  status: string | null;
  type: string | null;
  attendance_mode: string | null;
  venue: string | null;
  online_link: string | null;
  event_time: string | null;
  delivery_date: string | null;
  end_date: string | null;
  date_mode: string | null;
  delivery_mode: string | null;
  extra_config: Record<string, any> | null;
};

type Module = {
  id: string;
  title: string;
  type: string | null;
  is_free: boolean;
  sort_order: number;
  external_url: string | null;
  file_path: string | null;
};

const typeLabels: Record<string, string> = {
  guide: "Guide",
  masterclass: "Masterclass",
  app: "App",
  book: "Livre",
  formation: "Formation",
};

const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function ProductPage() {
  const { productId, slug } = useParams<{ productId?: string; slug?: string }>();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preselected, setPreselected] = useState<CoachingPreselected | null>(null);

  const handleCheckoutOpenChange = (open: boolean) => {
    setCheckoutOpen(open);
    if (!open) setPreselected(null);
  };

  const identifier = productId || slug || "";

  useEffect(() => {
    if (!identifier) return;
    (async () => {
      const query = supabase
        .from("products")
        .select("id, title, description, thumbnail_emoji, cover_image_url, price, currency, max_spots, spots_taken, status, type, attendance_mode, venue, online_link, event_time, delivery_date, end_date, date_mode, delivery_mode, extra_config");

      const { data: p } = await (isUUID(identifier)
        ? query.eq("id", identifier).single()
        : query.eq("slug", identifier).single());
      setProduct(p as Product | null);

      // SEO dynamique
      if (p) {
        document.title = `${(p as any).title} — Zizcreatif.dev`;
        const setMeta = (sel: string, val: string) => { const el = document.querySelector(sel); if (el) el.setAttribute("content", val); };
        setMeta('meta[name="description"]', (p as any).description?.split("\n---CONDITIONS---\n")[0]?.slice(0, 160) || "");
        setMeta('meta[property="og:title"]', `${(p as any).title} — Zizcreatif.dev`);
        setMeta('meta[property="og:description"]', (p as any).description?.split("\n---CONDITIONS---\n")[0]?.slice(0, 160) || "");
        setMeta('meta[property="og:image"]', (p as any).cover_image_url || "");
        setMeta('meta[property="og:url"]', window.location.href);
        setMeta('meta[name="twitter:title"]', `${(p as any).title} — Zizcreatif.dev`);
        setMeta('meta[name="twitter:description"]', (p as any).description?.split("\n---CONDITIONS---\n")[0]?.slice(0, 160) || "");
        setMeta('meta[name="twitter:image"]', (p as any).cover_image_url || "");
      }

      const { data: res } = await supabase
        .from("resources")
        .select("id, title, type, is_free, sort_order, external_url, file_path")
        .eq("product_id", (p as any)?.id)
        .order("sort_order", { ascending: true });
      setModules((res as Module[]) || []);
      setLoading(false);
    })();
  }, [identifier]);

  const handleOpenFreeResource = async (m: Module) => {
    if (m.type === "link" && m.external_url) {
      window.open(m.external_url, "_blank");
      return;
    }
    if (!m.file_path) return;
    const { data, error } = await supabase.functions.invoke("free-resource-url", {
      body: { resource_id: m.id },
    });
    if (error || !data?.url) return;
    if (m.type === "html5") {
      try {
        const res = await fetch(data.url);
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        window.open(URL.createObjectURL(blob), "_blank");
      } catch { /* ignore */ }
    } else {
      window.open(data.url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="text-destructive font-semibold">Produit introuvable</p>
        <Link to="/"><Button variant="outline">Retour</Button></Link>
      </div>
    );
  }

  const unlimited = product.max_spots === 0;
  const spotsLeft = unlimited ? Infinity : product.max_spots - (product.spots_taken || 0);
  const isClosed = product.status === "closed" || (!unlimited && spotsLeft <= 0);
  const isFree = product.price === 0;
  const freeModules = modules.filter(m => m.is_free);
  const paidModulesCount = modules.length - freeModules.length;
  const spotsPercent = unlimited ? 0 : Math.min(100, ((product.spots_taken || 0) / product.max_spots) * 100);
  const isFormation = product.type === "formation";
  const isMasterclass = product.type === "masterclass";
  const isDiner = product.type === "diner";
  const isWeekend = product.type === "weekend";
  const isLiveEvent = isFormation || isMasterclass; // events with venue/online/spots
  const isDigitalProduct = ["guide", "book", "app"].includes(product.type || "");
  const isOnline = product.attendance_mode !== "in-person";

  const getNightCount = (start: string, end: string) => {
    if (!start || !end) return null;
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    return diff > 0 ? Math.round(diff) : null;
  };
  const weekendNights = isWeekend
    ? getNightCount(product.delivery_date || "", product.end_date || "")
    : null;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle className="fixed top-4 right-4 z-50" />

      {/* Hero image */}
      <div className="relative w-full h-64 sm:h-80 lg:h-96 bg-muted overflow-hidden">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 via-background to-primary/5">
            <span className="text-8xl">{product.thumbnail_emoji || "📦"}</span>
            <div className="flex items-center gap-1.5 text-muted-foreground/50 text-sm">
              <ImageOff className="h-4 w-4" />
              <span>Image à venir</span>
            </div>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Link to="/">
            <Button variant="secondary" size="sm" className="gap-2 backdrop-blur-sm bg-background/80 hover:bg-background">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          </Link>
        </div>

        {/* Type badge */}
        {product.type && (
          <div className="absolute top-4 right-14">
            <Badge className="bg-primary text-primary-foreground capitalize font-semibold">
              {typeLabels[product.type] || product.type}
            </Badge>
          </div>
        )}
      </div>

      <main className="max-w-3xl mx-auto px-6 -mt-8 pb-16 space-y-6 relative z-10">

        {/* Title + status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight flex-1">
              {product.title}
            </h1>
            {isClosed && (
              <Badge className="bg-destructive text-destructive-foreground mt-1">Complet</Badge>
            )}
          </div>
        </motion.div>

        {/* Key info strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {/* Prix — coaching : pas de carte prix (le widget gère tout), sinon prix fixe */}
          {product.type !== "coaching" && (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Prix</p>
              <p className="text-xl font-black text-primary">
                {isFree ? "Gratuit" : `${product.price.toLocaleString("fr-FR")}`}
              </p>
              {!isFree && <p className="text-xs text-muted-foreground">{product.currency || "FCFA"}</p>}
            </div>
          )}

          {/* Places */}
          {!unlimited && (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Places</p>
              <p className="text-xl font-black text-foreground">
                {isClosed ? "0" : spotsLeft}
              </p>
              <p className="text-xs text-muted-foreground">sur {product.max_spots}</p>
            </div>
          )}

          {/* Mode (formation) */}
          {isFormation && (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Format</p>
              <div className="flex items-center justify-center gap-1 text-foreground font-bold text-sm">
                {isOnline ? <><Video className="h-4 w-4 text-primary" /> En ligne</> : <><MapPin className="h-4 w-4 text-primary" /> Présentiel</>}
              </div>
            </div>
          )}

          {/* Date */}
          {product.delivery_date && (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="text-sm font-bold text-foreground leading-tight">
                {formatDate(product.delivery_date)}
              </p>
              {product.event_time && (
                <p className="text-xs text-muted-foreground mt-0.5">{product.event_time}</p>
              )}
            </div>
          )}

          {/* Modules count (non-formation) */}
          {!isFormation && modules.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Modules</p>
              <p className="text-xl font-black text-foreground">{modules.length}</p>
              <p className="text-xs text-muted-foreground">contenus</p>
            </div>
          )}
        </motion.div>

        {/* ── Formation / Masterclass details ── */}
        {isLiveEvent && (product.venue || isOnline || product.event_time) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Informations pratiques
            </h3>
            <div className="grid gap-2 text-sm text-muted-foreground">
              {isOnline && (
                <div className="flex items-center gap-2"><Video className="h-4 w-4 text-primary shrink-0" /><span>Session en ligne</span></div>
              )}
              {!isOnline && product.venue && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary shrink-0" /><span>{product.venue}</span></div>
              )}
              {product.event_time && (
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary shrink-0" /><span>{product.event_time}</span></div>
              )}
              {!unlimited && (
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary shrink-0" /><span>Groupe limité à {product.max_spots} participants</span></div>
              )}
            </div>
            {!unlimited && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    {isClosed ? "Complet — liste d'attente disponible" : `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}`}
                  </span>
                  <span>{product.spots_taken || 0}/{product.max_spots}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${spotsPercent >= 80 ? "bg-destructive" : spotsPercent >= 50 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${spotsPercent}%` }} />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Dîner avec le mentor ── */}
        {isDiner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3"
          >
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-500" /> Détails du dîner
            </h3>
            <div className="grid gap-2 text-sm text-muted-foreground">
              {product.venue && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-500 shrink-0" /><span className="font-medium text-foreground">{product.venue}</span></div>
              )}
              {product.extra_config?.address && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span>{product.extra_config.address}</span></div>
              )}
              {product.event_time && (
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500 shrink-0" /><span>{product.event_time}</span></div>
              )}
              {product.extra_config?.dress_code && product.extra_config.dress_code !== "none" && (
                <div className="flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{DRESS_CODES.find(d => d.value === product.extra_config?.dress_code)?.label || product.extra_config.dress_code}</span>
                </div>
              )}
              {product.extra_config?.drinks_included && (
                <div className="flex items-center gap-2"><Wine className="h-4 w-4 text-amber-500 shrink-0" /><span>Boissons incluses</span></div>
              )}
              {!unlimited && (
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-500 shrink-0" /><span>{spotsLeft === Infinity ? "Places disponibles" : `${spotsLeft} place${(spotsLeft as number) > 1 ? "s" : ""} restante${(spotsLeft as number) > 1 ? "s" : ""}`}</span></div>
              )}
            </div>
            {product.extra_config?.menu && (
              <div className="pt-2 border-t border-amber-500/20">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">Menu</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{product.extra_config.menu}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Week-end Détox ── */}
        {isWeekend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 space-y-4"
          >
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <TreePine className="h-4 w-4 text-green-500" /> Détails du séjour
            </h3>
            <div className="grid gap-2 text-sm text-muted-foreground">
              {product.venue && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-500 shrink-0" /><span className="font-medium text-foreground">{product.venue}</span></div>
              )}
              {product.extra_config?.address && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span>{product.extra_config.address}</span></div>
              )}
              {product.delivery_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500 shrink-0" />
                  <span>
                    {formatDate(product.delivery_date)}
                    {product.end_date && ` → ${formatDate(product.end_date)}`}
                    {weekendNights && ` · ${weekendNights} nuit${weekendNights > 1 ? "s" : ""}`}
                  </span>
                </div>
              )}
              {product.event_time && (
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-green-500 shrink-0" /><span>Arrivée à {product.event_time}</span></div>
              )}
              {product.extra_config?.departure_time && (
                <div className="flex items-center gap-2"><Moon className="h-4 w-4 text-green-500 shrink-0" /><span>Départ à {product.extra_config.departure_time}</span></div>
              )}
              {!unlimited && (
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-green-500 shrink-0" /><span>{spotsLeft === Infinity ? "" : `${spotsLeft} place${(spotsLeft as number) > 1 ? "s" : ""} restante${(spotsLeft as number) > 1 ? "s" : ""}`}</span></div>
              )}
            </div>
            {/* Inclus */}
            {(product.extra_config?.accommodation_included || product.extra_config?.meals_included || product.extra_config?.transport_included) && (
              <div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">Inclus dans le prix</p>
                <div className="flex flex-wrap gap-2">
                  {product.extra_config?.accommodation_included && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                      <TreePine className="h-3 w-3" /> Hébergement
                    </span>
                  )}
                  {product.extra_config?.meals_included && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                      <Utensils className="h-3 w-3" /> Repas
                    </span>
                  )}
                  {product.extra_config?.transport_included && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                      <Rocket className="h-3 w-3" /> Transport
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Programme */}
            {product.extra_config?.programme && (
              <div className="pt-2 border-t border-green-500/20">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">Programme</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{product.extra_config.programme}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Description */}
        {product.description && (() => {
          const parts = product.description.split("\n---CONDITIONS---\n");
          const desc = parts[0];
          const conditions = parts[1];
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{desc}</p>
              {conditions && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <ClipboardCheck className="h-5 w-5" />
                    Conditions d'acceptation
                  </div>
                  <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{conditions}</p>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* CTA / Booking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {product.type === "coaching" && product.extra_config?.durations ? (
            /* ── Coaching: interactive booking widget ── */
            <CoachingBookingWidget
              extraConfig={product.extra_config}
              currency={product.currency}
              isClosed={isClosed}
              onBook={(sel) => { setPreselected(sel); setCheckoutOpen(true); }}
            />
          ) : (
            /* ── Other products: standard CTA card ── */
            (() => {
              const ctaLabel = isDigitalProduct
                ? "Obtenir l'accès"
                : isDiner
                ? "Réserver ma place"
                : isWeekend
                ? "Réserver mon séjour"
                : isMasterclass
                ? "Réserver ma place"
                : isFormation
                ? "S'inscrire"
                : "Obtenir l'accès";
              const ctaSubtitle = isClosed
                ? "Complet"
                : isDigitalProduct
                ? "Accède au contenu"
                : "Réserve ta place";
              return (
                <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{ctaSubtitle}</p>
                    <span className="text-3xl font-black text-primary">
                      {isFree ? "Gratuit" : `${product.price.toLocaleString("fr-FR")} ${product.currency || "FCFA"}`}
                    </span>
                  </div>
                  {isFree ? (
                    <Badge variant="secondary" className="text-sm px-4 py-2">Accès gratuit</Badge>
                  ) : isClosed ? (
                    <Button size="lg" variant="outline" className="font-bold gap-2" onClick={() => setCheckoutOpen(true)}>
                      Liste d'attente <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
                      onClick={() => setCheckoutOpen(true)}
                    >
                      {ctaLabel} <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })()
          )}
        </motion.div>

        {/* Share buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Partager ce produit
          </p>
          <div className="flex flex-wrap gap-2">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${product.title} — ${window.location.href}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-green-500/10 hover:border-green-500/40 text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            {/* X / Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(product.title)}&url=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-foreground/5 text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.834L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X / Twitter
            </a>
            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-blue-500/10 hover:border-blue-500/40 text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
            {/* LinkedIn */}
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-blue-700/10 hover:border-blue-700/40 text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            {/* Copy link */}
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier le lien"}
            </button>
          </div>
        </motion.div>

        {/* Modules list (non-formation) */}
        {modules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-foreground">
              Contenu ({modules.length} module{modules.length > 1 ? "s" : ""})
            </h2>

            <div className="grid gap-3">
              {modules.map((m, i) => (
                <Card key={m.id} className={`transition-all ${!m.is_free ? "opacity-60" : ""}`}>
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-6 text-center">{i + 1}</span>
                      {m.is_free ? (
                        <Unlock className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground">{m.title}</span>
                      {m.is_free && (
                        <Badge variant="secondary" className="text-xs">Gratuit</Badge>
                      )}
                    </div>
                    {m.is_free ? (
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => handleOpenFreeResource(m)}>
                        {m.type === "link" ? (
                          <>Accéder <ExternalLink className="h-3.5 w-3.5" /></>
                        ) : m.type === "html5" ? (
                          <>Lire <BookOpen className="h-3.5 w-3.5" /></>
                        ) : (
                          <>Télécharger <Download className="h-3.5 w-3.5" /></>
                        )}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled className="gap-2 text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" /> Verrouillé
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {paidModulesCount > 0 && !isFree && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
                <p className="text-foreground font-semibold">
                  🔒 {paidModulesCount} module{paidModulesCount > 1 ? "s" : ""} payant{paidModulesCount > 1 ? "s" : ""} à débloquer
                </p>
                <p className="text-sm text-muted-foreground">
                  Achète le contenu complet pour accéder à tous les modules.
                </p>
                {!isClosed && (
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    Débloquer tout <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {product && (
        <GuestCheckoutDialog
          open={checkoutOpen}
          onOpenChange={handleCheckoutOpenChange}
          product={{
            id: product.id,
            title: product.title,
            price: product.price,
            currency: product.currency,
            type: product.type,
          }}
          preselected={preselected ?? undefined}
        />
      )}
    </div>
  );
}
