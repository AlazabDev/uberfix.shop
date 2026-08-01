import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Upload, X } from "lucide-react";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

const reviewSchema = z.object({
  rating: z.number().min(1, "يجب تحديد التقييم").max(5),
  comment: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface AddReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string;
  requestId?: string;
  onReviewAdded?: () => void;
}

export function AddReviewDialog({
  open,
  onOpenChange,
  technicianId,
  requestId,
  onReviewAdded
}: AddReviewDialogProps) {
  const { toast } = useToast();
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0 }
  });

  const rating = watch("rating");

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (selectedImages.length + files.length > 5) {
      toast({
        title: "تحذير",
        description: "يمكنك رفع 5 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول لإضافة تقييم",
          variant: "destructive",
        });
        return;
      }

      // Upload images if any
      const imageUrls: string[] = [];
      for (const file of selectedImages) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('review-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Insert review
      const { error } = await supabaseLegacy.from('reviews')
        .insert({
          technician_id: technicianId,
          customer_id: user.id,
          request_id: requestId,
          rating: data.rating,
          comment: data.comment,
          images: imageUrls,
        });

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إضافة التقييم بنجاح",
      });

      reset();
      setSelectedImages([]);
      onOpenChange(false);
      onReviewAdded?.();
    } catch (error) {
      console.error('Error adding review:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة التقييم",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة تقييم</DialogTitle>
          <DialogDescription>
            شاركنا تجربتك مع هذا الفني
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>التقييم *</Label>
            <div className="flex items-center gap-1 justify-center py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setValue("rating", i + 1)}
                  onMouseEnter={() => setHoveredRating(i + 1)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      i < (hoveredRating || rating)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'fill-muted text-muted'
                    }`}
                  />
                </button>
              ))}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">التعليق (اختياري)</Label>
            <Textarea
              id="comment"
              {...register("comment")}
              placeholder="اكتب تعليقك هنا..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>الصور (اختياري - حتى 5 صور)</Label>
            <div className="space-y-3">
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedImages.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`صورة التقييم ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`حذف الصورة ${idx + 1}`}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedImages.length < 5 && (
                <div>
                  <input
                    type="file"
                    id="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    aria-label="اختر صور التقييم"
                  />
                  <Label
                    htmlFor="images"
                    className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                  >
                    <Upload className="h-5 w-5" aria-hidden="true" />
                    <span>اختر صور لرفعها</span>
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !rating}
            >
              {isSubmitting ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
