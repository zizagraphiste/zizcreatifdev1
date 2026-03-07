import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Un email de réinitialisation a été envoyé.");
        setIsForgot(false);
      } else if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        // If auto-confirm is on, session exists → redirect
        if (data.session) {
          const { data: isAdmin } = await (supabase.rpc as any)("has_role", {
            _user_id: data.user!.id,
            _role: "admin",
          });
          toast.success("Compte créé avec succès !");
          navigate(isAdmin ? "/admin" : "/member");
        } else {
          // Email confirmation required
          toast.success("Vérifie ton email pour confirmer ton inscription.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: isAdmin } = await (supabase.rpc as any)("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        navigate(isAdmin ? "/admin" : "/member");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ziz<span className="text-primary">creatif</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isForgot
              ? "Réinitialise ton mot de passe"
              : isSignUp
              ? "Crée ton compte"
              : "Connecte-toi à ton espace"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Prénom Nom"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ton@email.com"
            />
          </div>

          {!isForgot && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            disabled={loading}
          >
            {loading
              ? "…"
              : isForgot
              ? "Envoyer le lien"
              : isSignUp
              ? "S'inscrire"
              : "Se connecter"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          {!isForgot && !isSignUp && (
            <button
              onClick={() => { setIsForgot(true); setError(""); }}
              className="text-primary hover:underline font-medium block mx-auto"
            >
              Mot de passe oublié ?
            </button>
          )}

          {isForgot ? (
            <button
              onClick={() => { setIsForgot(false); setError(""); }}
              className="text-primary hover:underline font-medium"
            >
              Retour à la connexion
            </button>
          ) : (
            <p>
              {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Se connecter" : "S'inscrire"}
              </button>
            </p>
          )}

          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground hover:underline font-medium block mx-auto mt-2"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
