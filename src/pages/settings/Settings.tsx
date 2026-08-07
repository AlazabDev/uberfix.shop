import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { PlatformSettings } from "@/components/settings/PlatformSettings";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { WorkOrderSettings } from "@/components/settings/WorkOrderSettings";
import { TechniciansSettings } from "@/components/settings/TechniciansSettings";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";
import { UISettings } from "@/components/settings/UISettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { ETAInvoicingSettings } from "@/components/settings/ETAInvoicingSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { LauncherSettings } from "@/components/settings/LauncherSettings";
import { UFBotTrainingPanel } from "@/components/ufbot/UFBotTrainingPanel";
import { 
  User, 
  Building2, 
  Key, 
  CreditCard, 
  Settings as SettingsIcon,
  ClipboardList,
  Users,
  Bell,
  Palette,
  Plug,
  Shield,
  LayoutGrid
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function Settings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "account";

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <SettingsIcon className="h-7 w-7 text-primary" />
          مركز التحكم - UberFix.shop
        </h1>
        <p className="text-muted-foreground mt-2">
          إدارة شاملة لجميع إعدادات التطبيق من مكان واحد
        </p>
      </div>
      
      <Tabs defaultValue={defaultTab} dir="rtl" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1">
          <TabsTrigger value="account" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الحساب</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">عام</span>
          </TabsTrigger>
          <TabsTrigger value="workorders" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الطلبات</span>
          </TabsTrigger>
          <TabsTrigger value="technicians" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الفنيون</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الإشعارات</span>
          </TabsTrigger>
          <TabsTrigger value="ui" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الواجهة</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Plug className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">التكاملات</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الأمان</span>
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">المنصة</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <Key className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">كلمة المرور</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الاشتراك</span>
          </TabsTrigger>
          <TabsTrigger value="launcher" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2">
            <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">التطبيقات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="workorders">
          <WorkOrderSettings />
        </TabsContent>

        <TabsContent value="technicians">
          <TechniciansSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsSettings />
        </TabsContent>

        <TabsContent value="ui">
          <UISettings />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsSettings />
          <div className="mt-6">
            <ETAInvoicingSettings />
          </div>
          <div className="mt-6">
            <UFBotTrainingPanel />
          </div>
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="platform">
          <PlatformSettings />
        </TabsContent>

        <TabsContent value="password">
          <PasswordSettings />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionSettings />
        </TabsContent>

        <TabsContent value="launcher">
          <LauncherSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
