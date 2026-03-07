import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Upload, ExternalLink, Image as ImageIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!registrationId) return;
    (async () => {
      const { data: reg, error } = await supabase
        .from("registrations")
        .select("id, full_name, email, status, product_id, products(title, price, currency, cover_image_url, thumbnail_emoji)")
        .eq("id", registrationId)
        .maybeSingle();

      if (error || !reg) {
        setStatus("not_found");
        return;
      }

      const r = reg as any;
      const regData: RegistrationData = {
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        status: r.status,
        product_id: r.product_id,
        product_title: r.products?.title || "",
        product_price: r.products?.price || 0,
        product_currency: r.products?.currency || "XOF",
        product_cover_image_url: r.products?.cover_image_url || null,
        product_thumbnail_emoji: r.products?.thumbnail_emoji || null,
      };

      setData(regData);

      if (r.status === "confirmed") {
        setStatus("already_confirmed");
      } else if (r.status === "paid") {
        setStatus("submitted");
      } else {
        setStatus("ready");
      }
    })();
  }, [registrationId]);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Seules les images JPG/PNG sont acceptées");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file || !data) return;
    setSubmitting(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${data.id}-proof.${ext}`;

      // Upload via edge function (no auth needed)
      const { error: invokeError, data: result } = await supabase.functions.invoke("upload-payment-proof", {
        body: {
          registration_id: data.id,
          payment_ref: paymentRef || null,
          file_name: path,
          file_base64: await fileToBase64(file),
          content_type: file.type,
        },
      });

      if (invokeError) throw invokeError;
      if (result?.error) throw new Error(result.error);

      setStatus("submitted");
      toast.success("Preuve envoyée ✓");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-foreground">Inscription introuvable</h1>
          <p className="text-muted-foreground">Ce lien de paiement est invalide ou a expiré.</p>
          <Link to="/">
            <Button variant="outline">Retour à l'accueil</Button>
          </Link>
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
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Preuve reçue ✓</h1>
          <p className="text-muted-foreground">
            L'admin va vérifier ton paiement et t'envoyer un email de confirmation.
            Tu pourras ensuite te connecter sur ton espace membre.
          </p>
          <Link to="/login">
            <Button variant="outline" className="gap-2">
              Aller à la connexion <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // status === "ready"
  const waveUrl = `https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/?amount=${data!.product_price}`;

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle className="fixed top-4 right-4 z-50" />

      <header className="border-b border-border px-6 py-4">
        <span className="text-lg font-bold text-foreground">
          Ziz<span className="text-primary">creatif</span>
        </span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-8">
        {/* Product recap */}
        <Card className="border-primary/20">
          <CardContent className="flex items-center gap-4 py-5">
            {data!.product_cover_image_url ? (
              <img src={data!.product_cover_image_url} alt={data!.product_title} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <span className="text-4xl">{data!.product_thumbnail_emoji || "📦"}</span>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{data!.product_title}</h2>
              <p className="text-sm text-muted-foreground">Pour : {data!.full_name}</p>
            </div>
            <span className="text-2xl font-black text-primary whitespace-nowrap">
              {data!.product_price === 0 ? "Gratuit" : `${data!.product_price.toLocaleString("fr-FR")} ${data!.product_currency}`}
            </span>
          </CardContent>
        </Card>

        {/* Step 1 — Pay */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
            <h3 className="text-lg font-bold text-foreground">Payer via Wave</h3>
          </div>
          <a href={waveUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base gap-2">
              Payer {data!.product_price.toLocaleString("fr-FR")} {data!.product_currency} sur Wave
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>

        {/* Step 2 — Screenshot instruction */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
            <h3 className="text-lg font-bold text-foreground">Fais une capture d'écran</h3>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Après le paiement, fais une <strong className="text-foreground">capture d'écran</strong> de la confirmation Wave.</p>
                <p>Elle doit montrer le montant, la date et la référence de la transaction.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 — Upload proof */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
            <h3 className="text-lg font-bold text-foreground">Envoie ta preuve</h3>
          </div>

          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors p-8 text-center ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                <p className="text-xs text-muted-foreground">{file?.name} — {((file?.size || 0) / 1024 / 1024).toFixed(1)} Mo</p>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                }}>
                  Supprimer
                </Button>
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <Upload className="h-10 w-10 mx-auto text-primary/60" />
                <p className="text-sm">Glisse ton image ici ou <span className="text-primary font-medium">clique pour choisir</span></p>
                <p className="text-xs">JPG ou PNG · Max 5 Mo</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
          </div>

          {/* Optional payment ref */}
          <div className="space-y-2">
            <Label className="text-sm">Référence transaction Wave (optionnel)</Label>
            <Input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="Ex: TXN-12345678"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!file || submitting}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base gap-2"
          >
            {submitting ? "Envoi en cours…" : "Envoyer ma preuve →"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // Remove data:image/...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
