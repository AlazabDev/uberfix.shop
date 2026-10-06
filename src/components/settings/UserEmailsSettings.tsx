import { useEffect, useState } from "react";
import { Loader2, Mail, Plus, Star, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type UserEmail = {
  id: string;
  email: string;
  label: string | null;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const UserEmailsSettings = () => {
  const { toast } = useToast();
  const [emails, setEmails] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_emails")
      .select("id, email, label, is_primary, is_verified, created_at")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "تعذر تحميل العناوين", description: error.message, variant: "destructive" });
    }
    setEmails((data ?? []) as UserEmail[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      toast({ title: "بريد غير صالح", description: "أدخل بريدًا إلكترونيًا صحيحًا.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error("جلسة غير صالحة");

      const { error } = await supabase.from("user_emails").insert({
        user_id: userId,
        email,
        label: newLabel.trim() || null,
        is_primary: emails.length === 0,
      });
      if (error) {
        throw new Error(
          error.code === "23505" || error.message.includes("duplicate")
            ? "هذا البريد مضاف بالفعل"
            : error.message
        );
      }

      setNewEmail("");
      setNewLabel("");
      toast({ title: "تمت الإضافة", description: "أُضيف البريد إلى حسابك." });
      await load();
    } catch (err) {
      toast({
        title: "فشل الإضافة",
        description: err instanceof Error ? err.message : "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMakePrimary = async (id: string) => {
    setSaving(true);
    try {
      const current = emails.find((e) => e.is_primary);
      if (current && current.id !== id) {
        const { error: clearErr } = await supabase
          .from("user_emails")
          .update({ is_primary: false })
          .eq("id", current.id);
        if (clearErr) throw clearErr;
      }
      const { error } = await supabase.from("user_emails").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
      await load();
    } catch (err) {
      toast({
        title: "تعذر التعيين",
        description: err instanceof Error ? err.message : "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("user_emails").delete().eq("id", id);
    if (error) {
      toast({ title: "تعذر الحذف", description: error.message, variant: "destructive" });
    } else {
      await load();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          عناوين البريد الإضافية
        </CardTitle>
        <CardDescription>
          أضف أكثر من عنوان بريد لحسابك لاستقبال الإشعارات، وحدّد عنوانًا رئيسيًا واحدًا.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="newEmail">البريد الإلكتروني</Label>
            <Input
              id="newEmail"
              type="email"
              dir="ltr"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newLabel">وصف (اختياري)</Label>
            <Input
              id="newLabel"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="مثال: بريد العمل"
            />
          </div>
          <Button onClick={handleAdd} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : emails.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            لا توجد عناوين بريد إضافية بعد.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {emails.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 flex-wrap">
                <div className="space-y-1">
                  <div className="font-medium" dir="ltr">
                    {item.email}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.label && <span>{item.label}</span>}
                    {item.is_primary && <Badge variant="secondary">رئيسي</Badge>}
                    {item.is_verified ? (
                      <Badge variant="secondary">مُوثّق</Badge>
                    ) : (
                      <Badge variant="outline">غير مُوثّق</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!item.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => handleMakePrimary(item.id)}
                      className="gap-1"
                    >
                      <Star className="h-3.5 w-3.5" />
                      تعيين رئيسي
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
