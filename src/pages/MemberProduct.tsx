import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ExternalLink, BookOpen, X, Maximize2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

type Resource = {
  id: string;
  title: string;
  type: string | null;
  external_url: string | null;
  file_path: string | null;
};

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  guide: { icon: "📘", label: "Guide" },
  masterclass: { icon: "🎬", label: "Masterclass" },
  app: { icon: "⚡", label: "App" },
  book: { icon: "📚", label: "Livre" },
  formation: { icon: "🎓", label: "Formation" },
  coaching: { icon: "🤝", label: "Coaching" },
};

export default function MemberProduct() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "forbidden" | "not_yet" | "ok">("loading");
  const [availableAt, setAvailableAt] = useState<Date | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number } | null>(null);

  useEffect(() => {
    if (!user || !productId) return;
    (async () => {
      const { data: grants } = await supabase
        .from("access_grants")
        .select("available_at, products(title, thumbnail_emoji, cover_image_url, description, type)")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .limit(1);

      if (!grants || grants.length === 0) { setStatus("forbidden"); return; }

      const grant = grants[0] as any;
      setProduct(grant.products);
      const avAt = grant.available_at ? new Date(grant.available_at) : null;

      if (avAt && avAt > new Date()) { setAvailableAt(avAt); setStatus("not_yet"); return; }

      const { data: res } = await supabase
        .from("resources")
        .select("id, title, type, external_url, file_path")
        .eq("product_id", productId)
        .order("id");
      setResources(res || []);
      setStatus("ok");
    })();
  }, [user, productId]);

  // Countdown
  useEffect(() => {
    if (status !== "not_yet" || !availableAt) return;
    const update = () => {
      const diff = availableAt.getTime() - Date.now();
      if (diff <= 0) { window.location.reload(); return; }
      setCountdown({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000) });
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [status, availableAt]);

  const getSignedUrl = async (resourceId: string): Promise<string | null> => {
    const res = await supabase.functions.invoke("resource-signed-url", {
      body: { resource_id: resourceId },
    });
    if (res.error || !res.data?.url) {
      toast.error("Impossible de charger la ressource. Réessaie dans quelques instants.");
      return null;
    }
    return res.data.url as string;
  };

  const handleOpen = async (r: Resource) => {
    // External link — direct open
    if (r.type === "link" && r.external_url) {
      window.open(r.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    // File — get signed URL
    setLoadingId(r.id);
    const url = await getSignedUrl(r.id);
    setLoadingId(null);
    if (!url) return;

    // HTML5 / PDF → try iframe, with fallback button to open in new tab
    if (r.type === "html5") {
      setIframeUrl(url);
    } else {
      // Default: open in new tab (works for PDF, video, etc.)
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // ── Loading ──
  if (status === "loading") return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  // ── Forbidden ──
  if (status === "forbidden") return (
    <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-5 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Accès non autorisé</p>
        <p className="text-sm text-muted-foreground mt-1">Tu n'as pas encore accès à ce produit.</p>
      </div>
      <Link to="/member"><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Mon espace</Button></Link>
    </div>
  );

  // ── Not yet ──
  if (status === "not_yet") return (
    <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-6 px-4 text-center">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <div className="text-5xl">{product?.thumbnail_emoji || "⏳"}</div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Pas encore disponible</h2>
        <p className="text-muted-foreground mt-1">Disponible le {availableAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      {countdown && (
        <div className="flex gap-4">
          {[{ v: countdown.d, l: "jours" }, { v: countdown.h, l: "heures" }, { v: countdown.m, l: "min" }].map(({ v, l }) => (
            <div key={l} className="bg-card border border-border rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-black text-primary font-mono">{v}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}
      <Link to="/member"><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button></Link>
    </div>
  );

  // ── OK ──
  const typeInfo = TYPE_LABELS[product?.type] || { icon: "📦", label: "Produit" };

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle className="fixed top-4 right-4 z-50" />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link to="/member">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2.5 min-w-0">
          {product?.cover_image_url ? (
            <img src={product.cover_image_url} alt={product.title} loading="lazy" className="w-7 h-7 rounded-md object-cover shrink-0" />
          ) : (
            <span className="text-xl shrink-0">{product?.thumbnail_emoji || "📦"}</span>
          )}
          <h1 className="font-semibold text-foreground text-sm truncate">{product?.title}</h1>
        </div>
      </header>

      {/* Iframe viewer */}
      {iframeUrl && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
            <p className="text-sm font-medium text-foreground truncate">Lecture en ligne</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(iframeUrl, "_blank")}>
                <Maximize2 className="h-3.5 w-3.5" /> Ouvrir dans un onglet
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIframeUrl(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <iframe
            src={iframeUrl}
            className="flex-1 w-full border-0"
            title="Ressource"
            onError={() => {
              toast.error("Impossible d'afficher la ressource dans le navigateur.");
              window.open(iframeUrl, "_blank");
              setIframeUrl(null);
            }}
          />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Product header */}
        <div className="flex gap-5 items-start">
          <div className="shrink-0">
            {product?.cover_image_url ? (
              <img src={product.cover_image_url} alt={product.title} loading="lazy" className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shadow-md" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-primary/10 flex items-center justify-center text-4xl">
                {product?.thumbnail_emoji || "📦"}
              </div>
            )}
          </div>
          <div className="min-w-0 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              <span>{typeInfo.icon}</span> {typeInfo.label}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">{product?.title}</h2>
          </div>
        </div>

        {/* Description */}
        {product?.description && (
          <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description.split("\n---CONDITIONS---\n")[0]}
            </p>
          </div>
        )}

        {/* Resources */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">
            Ressources {resources.length > 0 && <span className="text-muted-foreground font-normal text-sm">({resources.length})</span>}
          </h3>

          {resources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground text-sm">Les ressources seront bientôt disponibles.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resources.map((r, i) => {
                const isLink = r.type === "link" && r.external_url;
                const isHtml5 = r.type === "html5";
                const isLoading = loadingId === r.id;

                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium text-foreground text-sm truncate">{r.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isLink ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleOpen(r)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Accéder
                        </Button>
                      ) : isHtml5 ? (
                        <>
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            disabled={isLoading}
                            onClick={() => handleOpen(r)}
                          >
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                            {isLoading ? "Chargement…" : "Lire en ligne"}
                          </Button>
                          {!isLoading && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              disabled={isLoading}
                              onClick={async () => {
                                setLoadingId(r.id);
                                const url = await getSignedUrl(r.id);
                                setLoadingId(null);
                                if (url) window.open(url, "_blank");
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={isLoading}
                          onClick={() => handleOpen(r)}
                        >
                          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          {isLoading ? "Chargement…" : "Télécharger"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
