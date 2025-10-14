import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type AdminRouteProps = {
  children: React.ReactNode;
};

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkRole = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (isMounted) {
        setIsAdmin(profile?.role === "admin");
        setLoading(false);
      }
    };

    checkRole();
    return () => {
      isMounted = false;
    };
  }, []);

 
  
  if (loading) {
    return <div className="p-10 text-center">Checking permissions...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;


