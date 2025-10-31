import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

type UserRoleState = { role: string | null; name: string | null; loading: boolean };

export function useUserRole(): UserRoleState {
  const cached = typeof window !== "undefined" ? window.sessionStorage.getItem("userRoleCache") : null;
  const initial = cached ? JSON.parse(cached) as { role: string | null; name: string | null } : { role: null, name: null };
  const [role, setRole] = useState<string | null>(initial.role);
  const [name, setName] = useState<string | null>(initial.name);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchRole() {
      const { data,  error: userError } = await supabase.auth.getUser();
  
      if (userError || !data?.user) {
        setRole(null);
        setName(null);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", data.user?.id)
        .single();

      if (profileError || !profile) {
        setRole(null);
        setName(null);
      } else {
        setRole(profile.role);
        setName(profile.name)
        // cache for faster perceived load on next navigation
        try {
          window.sessionStorage.setItem("userRoleCache", JSON.stringify({ role: profile.role, name: profile.name }));
        } catch {}
      }
      setLoading(false);
    }
    fetchRole();
  }, []);

  return { role, name, loading } ;
}
