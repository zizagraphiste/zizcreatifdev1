import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (error) {
        console.error("Role fetch error:", error);
        setUserRole("member");
        return;
      }

      setUserRole(data ? "admin" : "member");
    } catch (err) {
      console.error("Unexpected role fetch error:", err);
      setUserRole("member");
    }
  };

  const syncAuthState = async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      await Promise.race([
        fetchRole(nextSession.user.id),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            setUserRole((prev) => prev ?? "member");
            resolve();
          }, 3000)
        ),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        // IMPORTANT: do not await inside onAuthStateChange callback (can deadlock Supabase client)
        void syncAuthState(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      void syncAuthState(initialSession);
    }).catch((err) => {
      console.error("Get session error:", err);
      setUserRole(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
