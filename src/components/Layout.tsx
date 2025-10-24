import { Outlet } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
