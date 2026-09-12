import { NavLink, useLocation } from "react-router-dom";
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
  Mail
} from "lucide-react";
import { useRequestsCounts } from "@/hooks/useRequestsCount";

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

const items = [
  {
    icon: Home,
    label: "الرئيسية",
    href: "/dashboard"
  },
  {
    icon: ClipboardList,
    label: "طلبات الصيانة",
    href: "/requests"
  },
  {
    icon: ListChecks,
    label: "كل الطلبات",
    href: "/all-requests",
    showBadge: true
  },
  {
    icon: Mail,
    label: "الدردشة",
    href: "/inbox"
  },
  {
    icon: Users,
    label: "الموردين والفنيين",
    href: "/vendors"
  },
  {
    icon: Building2,
    label: "العقارات",
    href: "/properties"
  },
  {
    icon: Calendar,
    label: "المواعيد",
    href: "/appointments"
  },
  {
    icon: DollarSign,
    label: "الفواتير",
    href: "/invoices"
  },
  {
    icon: FileText,
    label: "العقود",
    href: "/contracts"
  },
  {
    icon: MapPin,
    label: "خريطة الخدمات",
    href: "/service-map"
  },
  {
    icon: BarChart3,
    label: "التقارير",
    href: "/reports"
  },
  {
    icon: Clock,
    label: "لوحة SLA",
    href: "/reports/sla"
  },
  {
    icon: Activity,
    label: "مراقب الإنتاج",
    href: "/production-monitor"
  },
  {
    icon: Settings,
    label: "الإعدادات",
    href: "/settings"
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { counts } = useRequestsCounts();

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className="justify-start group-data-[collapsible=icon]:justify-center"
                  >
                    <NavLink to={item.href} end>
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && (
                        <>
                          <span>{item.label}</span>
                          {item.showBadge && counts.total > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold mr-auto">
                              {counts.total}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
  );
}
