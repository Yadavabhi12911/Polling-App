import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useUserRole } from "./useUserRole";
import { Home, Bot, BarChart3, LogOut, Settings, Menu } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const Navigation = () => {
  const navigate = useNavigate();
  const userRole = useUserRole();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/signin");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand Section */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="flex items-center gap-3 px-3 hover:bg-accent"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
                <Home className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight">
                ChatPoll
              </span>
            </Button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {userRole === "admin" ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/app/polling")}
                  className="gap-2 hover:bg-accent"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">Admin Polls</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/app/admin")}
                  className="gap-2 hover:bg-accent"
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Dashboard</span>
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/app/user-polls")}
                className="gap-2 hover:bg-accent"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium">View Polls</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/chat-bot")}
              className="gap-2 hover:bg-accent"
            >
              <Bot className="h-4 w-4" />
              <span className="font-medium">AI Assistant</span>
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {userRole === "admin" ? (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/app/polling")}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Admin Polls</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/app/admin")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/app/user-polls")}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>View Polls</span>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => navigate("/app/chat-bot")}>
                  <Bot className="mr-2 h-4 w-4" />
                  <span>AI Assistant</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
