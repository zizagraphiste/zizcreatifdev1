import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LogOut, ArrowRight, MessageCircle } from "lucide-react";
import MentorChat from "@/components/MentorChat";

type GrantedProduct = {
  product_id: string;
  available_at: string | null;
  granted_at: string | null;
  title: string;
  thumbnail_emoji: string | null;
  cover_image_url: string | null;
  description: string | null;
  type: string | null;
};

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!target) return;
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [target]);
  if (!target) return null;
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { days: d, hours: h, minutes: m, total: diff };
}

function ProductCard({ item }: { item: GrantedProduct }) {
  const availableAt = item.available_at ? new Date(item.available_at) : null;
  const isAvailable = !availableAt || availableAt <= new Date();
  const countdown = useCountdown(isAvailable ? null : availableAt);
  const showCountdown = countdown && countdown.total < 7 * 86400000;

  return (
    <Card className="border-border hover:border-primary/40 transition-colors overflow-hidden">
      {item.cover_image_url && (
        <div className="h-36 overflow-hidden">
          <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        {!item.cover_image_url && <span className="text-3xl">{item.thumbnail_emoji || "📦"}</span>}
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base truncate">{item.title}</CardTitle>
          {item.type && (
            <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
          )}
        </div>
        {isAvailable ? (
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/20">
            Actif ✓
          </Badge>
        ) : (
          <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/20">
            {availableAt
              ? `Disponible le ${availableAt.toLocaleDateString("fr-FR")}`
              : "En attente"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        {showCountdown && (
          <div className="flex gap-3 text-sm font-mono text-primary">
            <span>{countdown.days}j</span>
            <span>{countdown.hours}h</span>
            <span>{countdown.minutes}min</span>
          </div>
        )}
        {isAvailable ? (
          <Link to={`/member/${item.product_id}`}>
            <Button className="w-full gap-2">
              Accéder <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="w-full gap-2" disabled>
                Accéder <ArrowRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Disponible le {availableAt?.toLocaleDateString("fr-FR")}
            </TooltipContent>
          </Tooltip>
        )}
        {!isAvailable && (
          <p className="text-xs text-muted-foreground text-center">
            Tu recevras un email dès que le contenu est disponible.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Member() {
  const { user, signOut } = useAuth();
  const [products, setProducts] = useState<GrantedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("access_grants")
        .select("product_id, available_at, granted_at, products(title, thumbnail_emoji, cover_image_url, description, type)")
        .eq("user_id", user.id);

      const items: GrantedProduct[] = (data || []).map((g: any) => ({
        product_id: g.product_id,
        available_at: g.available_at,
        granted_at: g.granted_at,
        title: g.products?.title || "",
        thumbnail_emoji: g.products?.thumbnail_emoji,
        cover_image_url: g.products?.cover_image_url,
        description: g.products?.description,
        type: g.products?.type,
      }));
      setProducts(items);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-foreground">
            Ziz<span className="text-primary">creatif</span>
          </span>
          <span className="text-muted-foreground text-sm">· Mon espace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/member/profile">
            <Button variant="ghost" size="sm">Profil</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Mes produits</h1>

        {loading ? (
          <p className="text-muted-foreground animate-pulse">Chargement…</p>
        ) : products.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">Tu n'as pas encore de produit.</p>
            <Link to="/">
              <Button variant="outline">Découvrir les produits</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((p) => (
              <ProductCard key={p.product_id} item={p} />
            ))}
          </div>
        )}

        {/* Mentor Chat Section */}
        <div className="border-t border-border pt-8">
          <MentorChat />
        </div>
      </main>
    </div>
  );
}
