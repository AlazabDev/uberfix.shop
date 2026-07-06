import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AppSettings {
  id: string;
  // General Settings
  app_name: string;
  app_logo_url: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  default_currency: string;
  timezone: string;
  default_language: string;
  allow_self_registration: boolean;
  
  // Work Order Settings
  order_stages: string[];
  max_execution_time: number;
  allow_edit_after_start: boolean;
  require_manager_approval: boolean;
  
  // Technicians & Clients Settings
  show_technicians_on_map: boolean;
  enable_technician_rating: boolean;
  allow_technician_quotes: boolean;
  technician_statuses: string[];
  
  // Notifications Settings
  notification_types: string[];
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  enable_in_app_notifications: boolean;
  enable_reminders: boolean;
  notification_templates: Record<string, any>;
  
  // UI/UX Settings
  theme_mode: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  map_style: string;
  show_footer: boolean;
  custom_css: string | null;
  
  // Integrations Settings
  google_maps_enabled: boolean;
  erpnext_enabled: boolean;
  erpnext_url: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null;
  smtp_from_email: string | null;
  
  // Security & Backup Settings
  enable_2fa: boolean;
  auto_backup_enabled: boolean;
  backup_frequency: string;
  lock_sensitive_settings: boolean;
  session_timeout: number;
  
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export function useAppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as AppSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      const { data, error } = await supabase
        .from("app_settings")
        .update(updates as any)
        .eq("id", settings?.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ الإعدادات بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
  };
}
