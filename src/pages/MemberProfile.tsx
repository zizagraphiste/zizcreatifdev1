import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { ArrowLeft, Camera, Mail, User, Lock, CalendarDays, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Profile = {
  full_name: string;
  phone: string;
  avatar_url: string | null;
  created_at: string | null;
};

export default function MemberProfile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    phone: "",
    avatar_url: null,
    created_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  /* ── Fetch profil ── */
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, created_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            full_name: (data as any).full_name || "",
            phone: (data as any).phone || "",
            avatar_url: (data as any).avatar_url || null,
            created_at: (data as any).created_at || null,
          });
        }
        setLoading(false);
      });
  }, [user]);

  /* ── Upload avatar ── */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image trop lourde (max 2 Mo)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase
      .from("profiles")
      .update({ avatar_url: freshUrl } as any)
      .eq("id", user.id);
    setProfile((p) => ({ ...p, avatar_url: freshUrl }));
    toast.success("Photo de profil mise à jour ✓");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Supprimer avatar ── */
  const removeAvatar = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ avatar_url: null } as any)
      .eq("id", user.id);
    setProfile((p) => ({ ...p, avatar_url: null }));
    toast.success("Photo supprimée");
  };

  /* ── Sauvegarder infos ── */
  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, phone: profile.phone } as any)
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour ✓");
    setSaving(false);
  };

  /* ── Changer mot de passe ── */
  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Minimum 6 caractères");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour ✓");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), "d MMMM yyyy", { locale: fr })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/member">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:block">Mon espace</span>
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-semibold text-foreground">Mon profil</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">
            Chargement…
          </div>
        ) : (
          <>
            {/* ── Card Avatar ── */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-col items-center gap-4">
                {/* Grand cercle avatar + bouton caméra */}
                <div className="relative">
                  <AvatarCircle
                    name={profile.full_name || user?.email}
                    avatarUrl={profile.avatar_url}
                    size="xl"
                  />
                  <label className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg ring-2 ring-background">
                    {uploading ? (
                      <span className="text-[10px] font-bold animate-pulse">…</span>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>

                {/* Nom + email + date */}
                <div className="text-center space-y-0.5">
                  <p className="font-semibold text-foreground text-lg leading-tight">
                    {profile.full_name || "Sans nom"}
                  </p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {memberSince && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Membre depuis le {memberSince}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions avatar */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-1.5 text-xs"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {uploading ? "Envoi…" : "Changer la photo"}
                  </Button>
                  {profile.avatar_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={removeAvatar}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG ou WebP · max 2 Mo
                </p>
              </div>
            </div>

            {/* ── Card Informations ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">
                  Informations personnelles
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, full_name: e.target.value }))
                    }
                    placeholder="Prénom Nom"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveProfile();
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+221 77 000 00 00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="pl-9 opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveProfile} disabled={saving} className="gap-1.5">
                {saving ? (
                  "Enregistrement…"
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </div>

            {/* ── Card Mot de passe ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">
                  Changer le mot de passe
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new_password">Nouveau mot de passe</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password">Confirmer</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") changePassword();
                    }}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={changePassword}
                disabled={!newPassword || newPassword.length < 6 || changingPassword}
                className="gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                {changingPassword ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
