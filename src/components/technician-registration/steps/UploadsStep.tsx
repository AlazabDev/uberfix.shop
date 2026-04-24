import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TechnicianRegistrationData, TechnicianDocument } from "@/types/technician-registration";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const uploadsSchema = z.object({
  documents: z.array(z.object({
    document_type: z.enum(['tax_card', 'commercial_registration', 'national_id', 'insurance_certificate', 'professional_license']),
    file_url: z.string().optional(),
    file_name: z.string().min(1, "يجب اختيار ملف"),
    file_size: z.number().optional(),
  })).optional(),
});

type UploadsFormData = z.infer<typeof uploadsSchema>;

interface UploadsStepProps {
  data: Partial<TechnicianRegistrationData>;
  onNext: (data: Partial<TechnicianRegistrationData>) => void;
  onBack: () => void;
  onSaveAndExit: (data: Partial<TechnicianRegistrationData>) => void;
}

const DOCUMENT_TYPES = [
  { value: 'tax_card', label: 'البطاقة الضريبية' },
  { value: 'commercial_registration', label: 'السجل التجاري' },
  { value: 'national_id', label: 'البطاقة الشخصية' },
  { value: 'insurance_certificate', label: 'شهادة التأمين' },
  { value: 'professional_license', label: 'رخصة مهنية' },
];

export function UploadsStep({ data, onNext, onBack, onSaveAndExit }: UploadsStepProps) {
  // Holds File objects keyed by field index — files cannot be JSON-serialized
  // so we keep them in component state and forward them through onNext.
  const [pendingFiles, setPendingFiles] = useState<{ [key: number]: File }>(() => {
    const initial: { [key: number]: File } = {};
    (data.documents || []).forEach((d, i) => {
      if (d.pending_file) initial[i] = d.pending_file;
    });
    return initial;
  });

  const form = useForm<UploadsFormData>({
    resolver: zodResolver(uploadsSchema),
    defaultValues: {
      documents: (data.documents || []).map(d => ({
        document_type: d.document_type,
        file_url: d.file_url,
        file_name: d.file_name,
        file_size: d.file_size,
      })),
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "documents",
  });

  const handleFileSelect = (file: File, index: number, documentType: string) => {
    // Validate type and size locally before storing in memory.
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. المسموح: PDF أو صورة JPG/PNG");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("حجم الملف يتجاوز 10 ميجابايت");
      return;
    }

    // Keep the File reference in component state.
    setPendingFiles(prev => ({ ...prev, [index]: file }));

    // Update the form-controlled metadata (the original Arabic name is preserved
    // for display; the actual upload is deferred to after signup).
    update(index, {
      document_type: documentType as TechnicianDocument["document_type"],
      file_url: "",
      file_name: file.name,
      file_size: file.size,
    });

    toast.success("تم اختيار الملف. سيتم رفعه عند إرسال التسجيل");
  };

  const buildDocumentsPayload = (formValues: UploadsFormData): TechnicianDocument[] => {
    return (formValues.documents || []).map((d, i) => ({
      document_type: d.document_type,
      file_url: d.file_url || "",
      file_name: d.file_name,
      file_size: d.file_size,
      pending_file: pendingFiles[i],
    }));
  };

  const onSubmit = (formData: UploadsFormData) => {
    onNext({ documents: buildDocumentsPayload(formData) });
  };

  const handleSaveAndExit = () => {
    const currentData = form.getValues();
    // Note: pending_file is in-memory only — it won't survive page reload.
    onSaveAndExit({ documents: buildDocumentsPayload(currentData) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">الخطوة 8: المرفقات</h2>
        <p className="text-muted-foreground">قم برفع المستندات الرسمية المطلوبة</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>ملحوظة:</strong> المستندات سيتم رفعها فعلياً عند الضغط على "إرسال الطلب" في الخطوة الأخيرة. يتم التحقق من النوع (PDF / JPG / PNG) والحجم (حتى 10 ميجابايت) محلياً.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">المستندات</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ 
                  document_type: 'national_id' as any, 
                  file_url: '', 
                  file_name: '',
                  file_size: 0 
                })}
              >
                <Upload className="h-4 w-4 ml-1" />
                إضافة مستند
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">مستند {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name={`documents.${index}.document_type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع المستند *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع المستند" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name={`documents.${index}.file_url`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الملف *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const documentType = form.watch(`documents.${index}.document_type`);
                                handleFileSelect(file, index, documentType);
                              }
                            }}
                          />
                          {pendingFiles[index] && (
                            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span dir="auto">{form.watch(`documents.${index}.file_name`)}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(pendingFiles[index].size / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                          )}
                          {!pendingFiles[index] && form.watch(`documents.${index}.file_name`) && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span dir="auto">{form.watch(`documents.${index}.file_name`)}</span>
                              <span className="text-xs text-amber-600">
                                (يلزم إعادة الاختيار بعد إعادة تحميل الصفحة)
                              </span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            {fields.length === 0 && (
              <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">لم يتم إضافة مستندات بعد</p>
                <p className="text-sm text-muted-foreground mt-1">اضغط "إضافة مستند" للبدء</p>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-between pt-6">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onBack}>
                رجوع
              </Button>
              <Button type="button" variant="ghost" onClick={handleSaveAndExit}>
                حفظ والعودة لاحقاً
              </Button>
            </div>
            <Button type="submit">
              حفظ واستمرار
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
