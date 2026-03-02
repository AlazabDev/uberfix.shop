import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ClipboardList,
  BarChart3,
  Users,
  MapPin,
  FileText,
  Settings,
  Building2,
  Calendar,
  DollarSign,
  PlayCircle,
  Activity,
  ListChecks,
  Clock,
  Mail,
  Wallet,
  Briefcase,
  Award,
  Shield,
  UserCheck,
  Lock,
  MessageSquare,
  ScrollText,
  Store,
  Archive,
  Database,
  Bell
} from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { ModuleAccessDialog } from "./ModuleAccessDialog";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// All possible menu items with their module keys
const allMenuItems = [
  // Customer & General
  { icon: Home, label: "الرئيسية", href: "/dashboard", moduleKey: "dashboard" },
  { icon: ClipboardList, label: "طلبات الصيانة", href: "/requests", moduleKey: "requests" },
  { icon: ListChecks, label: "كل الطلبات", href: "/all-requests", moduleKey: "all_requests", showBadge: true },
  { icon: Mail, label: "صندوق البريد", href: "/inbox", moduleKey: "inbox" },
  { icon: Users, label: "الموردين والفنيين", href: "/vendors", moduleKey: "vendors" },
  { icon: BarChart3, label: "التقارير والإحصائيات", href: "/reports", moduleKey: "reports" },
  { icon: Building2, label: "العقارات", href: "/properties", moduleKey: "properties" },
  { icon: Calendar, label: "المواعيد", href: "/appointments", moduleKey: "appointments" },
  { icon: DollarSign, label: "الفواتير", href: "/invoices", moduleKey: "invoices" },
  { icon: ScrollText, label: "عقود الصيانة", href: "/contracts", moduleKey: "contracts" },
  { icon: MapPin, label: "خريطة الخدمات", href: "/service-map", moduleKey: "service_map" },
  { icon: FileText, label: "التوثيق", href: "/documentation", moduleKey: "documentation" },
  { icon: Settings, label: "الإعدادات", href: "/settings", moduleKey: "settings" },
  
  // Owner/Admin only
  { icon: PlayCircle, label: "اختبار النظام", href: "/testing", moduleKey: "testing" },
  { icon: BarChart3, label: "تقرير الإنتاج", href: "/reports/production", moduleKey: "production_report" },
  { icon: Clock, label: "لوحة SLA", href: "/reports/sla", moduleKey: "sla_dashboard" },
  { icon: Activity, label: "مراقب الإنتاج", href: "/production-monitor", moduleKey: "production_monitor" },
  { icon: UserCheck, label: "إدارة المستخدمين", href: "/admin/users", moduleKey: "admin_users" },
  { icon: UserCheck, label: "موافقات الفنيين", href: "/admin/technician-approval", moduleKey: "technician_approval" },
  { icon: Shield, label: "إعدادات المديولات", href: "/admin/module-settings", moduleKey: "module_settings" },
  { icon: Store, label: "دليل المتاجر", href: "/admin/stores", moduleKey: "module_settings" },
  { icon: Archive, label: "أرشيف الصيانة", href: "/admin/maintenance-archive", moduleKey: "module_settings" },
  { icon: DollarSign, label: "بطاقة الأسعار", href: "/admin/rate-card", moduleKey: "module_settings" },
  { icon: Building2, label: "دليل المولات", href: "/admin/malls", moduleKey: "module_settings" },
  { icon: Database, label: "استيراد البيانات", href: "/admin/data-import", moduleKey: "module_settings" },
  { icon: Bell, label: "مركز الإشعارات", href: "/dashboard/notification-center", moduleKey: "notification_center" },
  { icon: MessageSquare, label: "قوالب الرسائل", href: "/dashboard/whatsapp/templates", moduleKey: "whatsapp_templates" },
  { icon: MessageSquare, label: "سجل المراسلات", href: "/dashboard/whatsapp/logs", moduleKey: "whatsapp_logs" },
  
  // Technician specific
  { icon: Home, label: "لوحة الفني", href: "/technicians/dashboard", moduleKey: "technician_dashboard" },
  { icon: Briefcase, label: "المهام", href: "/technicians/tasks", moduleKey: "technician_tasks" },
  { icon: Wallet, label: "المحفظة", href: "/technicians/wallet", moduleKey: "technician_wallet" },
  { icon: Award, label: "الأرباح", href: "/technicians/earnings", moduleKey: "technician_earnings" },
];

export function RoleBasedSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { requests } = useMaintenanceRequests();
  const { isModuleEnabled, loading, userRole } = useModulePermissions();
  
  // State for access denied dialog
  const [accessDeniedDialog, setAccessDeniedDialog] = useState({
    open: false,
    moduleName: ""
  });

  const isActive = (path: string) => currentPath === path;

  // Handle menu item click - check permission before navigation
  const handleMenuClick = (e: React.MouseEvent, item: typeof allMenuItems[0]) => {
    const hasAccess = isModuleEnabled(item.moduleKey);
    
    if (!hasAccess) {
      e.preventDefault();
      setAccessDeniedDialog({
        open: true,
        moduleName: item.label
      });
    }
    // If has access, let the NavLink handle navigation normally
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'owner': return 'المالك';
      case 'manager': return 'مدير';
      case 'technician': return 'فني';
      default: return 'عميل';
    }
  };

  return (
    <>
      <Sidebar
        side="right"
        className={state === "collapsed" ? "w-14" : "w-64"}
        collapsible="icon"
      >
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              القائمة الرئيسية
              {userRole && (
                <span className="text-xs text-muted-foreground mr-2">
                  ({getRoleLabel(userRole)})
                </span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Show ALL menu items, not just enabled ones */}
                {allMenuItems.map((item) => {
                  const hasAccess = loading ? true : isModuleEnabled(item.moduleKey);
                  
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(item.href)}
                        className={cn(
                          !hasAccess && "opacity-60"
                        )}
                      >
                        <NavLink 
                          to={hasAccess ? item.href : "#"}
                          onClick={(e) => handleMenuClick(e, item)}
                          end
                        >
                          <div className="relative">
                            <item.icon className="h-4 w-4" />
                            {/* Lock indicator for disabled modules */}
                            {!hasAccess && (
                              <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-muted-foreground" />
                            )}
                          </div>
                          {state !== "collapsed" && (
                            <>
                              <span className={cn(!hasAccess && "text-muted-foreground")}>
                                {item.label}
                              </span>
                              {/* Lock badge for disabled modules */}
                              {!hasAccess && (
                                <Lock className="h-3 w-3 text-muted-foreground mr-auto" />
                              )}
                              {/* Badge for requests count - only if has access */}
                              {hasAccess && item.showBadge && requests.length > 0 && (
                                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold mr-auto">
                                  {requests.length}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="p-2 border-t border-border">
            {state !== "collapsed" && (
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p className="font-medium">نسخة 1.0.0</p>
                <p>© 2024 UberFix.shop</p>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Access Denied Dialog */}
      <ModuleAccessDialog 
        open={accessDeniedDialog.open}
        onOpenChange={(open) => setAccessDeniedDialog({ ...accessDeniedDialog, open })}
        moduleName={accessDeniedDialog.moduleName}
      />
    </>
  );
}
