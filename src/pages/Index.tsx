import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteContent } from "@/hooks/useSiteContent";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, BookOpen, Users, Zap, MapPin, Video, Calendar, Clock, UserCheck } from "lucide-react";


type Category = { id: string; name: string; sort_order: number };

type Product = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_emoji: string | null;
  cover_image_url: string | null;
  type: string | null;
  price: number;
  currency: string | null;
  max_spots: number;
  spots_taken: number | null;
  delivery_mode: string | null;
  delivery_date: string | null;
  event_time: string | null;
  attendance_mode: string | null;
  venue: string | null;
  date_mode: string | null;
  status: string | null;
  category_id: string | null;
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

function HeroSection({ get }: { get: (key: string, fb: string) => string }) {
  const coverImage = get("hero_cover_image", "");
  const coverPos = get("hero_cover_position", "50 50");
  const [x, y] = coverPos.split(" ").map(Number);

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden px-6">
      {/* Cover image */}
      {coverImage && (
        <div className="absolute inset-0">
          <img src={coverImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${x}% ${y}%` }} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
      )}

      {/* Glow effect (shown when no cover) */}
      {!coverImage && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
        </div>
      )}

      <motion.div
        className="relative z-10 max-w-5xl mx-auto w-full space-y-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        {/* Tag pill */}
        <motion.div variants={fadeUp} custom={0}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {get("hero_tag", "Guides · Masterclass · Apps en avant-première")}
          </span>
        </motion.div>

        {/* Big headline */}
        <motion.h1
          variants={fadeUp}
          custom={1}
          className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9]"
        >
          <span className="text-foreground">{get("hero_line1", "Apprends.")}</span>
          <br />
          <span className="bg-gradient-to-r from-primary to-[hsl(40,90%,60%)] bg-clip-text text-transparent">
            {get("hero_line2", "Crée.")}
          </span>
          <br />
          <span className="bg-gradient-to-r from-[hsl(40,90%,60%)] to-primary bg-clip-text text-transparent">
            {get("hero_line3", "Évolue.")}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-lg sm:text-xl text-muted-foreground font-light max-w-lg leading-relaxed"
        >
          {get("hero_subtitle", "Des ressources exclusives pour les créatifs ambitieux — guides pratiques, masterclass en direct, et accès anticipé aux apps que je construis.")}
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center gap-4 pt-2">
          <a href="#produits">
            <Button size="lg" className="bg-gradient-to-r from-primary to-[hsl(40,90%,60%)] text-primary-foreground hover:opacity-90 font-bold text-base gap-2 min-w-48 h-12 rounded-full">
              → {get("hero_cta_primary", "Voir le catalogue")}
            </Button>
          </a>
          <Link to="/login">
            <Button size="lg" variant="outline" className="min-w-48 h-12 font-semibold text-base border-border rounded-full">
              {get("hero_cta_secondary", "En savoir plus")}
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

function ValueProps({ get }: { get: (key: string, fb: string) => string }) {
  const items = [
    { icon: BookOpen, title: get("vp1_title", "Guides complets"), desc: get("vp1_desc", "Des guides PDF étape par étape pour maîtriser la création de produits digitaux.") },
    { icon: Users, title: get("vp2_title", "Masterclasses live"), desc: get("vp2_desc", "Sessions en direct avec Q&A pour aller plus loin et poser tes questions.") },
    { icon: Zap, title: get("vp3_title", "Apps & templates"), desc: get("vp3_desc", "Des outils prêts à utiliser pour lancer plus vite sans repartir de zéro.") },
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="text-center space-y-4 p-6 rounded-xl bg-card border border-border"
          >
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <item.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const navigate = useNavigate();
  const unlimited = product.max_spots === 0;
  const spotsLeft = unlimited ? Infinity : product.max_spots - (product.spots_taken || 0);
  const isClosed = product.status === "closed" || (!unlimited && spotsLeft <= 0);
  const almostFull = !isClosed && !unlimited && spotsLeft <= 3;
  const isFree = product.price === 0;

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={`group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-all cursor-pointer ${
        isClosed
          ? "border-border opacity-75"
          : "border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      }`}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative h-44 bg-muted overflow-hidden">
        {product.cover_image_url ? (
          <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {product.thumbnail_emoji || "📦"}
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {product.type && (
            <Badge variant="secondary" className="capitalize text-xs backdrop-blur-sm">
              {product.type}
            </Badge>
          )}
          {isClosed && (
            <Badge className="bg-destructive text-destructive-foreground text-xs backdrop-blur-sm">
              Liste complète
            </Badge>
          )}
          {almostFull && (
            <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30 hover:bg-orange-500/15 text-xs backdrop-blur-sm">
              🔥 {spotsLeft} place{spotsLeft > 1 ? "s" : ""} restante{spotsLeft > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-foreground mb-2">{product.title}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">{product.description}</p>
        )}

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <span className="text-2xl font-black text-primary">
            {isFree ? "Gratuit" : `${product.price.toLocaleString("fr-FR")} ${product.currency || "FCFA"}`}
          </span>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-1"
            onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
          >
            Voir le contenu <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function FormationCard({ product, index }: { product: Product; index: number }) {
  const navigate = useNavigate();
  const unlimited = product.max_spots === 0;
  const spotsLeft = unlimited ? Infinity : product.max_spots - (product.spots_taken || 0);
  const isClosed = product.status === "closed" || (!unlimited && spotsLeft <= 0);
  const spotsPercent = unlimited ? 0 : Math.min(100, ((product.spots_taken || 0) / product.max_spots) * 100);
  const isOnline = product.attendance_mode !== "in-person";

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={`group relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all cursor-pointer ${
        isClosed ? "border-border opacity-80" : "border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
      }`}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Cover image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {product.cover_image_url ? (
          <img src={product.cover_image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-primary/10 to-primary/5">
            {product.thumbnail_emoji || "🎓"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges top-right */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <Badge className="bg-primary text-primary-foreground text-xs font-semibold">Formation</Badge>
          {isClosed && <Badge className="bg-destructive text-destructive-foreground text-xs">Complet</Badge>}
        </div>

        {/* Mode badge bottom-left */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="gap-1 text-xs backdrop-blur-sm bg-background/80">
            {isOnline ? <><Video className="h-3 w-3" /> En ligne</> : <><MapPin className="h-3 w-3" /> Présentiel</>}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1">{product.title}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {product.delivery_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {formatDate(product.delivery_date)}
            </span>
          )}
          {product.event_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {product.event_time}
            </span>
          )}
          {!isOnline && product.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {product.venue}
            </span>
          )}
        </div>

        {/* Places */}
        {!unlimited && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <UserCheck className="h-3.5 w-3.5" />
                {isClosed ? "Formation complète" : `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}`}
              </span>
              <span className="text-muted-foreground">{product.spots_taken || 0}/{product.max_spots}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  spotsPercent >= 80 ? "bg-destructive" : spotsPercent >= 50 ? "bg-orange-500" : "bg-primary"
                }`}
                style={{ width: `${spotsPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <span className="text-2xl font-black text-primary">
            {product.price === 0 ? "Gratuit" : `${product.price.toLocaleString("fr-FR")} ${product.currency || "FCFA"}`}
          </span>
          <Button
            size="sm"
            className={isClosed ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-1"}
            onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
          >
            {isClosed ? "Liste d'attente" : "S'inscrire"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ProductsSection({ get }: { get: (key: string, fb: string) => string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, title, description, thumbnail_emoji, cover_image_url, type, price, currency, max_spots, spots_taken, delivery_mode, status, category_id")
          .in("status", ["active", "closed"])
          .neq("type", "formation")
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("sort_order"),
      ]);
      setProducts((prodRes.data || []).filter(p => p.type !== "formation"));
      setCategories((catRes.data as Category[]) || []);
      setLoading(false);
    })();
  }, []);

  const [activeType, setActiveType] = useState<string | null>(null);

  const types = Array.from(new Set(products.map((p) => p.type).filter(Boolean))) as string[];

  const filtered = products.filter((p) => {
    if (activeFilter && p.category_id !== activeFilter) return false;
    if (activeType && p.type !== activeType) return false;
    return true;
  });

  return (
    <section id="produits" className="py-20 px-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-primary text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" /> Catalogue
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black text-foreground"
          >
            {get("catalogue_title", "Produits disponibles")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-lg mx-auto"
          >
            {get("catalogue_subtitle", "Des ressources concrètes pour passer à l'action et créer tes premiers revenus en ligne.")}
          </motion.p>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap justify-center gap-2"
          >
            <button
              onClick={() => setActiveFilter(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                activeFilter === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              Tous
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveFilter(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  activeFilter === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </motion.div>
        )}

        {/* Type Filters */}
        {types.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2"
          >
            <button
              onClick={() => setActiveType(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                activeType === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              Tous les types
            </button>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors capitalize ${
                  activeType === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </motion.div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Aucun produit disponible pour le moment.</p>
            <p className="text-sm text-muted-foreground mt-2">Reviens bientôt !</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FormationsSection() {
  const [formations, setFormations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, description, thumbnail_emoji, cover_image_url, type, price, currency, max_spots, spots_taken, delivery_mode, delivery_date, event_time, attendance_mode, venue, date_mode, status, category_id")
        .eq("type", "formation")
        .in("status", ["active", "closed"])
        .order("created_at", { ascending: false });
      setFormations(data || []);
      setLoading(false);
    })();
  }, []);

  if (!loading && formations.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-primary text-sm font-semibold"
          >
            <Users className="h-4 w-4" /> Formations
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black text-foreground"
          >
            Formations à venir
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-lg mx-auto"
          >
            Rejoins la liste d'attente ou inscris-toi à une date précise. La formation démarre dès que le groupe est complet.
          </motion.p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {formations.map((p, i) => (
              <FormationCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CTASection({ get }: { get: (key: string, fb: string) => string }) {
  return (
    <section className="py-20 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto text-center rounded-2xl border border-primary/20 bg-primary/5 p-10 sm:p-16 space-y-6"
      >
        <h2 className="text-3xl sm:text-4xl font-black text-foreground">
          {get("cta_title", "Prêt à lancer ton activité ?")}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {get("cta_subtitle", "Rejoins la communauté Zizcreatif et accède à des ressources exclusives pour créer, vendre et scaler.")}
        </p>
        <Link to="/login">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base gap-2 h-12 min-w-48 mt-2">
            {get("cta_button", "Créer mon compte")} <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}

function Footer({ get }: { get: (key: string, fb: string) => string }) {
  return (
    <footer className="border-t border-border py-8 px-6 text-center">
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()}{" "}
        <span className="font-semibold text-foreground">
          Zizcreatif<span className="text-primary">.dev</span>
        </span>{" "}
        — {get("footer_text", "Tous droits réservés.")}
      </p>
    </footer>
  );
}

export default function Index() {
  const { session, userRole } = useAuth();
  const { get, loading: contentLoading } = useSiteContent();
  const dashboardPath = userRole === "admin" ? "/admin" : "/member";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">
            Ziz<span className="text-primary">creatif</span>
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <Link to={dashboardPath}>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  Mon espace
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  Connexion
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="pt-14">
        <HeroSection get={get} />
        <ValueProps get={get} />
        <ProductsSection get={get} />
        <FormationsSection />
        <CTASection get={get} />
      </main>

      <Footer get={get} />
    </div>
  );
}
