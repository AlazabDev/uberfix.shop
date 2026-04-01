import { LandingHeader } from "@/components/landing/LandingHeader";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, Wrench, Building2, FileText, Users, MessageSquare, 
  DollarSign, Settings, Shield, Map, Globe, Phone, Mail, QrCode,
  BarChart3, ClipboardList, UserCheck, Bell, GitBranch, ExternalLink,
  Lock, Unlock, Zap, BookOpen, HelpCircle, Camera, Calendar,
  FileCheck, Briefcase, ArrowUpRight, Layers
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface RouteItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface RouteSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  isProtected: boolean;
  routes: RouteItem[];
}

const sections: RouteSection[] = [
  {
    title: "الصفحة الرئيسية والتسويق",
    icon: <Globe className="h-5 w-5" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    isProtected: false,
    routes: [
      { path: "/", label: "الصفحة الرئيسية", icon: <Globe className="h-4 w-4" /> },
      { path: "/about", label: "من نحن", icon: <Users className="h-4 w-4" /> },
      { path: "/services", label: "الخدمات", icon: <Wrench className="h-4 w-4" /> },
      { path: "/gallery", label: "معرض الأعمال", icon: <Camera className="h-4 w-4" /> },
      { path: "/blog", label: "المدونة", icon: <BookOpen className="h-4 w-4" /> },
      { path: "/faq", label: "الأسئلة الشائعة", icon: <HelpCircle className="h-4 w-4" /> },
      { path: "/user-guide", label: "دليل المستخدم", icon: <BookOpen className="h-4 w-4" /> },
      { path: "/beta-test", label: "اختبار تجريبي", icon: <Zap className="h-4 w-4" /> },
    ],
  },
  {
    title: "نماذج الطلبات العامة",
    icon: <ClipboardList className="h-5 w-5" />,
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    isProtected: false,
    routes: [
      { path: "/uf", label: "طلب صيانة سريع", icon: <Zap className="h-4 w-4" /> },
      { path: "/quote", label: "طلب عرض أسعار", icon: <FileText className="h-4 w-4" /> },
      { path: "/service-request", label: "طلب خدمة", icon: <Wrench className="h-4 w-4" /> },
      { path: "/book-consultation", label: "حجز استشارة", icon: <Calendar className="h-4 w-4" /> },
      { path: "/service-map", label: "خريطة الخدمات", icon: <Map className="h-4 w-4" /> },
    ],
  },
  {
    title: "تتبع الطلبات",
    icon: <Map className="h-5 w-5" />,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    isProtected: false,
    routes: [
      { path: "/track", label: "تتبع طلب", icon: <Map className="h-4 w-4" /> },
      { path: "/track-orders", label: "تتبع الطلبات", icon: <ClipboardList className="h-4 w-4" /> },
      { path: "/completed-services", label: "الخدمات المنجزة", icon: <FileCheck className="h-4 w-4" /> },
    ],
  },
  {
    title: "تسجيل الفنيين",
    icon: <UserCheck className="h-5 w-5" />,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    isProtected: false,
    routes: [
      { path: "/technicians/register", label: "تسجيل فني جديد", icon: <UserCheck className="h-4 w-4" /> },
    ],
  },
  {
    title: "المصادقة",
    icon: <Shield className="h-5 w-5" />,
    color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    isProtected: false,
    routes: [
      { path: "/login", label: "تسجيل الدخول", icon: <Lock className="h-4 w-4" /> },
      { path: "/register", label: "إنشاء حساب", icon: <Users className="h-4 w-4" /> },
      { path: "/forgot-password", label: "استعادة كلمة المرور", icon: <Shield className="h-4 w-4" /> },
    ],
  },
  {
    title: "القانونية والامتثال",
    icon: <FileCheck className="h-5 w-5" />,
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    isProtected: false,
    routes: [
      { path: "/privacy-policy", label: "سياسة الخصوصية", icon: <Shield className="h-4 w-4" /> },
      { path: "/terms-of-service", label: "شروط الخدمة", icon: <FileText className="h-4 w-4" /> },
      { path: "/acceptable-use-policy", label: "سياسة الاستخدام", icon: <FileCheck className="h-4 w-4" /> },
      { path: "/compliance", label: "بيانات الامتثال", icon: <Shield className="h-4 w-4" /> },
      { path: "/data-deletion", label: "حذف البيانات", icon: <FileText className="h-4 w-4" /> },
      { path: "/api-documentation", label: "توثيق API", icon: <GitBranch className="h-4 w-4" /> },
    ],
  },
  {
    title: "لوحة التحكم",
    icon: <LayoutDashboard className="h-5 w-5" />,
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    isProtected: true,
    routes: [
      { path: "/dashboard", label: "لوحة التحكم الرئيسية", icon: <LayoutDashboard className="h-4 w-4" /> },
      { path: "/monitoring", label: "لوحة المراقبة", icon: <BarChart3 className="h-4 w-4" /> },
      { path: "/branch-management", label: "إدارة الفروع", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    title: "إدارة الصيانة",
    icon: <Wrench className="h-5 w-5" />,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    isProtected: true,
    routes: [
      { path: "/requests", label: "الطلبات", icon: <ClipboardList className="h-4 w-4" /> },
      { path: "/all-requests", label: "جميع الطلبات", icon: <Layers className="h-4 w-4" /> },
      { path: "/maintenance/overview", label: "نظرة عامة", icon: <BarChart3 className="h-4 w-4" /> },
      { path: "/maintenance/create", label: "إنشاء طلب", icon: <ClipboardList className="h-4 w-4" /> },
      { path: "/request-lifecycle", label: "دورة حياة الطلب", icon: <GitBranch className="h-4 w-4" /> },
      { path: "/maintenance-procedures", label: "إجراءات الصيانة", icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    title: "العقارات",
    icon: <Building2 className="h-5 w-5" />,
    color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    isProtected: true,
    routes: [
      { path: "/properties", label: "قائمة العقارات", icon: <Building2 className="h-4 w-4" /> },
      { path: "/properties/add", label: "إضافة عقار", icon: <Building2 className="h-4 w-4" /> },
      { path: "/properties/archived", label: "العقارات المؤرشفة", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    title: "العقود",
    icon: <FileCheck className="h-5 w-5" />,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    isProtected: true,
    routes: [
      { path: "/contracts", label: "قائمة العقود", icon: <FileCheck className="h-4 w-4" /> },
    ],
  },
  {
    title: "التقارير",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    isProtected: true,
    routes: [
      { path: "/reports", label: "التقارير العامة", icon: <BarChart3 className="h-4 w-4" /> },
      { path: "/reports/sla", label: "تقرير SLA", icon: <BarChart3 className="h-4 w-4" /> },
      { path: "/reports/expenses", label: "تقرير المصروفات", icon: <DollarSign className="h-4 w-4" /> },
      { path: "/reports/maintenance", label: "تقرير الصيانة", icon: <Wrench className="h-4 w-4" /> },
      { path: "/reports/production", label: "تقرير الإنتاج", icon: <BarChart3 className="h-4 w-4" /> },
      { path: "/reports/property-lifecycle", label: "دورة حياة العقار", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    title: "إدارة الفنيين",
    icon: <Users className="h-5 w-5" />,
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    isProtected: true,
    routes: [
      { path: "/technicians/dashboard", label: "لوحة الفني", icon: <LayoutDashboard className="h-4 w-4" /> },
      { path: "/technicians/tasks", label: "إدارة المهام", icon: <ClipboardList className="h-4 w-4" /> },
      { path: "/technicians/wallet", label: "المحفظة", icon: <DollarSign className="h-4 w-4" /> },
      { path: "/technicians/earnings", label: "الأرباح", icon: <DollarSign className="h-4 w-4" /> },
      { path: "/hall-of-excellence", label: "قاعة التميز", icon: <ArrowUpRight className="h-4 w-4" /> },
    ],
  },
  {
    title: "الاتصالات",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    isProtected: true,
    routes: [
      { path: "/inbox", label: "صندوق الوارد", icon: <Mail className="h-4 w-4" /> },
      { path: "/whatsapp", label: "واتساب", icon: <MessageSquare className="h-4 w-4" /> },
      { path: "/message-logs", label: "سجل الرسائل", icon: <FileText className="h-4 w-4" /> },
      { path: "/dashboard/notification-center", label: "مركز الإشعارات", icon: <Bell className="h-4 w-4" /> },
      { path: "/dashboard/whatsapp/templates", label: "قوالب واتساب", icon: <FileText className="h-4 w-4" /> },
      { path: "/dashboard/whatsapp/flow-manager", label: "إدارة Flows", icon: <GitBranch className="h-4 w-4" /> },
    ],
  },
  {
    title: "المالية",
    icon: <DollarSign className="h-5 w-5" />,
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    isProtected: true,
    routes: [
      { path: "/invoices", label: "الفواتير", icon: <FileText className="h-4 w-4" /> },
      { path: "/vendors", label: "الموردون", icon: <Briefcase className="h-4 w-4" /> },
      { path: "/appointments", label: "المواعيد", icon: <Calendar className="h-4 w-4" /> },
    ],
  },
  {
    title: "الإدارة",
    icon: <Settings className="h-5 w-5" />,
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    isProtected: true,
    routes: [
      { path: "/admin-control-center", label: "مركز التحكم", icon: <Shield className="h-4 w-4" /> },
      { path: "/admin/users", label: "إدارة المستخدمين", icon: <Users className="h-4 w-4" /> },
      { path: "/admin/technician-approval", label: "موافقة الفنيين", icon: <UserCheck className="h-4 w-4" /> },
      { path: "/admin/stores", label: "دليل المتاجر", icon: <Building2 className="h-4 w-4" /> },
      { path: "/admin/malls", label: "دليل المولات", icon: <Building2 className="h-4 w-4" /> },
      { path: "/admin/rate-card", label: "بطاقة الأسعار", icon: <DollarSign className="h-4 w-4" /> },
      { path: "/admin/module-settings", label: "إعدادات الوحدات", icon: <Settings className="h-4 w-4" /> },
      { path: "/dashboard/gateway", label: "بوابة الصيانة", icon: <GitBranch className="h-4 w-4" /> },
      { path: "/settings", label: "الإعدادات", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

const integrations = [
  { name: "WhatsApp Business Cloud API", desc: "إرسال/استقبال الرسائل، Flows، القوالب", color: "bg-green-500" },
  { name: "Facebook Lead Ads", desc: "استقبال العملاء المحتملين من إعلانات فيسبوك", color: "bg-blue-600" },
  { name: "Google Maps Platform", desc: "الخرائط التشغيلية، حساب المسارات، تحديد المواقع", color: "bg-red-500" },
  { name: "Mapbox GL JS", desc: "خريطة Globe للصفحة الرئيسية", color: "bg-indigo-500" },
  { name: "Twilio", desc: "SMS، المكالمات الصوتية، إشعارات الحالة", color: "bg-red-600" },
  { name: "JotForm", desc: "استقبال النماذج ومزامنة الحالة ثنائية الاتجاه", color: "bg-orange-500" },
  { name: "EmailJS", desc: "إرسال إشعارات البريد الإلكتروني", color: "bg-yellow-500" },
  { name: "Supabase", desc: "قاعدة البيانات، المصادقة، التخزين، Edge Functions، Realtime", color: "bg-emerald-500" },
  { name: "Meta Graph API", desc: "إدارة الصفحات، حذف البيانات، إلغاء التفويض", color: "bg-blue-500" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const SiteMap = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <LandingHeader />

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            خريطة التطبيق
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            جميع صفحات ومسارات نظام UberFix مع روابط التكاملات الخارجية
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">عام</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">يتطلب تسجيل دخول</span>
            </div>
          </div>
        </div>

        {/* Route Sections */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
        >
          {sections.map((section) => (
            <motion.div key={section.title} variants={item}>
              <Card className="h-full hover:shadow-md transition-shadow border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${section.color}`}>
                        {section.icon}
                      </div>
                      {section.title}
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${section.isProtected ? 'bg-primary/5 text-primary border-primary/20' : 'bg-green-500/5 text-green-600 border-green-500/20'}`}>
                      {section.isProtected ? <Lock className="h-3 w-3 ml-1" /> : <Unlock className="h-3 w-3 ml-1" />}
                      {section.isProtected ? "محمي" : "عام"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5">
                    {section.routes.map((route) => (
                      <li key={route.path}>
                        <Link
                          to={route.path}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group py-1 px-2 rounded-md hover:bg-accent/50"
                        >
                          <span className="text-muted-foreground/50 group-hover:text-primary transition-colors">
                            {route.icon}
                          </span>
                          <span className="flex-1">{route.label}</span>
                          <code className="text-[10px] text-muted-foreground/40 font-mono group-hover:text-muted-foreground/70 transition-colors hidden sm:inline" dir="ltr">
                            {route.path}
                          </code>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Integrations */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            التكاملات الخارجية
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {integrations.map((intg) => (
              <Card key={intg.name} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${intg.color}`} />
                  <div>
                    <p className="font-medium text-sm text-foreground">{intg.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{intg.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-primary">51+</p>
              <p className="text-xs text-muted-foreground mt-1">مسار عام</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-primary">58+</p>
              <p className="text-xs text-muted-foreground mt-1">مسار محمي</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-primary">49</p>
              <p className="text-xs text-muted-foreground mt-1">Edge Function</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-primary">9</p>
              <p className="text-xs text-muted-foreground mt-1">تكامل خارجي</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SiteMap;
