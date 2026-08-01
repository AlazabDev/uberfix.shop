import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, MapPin } from "lucide-react";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { MapLocationPicker } from "@/components/maps/MapLocationPicker";
import type { Service } from "@/hooks/useServices";
import { getPropertyIcon } from "@/lib/propertyIcons";

const formSchema = z.object({
  property_id: z.string().optional(),
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  client_name: z.string().min(1, "اسم المسؤول مطلوب"),
  client_phone: z.string().optional(),
  client_email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  location: z.string().min(1, "الموقع مطلوب"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  preferred_date: z.string().optional(),
  preferred_time: z.string().optional(),
  temp_contact_name: z.string().optional(),
  temp_contact_country_code: z.string().default("+20"),
  temp_contact_phone: z.string().optional(),
});

interface RequestDetailsStepProps {
  selectedServices: string[];
  onBack: () => void;
}

export const RequestDetailsStep = ({ selectedServices, onBack }: RequestDetailsStepProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      temp_contact_country_code: "+20"
    }
  });

  useEffect(() => {
    fetchServices();
    fetchProperties();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabaseLegacy.from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchSubcategories = async (categoryId: string) => {
    const { data } = await supabaseLegacy.from('services')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data) setSubcategories(data);
  };

  const fetchServices = async () => {
    const { data } = await supabaseLegacy.from('services')
      .select('*')
      .in('id', selectedServices);
    if (data) setServices(data);
  };

  const fetchProperties = async () => {
    const { data } = await supabaseLegacy.from('properties')
      .select('id, name, type, icon_url')
      .eq('status', 'active')
      .order('name');
    if (data) setProperties(data);
  };

  const handleLocationSelect = (data: { lat: number; lng: number; address?: string }) => {
    form.setValue('latitude', data.lat);
    form.setValue('longitude', data.lng);
    if (data.address) {
      form.setValue('location', data.address);
    }
    toast({
      title: "تم تحديد الموقع",
      description: data.address || `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('يجب تسجيل الدخول لإنشاء طلب');
      }

      // حساب التكاليف
      const totalServicePrice = services.reduce((sum, s) => sum + Number(s.base_price || 0), 0);
      const inspectionPrice = services.some(s => s.requires_inspection) 
        ? services.find(s => s.requires_inspection)?.inspection_price || 0 
        : 0;
      const taxAmount = (totalServicePrice + inspectionPrice) * 0.14;

      // جلب بيانات المستخدم
      const { data: profile, error: profileError } = await supabaseLegacy.from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile?.company_id) {
        console.error('Profile error:', profileError);
        throw new Error('لم يتم العثور على بيانات الشركة. يرجى التواصل مع المسؤول.');
      }

      // جلب أول فرع للشركة
      const { data: branch, error: branchError } = await supabaseLegacy.from('branches')
        .select('id')
        .eq('company_id', profile.company_id)
        .limit(1)
        .maybeSingle();

      if (branchError || !branch) {
        console.error('Branch error:', branchError);
        throw new Error('لم يتم العثور على فرع للشركة. يرجى إنشاء فرع أولاً.');
      }

      // إعداد البيانات للإرسال
      const requestData = {
        company_id: profile.company_id,
        branch_id: branch.id,
        created_by: user.id,
        title: values.title,
        description: values.description || null,
        client_name: values.client_name,
        client_phone: values.client_phone || null,
        client_email: values.client_email || null,
        location: values.location,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        service_type: services.map(s => s.name).join(', '),
        category_id: values.category_id || null,
        subcategory_id: values.subcategory_id || null,
        property_id: values.property_id || null,
        status: 'Open' as const,
        workflow_stage: 'submitted',
        estimated_cost: totalServicePrice + inspectionPrice + taxAmount
      };

      

      const { data: request, error: requestError } = await supabaseLegacy.from('maintenance_requests')
        .insert([requestData])
        .select()
        .maybeSingle();

      if (requestError) {
        console.error('Submit error:', requestError);
        throw new Error(`فشل في إنشاء الطلب: ${requestError.message}`);
      }

      

      toast({
        title: "✅ تم إنشاء الطلب بنجاح",
        description: `رقم الطلب: ${request.id.substring(0, 8)}`,
      });

      navigate('/requests');
    } catch (error) {
      console.error('Error creating request:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast({
        title: "❌ خطأ في إنشاء الطلب",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">الخدمات المحددة</h3>
            <div className="space-y-2 mb-6">
              {services.map(service => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>{service.name}</span>
                  <span className="font-bold">{service.base_price} جنيه</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العقار (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العقار" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map(prop => (
                          <SelectItem key={prop.id} value={prop.id}>
                            <div className="flex items-center gap-2">
                              <img 
                                src={prop.icon_url || getPropertyIcon(prop.type)} 
                                alt="" 
                                className="h-4 w-4"
                              />
                              <span>{prop.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الطلب *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثال: صيانة كهرباء" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الخدمة</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('subcategory_id', '');
                        fetchSubcategories(value);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الخدمة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon_url} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الخدمة الفرعية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الخدمة الفرعية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name} - {sub.base_price} جنيه
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المسؤول *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" dir="ltr" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" dir="ltr" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموقع *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </div>
                    <MapLocationPicker
                      defaultLatitude={form.watch('latitude')}
                      defaultLongitude={form.watch('longitude')}
                      onLocationSelect={handleLocationSelect}
                      height="300px"
                      showSearch={true}
                      showCurrentLocation={true}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التاريخ المفضل</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوقت المفضل</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>التفاصيل</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="mt-4">
              <FormLabel>الصور المرفقة</FormLabel>
              <ImageUpload
                images={[]}
                onImagesChange={() => {
                  // سيتم تحميل الصور لاحقاً
                }}
                maxImages={5}
              />
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="font-bold mb-4">بيانات التواصل المؤقتة (اختياري)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="temp_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الشخص للتواصل</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="temp_contact_country_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز الدولة</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="temp_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الجوال</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" dir="ltr" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowRight className="ml-2 h-4 w-4" />
            السابق
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            إرسال الطلب
          </Button>
        </div>
      </form>
    </Form>
  );
};
