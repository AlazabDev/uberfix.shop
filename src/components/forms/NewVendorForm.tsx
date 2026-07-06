import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { IconSelector } from "./IconSelector";
import { vendorFormSchema } from "@/lib/validationSchemas";
import { SPECIALIZATIONS_LIST } from "@/constants/technicianConstants";

interface NewVendorFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

type VendorFormData = z.infer<typeof vendorFormSchema>;

export const NewVendorForm = ({ onClose, onSuccess }: NewVendorFormProps) => {
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState("");
  const [mapIcon, setMapIcon] = useState<string | null>(null);

  // Use unified specializations from constants
  const specialties = [
    ...SPECIALIZATIONS_LIST.map(s => s.labelAr),
    "بلاط وسيراميك",
    "عزل",
    "تنظيف",
    "أخرى"
  ];

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      company_name: "",
      specialization: [],
      phone: "",
      email: "",
      address: "",
      unit_rate: "",
      experience_years: "",
      notes: "",
    },
  });

  const addCertification = () => {
    if (newCertification.trim() && !certifications.includes(newCertification.trim())) {
      setCertifications(prev => [...prev, newCertification.trim()]);
      setNewCertification("");
    }
  };

  const removeCertification = (cert: string) => {
    setCertifications(prev => prev.filter(c => c !== cert));
  };

  const onSubmit = async (data: VendorFormData) => {
    try {
      // التحقق من تسجيل الدخول
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      // إنشاء المورد مباشرة في جدول vendors
      const vendorData = {
        name: data.name,
        company_name: data.company_name || null,
        specialization: data.specialization,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        unit_rate: data.unit_rate && data.unit_rate !== "" ? parseFloat(data.unit_rate) : null,
        experience_years: data.experience_years && data.experience_years !== "" ? parseInt(data.experience_years) : null,
        status: 'active',
        certifications: certifications.length > 0 ? certifications : null,
        map_icon: mapIcon || null
      };

      const { error } = await supabase
        .from('vendors')
        .insert([vendorData as any]);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "تم بنجاح",
        description: "تم إضافة الفني الجديد بنجاح"
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding vendor:', error);
      
      let errorMessage = "حدث خطأ في إضافة الفني";
      
      // معالجة الأخطاء الشائعة
      if (error instanceof Error) {
        if (error.message?.includes('permission denied') || error.message?.includes('policy')) {
          errorMessage = "ليس لديك صلاحية لإضافة فنيين. يرجى التواصل مع المدير.";
        } else if (error.message?.includes('duplicate')) {
          errorMessage = "هذا البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل";
        }
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">إضافة مورد جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم *</FormLabel>
                    <FormControl>
                      <Input placeholder="اسم المورد" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الشركة</FormLabel>
                    <FormControl>
                      <Input placeholder="اسم الشركة (اختياري)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التخصص *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange([value])} 
                      value={field.value[0] || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التخصص" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>
                            {specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input placeholder="01xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>رقم هاتف مصري (11 رقم)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unit_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر الوحدة (جنيه)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Input placeholder="العنوان الكامل" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experience_years"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سنوات الخبرة</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="50" placeholder="عدد سنوات الخبرة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>الشهادات والتراخيص</FormLabel>
              <div className="flex gap-2 mb-2 mt-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="أضف شهادة أو ترخيص"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                />
                <Button type="button" onClick={addCertification} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {certifications.map((cert) => (
                  <Badge key={cert} variant="secondary" className="px-2 py-1">
                    {cert}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => removeCertification(cert)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <IconSelector
              value={mapIcon}
              onChange={setMapIcon}
              specialization={form.watch("specialization")[0]}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ملاحظات إضافية"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
                {form.formState.isSubmitting ? "جاري الإضافة..." : "إضافة المورد"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
