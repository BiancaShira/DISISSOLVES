import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Moon, 
  Sun, 
  Home, 
  TrendingUp, 
  Clock, 
  Search, 
  Plus, 
  CheckCircle, 
  BarChart3, 
  Users, 
  History, 
  LogOut 
} from "lucide-react";

interface SidebarProps {
  onFilterChange?: (filters: { sortBy?: string; category?: string; status?: string }) => void;
  onRaiseIssue?: () => void;
}

export function Sidebar({ onFilterChange, onRaiseIssue }: SidebarProps = {}) {
  const { user, logoutMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  // Fetch pending approvals count for admin
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logoutMutation.mutate();
    }
  };

  const getInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.username?.slice(0, 2).toUpperCase() || "U";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      case "supervisor": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border shadow-lg z-30">
      {/* Logo Section */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-dark-green to-lime-green rounded-lg flex items-center justify-center">
            <Wrench className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-green dark:text-lime-green">DisiSolves</h1>
            <p className="text-xs text-muted-foreground">Internal Q&A</p>
          </div>
        </div>
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="p-2"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-lime-green rounded-full flex items-center justify-center">
            <span className="text-dark-green font-semibold text-sm">
              {getInitials(user)}
            </span>
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.username
              }
            </p>
            <Badge className={getRoleColor(user?.role || "user")}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        {/* Common menu items for all roles */}
        <Button 
          variant="ghost" 
          className="w-full justify-start bg-lime-green/10 text-dark-green dark:text-lime-green font-medium"
          onClick={() => {
            setLocation("/");
            onFilterChange?.({});
          }}
          data-testid="button-dashboard"
        >
          <Home className="mr-3 h-4 w-4" />
          Dashboard
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => {
            setLocation("/");
            onFilterChange?.({});
          }}
          data-testid="button-browse-all"
        >
          <Search className="mr-3 h-4 w-4" />
          Browse All
        </Button>

        {/* Admin Sidebar */}
        {user?.role === "admin" && (
          <>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => setLocation("/analytics")}
              data-testid="button-analytics"
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Analytics
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => setLocation("/users")}
              data-testid="button-user-management"
            >
              <Users className="mr-3 h-4 w-4" />
              User Management
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start bg-lime-green/10 text-lime-green hover:bg-lime-green/20"
              onClick={() => onRaiseIssue?.()}
              data-testid="button-raise-issue"
            >
              <Plus className="mr-3 h-4 w-4" />
              Raise Issue (Q&A in one)
            </Button>
          </>
        )}

        {/* Supervisor Sidebar */}
        {user?.role === "supervisor" && (
          <>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => setLocation("/activity")}
              data-testid="button-my-activity"
            >
              <History className="mr-3 h-4 w-4" />
              My Activity
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start bg-lime-green/10 text-lime-green hover:bg-lime-green/20"
              onClick={() => onRaiseIssue?.()}
              data-testid="button-raise-issue"
            >
              <Plus className="mr-3 h-4 w-4" />
              Raise Issue
            </Button>
          </>
        )}

        {/* User Sidebar */}
        {user?.role === "user" && (
          <>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => setLocation("/activity")}
              data-testid="button-my-activity"
            >
              <History className="mr-3 h-4 w-4" />
              My Activity
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start bg-lime-green/10 text-lime-green hover:bg-lime-green/20"
              onClick={() => onRaiseIssue?.()}
              data-testid="button-raise-issue"
            >
              <Plus className="mr-3 h-4 w-4" />
              Raise Issue
            </Button>
          </>
        )}
      </nav>
      
      {/* Logout */}
      <div className="absolute bottom-4 left-4 right-4">
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="mr-3 h-4 w-4" />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  );
}
