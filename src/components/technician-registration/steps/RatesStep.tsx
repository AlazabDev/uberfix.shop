import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TechnicianRegistrationData, ServicePrice } from "@/types/technician-registration";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";

const ratesSchema = z.object({
  pricing_notes: z.string().optional(),
  services: z.array(z.object({
    service_id: z.number(),
    service_name: z.string().optional(),
    standard_price: z.number().min(1, "السعر مطلوب"),
    emergency_price: z.number().optional(),
    night_weekend_price: z.number().optional(),
    min_job_value: z.number().optional(),
    material_markup_percent: z.number().min(0).max(100).optional(),
    platform_price: z.number().optional(),
  })).min(1, "يجب اختيار خدمة واحدة على الأقل"),
});

type RatesFormData = z.infer<typeof ratesSchema>;

interface RatesStepProps {
  data: Partial<TechnicianRegistrationData>;
  onNext: (data: Partial<TechnicianRegistrationData>) => void;
  onBack: () => void;
  onSaveAndExit: (data: Partial<TechnicianRegistrationData>) => void;
}

export function RatesStep({ data, onNext, onBack, onSaveAndExit }: RatesStepProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(
    new Set(data.services?.map(s => s.service_id) || [])
  );

  const fetchCategories = async () => {
    const { data, error } = await supabaseLegacy.from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchServices = async () => {
    const { data, error } = await supabaseLegacy.from('service_items')
      .select(`
        id,
        name,
        base_price,
        subcategory_id,
        service_subcategories!inner(
          id,
          name,
          category_id
        )
      `)
      .eq('is_active', true);

    if (!error && data) {
      setServices(data);
    }
  };

  const form = useForm<RatesFormData>({
    resolver: zodResolver(ratesSchema),
    defaultValues: {
      pricing_notes: data.pricing_notes || '',
      services: data.services || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services",
  });

  useEffect(() => {
    fetchCategories();
    fetchServices();
  }, []);

  const toggleService = (service: any) => {
    const isSelected = selectedServiceIds.has(service.id);
    
    if (isSelected) {
      // Remove service
      setSelectedServiceIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(service.id);
        return newSet;
      });
      const index = fields.findIndex(f => f.service_id === service.id);
      if (index >= 0) remove(index);
    } else {
      // Add service
      setSelectedServiceIds(prev => new Set(prev).add(service.id));
      append({
        service_id: service.id,
        service_name: service.name,
        standard_price: service.base_price || 0,
        emergency_price: undefined,
        night_weekend_price: undefined,
        min_job_value: undefined,
        material_markup_percent: undefined,
        platform_price: service.base_price,
      });
    }
  };

  const getServicesForCategory = (categoryId: number) => {
    return services.filter(s => s.service_subcategories.category_id === categoryId);
  };

  const onSubmit = (formData: RatesFormData) => {
    onNext(formData);
  };

  const handleSaveAndExit = () => {
    const currentData = form.getValues();
    onSaveAndExit(currentData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">الخطوة 4: الأسعار</h2>
        <p className="text-muted-foreground">حدد الخدمات التي تقدمها وأسعارك (مقطوعيات)</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>ملحوظة:</strong> الأسعار المطلوبة هي مقطوعيات لكل خدمة. سعر المنصة معروض للمقارنة فقط.
            </p>
          </div>

          <FormField
            control={form.control}
            name="pricing_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظات التسعير (اختياري)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="أي تفاصيل أو شروط خاصة بالأسعار..."
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Accordion type="multiple" className="w-full">
            {categories.map((category) => {
              const categoryServices = getServicesForCategory(category.id);
              if (categoryServices.length === 0) return null;

              return (
                <AccordionItem key={category.id} value={`category-${category.id}`}>
                  <AccordionTrigger className="text-lg font-semibold">
                    {category.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {categoryServices.map((service) => {
                        const isSelected = selectedServiceIds.has(service.id);
                        const fieldIndex = fields.findIndex(f => f.service_id === service.id);

                        return (
                          <div key={service.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleService(service)}
                              />
                              <div className="flex-1">
                                <label className="text-base font-medium cursor-pointer">
                                  {service.name}
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  سعر المنصة: {service.base_price} جنيه
                                </p>
                              </div>
                            </div>

                            {isSelected && fieldIndex >= 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 animate-in fade-in-50">
                                <FormField
                                  control={form.control}
                                  name={`services.${fieldIndex}.standard_price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>السعر القياسي *</FormLabel>
                                      <FormControl>
                                        <Input type="number" placeholder="100" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`services.${fieldIndex}.emergency_price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>سعر الطوارئ</FormLabel>
                                      <FormControl>
                                        <Input type="number" placeholder="150" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`services.${fieldIndex}.night_weekend_price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>ليلي/عطلات</FormLabel>
                                      <FormControl>
                                        <Input type="number" placeholder="120" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`services.${fieldIndex}.min_job_value`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>حد أدنى للطلب</FormLabel>
                                      <FormControl>
                                        <Input type="number" placeholder="50" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`services.${fieldIndex}.material_markup_percent`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>نسبة الخامات %</FormLabel>
                                      <FormControl>
                                        <Input type="number" placeholder="15" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                                      </FormControl>
                                      <FormDescription className="text-xs">نسبة الربح على الخامات</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {fields.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ يجب اختيار خدمة واحدة على الأقل للمتابعة
              </p>
            </div>
          )}

          <div className="flex gap-4 justify-between pt-6">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onBack}>
                رجوع
              </Button>
              <Button type="button" variant="ghost" onClick={handleSaveAndExit}>
                حفظ والعودة لاحقاً
              </Button>
            </div>
            <Button type="submit" disabled={fields.length === 0}>
              حفظ واستمرار
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
