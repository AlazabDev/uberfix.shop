import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send, Loader2, ImagePlus, X, Wrench, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SERVICE_TYPES = [
  { value: 'ac', label: 'تكييف', emoji: '❄️' },
  { value: 'electrical', label: 'كهرباء', emoji: '⚡' },
  { value: 'plumbing', label: 'سباكة', emoji: '🔧' },
  { value: 'carpentry', label: 'نجارة', emoji: '🪚' },
  { value: 'painting', label: 'دهانات', emoji: '🎨' },
  { value: 'cleaning', label: 'تنظيف', emoji: '🧹' },
  { value: 'metalwork', label: 'حدادة', emoji: '⚙️' },
  { value: 'other', label: 'أخرى', emoji: '📋' },
];

const PRIORITIES = [
  { value: 'high', label: 'عاجل', emoji: '🔴' },
  { value: 'medium', label: 'متوسط', emoji: '🟡' },
  { value: 'low', label: 'عادي', emoji: '🟢' },
];

const BRANCHES = [
  'الفرع الرئيسي',
  'فرع المعادي',
  'فرع مدينة نصر',
  'فرع الشيخ زايد',
  'فرع التجمع الخامس',
  'فرع الإسكندرية',
];

interface SuccessData {
  request_number: string;
  request_id: string;
  track_url: string;
}

export function WhatsAppMaintenanceForm({ className }: { className?: string }) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [branch, setBranch] = useState('');
  const [priority, setPriority] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ', description: 'تم نسخ رقم الطلب' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !serviceType || !branch || !priority || !description.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Convert image to base64 if exists
      const images: string[] = [];
      if (imagePreview) {
        images.push(imagePreview);
      }

      const { data, error } = await supabase.functions.invoke('submit-public-request', {
        body: {
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          client_email: clientEmail.trim(),
          service_type: serviceType,
          branch_name: branch,
          priority,
          description: description.trim(),
          images: images.length > 0 ? images : undefined,
          channel: 'public_form',
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSuccess({
          request_number: data.request_number,
          request_id: data.request_id,
          track_url: data.track_url,
        });
      } else {
        throw new Error(data?.message_ar || 'فشل في إنشاء الطلب');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل في إرسال الطلب',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setServiceType('');
    setBranch('');
    setPriority('');
    setDescription('');
    removeImage();
    setSuccess(null);
  };

  // Success screen
  if (success) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">تم إرسال طلبك بنجاح! ✅</h2>
            <p className="text-muted-foreground">سيتم التواصل معك قريباً</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 space-y-3 max-w-sm mx-auto">
            <p className="text-sm text-muted-foreground">رقم الطلب</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-mono font-bold text-primary tracking-wider">
                {success.request_number}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(success.request_number)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(success.track_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              تتبع حالة الطلب
            </Button>
            <Button onClick={resetForm} className="gap-2">
              <Send className="h-4 w-4" />
              إرسال طلب جديد
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          طلب صيانة سريع
        </CardTitle>
        <CardDescription>أرسل طلب صيانة بدون تسجيل دخول — سيتم إنشاء رقم طلب فوري</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* اسم مقدم الطلب */}
          <div className="space-y-2">
            <Label htmlFor="client-name">✍️ اسم مقدم الطلب *</Label>
            <Input
              id="client-name"
              placeholder="أدخل اسمك الكامل"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* رقم الهاتف */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-phone">📱 رقم الهاتف</Label>
              <Input
                id="client-phone"
                type="tel"
                dir="ltr"
                placeholder="+201234567890"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">📧 البريد الإلكتروني</Label>
              <Input
                id="client-email"
                type="email"
                dir="ltr"
                placeholder="email@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
          </div>

          {/* نوع الصيانة */}
          <div className="space-y-2">
            <Label>🔧 نوع الصيانة *</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue placeholder="اختر نوع الصيانة" /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* الفرع */}
          <div className="space-y-2">
            <Label>🏢 اسم الفرع *</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* الأولوية */}
          <div className="space-y-2">
            <Label>📋 الأولوية *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue placeholder="اختر الأولوية" /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.emoji} {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* وصف المشكلة */}
          <div className="space-y-2">
            <Label htmlFor="description">📝 وصف المشكلة *</Label>
            <Textarea
              id="description"
              placeholder="اشرح المشكلة بالتفصيل..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{description.length}/500 حرف</p>
          </div>

          {/* صورة */}
          <div className="space-y-2">
            <Label>📷 صورة المشكلة (اختياري)</Label>
            {imagePreview ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeImage}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">اضغط لإرفاق صورة</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !clientName.trim() || !serviceType || !branch || !priority || !description.trim()}
            className="w-full gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'جاري الإرسال...' : 'إرسال طلب الصيانة'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
