import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LogOut, ArrowRight, Package, ShoppingBag, MessageCircle,
  User, Home, Lock, CheckCircle, Clock, Camera,
} from "lucide-react";
import MentorChat from "@/components/MentorChat";
import { Onboarding } from "@/components/Onboarding";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { toast } from "sonner";

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

type Registration = {
  id: string;
  created_at: string;
  status: string;
  product_title: string;
  product_price: number;
  product_currency: string;
};

type Profile = {
  full_name: string;
  phone: string;
  onboarding_completed: boolean;
  avatar_url: string | null;
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

function AccessCard({ item }: { item: GrantedProduct }) {
  const availableAt = item.available_at ? new Date(item.available_at) : null;
  const isAvailable = !availableAt || availableAt <= new Date();
  const countdown = useCountdown(isAvailable ? null : availableAt);
  const showCountdown = countdown && countdown.total < 7 * 86400000;

  return (
    <Card className="border-border hover:border-primary/40 transition-colors overflow-hidden group">
      {item.cover_image_url ? (
        <div className="h-36 overflow-hidden">
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-5xl">
          {item.thumbnail_emoji || "📦"}
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{item.title}</h3>
            {item.type && (
              <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
            )}
          </div>
          {isAvailable ? (
            <Badge className="bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/15 shrink-0 text-xs">
              Actif ✓
            </Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15 shrink-0 text-xs">
              {availableAt ? availableAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "En attente"}
            </Badge>
          )}
        </div>

        {showCountdown && (
          <div className="flex gap-2 text-xs font-mono text-primary">
            <span>{countdown.days}j</span>
            <span>{countdown.hours}h</span>
            <span>{countdown.minutes}min</span>
          </div>
        )}

        {isAvailable ? (
          <Link to={`/member/${item.product_id}`}>
            <Button size="sm" className="w-full gap-2 text-xs">
              Accéder <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="w-full gap-2 text-xs" disabled>
                <Lock className="h-3.5 w-3.5" /> Pas encore disponible
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Disponible le {availableAt?.toLocaleDateString("fr-FR")}
            </TooltipContent>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", color: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  paid: { label: "Paiement signalé", color: "bg-primary/15 text-primary", icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: "Confirmé", color: "bg-green-500/15 text-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejeté", color: "bg-destructive/15 text-destructive", icon: null },
};

export default function Member() {
  const { user, signOut } = useAuth();
  const [products, setProducts] = useState<GrantedProduct[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "", onboarding_completed: true, avatar_url: null });
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [
        { data: grants },
        { data: regs },
        { data: prof },
      ] = await Promise.all([
        supabase
          .from("access_grants")
          .select("product_id, available_at, granted_at, products(title, thumbnail_emoji, cover_image_url, description, type)")
          .eq("user_id", user.id),
        supabase
          .from("registrations")
          .select("id, created_at, status, product_id, products(title, price, currency)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name, phone, onboarding_completed, avatar_url")
          .eq("id", user.id)
          .single(),
      ]);

      setProducts(
        ((grants || []) as any[]).map((g) => ({
          product_id: g.product_id,
          available_at: g.available_at,
          granted_at: g.granted_at,
          title: g.products?.title || "",
          thumbnail_emoji: g.products?.thumbnail_emoji,
          cover_image_url: g.products?.cover_image_url,
          description: g.products?.description,
          type: g.products?.type,
        }))
      );

      const prodMap: Record<string, any> = {};
      ((regs || []) as any[]).forEach((r) => {
        if (r.products) prodMap[r.product_id] = r.products;
      });
      setRegistrations(
        ((regs || []) as any[]).map((r) => ({
          id: r.id,
          created_at: r.created_at,
          status: r.status,
          product_title: r.products?.title || "—",
          product_price: r.products?.price || 0,
          product_currency: r.products?.currency || "FCFA",
        }))
      );

      const p = prof as any;
      const profData: Profile = {
        full_name: p?.full_name || "",
        phone: p?.phone || "",
        onboarding_completed: p?.onboarding_completed ?? true,
        avatar_url: p?.avatar_url || null,
      };
      setProfile(profData);
      if (!profData.onboarding_completed) setShowOnboarding(true);

      setLoading(false);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, phone: profile.phone } as any)
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour ✓");
    setSavingProfile(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Seules les images sont acceptées"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image trop lourde (max 2 Mo)"); return; }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setAvatarUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: freshUrl } as any).eq("id", user.id);
    setProfile((p) => ({ ...p, avatar_url: freshUrl }));
    toast.success("Photo de profil mise à jour ✓");
    setAvatarUploading(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (newPassword.length < 6) { toast.error("Minimum 6 caractères"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Mot de passe mis à jour !"); setNewPassword(""); setConfirmPassword(""); }
  };

  if (showOnboarding && user) {
    return (
      <Onboarding
        userId={user.id}
        initialName={profile.full_name}
        onComplete={() => {
          setShowOnboarding(false);
          setProfile((p) => ({ ...p, onboarding_completed: true }));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-base font-bold text-foreground">
            Ziz<span className="text-primary">creatif</span>
          </span>
          <span className="hidden sm:block text-muted-foreground text-sm">· Mon espace</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/member/profile">
            <AvatarCircle name={profile.full_name || user?.email} avatarUrl={profile.avatar_url} size="sm" className="cursor-pointer hover:opacity-80 transition-opacity" />
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </Button>
        </div>
      </header>

      {/* ── Welcome banner ── */}
      {!loading && (
        <div className="border-b border-border bg-primary/5 px-4 sm:px-6 py-3">
          <p className="text-sm text-foreground font-medium">
            👋 Bonjour {profile.full_name.split(" ")[0] || user?.email?.split("@")[0]} !
          </p>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Chargement…</div>
        ) : (
          <Tabs defaultValue="acces" className="space-y-6">
            <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex h-auto p-1">
              <TabsTrigger value="acces" className="gap-1.5 text-xs sm:text-sm py-2">
                <Package className="h-4 w-4 hidden sm:block" />
                <span>Mes accès</span>
                {products.length > 0 && (
                  <Badge className="bg-primary/15 text-primary text-xs">{products.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="commandes" className="gap-1.5 text-xs sm:text-sm py-2">
                <ShoppingBag className="h-4 w-4 hidden sm:block" />
                <span>Commandes</span>
              </TabsTrigger>
              <TabsTrigger value="mentor" className="gap-1.5 text-xs sm:text-sm py-2">
                <MessageCircle className="h-4 w-4 hidden sm:block" />
                <span>Mentor</span>
              </TabsTrigger>
              <TabsTrigger value="profil" className="gap-1.5 text-xs sm:text-sm py-2">
                <User className="h-4 w-4 hidden sm:block" />
                <span>Profil</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Onglet : Mes accès ── */}
            <TabsContent value="acces" className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Mes accès</h2>
              {products.length === 0 ? (
                <div className="text-center py-14 space-y-4">
                  <p className="text-5xl">📦</p>
                  <p className="text-muted-foreground">Tu n'as pas encore de produit.</p>
                  <Link to="/">
                    <Button variant="outline">Découvrir le catalogue</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <AccessCard key={p.product_id} item={p} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Onglet : Commandes ── */}
            <TabsContent value="commandes" className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Historique des commandes</h2>
              {registrations.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Aucune commande pour le moment.</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produit</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Montant</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((r) => {
                        const s = STATUS_MAP[r.status] || STATUS_MAP.pending;
                        return (
                          <tr key={r.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground text-sm line-clamp-1">{r.product_title}</div>
                              <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                                {r.product_price > 0 ? `${r.product_price.toLocaleString("fr-FR")} ${r.product_currency}` : "Gratuit"} · {new Date(r.created_at).toLocaleDateString("fr-FR")}
                              </div>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                              {r.product_price > 0 ? `${r.product_price.toLocaleString("fr-FR")} ${r.product_currency}` : "Gratuit"}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
                                {s.icon} {s.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── Onglet : Mentor ── */}
            <TabsContent value="mentor">
              <MentorChat />
            </TabsContent>

            {/* ── Onglet : Profil ── */}
            <TabsContent value="profil" className="space-y-6 max-w-md">
              <h2 className="text-lg font-bold text-foreground">Mon profil</h2>

              {/* Infos */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-foreground text-sm">Informations personnelles</h3>

                {/* Avatar upload */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <AvatarCircle
                      name={profile.full_name || user?.email}
                      avatarUrl={profile.avatar_url}
                      size="lg"
                    />
                    <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md ring-2 ring-background">
                      {avatarUploading
                        ? <span className="text-[10px] font-bold animate-pulse">…</span>
                        : <Camera className="h-3.5 w-3.5" />}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={avatarUploading}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{profile.full_name || "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG ou WebP · max 2 Mo</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nom complet</Label>
                    <Input
                      value={profile.full_name}
                      onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled className="opacity-60" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+221 77 000 00 00"
                      type="tel"
                    />
                  </div>
                </div>
                <Button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {savingProfile ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>

              {/* Password */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-foreground text-sm">Changer le mot de passe</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nouveau mot de passe</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirmer</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={changePassword}
                  disabled={!newPassword || newPassword.length < 6}
                >
                  Mettre à jour le mot de passe
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
