import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Trash2 } from "lucide-react";

const accountSchema = z.object({
  first_name: z.string().min(1, "الاسم مطلوب"),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export const AccountSettings = () => {
  const { profile, preferences, updateProfile, updatePreferences } = useUserSettings();
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences?.notifications_enabled ?? true);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Resolve avatar to a signed URL (private bucket)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = profile?.avatar_url;
      if (!raw) { setAvatarUrl(null); return; }
      if (raw.startsWith("http")) { setAvatarUrl(raw); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(raw, 60 * 60);
      if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [profile?.avatar_url]);

  const initials = (profile?.first_name?.[0] ?? profile?.name?.[0] ?? "U").toUpperCase();

  const handlePickFile = () => fileRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "ملف غير صالح", description: "اختر صورة (JPG / PNG / WEBP).", variant: "destructive" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "الحجم كبير", description: "الحد الأقصى 3 ميجابايت.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("جلسة غير صالحة");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      updateProfile({ avatar_url: path });
    } catch (err) {
      toast({
        title: "فشل رفع الصورة",
        description: err instanceof Error ? err.message : "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!profile?.avatar_url) return;
    if (!profile.avatar_url.startsWith("http")) {
      await supabase.storage.from("avatars").remove([profile.avatar_url]);
    }
    updateProfile({ avatar_url: null });
  };

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    values: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      position: profile?.position || "",
    },
  });

  const onSubmit = (values: AccountFormValues) => {
    updateProfile(values);
  };

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    // Notifications settings removed
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>البيانات الشخصية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="avatar" /> : null}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handlePickFile}
                disabled={uploading}
                className="absolute -bottom-1 -left-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md hover:opacity-90 disabled:opacity-50"
                aria-label="تغيير الصورة"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">الصورة الشخصية</div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handlePickFile} disabled={uploading}>
                  {uploading ? "جارٍ الرفع..." : "تغيير الصورة"}
                </Button>
                {profile?.avatar_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
                    <Trash2 className="ms-1 h-4 w-4" /> إزالة
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG / PNG / WEBP — حتى 3 ميجابايت</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم بالكامل *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل الاسم" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اللقب</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل اللقب" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="+20 123 456 7890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوظيفة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: مدير" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <Label>استقبال الإشعارات</Label>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationsChange}
                  />
                </div>
                <Button type="submit">حفظ</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
