import { Settings, User, Menu, LogOut, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ROLE_LABELS, ROLE_HIERARCHY, type AppRole } from "@/config/owners";

interface HeaderProps {
  onMenuToggle?: () => void;
}

interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
}

export const Header = ({ onMenuToggle }: HeaderProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const { roles } = useUserRoles();

  // Highest-priority role label from user_roles (single source of truth)
  const primaryRoleLabel = (() => {
    if (!roles || roles.length === 0) return "";
    const sorted = [...roles].sort(
      (a, b) => ROLE_HIERARCHY.indexOf(a as AppRole) - ROLE_HIERARCHY.indexOf(b as AppRole)
    );
    return ROLE_LABELS[sorted[0] as AppRole] || sorted[0];
  })();

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setUserData({
        email: user.email || "",
        firstName: profile?.first_name || "مستخدم",
        lastName: profile?.last_name || "",
        avatarUrl: profile?.avatar_url || null,
        role: "" // populated reactively from user_roles via primaryRoleLabel
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "تم تسجيل الخروج",
        description: "نراك قريباً",
      });
      navigate("/login");
    } catch {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الخروج",
        variant: "destructive",
      });
    }
  };

  const getInitials = () => {
    if (!userData) return "م";
    const first = userData.firstName?.charAt(0) || "";
    const last = userData.lastName?.charAt(0) || "";
    return `${first}${last}` || "م";
  };

  const getFullName = () => {
    if (!userData) return "المستخدم";
    return `${userData.firstName} ${userData.lastName}`.trim() || "المستخدم";
  };
  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border/50 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Logo and Menu */}
      <div className="flex items-center gap-2 sm:gap-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          className="hover:bg-primary/10 transition-colors p-2 sm:p-3"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Professional Logo with A and Gear */}
          <div className="relative w-8 h-8 sm:w-12 sm:h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <div className="relative">
              <span className="text-primary-foreground font-bold text-sm sm:text-lg">A</span>
              <Cog className="absolute -top-1 -right-1 h-2 w-2 sm:h-3 sm:w-3 text-primary-foreground/80 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-primary tracking-tight">UberFix.shop</h1>
            <p className="text-xs text-muted-foreground font-medium">نظام إدارة طلبات الصيانة المتطور</p>
          </div>
          {/* Mobile Logo Text */}
          <div className="block sm:hidden">
            <h1 className="text-sm font-bold text-primary tracking-tight">UberFix.shop</h1>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* Notifications */}
        <NotificationsList />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 sm:gap-3 hover:bg-primary/10 transition-all duration-200 p-1 sm:p-2 rounded-xl"
            >
              <Avatar className="h-9 w-9 sm:h-11 sm:w-11 border-2 border-primary/30 shadow-lg ring-2 ring-primary/10 hover:ring-primary/30 transition-all">
                <AvatarImage 
                  src={userData?.avatarUrl || "/lovable-uploads/fb9d438e-077d-4ce0-997b-709c295e2b35.png"} 
                  alt={getFullName()} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-xs sm:text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-foreground">{getFullName()}</p>
                <p className="text-xs text-muted-foreground">{userData?.role || "..."}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
            <DropdownMenuLabel className="text-right py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage 
                    src={userData?.avatarUrl || "/lovable-uploads/fb9d438e-077d-4ce0-997b-709c295e2b35.png"} 
                    alt={getFullName()} 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 flex-1">
                  <p className="text-sm font-semibold leading-none">{getFullName()}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userData?.email || "..."}
                  </p>
                  <span className="text-xs text-primary font-medium">{userData?.role || "..."}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => navigate("/settings")}
            >
              <User className="ml-2 h-4 w-4 text-primary" />
              <span>الملف الشخصي</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => navigate("/settings")}
            >
              <Settings className="ml-2 h-4 w-4 text-primary" />
              <span>الإعدادات</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="text-destructive cursor-pointer hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 transition-colors"
            >
              <LogOut className="ml-2 h-4 w-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
