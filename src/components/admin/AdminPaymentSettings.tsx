import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Save, Smartphone, Phone, Banknote, Info } from "lucide-react";
import { toast } from "sonner";

type AllConfigs = {
  wave: { enabled: boolean; link: string };
  orange: { enabled: boolean; number: string; name: string };
  virement: { enabled: boolean; instructions: string };
};

const DEFAULT_CONFIGS: AllConfigs = {
  wave: { enabled: true, link: "https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/" },
  orange: { enabled: false, number: "", name: "" },
  virement: { enabled: false, instructions: "" },
};

export default function AdminPaymentSettings() {
  const [configs, setConfigs] = useState<AllConfigs>(DEFAULT_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Load Wave link (legacy key for backward compat with Payment.tsx)
      const { data: waveData } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "wave_payment_link")
        .maybeSingle();

      // Load full config
      const { data: configData } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "payment_methods_config")
        .maybeSingle();

      let newConfigs: AllConfigs = { ...DEFAULT_CONFIGS };
      if (configData?.value) {
        try {
          const parsed = JSON.parse(configData.value);
          newConfigs = { ...newConfigs, ...parsed };
        } catch {}
      }
      // Legacy wave link takes priority
      if (waveData?.value) newConfigs.wave.link = waveData.value;

      setConfigs(newConfigs);
      setLoading(false);
    })();
  }, []);

  const handleSave = async (method: keyof AllConfigs) => {
    setSaving(method);

    // For Wave, also update the legacy key (used by Payment.tsx)
    if (method === "wave") {
      await supabase
        .from("site_content")
        .upsert({ key: "wave_payment_link", value: configs.wave.link }, { onConflict: "key" });
    }

    // Save all configs as JSON
    const { error } = await supabase
      .from("site_content")
      .upsert(
        { key: "payment_methods_config", value: JSON.stringify(configs) },
        { onConflict: "key" }
      );

    const labels: Record<string, string> = {
      wave: "Wave",
      orange: "Orange Money",
      virement: "Virement",
    };

    if (error) toast.error(error.message);
    else toast.success(`${labels[method]} sauvegardé ✓`);
    setSaving(null);
  };

  const updateConfig = <K extends keyof AllConfigs>(
    method: K,
    field: string,
    value: any
  ) => {
    setConfigs((prev) => ({
      ...prev,
      [method]: { ...prev[method], [field]: value },
    }));
  };

  if (loading)
    return (
      <div className="animate-pulse text-muted-foreground py-10 text-center">
        Chargement…
      </div>
    );

  const waveTestUrl = configs.wave.link
    ? `${configs.wave.link.replace(/\/?$/, "/")}?amount=100`
    : "";

  return (
    <div className="space-y-8 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Modes de paiement</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Active et configure les méthodes de paiement disponibles pour tes clients.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground text-sm">Comment ça fonctionne ?</h3>
        </div>
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>Le client choisit un produit et remplit le formulaire</li>
          <li>Il est redirigé vers la page paiement avec le montant exact</li>
          <li>Il paie via la méthode de son choix</li>
          <li>
            Il clique{" "}
            <strong className="text-foreground">"J'ai effectué mon paiement"</strong>
          </li>
          <li>
            Tu valides dans{" "}
            <strong className="text-foreground">Inscriptions</strong> → l'accès est activé
          </li>
        </ol>
      </div>

      {/* ── Wave ── */}
      <MethodCard
        icon={<Smartphone className="h-5 w-5 text-[#1DC8FF]" />}
        iconBg="bg-[#1DC8FF]/10"
        title="Wave"
        subtitle="Le montant est ajouté automatiquement au lien"
        enabled={configs.wave.enabled}
        onToggle={(v) => updateConfig("wave", "enabled", v)}
        onSave={() => handleSave("wave")}
        saving={saving === "wave"}
      >
        <div className="space-y-2">
          <Label htmlFor="wave-link">Lien Wave (sans ?amount=)</Label>
          <Input
            id="wave-link"
            value={configs.wave.link}
            onChange={(e) => updateConfig("wave", "link", e.target.value)}
            placeholder="https://pay.wave.com/m/XXXX/c/sn/"
            className="font-mono text-sm"
          />
          {waveTestUrl && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs text-muted-foreground font-mono break-all">
                {configs.wave.link.replace(/\/?$/, "/")}?amount=10000
              </p>
              <a
                href={waveTestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Tester le lien (100 FCFA)
              </a>
            </div>
          )}
        </div>
      </MethodCard>

      {/* ── Orange Money ── */}
      <MethodCard
        icon={<Phone className="h-5 w-5 text-orange-500" />}
        iconBg="bg-orange-500/10"
        title="Orange Money"
        subtitle="Le client envoie manuellement au numéro indiqué"
        enabled={configs.orange.enabled}
        onToggle={(v) => updateConfig("orange", "enabled", v)}
        onSave={() => handleSave("orange")}
        saving={saving === "orange"}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Numéro Orange Money</Label>
            <Input
              value={configs.orange.number}
              onChange={(e) => updateConfig("orange", "number", e.target.value)}
              placeholder="77 XXX XX XX"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nom du compte</Label>
            <Input
              value={configs.orange.name}
              onChange={(e) => updateConfig("orange", "name", e.target.value)}
              placeholder="Prénom Nom"
            />
          </div>
        </div>
      </MethodCard>

      {/* ── Virement / Autre ── */}
      <MethodCard
        icon={<Banknote className="h-5 w-5 text-green-500" />}
        iconBg="bg-green-500/10"
        title="Virement / Autre"
        subtitle="Instructions libres (IBAN, chèque, espèces…)"
        enabled={configs.virement.enabled}
        onToggle={(v) => updateConfig("virement", "enabled", v)}
        onSave={() => handleSave("virement")}
        saving={saving === "virement"}
      >
        <div className="space-y-1.5">
          <Label>Instructions de paiement</Label>
          <Textarea
            value={configs.virement.instructions}
            onChange={(e) => updateConfig("virement", "instructions", e.target.value)}
            placeholder="Ex: Effectuez un virement vers IBAN FR76 XXXX…"
            rows={3}
          />
        </div>
      </MethodCard>
    </div>
  );
}

/* ── Reusable card ── */
function MethodCard({
  icon,
  iconBg,
  title,
  subtitle,
  enabled,
  onToggle,
  onSave,
  saving,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-6 space-y-5 transition-opacity ${
        enabled ? "border-border" : "opacity-55"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}
          >
            {icon}
          </div>
          <div>
            <h2 className="font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {enabled && (
        <>
          {children}
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </>
      )}
    </div>
  );
}
