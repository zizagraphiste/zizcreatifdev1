import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2, CheckCircle, Tag, UserCircle } from "lucide-react";
import { toast } from "sonner";

type GuestCheckoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    title: string;
    price: number;
    currency: string | null;
    type?: string | null;
  };
};

export function GuestCheckoutDialog({ open, onOpenChange, product }: GuestCheckoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  // Delivery fields for books
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  // Coaching notes
  const [coachingNotes, setCoachingNotes] = useState("");
  // Promo code
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ id: string; discount_type: string; discount_value: number } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const isFree = product.price === 0;
  const needsDelivery = product.type === "book";
  const isCoaching = product.type === "coaching";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Auto-fill from profile when logged in
  useEffect(() => {
    if (!open || !user) return;
    setProfileLoading(true);
    (async () => {
      setEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setFullName(profile.full_name);
      if ((profile as any)?.phone) setPhone((profile as any).phone);

      // Fallback: phone from last registration
      if (!(profile as any)?.phone) {
        const { data: lastReg } = await supabase
          .from("registrations")
          .select("phone")
          .eq("user_id", user.id)
          .not("phone", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastReg?.phone) setPhone(lastReg.phone);
      }
      setProfileLoading(false);
    })();
  }, [open, user]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPromoCode("");
      setPromoApplied(null);
      if (!isLoggedIn) {
        setFullName("");
        setEmail("");
        setPhone("");
      }
      setDeliveryAddress("");
      setDeliveryCity("");
      setDeliveryLocation("");
      setCoachingNotes("");
    }
  }, [open, isLoggedIn]);

  const finalPrice = promoApplied
    ? promoApplied.discount_type === "percentage"
      ? Math.max(0, Math.round(product.price * (1 - promoApplied.discount_value / 100)))
      : Math.max(0, product.price - promoApplied.discount_value)
    : product.price;
  const discountAmount = product.price - finalPrice;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setCheckingPromo(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("id, discount_type, discount_value, applies_to_type, max_uses, times_used, expires_at, active")
      .eq("code", promoCode.trim().toUpperCase())
      .eq("active", true)
      .maybeSingle();

    if (error || !data) { toast.error("Code promo invalide"); setPromoApplied(null); setCheckingPromo(false); return; }
    if (data.applies_to_type && data.applies_to_type !== product.type) { toast.error("Ce code ne s'applique pas à ce type de produit"); setPromoApplied(null); setCheckingPromo(false); return; }
    if ((data as any).max_uses > 0 && (data as any).times_used >= (data as any).max_uses) { toast.error("Ce code a atteint sa limite d'utilisation"); setPromoApplied(null); setCheckingPromo(false); return; }
    if ((data as any).expires_at && new Date((data as any).expires_at) < new Date()) { toast.error("Ce code a expiré"); setPromoApplied(null); setCheckingPromo(false); return; }

    setPromoApplied({ id: data.id, discount_type: data.discount_type, discount_value: data.discount_value });
    toast.success("Code promo appliqué !");
    setCheckingPromo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToUse = fullName.trim();
    const emailToUse = email.trim().toLowerCase();
    if (nameToUse.length < 2) { toast.error("Le nom doit contenir au moins 2 caractères"); return; }
    if (!emailRegex.test(emailToUse)) { toast.error("Email invalide"); return; }
    if (needsDelivery && !deliveryAddress.trim()) { toast.error("L'adresse de livraison est requise pour un livre"); return; }
    setLoading(true);

    try {
      const insertData: any = {
        full_name: nameToUse,
        email: emailToUse,
        phone: phone.trim() || null,
        product_id: product.id,
        user_id: user?.id || null,
        status: "pending",
      };

      if (needsDelivery) {
        insertData.delivery_address = deliveryAddress.trim();
        insertData.delivery_city = deliveryCity.trim() || null;
        insertData.delivery_location = deliveryLocation.trim() || null;
      }

      if (isCoaching && coachingNotes.trim()) {
        insertData.notes = coachingNotes.trim();
      }

      if (promoApplied) {
        insertData.promo_code_id = promoApplied.id;
        insertData.discount_amount = discountAmount;
      }

      const { data, error } = await supabase
        .from("registrations")
        .insert(insertData)
        .select("id")
        .single();

      if (error) throw error;

      if (promoApplied) {
        await supabase.rpc("increment_promo_usage" as any, { promo_id: promoApplied.id } as any);
      }

      toast.success("Inscription enregistrée ✓");
      onOpenChange(false);

      if (finalPrice === 0) {
        toast.success("Ce produit est gratuit ! Tu recevras un email de confirmation.");
      } else {
        navigate(`/payment/${data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur, réessaie");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isLoggedIn ? "Finaliser mon achat" : `S'inscrire à ${product.title}`}
          </DialogTitle>
        </DialogHeader>

        {/* Price */}
        <div className="text-center py-2">
          <span className="text-2xl font-black text-primary">
            {isFree ? "Gratuit" : `${product.price.toLocaleString("fr-FR")} ${product.currency || "FCFA"}`}
          </span>
          {promoApplied && finalPrice < product.price && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500 font-medium">
                -{discountAmount.toLocaleString("fr-FR")} FCFA → {finalPrice === 0 ? "Gratuit" : `${finalPrice.toLocaleString("fr-FR")} FCFA`}
              </span>
            </div>
          )}
        </div>

        {/* ── Logged-in: show profile banner instead of fields ── */}
        {isLoggedIn && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <UserCircle className="h-9 w-9 text-primary shrink-0" />
            {profileLoading ? (
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-40 rounded bg-muted animate-pulse" />
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{fullName || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
                {phone && <p className="text-xs text-primary mt-0.5">{phone}</p>}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Guest fields ── */}
          {!isLoggedIn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="guest-name">Nom complet</Label>
                <Input id="guest-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Prénom Nom" minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email</Label>
                <Input id="guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ton@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">
                  Téléphone <span className="text-muted-foreground font-normal">(optionnel)</span>
                </Label>
                <Input id="guest-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 000 00 00" />
              </div>
            </>
          )}

          {/* Delivery address for books */}
          {needsDelivery && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label className="font-semibold text-foreground">📦 Adresse de livraison</Label>
              <div className="space-y-2">
                <Label htmlFor="delivery-address" className="text-sm">Adresse *</Label>
                <Textarea id="delivery-address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required placeholder="Rue, quartier, bâtiment…" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-city" className="text-sm">Ville</Label>
                <Input id="delivery-city" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} placeholder="Ex: Dakar" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-location" className="text-sm">Point de repère</Label>
                <Input id="delivery-location" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Ex: Près de la pharmacie X" />
              </div>
            </div>
          )}

          {/* Coaching notes */}
          {isCoaching && (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <Label htmlFor="coaching-notes" className="font-semibold text-foreground flex items-center gap-2">
                🎯 Points à aborder durant la séance
              </Label>
              <Textarea
                id="coaching-notes"
                value={coachingNotes}
                onChange={(e) => setCoachingNotes(e.target.value)}
                placeholder={"Ex :\n— Stratégie de prix pour mon offre\n— Comment prospecter sur LinkedIn\n— Développer ma présence en ligne"}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Ces informations aident à préparer ta séance pour qu'elle soit la plus efficace possible.
              </p>
            </div>
          )}

          {/* Promo code */}
          {!isFree && (
            <div className="space-y-2">
              <Label className="text-sm">Code promo</Label>
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(null); }}
                  placeholder="PROMO20"
                  className="font-mono flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleApplyPromo} disabled={checkingPromo || !promoCode.trim()}>
                  <Tag className="h-4 w-4 mr-1" />
                  {checkingPromo ? "…" : "Appliquer"}
                </Button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || (isLoggedIn && profileLoading)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 h-11"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {finalPrice === 0 ? "S'inscrire gratuitement" : "Continuer vers le paiement"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          {!isLoggedIn && (
            <p className="text-xs text-muted-foreground text-center">
              Pas besoin de créer un compte pour acheter.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
