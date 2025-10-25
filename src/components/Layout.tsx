import { Outlet } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />
      <main className="relative">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
