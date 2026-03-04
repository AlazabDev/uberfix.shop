import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, ArrowRight } from "lucide-react";
import { getSpecializationLabel } from "@/constants/technicianConstants";

interface SelectedTechnician {
  id: string;
  name: string;
  phone: string;
  specialization: string;
  rating: number;
  total_reviews: number;
  status: string;
  latitude: number;
  longitude: number;
}

export default function QuickRequestFromMap() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [technician, setTechnician] = useState<SelectedTechnician | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    location: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    const savedTechnician = sessionStorage.getItem('selectedTechnician');
    if (savedTechnician) {
      try {
        setTechnician(JSON.parse(savedTechnician));
      } catch {
        navigateBack();
      }
    } else {
      navigateBack();
    }
  }, []);

  const navigateBack = () => {
    toast({
      title: '⚠️ لم يتم اختيار فني',
      description: 'يرجى العودة للخريطة واختيار فني',
      variant: 'destructive',
    });
    navigate('/service-map');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technician) return;
    
    setSubmitting(true);

    try {
      // Get any available branch and company for routing
      const { data: branch } = await supabase
        .from('branches')
        .select('id, company_id')
        .limit(1)
        .maybeSingle();

      if (!branch) {
        throw new Error('لا يوجد فرع متاح لتوجيه الطلب');
      }

      const { data: request, error } = await supabase
        .from('maintenance_requests')
        .insert([{
          title: `طلب صيانة - ${getSpecializationLabel(technician.specialization)}`,
          description: formData.description,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email || null,
          location: formData.location,
          priority: formData.priority,
          status: 'Open' as any,
          company_id: branch.company_id,
          branch_id: branch.id,
          assigned_technician_id: technician.id,
          service_type: technician.specialization,
          channel: 'map',
        }])
        .select()
        .maybeSingle();

      if (error) throw error;

      toast({
        title: '✅ تم إنشاء الطلب بنجاح',
        description: `رقم الطلب: ${request?.request_number || request?.id?.slice(0, 8)}`,
      });

      sessionStorage.removeItem('selectedTechnician');
      navigate('/service-map');
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: '❌ خطأ في إنشاء الطلب',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!technician) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background py-8" dir="rtl">
      <div className="container max-w-4xl mx-auto px-4">
        <Card className="border-primary/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl">طلب صيانة سريع</CardTitle>
            <CardDescription>
              املأ البيانات التالية لإتمام طلب الصيانة
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* بطاقة الفني المختار */}
            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{technician.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getSpecializationLabel(technician.specialization)}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(technician.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground mr-1">
                        ({technician.total_reviews})
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/service-map')}
                  >
                    تغيير الفني
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* نموذج الطلب */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">الاسم *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_phone">رقم الهاتف *</Label>
                  <Input
                    id="client_phone"
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_email">البريد الإلكتروني (اختياري)</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">العنوان *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="أدخل عنوانك بالتفصيل"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">الأولوية</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">عادية</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف المشكلة *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اشرح المشكلة بالتفصيل..."
                  rows={5}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/service-map')}
                  className="flex-1"
                >
                  رجوع
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      إرسال الطلب
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}