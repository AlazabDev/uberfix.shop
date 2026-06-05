import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Wrench, Zap, Calendar, AlertTriangle, ClipboardList, Send,
  Loader2, ImagePlus, X, CheckCircle2, Copy, ExternalLink,
  Store, User, Tag, Pen, Flag, Camera, Clock, Phone, FileText, StickyNote, CalendarDays, ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type TabType = "general" | "urgent" | "periodic";


const GENERAL_SERVICE_TYPES = [
  { value: "electrical", label: "كهرباء" },
  { value: "plumbing", label: "سباكة" },
  { value: "ac", label: "تكييف / تبريد" },
  { value: "carpentry", label: "نجارة / أثاث" },
  { value: "painting", label: "دهانات / تشطيبات" },
  { value: "facades", label: "واجهات / لافتات" },
  { value: "other", label: "أخرى" },
];

const URGENT_TYPES = [
  { value: "power_outage", label: "انقطاع كهرباء كلي" },
  { value: "water_leak", label: "تسريب مياه / غمر" },
  { value: "ac_failure", label: "عطل في التكييف (توقف)" },
  { value: "glass_break", label: "كسر في زجاج الواجهة" },
  { value: "sign_issue", label: "مشكلة في اللافتة المضيئة" },
  { value: "door_lock", label: "انغلاق باب / قفل" },
  { value: "smoke", label: "رائحة / دخان" },
  { value: "other", label: "أخرى" },
];

const PERIODIC_TYPES = [
  { value: "full_inspection", label: "فحص شامل للفرع" },
  { value: "electrical_periodic", label: "صيانة كهرباء دورية" },
  { value: "ac_periodic", label: "صيانة تكييف وتبريد" },
  { value: "plumbing_periodic", label: "صيانة سباكة" },
  { value: "painting_periodic", label: "دهانات وتشطيبات" },
  { value: "facade_periodic", label: "فحص واجهات ولافتات" },
];

const TIME_SLOTS = [
  { value: "morning", label: "صباحاً (9 ص - 12 م)" },
  { value: "noon", label: "ظهراً (12 م - 3 م)" },
  { value: "evening", label: "مساءً (3 م - 6 م)" },
  { value: "after_close", label: "بعد الإغلاق (حسب التنسيق)" },
];

const CONTACT_TIMES = [
  { value: "now", label: "فوراً (اتصل الآن)" },
  { value: "1h", label: "خلال ساعة" },
  { value: "4h", label: "خلال 4 ساعات" },
];

interface SuccessData {
  request_number: string;
  request_id: string;
  track_url: string;
}

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "general", label: "طلب صيانة عام", icon: <ClipboardList className="h-5 w-5" /> },
  { key: "urgent", label: "صيانة طارئة 24/7", icon: <AlertTriangle className="h-5 w-5" /> },
  { key: "periodic", label: "صيانة دورية / وقائية", icon: <Calendar className="h-5 w-5" /> },
];

export default function UberFixRequestForm() {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const { toast } = useToast();

  // Shared fields
  const [clientName, setClientName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // General
  const [serviceType, setServiceType] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [priority, setPriority] = useState("low");

  // Urgent
  const [urgentType, setUrgentType] = useState("");
  const [stopsWork, setStopsWork] = useState("yes");
  const [contactTime, setContactTime] = useState("now");

  // Periodic
  const [periodicType, setPeriodicType] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الصورة يجب أن يكون أقل من 10 ميجابايت", variant: "destructive" });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => { setImageFile(null); setImagePreview(null); };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ رقم الطلب" });
  };

  const resetForm = () => {
    setClientName(""); setBranchName(""); setClientCompany(""); setClientPhone("");
    setDescription(""); removeImage(); setServiceType(""); setIssueDate("");
    setPriority("low"); setUrgentType(""); setStopsWork("yes"); setContactTime("now");
    setPeriodicType(""); setPreferredDate(""); setTimeSlot(""); setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !branchName.trim()) {
      toast({ title: "تنبيه", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const images: string[] = [];
      if (imagePreview) images.push(imagePreview);

      let resolvedServiceType = serviceType;
      let resolvedPriority = priority;
      let fullDescription = description;

      if (activeTab === "urgent") {
        resolvedServiceType = urgentType || "other";
        resolvedPriority = "high";
        fullDescription = `[طلب طارئ] ${stopsWork === "yes" ? "(يوقف العمل)" : ""} وقت الاتصال: ${CONTACT_TIMES.find(c => c.value === contactTime)?.label || contactTime}\n${description}`;
      } else if (activeTab === "periodic") {
        resolvedServiceType = periodicType || "other";
        resolvedPriority = "low";
        fullDescription = `[صيانة دورية] التاريخ المفضل: ${preferredDate} - الفترة: ${TIME_SLOTS.find(t => t.value === timeSlot)?.label || timeSlot}\n${description}`;
      }

      const { data, error } = await supabase.functions.invoke("submit-public-request", {
        body: {
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          branch_name: branchName.trim(),
          service_type: resolvedServiceType,
          priority: resolvedPriority,
          description: fullDescription.trim(),
          images: images.length > 0 ? images : undefined,
          channel: "public_form",
          metadata: {
            company_name: clientCompany,
            form_type: activeTab,
            ...(activeTab === "urgent" && { stops_work: stopsWork, contact_time: contactTime }),
            ...(activeTab === "periodic" && { preferred_date: preferredDate, time_slot: timeSlot }),
            ...(activeTab === "general" && { issue_date: issueDate }),
          },
        },
      });

      if (error) throw error;
      if (data?.success) {
        setSuccess({ request_number: data.request_number, request_id: data.request_id, track_url: data.track_url });
      } else {
        throw new Error(data?.message_ar || "فشل في إنشاء الطلب");
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "فشل في إرسال الطلب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 via-background to-muted/30 py-10 px-4" dir="rtl">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-[30px] shadow-2xl border border-primary/10 p-10 text-center space-y-6"
          >
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">تم إرسال طلبك بنجاح! ✅</h2>
            <p className="text-muted-foreground">سيتم التواصل معك قريباً</p>
            <div className="bg-muted/50 rounded-xl p-6 space-y-2">
              <p className="text-sm text-muted-foreground">رقم الطلب</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-primary tracking-wider">{success.request_number}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(success.request_number)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="gap-2" onClick={() => window.open(success.track_url, "_blank")}>
                <ExternalLink className="h-4 w-4" /> تتبع حالة الطلب
              </Button>
              <Button onClick={resetForm} className="gap-2">
                <Send className="h-4 w-4" /> إرسال طلب جديد
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 via-background to-muted/30 py-8 px-4" dir="rtl">
      <div className="max-w-[1300px] mx-auto">

        {/* Brand Header */}
        <div className="text-center mb-8 space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="text-[hsl(var(--brand-gold,45_100%_50%))]" style={{ color: "#FFB900" }}>UberFix</span>
            <span className="text-[#030957]"> by Alazab</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground flex-wrap">
            <Wrench className="h-5 w-5 text-[#FFB900]" />
            <span>نقدم حلولاً استثنائية لصيانة المحلات التجارية والسكنية</span>
            <Store className="h-5 w-5 text-[#FFB900]" />
          </div>
          <p className="max-w-2xl mx-auto text-sm md:text-base text-muted-foreground leading-relaxed">
            فريق متخصص، استجابة سريعة، وجودة تنفيذ مضمونة لجميع أعمال الصيانة الدورية والطارئة لمحلاتك التجارية ووحداتك السكنية.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all border ${
                activeTab === tab.key
                  ? "bg-[#030957] text-white shadow-lg shadow-[#030957]/30 border-[#030957]"
                  : "bg-card text-[#030957] hover:shadow-md border-[#030957]/10"
              }`}
            >
              <span className={activeTab === tab.key ? "text-[#FFB900]" : "text-[#FFB900]"}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-[30px] shadow-xl border border-[#FFB900]/10 p-6 md:p-10 max-w-4xl mx-auto"
          >
            {/* Form Header */}
            <div className="flex items-center gap-4 mb-8 border-b border-border pb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                activeTab === "urgent" ? "bg-destructive" : activeTab === "periodic" ? "bg-green-600" : "bg-[#030957]"
              }`}>
                {activeTab === "general" && <ClipboardList className="h-7 w-7 text-[#FFB900]" />}
                {activeTab === "urgent" && <AlertTriangle className="h-7 w-7 text-white" />}
                {activeTab === "periodic" && <Calendar className="h-7 w-7 text-white" />}
              </div>
              <div>
                <h2 className={`text-xl md:text-2xl font-bold ${
                  activeTab === "urgent" ? "text-destructive" : activeTab === "periodic" ? "text-green-600" : "text-[#030957]"
                }`}>
                  {activeTab === "general" && "طلب صيانة عام"}
                  {activeTab === "urgent" && "صيانة طارئة - استجابة فورية"}
                  {activeTab === "periodic" && "صيانة دورية / برنامج وقائي"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {activeTab === "general" && "لجميع أعمال الصيانة والإصلاح للفروع التجارية"}
                  {activeTab === "urgent" && "للمشكلات التي توقف العمل أو تشكل خطراً"}
                  {activeTab === "periodic" && "لجدولة الفحص والصيانة المنتظمة للفروع"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Shared: Name */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4 text-[#FFB900]" />
                    {activeTab === "periodic" ? "اسم المسؤول / مدير الفرع" : "اسم مقدم الطلب / جهة الاتصال"} *
                  </Label>
                  <Input placeholder="مثال: أحمد السيد" value={clientName} onChange={(e) => setClientName(e.target.value)} required
                    className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] focus:bg-card py-3 px-4 transition-all" />
                </div>

                {/* Shared: Branch */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Store className="h-4 w-4 text-[#FFB900]" /> اسم الفرع / رقم الفرع *
                  </Label>
                  <Input placeholder="مثال: فرع المعادي - 12" value={branchName} onChange={(e) => setBranchName(e.target.value)} required
                    className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] focus:bg-card py-3 px-4 transition-all" />
                </div>

                {/* Shared: Client/Company */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Tag className="h-4 w-4 text-[#FFB900]" /> السلسلة / العميل
                  </Label>
                  <Input
                    placeholder="اسم الشركة أو السلسلة (اختياري)"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] focus:bg-card py-3 px-4 transition-all"
                  />
                </div>

                {/* Tab-specific fields */}
                {activeTab === "general" && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Wrench className="h-4 w-4 text-[#FFB900]" /> نوع المشكلة *
                      </Label>
                      <Select value={serviceType} onValueChange={setServiceType}>
                        <SelectTrigger className="rounded-2xl border-2 border-muted bg-muted/30 py-3 px-4">
                          <SelectValue placeholder="اختر التخصص..." />
                        </SelectTrigger>
                        <SelectContent>
                          {GENERAL_SERVICE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Pen className="h-4 w-4 text-[#FFB900]" /> وصف المشكلة بالتفصيل
                      </Label>
                      <Textarea placeholder="اذكر تفاصيل المشكلة، متى ظهرت، أي ملاحظات..." rows={4}
                        value={description} onChange={(e) => setDescription(e.target.value)}
                        className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] focus:bg-card py-3 px-4 transition-all" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <CalendarDays className="h-4 w-4 text-[#FFB900]" /> تاريخ ملاحظة المشكلة
                      </Label>
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                        className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] py-3 px-4 transition-all" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Flag className="h-4 w-4 text-[#FFB900]" /> الأولوية
                      </Label>
                      <div className="flex gap-6 bg-muted/30 p-3 rounded-2xl border-2 border-muted">
                        <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="low" id="p-low" /> <Label htmlFor="p-low">عادي</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="medium" id="p-med" /> <Label htmlFor="p-med">مهم</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="high" id="p-high" /> <Label htmlFor="p-high">عاجل</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "urgent" && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Zap className="h-4 w-4 text-[#FFB900]" /> نوع الطارئ *
                      </Label>
                      <Select value={urgentType} onValueChange={setUrgentType}>
                        <SelectTrigger className="rounded-2xl border-2 border-muted bg-muted/30 py-3 px-4">
                          <SelectValue placeholder="اختر نوع العطل..." />
                        </SelectTrigger>
                        <SelectContent>
                          {URGENT_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4 text-[#FFB900]" /> وصف المشكلة بشكل عاجل *
                      </Label>
                      <Textarea placeholder="اذكر تفاصيل دقيقة للمساعدة في الاستجابة السريعة..." rows={4} required
                        value={description} onChange={(e) => setDescription(e.target.value)}
                        className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] focus:bg-card py-3 px-4 transition-all" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Flag className="h-4 w-4 text-[#FFB900]" /> هل المشكلة توقف العمل؟
                      </Label>
                      <div className="flex gap-6 bg-muted/30 p-3 rounded-2xl border-2 border-muted">
                        <RadioGroup value={stopsWork} onValueChange={setStopsWork} className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="yes" id="sw-yes" /> <Label htmlFor="sw-yes">نعم</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="no" id="sw-no" /> <Label htmlFor="sw-no">لا</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Clock className="h-4 w-4 text-[#FFB900]" /> وقت الاتصال المناسب
                      </Label>
                      <Select value={contactTime} onValueChange={setContactTime}>
                        <SelectTrigger className="rounded-2xl border-2 border-muted bg-muted/30 py-3 px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_TIMES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Phone className="h-4 w-4 text-[#FFB900]" /> رقم هاتف للتواصل العاجل *
                      </Label>
                      <Input type="tel" dir="ltr" placeholder="مثال: 01234567890" value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)} required
                        className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] py-3 px-4 transition-all" />
                    </div>
                  </>
                )}

                {activeTab === "periodic" && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Calendar className="h-4 w-4 text-[#FFB900]" /> نوع الخدمة الدورية *
                      </Label>
                      <Select value={periodicType} onValueChange={setPeriodicType}>
                        <SelectTrigger className="rounded-2xl border-2 border-muted bg-muted/30 py-3 px-4">
                          <SelectValue placeholder="اختر..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODIC_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <CalendarDays className="h-4 w-4 text-[#FFB900]" /> التاريخ المفضل للزيارة *
                      </Label>
                      <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} required
                        className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] py-3 px-4 transition-all" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Clock className="h-4 w-4 text-[#FFB900]" /> الفترة الزمنية
                      </Label>
                      <Select value={timeSlot} onValueChange={setTimeSlot}>
                        <SelectTrigger className="rounded-2xl border-2 border-muted bg-muted/30 py-3 px-4">
                          <SelectValue placeholder="اختر..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2 font-semibold">
                        <StickyNote className="h-4 w-4 text-[#FFB900]" /> ملاحظات خاصة / متطلبات
                      </Label>
                      <Textarea placeholder="أي تحضيرات مطلوبة قبل الزيارة، أو ملاحظات عن الأعمال السابقة..." rows={4}
                        value={description} onChange={(e) => setDescription(e.target.value)}
                        className="rounded-2xl border-2 border-muted bg-muted/30 focus:border-[#FFB900] focus:bg-card py-3 px-4 transition-all" />
                    </div>
                  </>
                )}

                {/* Shared: Image Upload */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Camera className="h-4 w-4 text-[#FFB900]" /> إرفاق صور (اختياري)
                  </Label>
                  {imagePreview ? (
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-[#FFB900]/30">
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeImage}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-[#FFB900] bg-[#FFB900]/5 rounded-2xl cursor-pointer hover:bg-[#FFB900]/10 transition-colors">
                      <ImagePlus className="h-8 w-8 text-[#030957]" />
                      <p className="font-semibold text-[#030957]">اضغط أو اسحب الصور هنا</p>
                      <small className="text-muted-foreground">jpg, png, webp (أقصى حجم 10MB)</small>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !clientName.trim() || !branchName.trim()}
                className={`mt-6 gap-3 px-10 py-6 rounded-full font-bold text-lg shadow-lg transition-all hover:-translate-y-0.5 ${
                  activeTab === "urgent"
                    ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20"
                    : activeTab === "periodic"
                    ? "bg-green-600 hover:bg-green-700 shadow-green-600/20"
                    : "bg-[#030957] hover:bg-[#02073e] shadow-[#030957]/20"
                } text-white`}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-[#FFB900]" />}
                {activeTab === "general" && (loading ? "جاري الإرسال..." : "إرسال الطلب")}
                {activeTab === "urgent" && (loading ? "جاري الإرسال..." : "طلب تدخل فوري")}
                {activeTab === "periodic" && (loading ? "جاري الإرسال..." : "جدولة الصيانة الدورية")}
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground text-sm flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#FFB900]" />
          جميع الطلبات مشفرة وتذهب مباشرة لفريق الصيانة لدى UberFix · Alazab
        </div>
      </div>
    </div>
  );
}
