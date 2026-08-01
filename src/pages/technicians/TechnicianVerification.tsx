import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Camera, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TechnicianVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");
  const [files, setFiles] = useState({
    nationalIdFront: null as File | null,
    nationalIdBack: null as File | null,
    selfie: null as File | null,
  });

  useEffect(() => {
    checkApplicationStatus();
  }, []);

  const checkApplicationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabaseLegacy.from("technician_profiles")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        toast({
          title: "خطأ",
          description: "يجب التسجيل كفني أولاً",
          variant: "destructive",
        });
        navigate("/technicians/registration/wizard");
        return;
      }

      setTechnicianId(profile.id);

      // Check if verification already exists
      const { data: verification } = await supabaseLegacy.from("technician_verifications")
        .select("verification_status")
        .eq("technician_id", profile.id)
        .maybeSingle();

      if (verification) {
        setVerificationStatus(verification.verification_status);
      }
    } catch (error) {
      console.error("Error checking application:", error);
    }
  };

  const handleFileChange = (type: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [type]: e.target.files[0] });
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!files.nationalIdFront || !files.nationalIdBack || !files.selfie) {
      toast({
        title: "خطأ",
        description: "يرجى رفع جميع المستندات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const nationalIdFrontUrl = await uploadFile(files.nationalIdFront, 'national-id-front');
      const nationalIdBackUrl = await uploadFile(files.nationalIdBack, 'national-id-back');
      const selfieUrl = await uploadFile(files.selfie, 'selfies');

      const { error } = await supabaseLegacy.from("technician_verifications")
        .insert({
          technician_id: technicianId!,
          national_id_front: nationalIdFrontUrl,
          national_id_back: nationalIdBackUrl,
          selfie_image: selfieUrl,
          verification_status: "pending",
        });

      if (error) throw error;

      toast({
        title: "تم الإرسال بنجاح",
        description: "سيتم مراجعة مستنداتك خلال 24-48 ساعة",
      });

      setVerificationStatus("pending");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (verificationStatus === "verified") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-green-600">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="mx-auto w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">تم التحقق بنجاح</h2>
            <p className="text-muted-foreground mb-6">
              تم التحقق من هويتك بنجاح. يمكنك الآن التوقيع على اتفاقية العمل.
            </p>
            <Button onClick={() => navigate("/technicians/agreement")} size="lg" className="w-full">
              التوقيع على الاتفاقية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "pending" && technicianId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="mx-auto w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">قيد المراجعة</h2>
            <p className="text-muted-foreground">
              مستنداتك قيد المراجعة من قبل فريقنا. سنتواصل معك قريباً.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">التحقق من الهوية</CardTitle>
            <CardDescription className="text-lg">
              يرجى رفع المستندات المطلوبة للتحقق من هويتك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                تأكد من وضوح الصور وأن جميع البيانات مقروءة. الصور غير الواضحة ستؤدي لرفض الطلب.
              </AlertDescription>
            </Alert>

            {/* National ID Front */}
            <div className="space-y-2">
              <Label htmlFor="id-front">صورة البطاقة - الوجه الأمامي *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Input
                  id="id-front"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange('nationalIdFront')}
                  className="hidden"
                />
                <label htmlFor="id-front" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {files.nationalIdFront
                      ? files.nationalIdFront.name
                      : "اضغط لرفع صورة الوجه الأمامي"}
                  </p>
                </label>
              </div>
            </div>

            {/* National ID Back */}
            <div className="space-y-2">
              <Label htmlFor="id-back">صورة البطاقة - الوجه الخلفي *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Input
                  id="id-back"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange('nationalIdBack')}
                  className="hidden"
                />
                <label htmlFor="id-back" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {files.nationalIdBack
                      ? files.nationalIdBack.name
                      : "اضغط لرفع صورة الوجه الخلفي"}
                  </p>
                </label>
              </div>
            </div>

            {/* Selfie */}
            <div className="space-y-2">
              <Label htmlFor="selfie">صورة شخصية (Selfie) *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Input
                  id="selfie"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange('selfie')}
                  className="hidden"
                />
                <label htmlFor="selfie" className="cursor-pointer">
                  <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {files.selfie ? files.selfie.name : "اضغط لالتقاط صورة شخصية واضحة"}
                  </p>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                التقط صورة واضحة لوجهك بدون نظارات أو غطاء رأس
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              size="lg"
              disabled={loading || !files.nationalIdFront || !files.nationalIdBack || !files.selfie}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                "إرسال المستندات"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
