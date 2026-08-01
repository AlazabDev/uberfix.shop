import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Upload, X } from "lucide-react";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useProperties } from "@/hooks/useProperties";
import { useServices } from "@/hooks/useServices";

const formSchema = z.object({
  property_id: z.string().min(1, "يجب اختيار العقار"),
  service_type: z.string().min(1, "يجب اختيار نوع الخدمة"),
  provider_type: z.enum(["internal", "external"]),
  category_id: z.string().optional(),
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
  description: z.string().optional(),
  quantity: z.number().min(1, "الكمية يجب أن تكون على الأقل 1"),
  unit_price: z.number().min(0, "السعر يجب أن يكون رقم موجب"),
  visit_datetime: z.string().optional(),
  notes: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  use_temp_contact: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateMaintenanceRequest() {
  const navigate = useNavigate();
  const { properties } = useProperties();
  const { categories } = useServices();
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider_type: "internal",
      quantity: 1,
      unit_price: 0,
      use_temp_contact: false,
    },
  });

  const watchQuantity = form.watch("quantity");
  const watchUnitPrice = form.watch("unit_price");
  const watchUseTempContact = form.watch("use_temp_contact");

  const subtotal = watchQuantity * watchUnitPrice;
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("يجب تسجيل الدخول أولاً");
        return;
      }

      // Get user's company and branch
      const { data: profile } = await supabaseLegacy.from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast.error("لم يتم العثور على بيانات الشركة");
        return;
      }

      // Get company's first branch
      const { data: branches } = await supabaseLegacy.from("branches")
        .select("id")
        .eq("company_id", profile.company_id)
        .limit(1);

      if (!branches || branches.length === 0) {
        toast.error("لم يتم العثور على فرع للشركة");
        return;
      }

      // Create maintenance request
      const { data: request, error } = await supabaseLegacy.from("maintenance_requests")
        .insert({
          company_id: profile.company_id,
          branch_id: branches[0].id,
          property_id: data.property_id,
          title: data.title,
          description: data.description,
          service_type: data.service_type,
          category_id: data.category_id,
          estimated_cost: total,
          status: "Open",
          workflow_stage: "submitted",
          created_by: user.id,
          client_name: data.use_temp_contact ? data.contact_name : undefined,
          client_phone: data.use_temp_contact ? data.contact_phone : undefined,
          customer_notes: data.notes,
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      toast.success("تم إنشاء طلب الصيانة بنجاح");
      navigate(`/maintenance/${request.id}`);
    } catch (error: any) {
      toast.error("فشل إنشاء طلب الصيانة");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">إنشاء طلب صيانة جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Property Selection */}
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اختر العقار *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العقار" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Provider Type */}
              <FormField
                control={form.control}
                name="provider_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع مزود الخدمة</FormLabel>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={field.value === "internal" ? "default" : "outline"}
                        onClick={() => field.onChange("internal")}
                        className="flex-1"
                      >
                        مزود داخلي
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "external" ? "default" : "outline"}
                        onClick={() => field.onChange("external")}
                        className="flex-1"
                      >
                        مزود خارجي
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التصنيف</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {categories.map((category) => (
                        <Button
                          key={category.id}
                          type="button"
                          variant={field.value === category.id ? "default" : "outline"}
                          onClick={() => field.onChange(category.id)}
                          className="h-auto py-4 flex flex-col items-center gap-2"
                        >
                          {category.icon && <span className="text-2xl">{category.icon}</span>}
                          <span className="text-sm">{category.name}</span>
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الطلب *</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل عنوان الطلب" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Type */}
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الخدمة *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: سباكة، كهرباء، نجارة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أدخل وصف تفصيلي للمشكلة"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price Calculation */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">حساب السعر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الكمية</FormLabel>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => field.onChange(Math.max(1, field.value - 1))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <FormControl>
                              <Input
                                type="number"
                                className="text-center"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => field.onChange(field.value + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>السعر</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المجموع الفرعي:</span>
                      <span className="font-semibold">{subtotal.toFixed(2)} جنيه</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الضريبة (14%):</span>
                      <span className="font-semibold">{tax.toFixed(2)} جنيه</span>
                    </div>
                    <div className="flex justify-between text-lg pt-2 border-t">
                      <span className="font-bold">الإجمالي:</span>
                      <span className="font-bold text-primary">{total.toFixed(2)} جنيه</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visit Datetime */}
              <FormField
                control={form.control}
                name="visit_datetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>موعد الزيارة</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات الطلب</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أضف أي ملاحظات إضافية"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Temporary Contact */}
              <FormField
                control={form.control}
                name="use_temp_contact"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>إضافة جهة اتصال مؤقتة</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        استخدام جهة اتصال مختلفة عن جهة الاتصال الافتراضية
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchUseTempContact && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم</FormLabel>
                        <FormControl>
                          <Input placeholder="اسم جهة الاتصال" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input placeholder="+20 XXX XXX XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Attachments */}
              <div className="space-y-3">
                <FormLabel>المرفقات</FormLabel>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      اضغط لرفع الملفات أو اسحبها هنا
                    </p>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={uploading}
              >
                {uploading ? "جاري الحفظ..." : "حفظ البيانات"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
