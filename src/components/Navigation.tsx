import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useUserRole } from "./useUserRole";
import { Home, Bot, BarChart3, LogOut } from "lucide-react";
import { supabase } from "../../supabaseClient";

const Navigation = () => {
  const navigate = useNavigate();
  const userRole = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="flex items-center space-x-2"
            >
              <Home className="h-5 w-5" />
              <span>Polling App</span>
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {userRole === "admin" ? (
              <>
            <Button
              variant="outline"
              onClick={() => navigate("/app/polling")}
              className="flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Admin Polls</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/app/admin")}
              className="flex items-center space-x-2"
            >
              <span>Dashboard</span>
            </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate("/app/user-polls")}
                className="flex items-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>View Polls</span>
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => navigate("/app/chat-bot")}
              className="flex items-center space-x-2"
            >
              <Bot className="h-4 w-4" />
              <span>AI Assistant</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
