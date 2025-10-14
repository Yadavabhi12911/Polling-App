import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export function useUserRole(): string | null {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      const { data: user, error: userError } = await supabase.auth.getUser();
    
      
      if (userError || !user?.user) {
        setRole(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.user.id)
        .single();

      if (profileError || !profile) {
        setRole(null);
      } else {
        setRole(profile.role);
      }
    }
    fetchRole();
  }, []);

  return role;
}
