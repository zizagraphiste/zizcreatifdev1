import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentSettings() {
  const [waveLink, setWaveLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "wave_payment_link")
        .maybeSingle();
      setWaveLink(data?.value || "https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/");
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!waveLink.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "wave_payment_link", value: waveLink.trim() }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Lien Wave sauvegardé ✓");
    }
    setSaving(false);
  };

  const testUrl = waveLink ? `${waveLink.replace(/\/?$/, "/")}?amount=100` : "";

  if (loading) return <div className="animate-pulse text-muted-foreground py-10 text-center">Chargement…</div>;

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres de paiement</h1>
        <p className="text-muted-foreground mt-1">Configure ton lien de paiement Wave.</p>
      </div>

      {/* Wave payment link */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1DC8FF]/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-[#1DC8FF]" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Lien Wave</h2>
            <p className="text-xs text-muted-foreground">Le montant est ajouté automatiquement à la fin</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wave-link">Ton lien de paiement Wave (sans le ?amount=)</Label>
          <Input
            id="wave-link"
            value={waveLink}
            onChange={(e) => setWaveLink(e.target.value)}
            placeholder="https://pay.wave.com/m/XXXX/c/sn/"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Exemple : <code className="bg-muted px-1 rounded">https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/</code>
          </p>
        </div>

        {/* Preview */}
        {testUrl && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Aperçu — lien pour un paiement de 10 000 FCFA :</p>
            <p className="text-xs text-primary break-all font-mono">
              {waveLink.replace(/\/?$/, "/")}?amount=10000
            </p>
            <a
              href={testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Tester le lien (100 FCFA)
            </a>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !waveLink.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <h3 className="font-semibold text-foreground">Comment ça fonctionne ?</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Le client choisit un produit et remplit le formulaire (nom, email, téléphone)</li>
          <li>Il est redirigé vers la page de paiement avec le montant exact pré-rempli</li>
          <li>Il paie sur Wave en quelques secondes</li>
          <li>Il clique <strong className="text-foreground">"J'ai effectué mon paiement"</strong></li>
          <li>Tu reçois une notification dans <strong className="text-foreground">Inscriptions</strong> → clique <strong className="text-green-500">Valider</strong></li>
          <li>L'accès du client est activé automatiquement</li>
        </ol>
      </div>
    </div>
  );
}
