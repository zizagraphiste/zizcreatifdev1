import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, ExternalLink, BookOpen } from "lucide-react";

type Resource = {
  id: string;
  title: string;
  type: string | null;
  external_url: string | null;
  file_path: string | null;
};

export default function MemberProduct() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "forbidden" | "not_yet" | "ok">("loading");
  const [availableAt, setAvailableAt] = useState<Date | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number } | null>(null);

  useEffect(() => {
    if (!user || !productId) return;
    (async () => {
      // Check access grant
      const { data: grants } = await supabase
        .from("access_grants")
        .select("available_at, products(title, thumbnail_emoji, cover_image_url, description, type)")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .limit(1);

      if (!grants || grants.length === 0) {
        setStatus("forbidden");
        return;
      }

      const grant = grants[0] as any;
      setProduct(grant.products);
      const avAt = grant.available_at ? new Date(grant.available_at) : null;

      if (avAt && avAt > new Date()) {
        setAvailableAt(avAt);
        setStatus("not_yet");
        return;
      }

      // Fetch resources
      const { data: res } = await supabase
        .from("resources")
        .select("id, title, type, external_url, file_path")
        .eq("product_id", productId);
      setResources(res || []);
      setStatus("ok");
    })();
  }, [user, productId]);

  // Countdown for not_yet
  useEffect(() => {
    if (status !== "not_yet" || !availableAt) return;
    const update = () => {
      const diff = availableAt.getTime() - Date.now();
      if (diff <= 0) { window.location.reload(); return; }
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [status, availableAt]);

  const getSignedUrl = async (resourceId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("resource-signed-url", {
      body: { resource_id: resourceId },
    });
    if (res.error) {
      console.error(res.error);
      return null;
    }
    return res.data?.url as string;
  };

  const handleDownload = async (resourceId: string) => {
    const url = await getSignedUrl(resourceId);
    if (url) window.open(url, "_blank");
  };

  const handleIframe = async (resourceId: string) => {
    const url = await getSignedUrl(resourceId);
    if (url) setIframeUrl(url);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="text-destructive font-semibold">Accès non autorisé</p>
        <Link to="/member"><Button variant="outline">Retour</Button></Link>
      </div>
    );
  }

  if (status === "not_yet") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-6">
        <ThemeToggle className="fixed top-4 right-4 z-50" />
        <h2 className="text-xl font-bold text-foreground">Pas encore disponible</h2>
        <p className="text-muted-foreground">
          Disponible le {availableAt?.toLocaleDateString("fr-FR")}
        </p>
        {countdown && (
          <div className="flex gap-4 text-2xl font-mono text-primary">
            <span>{countdown.d}j</span>
            <span>{countdown.h}h</span>
            <span>{countdown.m}min</span>
          </div>
        )}
        <Link to="/member"><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link to="/member">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </Link>
        {product?.cover_image_url ? (
          <img src={product.cover_image_url} alt={product.title} loading="lazy" className="w-8 h-8 rounded object-cover" />
        ) : (
          <span className="text-2xl">{product?.thumbnail_emoji || "📦"}</span>
        )}
        <h1 className="text-lg font-bold text-foreground">{product?.title}</h1>
      </header>

      {iframeUrl && (
        <div className="border-b border-border">
          <div className="flex justify-end px-4 py-2">
            <Button variant="ghost" size="sm" onClick={() => setIframeUrl(null)}>Fermer</Button>
          </div>
          <iframe src={iframeUrl} className="w-full h-[70vh] border-0" title="Ressource" />
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        {product?.description && (
          <p className="text-muted-foreground">{product.description}</p>
        )}

        <h2 className="text-lg font-semibold text-foreground pt-4">Ressources</h2>
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune ressource pour le moment.</p>
        ) : (
          <div className="grid gap-3">
            {resources.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <span className="font-medium text-foreground">{r.title}</span>
                  {r.type === "link" && r.external_url ? (
                    <a href={r.external_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-2">
                        Accéder <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  ) : r.type === "html5" ? (
                    <Button size="sm" className="gap-2" onClick={() => handleIframe(r.id)}>
                      <BookOpen className="h-4 w-4" /> Lire en ligne
                    </Button>
                  ) : (
                    <Button size="sm" className="gap-2" onClick={() => handleDownload(r.id)}>
                      <Download className="h-4 w-4" /> Télécharger
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
