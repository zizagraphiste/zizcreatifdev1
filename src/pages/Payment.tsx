import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ExternalLink, ArrowRight, Smartphone } from "lucide-react";
import { toast } from "sonner";

type RegistrationData = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  product_id: string;
  product_title: string;
  product_price: number;
  product_currency: string;
  product_cover_image_url: string | null;
  product_thumbnail_emoji: string | null;
};

export default function Payment() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [data, setData] = useState<RegistrationData | null>(null);
  const [status, setStatus] = useState<"loading" | "not_found" | "already_confirmed" | "ready" | "submitted">("loading");
  const [waveBaseUrl, setWaveBaseUrl] = useState("https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/");
  const [waveLaunched, setWaveLaunched] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!registrationId) return;
    (async () => {
      // Load Wave link from site_content
      const { data: waveContent } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "wave_payment_link")
        .maybeSingle();
      if (waveContent?.value) setWaveBaseUrl(waveContent.value);

      // Load registration
      const { data: reg, error } = await supabase
        .from("registrations")
        .select("id, full_name, email, status, product_id, products(title, price, currency, cover_image_url, thumbnail_emoji)")
        .eq("id", registrationId)
        .maybeSingle();

      if (error || !reg) { setStatus("not_found"); return; }

      const r = reg as any;
      setData({
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        status: r.status,
        product_id: r.product_id,
        product_title: r.products?.title || "",
        product_price: r.products?.price || 0,
        product_currency: r.products?.currency || "FCFA",
        product_cover_image_url: r.products?.cover_image_url || null,
        product_thumbnail_emoji: r.products?.thumbnail_emoji || null,
      });

      if (r.status === "confirmed") setStatus("already_confirmed");
      else if (r.status === "paid") setStatus("submitted");
      else setStatus("ready");
    })();
  }, [registrationId]);

  const handleConfirmPayment = async () => {
    if (!data) return;
    setConfirming(true);
    const { error } = await supabase
      .from("registrations")
      .update({ status: "paid" })
      .eq("id", data.id);
    if (error) {
      toast.error("Erreur, réessaie.");
      setConfirming(false);
      return;
    }
    setStatus("submitted");
    toast.success("Paiement signalé ✓");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <ThemeToggle className="fixed top-4 right-4 z-50" />
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Lien invalide</h1>
          <p className="text-muted-foreground">Ce lien de paiement est invalide ou a expiré.</p>
          <Link to="/"><Button variant="outline">Retour à l'accueil</Button></Link>
        </div>
      </div>
    );
  }

  if (status === "already_confirmed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <ThemeToggle className="fixed top-4 right-4 z-50" />
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Accès déjà activé !</h1>
          <p className="text-muted-foreground">Tu as déjà accès à ce produit. Connecte-toi pour y accéder.</p>
          <Link to="/login">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              Se connecter <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <ThemeToggle className="fixed top-4 right-4 z-50" />
        <div className="text-center space-y-5 max-w-md">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Paiement reçu ✓</h1>
          <p className="text-muted-foreground leading-relaxed">
            Ton paiement a bien été signalé. L'admin va vérifier et <strong className="text-foreground">activer ton accès très bientôt</strong>.
            Tu recevras un email de confirmation à <span className="text-primary">{data?.email}</span>.
          </p>
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground text-left space-y-1">
            <p>📦 <strong className="text-foreground">{data?.product_title}</strong></p>
            <p>👤 {data?.full_name}</p>
          </div>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              Retour à l'accueil <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // status === "ready"
  const waveUrl = `${waveBaseUrl}?amount=${data!.product_price}`;

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle className="fixed top-4 right-4 z-50" />

      <header className="border-b border-border px-6 py-4">
        <span className="text-lg font-bold text-foreground">
          Ziz<span className="text-primary">creatif</span>
        </span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-6">

        {/* Product recap */}
        <Card className="border-primary/20">
          <CardContent className="flex items-center gap-4 py-5">
            {data!.product_cover_image_url ? (
              <img
                src={data!.product_cover_image_url}
                alt={data!.product_title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <span className="text-4xl">{data!.product_thumbnail_emoji || "📦"}</span>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{data!.product_title}</h2>
              <p className="text-sm text-muted-foreground">Pour : {data!.full_name}</p>
              <p className="text-xs text-muted-foreground">{data!.email}</p>
            </div>
            <span className="text-2xl font-black text-primary whitespace-nowrap">
              {data!.product_price.toLocaleString("fr-FR")} {data!.product_currency}
            </span>
          </CardContent>
        </Card>

        {/* How to pay */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">1</div>
            <h3 className="text-base font-bold text-foreground">Paye via Wave</h3>
          </div>

          <p className="text-sm text-muted-foreground pl-11">
            Le montant est pré-rempli automatiquement. Ouvre l'application Wave et confirme le paiement.
          </p>

          <div className="pl-11">
            <a
              href={waveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWaveLaunched(true)}
            >
              <Button className="w-full h-12 bg-[#1DC8FF] hover:bg-[#1DC8FF]/90 text-black font-bold text-base gap-2">
                <Smartphone className="h-5 w-5" />
                Payer {data!.product_price.toLocaleString("fr-FR")} {data!.product_currency} sur Wave
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>

        {/* Confirm payment */}
        <div className={`rounded-xl border bg-card p-5 space-y-4 transition-all ${waveLaunched ? "border-primary/40" : "border-border opacity-60"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${waveLaunched ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
            <h3 className="text-base font-bold text-foreground">Confirme ton paiement</h3>
          </div>

          <p className="text-sm text-muted-foreground pl-11">
            Une fois le paiement Wave effectué, clique ici pour informer l'admin.
          </p>

          <div className="pl-11">
            <Button
              onClick={handleConfirmPayment}
              disabled={confirming}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base gap-2"
            >
              {confirming ? "Envoi en cours…" : <>J'ai effectué mon paiement <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Un problème ? Contacte-nous à <span className="text-primary">support@zizcreatif.dev</span>
        </p>
      </main>
    </div>
  );
}
