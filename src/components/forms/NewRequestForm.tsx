import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Loader2, Building2, Plus, User, Pencil, Check } from "lucide-react";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { useToast } from "@/hooks/use-toast";
import { MapLocationPicker } from "@/components/maps/MapLocationPicker";
import { supabase } from "@/integrations/supabase/client";
import { useProperties } from "@/hooks/useProperties";
import { SmartPropertyForm } from "@/components/forms/property";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { maintenanceRequestFormSchema } from "@/lib/validationSchemas";
import { getPropertyIcon } from "@/lib/propertyIcons";
import { ImageUpload } from "@/components/forms/ImageUpload";

interface NewRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialPropertyId?: string;
}

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestFormSchema>;

export function NewRequestForm({ onSuccess, onCancel, initialPropertyId }: NewRequestFormProps) {
  const { createRequest } = useMaintenanceRequests();
  const { properties, loading: propertiesLoading } = useProperties();
  const { toast } = useToast();
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestFormSchema),
    defaultValues: {
      title: "",
      description: "",
      client_name: "",
      client_phone: "",
      client_email: "",
      location: "",
      service_type: "general",
      priority: "medium",
      preferred_date: "",
      preferred_time: "",
      customer_notes: "",
      latitude: null,
      longitude: null,
      property_id: initialPropertyId || "",
    },
  });

  // جلب بيانات المستخدم من حسابه
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, full_name, phone, email')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            const userData = {
              name: profile.full_name || profile.name || '',
              phone: profile.phone || '',
              email: profile.email || user.email || ''
            };
            setUserProfile(userData);
            // ملء البيانات تلقائياً
            form.setValue('client_name', userData.name);
            form.setValue('client_phone', userData.phone);
            form.setValue('client_email', userData.email);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
  }, [form]);

  // التحقق من وجود عقارات عند تحميل المكون
  useEffect(() => {
    if (!propertiesLoading && properties.length === 0) {
      setShowPropertyForm(true);
    }
  }, [propertiesLoading, properties]);

  const handleSubmit = async (data: MaintenanceRequestFormData) => {
    try {
      setUploading(true);
      
      // إعداد البيانات للإرسال
      const requestPayload = {
        title: data.title,
        description: data.description,
        client_name: data.client_name,
        client_phone: data.client_phone,
        client_email: data.client_email || undefined,
        location: data.location,
        service_type: data.service_type,
        priority: data.priority,
        property_id: data.property_id || null,
        latitude: data.latitude,
        longitude: data.longitude,
        customer_notes: data.customer_notes || undefined,
        status: 'Open' as const
      };
      
      const result = await createRequest(requestPayload);
      if (result) {
        // رفع الصور إذا وجدت
        if (images.length > 0) {
          const uploadPromises = images.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${result.id}/${Date.now()}_${index}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('maintenance-attachments')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (uploadError) {
              console.error('Upload error:', uploadError);
              return null;
            }
            
            const { data: urlData } = supabase.storage
              .from('maintenance-attachments')
              .getPublicUrl(fileName);
            
            return urlData?.publicUrl;
          });
          
          const uploadedUrls = await Promise.all(uploadPromises);
          const validUrls = uploadedUrls.filter(Boolean);
          
          if (validUrls.length > 0) {
            // حفظ روابط الصور في جدول منفصل أو في حقل JSON
            
          }
        }
        // إنشاء إشعار للمستخدم
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('notifications').insert({
            recipient_id: user.id,
            title: 'تم استلام طلبك',
            message: `تم استلام طلب الصيانة: ${data.title}`,
            type: 'success',
            entity_type: 'maintenance_request',
            entity_id: result.id
          });
        }

        toast({
          title: "تم إرسال الطلب بنجاح",
          description: "سيتم التواصل معك قريباً",
        });

        // إرسال إشعار لأقرب فني إذا تم تحديد الموقع
        if (data.latitude && data.longitude) {
          try {
            const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-notification', {
              body: {
                maintenanceRequestId: result.id,
                latitude: data.latitude,
                longitude: data.longitude,
                serviceType: data.service_type,
                clientName: data.client_name,
                address: data.location
              }
            });

            if (notificationError) {
              console.error('Notification error:', notificationError);
              toast({
                title: "تحذير",
                description: "تم إنشاء الطلب لكن فشل في إرسال الإشعارات للفنيين",
                variant: "destructive",
              });
            } else if (notificationResult?.vendor) {
              toast({
                title: "تم تعيين فني",
                description: `تم تعيين ${notificationResult.vendor.name} للطلب (${notificationResult.vendor.distance?.toFixed(1)} كم)`,
              });
            }
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            toast({
              title: "تحذير", 
              description: "تم إنشاء الطلب لكن لا يوجد فنيين متاحين في المنطقة",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "ملاحظة",
            description: "لم يتم تحديد موقع - سيتم تعيين فني يدوياً",
          });
        }

        // حفظ معرف الطلب قبل مسح البيانات
        const requestId = result.id;
        
        form.reset();
        setImages([]);
        setUploading(false);
        
        // إغلاق النموذج أولاً
        if (onSuccess) {
          onSuccess();
        }
        
        // ثم التوجيه لصفحة التفاصيل بعد ثانية واحدة
        setTimeout(() => {
          window.location.href = `/requests/${requestId}`;
        }, 500);
      }
    } catch (error) {
      console.error("Submit error:", error);
      setUploading(false);
      toast({
        title: "خطأ في إرسال الطلب",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const handleLocationSelect = (data: { lat: number; lng: number; address?: string }) => {
    form.setValue('latitude', data.lat);
    form.setValue('longitude', data.lng);
    if (data.address) {
      form.setValue('location', data.address);
    }
    toast({
      title: "تم تحديد الموقع",
      description: "تم حفظ موقعك بنجاح",
    });
  };

  // عرض نموذج إضافة عقار إذا لم يكن لدى المستخدم عقارات
  if (showPropertyForm) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">إضافة عقار</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              يجب إضافة عقار أولاً قبل تقديم طلب الصيانة. يساعدنا ذلك في تقديم خدمة أفضل لك.
            </AlertDescription>
          </Alert>
          <SmartPropertyForm 
            skipNavigation={true}
            onSuccess={() => {
              setShowPropertyForm(false);
            }}
            onCancel={() => {
              setShowPropertyForm(false);
              onCancel?.();
            }}
            compact={true}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">طلب صيانة جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Property Selection */}
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العقار *</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="اختر العقار" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            <div className="flex items-center gap-2">
                              <img 
                                src={property.icon_url || getPropertyIcon(property.type)} 
                                alt="" 
                                className="h-4 w-4"
                              />
                              <span>{property.name} - {property.address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label="إضافة عقار جديد">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>إضافة عقار جديد</DialogTitle>
                        </DialogHeader>
                        <SmartPropertyForm 
                          skipNavigation={true}
                          onSuccess={() => {
                            toast({
                              title: "تم إضافة العقار بنجاح",
                            });
                          }}
                          compact={true}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* عنوان الطلب */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان الطلب *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: إصلاح تسريب المياه" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* بيانات العميل - تلقائية من الحساب */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">بيانات التواصل</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingContact(!editingContact)}
                  className="h-8 gap-1"
                >
                  {editingContact ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span className="text-xs">تم</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3 w-3" />
                      <span className="text-xs">تعديل</span>
                    </>
                  )}
                </Button>
              </div>

              {editingContact ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="client_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">الاسم</FormLabel>
                        <FormControl>
                          <Input placeholder="الاسم" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">الهاتف</FormLabel>
                        <FormControl>
                          <Input placeholder="01xxxxxxxxx" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">البريد</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-foreground">{form.watch('client_name') || 'لم يحدد'}</span>
                  <span className="text-muted-foreground">{form.watch('client_phone') || 'لم يحدد'}</span>
                  <span className="text-muted-foreground">{form.watch('client_email') || 'لم يحدد'}</span>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <div className="relative flex-1">
                        <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="العنوان التفصيلي" className="pr-10" {...field} />
                      </div>
                    </FormControl>
                  </div>
                  <MapLocationPicker
                    defaultLatitude={form.watch('latitude') || undefined}
                    defaultLongitude={form.watch('longitude') || undefined}
                    onLocationSelect={handleLocationSelect}
                    height="300px"
                    showSearch={true}
                    showCurrentLocation={true}
                  />
                  {form.watch('latitude') && form.watch('longitude') && (
                    <p className="text-sm text-green-600">
                      ✓ تم تحديد الموقع على الخريطة
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Details */}
            <FormField
              control={form.control}
              name="service_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الخدمة *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الخدمة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="plumbing">سباكة</SelectItem>
                      <SelectItem value="electrical">كهرباء</SelectItem>
                      <SelectItem value="hvac">تكييف</SelectItem>
                      <SelectItem value="carpentry">نجارة</SelectItem>
                      <SelectItem value="painting">دهانات</SelectItem>
                      <SelectItem value="cleaning">تنظيف</SelectItem>
                      <SelectItem value="general">صيانة عامة</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>وصف المشكلة *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="اشرح التفاصيل والمشكلة بوضوح..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority & Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الأولوية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">منخفضة</SelectItem>
                        <SelectItem value="medium">متوسطة</SelectItem>
                        <SelectItem value="high">عالية</SelectItem>
                        <SelectItem value="urgent">عاجلة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوقت المفضل</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الوقت" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">صباحاً (8-12)</SelectItem>
                        <SelectItem value="afternoon">ظهراً (12-4)</SelectItem>
                        <SelectItem value="evening">مساءً (4-8)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customer_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أي تفاصيل إضافية تريد إضافتها..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* رفع الصور */}
            <div className="space-y-2">
              <FormLabel>صور المشكلة (اختياري)</FormLabel>
              <ImageUpload 
                images={images} 
                onImagesChange={setImages}
                maxImages={5}
              />
            </div>

            {/* Priority Badge Preview */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">معاينة الأولوية:</span>
              <Badge className={
                form.watch('priority') === "urgent" || form.watch('priority') === "high" ? "bg-destructive text-destructive-foreground" :
                form.watch('priority') === "medium" ? "bg-warning text-warning-foreground" :
                "bg-muted text-muted-foreground"
              }>
                {form.watch('priority') === "urgent" ? "عاجلة" :
                 form.watch('priority') === "high" ? "عالية" : 
                 form.watch('priority') === "medium" ? "متوسطة" : "منخفضة"}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting || uploading}>
                {(form.formState.isSubmitting || uploading) && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                إرسال الطلب
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={form.formState.isSubmitting || uploading}>
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
