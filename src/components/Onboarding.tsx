import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, BookOpen, Users, Mic, Target, CheckCircle, Phone, Briefcase, Camera, Mail } from "lucide-react";

type OnboardingProps = {
  userId: string;
  initialName?: string;
  initialEmail?: string;
  onComplete: () => void;
};

const INTERESTS = [
  { key: "guides", label: "Guides pratiques", icon: BookOpen, desc: "PDF étape par étape" },
  { key: "formations", label: "Formations", icon: Users, desc: "Apprendre en groupe" },
  { key: "masterclass", label: "Masterclass", icon: Mic, desc: "Sessions live avec Q&A" },
  { key: "coaching", label: "Coaching", icon: Target, desc: "Accompagnement one-to-one" },
];

const STEPS = 3;

export function Onboarding({ userId, initialName = "", initialEmail = "", onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploadingAvatar(false);
  };

  const toggleInterest = (key: string) => {
    setSelectedInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || initialName,
        phone: phone.trim() || null,
        profession: profession.trim() || null,
        avatar_url: avatarUrl || null,
        interests: selectedInterests,
        onboarding_completed: true,
      } as any)
      .eq("id", userId);
    setSaving(false);
    onComplete();
  };

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center px-4">
      {/* Progress dots */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 <= step ? "bg-primary w-6" : "bg-muted w-3"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-foreground">
                  Bienvenue sur <span className="text-primary">Zizcreatif</span> !
                </h1>
                <p className="text-muted-foreground text-sm">
                  Complète ton profil pour personnaliser ton expérience.
                </p>
              </div>

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full border-2 border-dashed border-primary/40 hover:border-primary transition-colors overflow-hidden bg-muted flex items-center justify-center"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">
                  Photo de profil <span className="text-primary font-medium">*</span>
                  {uploadingAvatar && <span className="ml-1 animate-pulse">Envoi…</span>}
                </p>
              </div>

              <div className="space-y-3 text-left">
                {/* Email (read-only) */}
                {initialEmail && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" /> Email
                    </label>
                    <Input value={initialEmail} readOnly className="text-base h-11 bg-muted text-muted-foreground cursor-not-allowed" />
                  </div>
                )}
                {/* Nom */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Nom complet <span className="text-primary">*</span>
                  </label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom et nom" className="text-base h-11" autoFocus />
                </div>
                {/* Téléphone */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" /> Numéro WhatsApp <span className="text-primary">*</span>
                  </label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+221 77 000 00 00" className="text-base h-11" />
                </div>
                {/* Profession */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Profession / activité <span className="text-primary">*</span>
                  </label>
                  <Input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Ex : Graphiste freelance, Entrepreneur…" className="text-base h-11" />
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!avatarUrl || !name.trim() || !phone.trim() || !profession.trim() || uploadingAvatar}
                className="w-full h-12 bg-primary text-primary-foreground font-bold gap-2 text-base"
              >
                Continuer <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* ── Step 2: Interests ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-foreground">
                  Salut {name.split(" ")[0]} 👋
                </h2>
                <p className="text-muted-foreground">
                  Qu'est-ce qui t'intéresse le plus ?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {INTERESTS.map((item) => {
                  const selected = selectedInterests.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleInterest(item.key)}
                      className={`relative flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {selected && (
                        <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selected ? "bg-primary/20" : "bg-muted"
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${selected ? "text-primary" : ""}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs mt-0.5 opacity-70">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 h-11 bg-primary text-primary-foreground font-bold gap-2"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="mx-auto w-24 h-24 rounded-full bg-green-500/15 flex items-center justify-center"
              >
                <CheckCircle className="h-12 w-12 text-green-500" />
              </motion.div>

              <div className="space-y-3">
                <h2 className="text-2xl font-black text-foreground">
                  Tout est prêt, {name.split(" ")[0]} !
                </h2>
                <p className="text-muted-foreground">
                  Ton espace est personnalisé. Tu peux maintenant découvrir les produits
                  et activités qui correspondent à tes centres d'intérêt.
                </p>
              </div>

              {selectedInterests.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedInterests.map((k) => {
                    const info = INTERESTS.find((i) => i.key === k);
                    return info ? (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm"
                      >
                        <info.icon className="h-3.5 w-3.5" />
                        {info.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              <Button
                onClick={handleFinish}
                disabled={saving}
                className="w-full h-12 bg-primary text-primary-foreground font-bold text-base gap-2"
              >
                {saving ? "Enregistrement…" : (
                  <>Accéder à mon espace <ArrowRight className="h-5 w-5" /></>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
