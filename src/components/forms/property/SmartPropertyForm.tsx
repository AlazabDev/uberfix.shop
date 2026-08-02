import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, Upload, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { InteractiveMap } from "@/components/maps/InteractiveMap";
import type { Property } from "@/hooks/useProperties";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyTypeSelector, PropertyCategory } from "./PropertyTypeSelector";
import { ResidentialFields } from "./ResidentialFields";
import { CommercialFields } from "./CommercialFields";
import { IndustrialFields } from "./IndustrialFields";
import { propertyFormSchema, PropertyFormData, categoryToType } from "./types";

interface SmartPropertyFormProps {
  initialData?: Partial<Property>;
  propertyId?: string;
  skipNavigation?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean; // للعرض داخل Dialog
}

export function SmartPropertyForm({ initialData, propertyId, skipNavigation, onSuccess, onCancel, compact }: SmartPropertyFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<{ id: number; name_ar: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; name_ar: string }[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [enableContact, setEnableContact] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);

  const getInitialCategory = (): PropertyCategory => {
    if (initialData?.type === "commercial") return "commercial";
    if (initialData?.type === "industrial") return "industrial";
    return "residential";
  };

  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory>(getInitialCategory());

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      code: initialData?.code || "",
      name: initialData?.name || "",
      category: getInitialCategory(),
      type: initialData?.type || "residential",
      status: initialData?.status || "active",
      address: initialData?.address || "",
      city_id: initialData?.city_id ?? undefined,
      district_id: initialData?.district_id ?? undefined,
      latitude: initialData?.latitude ?? 30.0444,
      longitude: initialData?.longitude ?? 31.2357,
      description: initialData?.description || "",
      manager_id: initialData?.manager_id || "",
      area: initialData?.area ?? undefined,
      floors: initialData?.floors ?? undefined,
      parking_spaces: initialData?.parking_spaces ?? undefined,
      rooms: initialData?.rooms ?? undefined,
      bathrooms: initialData?.bathrooms ?? undefined,
    },
  });

  const selectedCityId = watch("city_id");

  useEffect(() => {
    setValue("category", selectedCategory);
    setValue("type", categoryToType[selectedCategory]);
  }, [selectedCategory, setValue]);

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase.from("cities").select("*").order("name_ar");
      if (data) setCities(data);
    };
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCityId) {
      const fetchDistricts = async () => {
        const { data } = await supabase
          .from("districts")
          .select("*")
          .eq("city_id", selectedCityId)
          .order("name_ar");
        if (data) setDistricts(data);
      };
      fetchDistricts();
    }
  }, [selectedCityId]);

  useEffect(() => {
    if (initialData?.images && initialData.images.length > 0) {
      setImagePreview(initialData.images[0]);
    }
  }, [initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error("نوع الملف غير مدعوم. يرجى استخدام JPG, PNG أو WebP");
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت");
        return;
      }

      setImage(file);
      setStorageError(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setStorageError(null);
    setUploadProgress(0);
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      setUploadProgress(10);
      const fileExt = file.name.split(".").pop();
      // Storage RLS requires the first folder segment to match auth.uid()
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw new Error(`فشل رفع الصورة: ${uploadError.message}`);
      }

      setUploadProgress(70);
      const { data: { publicUrl } } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
      setStorageError(errorMessage);
      return null;
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setLoading(true);
      setStorageError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("يجب تسجيل الدخول أولاً");
        if (!skipNavigation) navigate("/login");
        return;
      }

      let uploadedImages: string[] = initialData?.images || [];
      if (image) {
        const imageUrl = await uploadImage(image, user.id);
        if (imageUrl) uploadedImages = [imageUrl];
      }

      const propertyData = {
        // Code is auto-generated by DB trigger on insert; only preserve on update.
        ...(propertyId && initialData?.code ? { code: initialData.code } : {}),
        name: data.name,
        type: data.type,
        status: data.status || "active",
        address: data.address,
        city_id: data.city_id || null,
        district_id: data.district_id || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        description: data.description || null,
        images: uploadedImages.length > 0 ? uploadedImages : null,
        manager_id: data.manager_id || user.id,
        area: data.area || null,
        floors: data.floors || null,
        parking_spaces: data.parking_spaces || null,
        rooms: data.rooms || null,
        bathrooms: data.bathrooms || null,
        metadata: {
          operating_status: data.operating_status || null,
          location_nature: data.location_nature || null,
          subscription_status: data.subscription_status || null,
          access_policy: data.access_policy || null,
          business_activity: data.business_activity || null,
          opening_time: data.opening_time || null,
          closing_time: data.closing_time || null,
          unit_type: data.unit_type || null,
          industrial_activity: data.industrial_activity || null,
          hazard_level: data.hazard_level || null,
          shift_pattern: data.shift_pattern || null,
          production_lines: data.production_lines ?? null,
          workers_count: data.workers_count ?? null,
          units_count: data.units_count ?? null,
          management_start_date: data.management_start_date || null,
          contact_name: data.contact_name || null,
          contact_phone: data.contact_phone || null,
        },
      };

      if (propertyId) {
        const { error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq("id", propertyId);

        if (error) throw new Error(`فشل تحديث العقار: ${error.message}`);
        toast.success("تم تحديث العقار بنجاح");
      } else {
        const { data: created, error } = await supabase
          .from("properties")
          .insert([{ ...propertyData, created_by: user.id }])
          .select("id")
          .maybeSingle();

        if (error) {
          if (error.message.includes('row-level security')) {
            throw new Error("يجب تأكيد بريدك الإلكتروني أولاً");
          }
          throw new Error(`فشل إنشاء العقار: ${error.message}`);
        }

        // QR must point at the real property id, which only exists after insert.
        if (created?.id) {
          await supabase
            .from("properties")
            .update({
              qr_code_data: `${window.location.origin}/quick-request/${created.id}`,
              qr_code_generated_at: new Date().toISOString(),
            })
            .eq("id", created.id);
        }
        toast.success("تم إنشاء العقار بنجاح");
      }

      if (onSuccess) {
        onSuccess();
      } else if (!skipNavigation) {
        setTimeout(() => navigate("/properties"), 1500);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "حدث خطأ أثناء حفظ العقار";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {storageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{storageError}</AlertDescription>
        </Alert>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex items-center ${s < 3 ? "flex-1" : ""}`}
          >
            <button
              type="button"
              onClick={() => setStep(s)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </button>
            {s < 3 && (
              <div
                className={`flex-1 h-1 mx-2 rounded ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Property Category */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 1: اختيار نوع العقار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <PropertyTypeSelector
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label>كود الفرع / العقار</Label>
                <Input
                  {...register("code")}
                  readOnly
                  disabled
                  placeholder={initialData?.code || "سيتم توليده تلقائيًا (UF-PRP-XXXXX)"}
                  className="bg-muted cursor-not-allowed text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  يتم توليد الكود تلقائيًا بواسطة النظام عند الحفظ ولا يمكن تعديله.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">اسم العقار *</Label>
                <Input {...register("name")} placeholder="مثال: برج النخيل" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>صورة العقار</Label>
              <div className="flex items-start gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -left-2 h-6 w-6 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="max-w-xs"
                  />
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>تاريخ بدء الإدارة</Label>
              <Input type="date" {...register("management_start_date")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Category-Specific Fields */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>
              الخطوة 2: تفاصيل العقار{" "}
              {selectedCategory === "residential" && "السكني"}
              {selectedCategory === "commercial" && "التجاري"}
              {selectedCategory === "industrial" && "الصناعي"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCategory === "residential" && (
              <ResidentialFields register={register} setValue={setValue} watch={watch} />
            )}
            {selectedCategory === "commercial" && (
              <CommercialFields register={register} setValue={setValue} watch={watch} />
            )}
            {selectedCategory === "industrial" && (
              <IndustrialFields register={register} setValue={setValue} watch={watch} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Location & Contact */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 3: الموقع والتواصل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>الدولة</Label>
                <Select defaultValue="EG">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EG">جمهورية مصر العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المدينة</Label>
                <Select
                  value={watch("city_id")?.toString() || ""}
                  onValueChange={(value) => {
                    setValue("city_id", parseInt(value, 10));
                    setValue("district_id", undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id.toString()}>
                        {city.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الحي</Label>
                <Select
                  value={watch("district_id")?.toString() || ""}
                  onValueChange={(value) => setValue("district_id", parseInt(value, 10))}
                  disabled={!selectedCityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحي" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district.id} value={district.id.toString()}>
                        {district.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">العنوان التفصيلي *</Label>
              <Input {...register("address")} placeholder="مثال: 8 شارع 500 المعادي القاهرة" />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>

            <InteractiveMap
              latitude={watch("latitude") ?? 30.0444}
              longitude={watch("longitude") ?? 31.2357}
              onLocationChange={(lat, lng, address) => {
                setValue("latitude", lat, { shouldDirty: true });
                setValue("longitude", lng, { shouldDirty: true });
                if (address) setValue("address", address, { shouldDirty: true });
              }}
              height="280px"
            />

            <div className="space-y-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea {...register("description")} placeholder="أي معلومات إضافية عن العقار..." rows={3} />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>إضافة بيانات تواصل</Label>
                <Switch checked={enableContact} onCheckedChange={setEnableContact} />
              </div>

              {enableContact && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>اسم الشخص المسؤول</Label>
                    <Input {...register("contact_name")} placeholder="الاسم" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input {...register("contact_phone")} placeholder="01xxxxxxxxx" dir="ltr" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
            <ChevronRight className="ml-2 h-4 w-4" />
            السابق
          </Button>
        )}

        {step < 3 ? (
          <Button type="button" onClick={nextStep} className="flex-1">
            التالي
            <ChevronLeft className="mr-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={loading} className="flex-1">
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {propertyId ? "تحديث العقار" : "حفظ العقار"}
          </Button>
        )}

        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else if (!skipNavigation) {
              navigate("/properties");
            }
          }} 
          disabled={loading}
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
}
