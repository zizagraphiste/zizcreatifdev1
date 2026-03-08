import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdminProfileData = {
  full_name: string | null;
  avatar_url: string | null;
};

type AdminProfileContextType = {
  adminProfile: AdminProfileData | null;
  refreshProfile: () => void;
};

const AdminProfileContext = createContext<AdminProfileContextType>({
  adminProfile: null,
  refreshProfile: () => {},
});

export function AdminProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [adminProfile, setAdminProfile] = useState<AdminProfileData | null>(null);

  const fetchProfile = useCallback(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setAdminProfile(data as AdminProfileData);
      });
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <AdminProfileContext.Provider value={{ adminProfile, refreshProfile: fetchProfile }}>
      {children}
    </AdminProfileContext.Provider>
  );
}

export function useAdminProfile() {
  return useContext(AdminProfileContext);
}
