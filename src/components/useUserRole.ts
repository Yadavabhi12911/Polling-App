import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export function useUserRole(): { role: string | null; name: string | null } {
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      const { data,  error: userError } = await supabase.auth.getUser();
  
      if (userError || !data?.user) {
        setRole(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", data.user?.id)
        .single();

      if (profileError || !profile) {
        setRole(null);
      } else {
        
        
        setRole(profile.role);
        setName(profile.name)
      
      }
    }
    fetchRole();
  }, []);

  return { role, name } ;
}
