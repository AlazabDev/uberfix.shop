// chatbotData.full.ts
// ملف شامل لتغذية الشات بوت - يدعم جميع الاحتياجات

// ==========================================
// 1. الأنواع الأساسية (Types & Interfaces)
// ==========================================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp?: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    suggestedActions?: string[];
  };
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface Intent {
  id: string;
  name: string;
  keywords: string[];
  responses: string[];
  requiresData?: string[];
  followUp?: string;
}

export interface ConversationFlow {
  id: string;
  name: string;
  steps: ConversationStep[];
}

export interface ConversationStep {
  id?: string;
  question: string;
  expectedAnswerType: "text" | "number" | "phone" | "email" | "choice";
  choices?: string[];
  nextStepId?: string;
  validation?: RegExp;
  errorMessage?: string;
}

export interface ProductService {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  priceRange: string;
  duration: string;
  warranty: string;
  features: string[];
  imageUrl?: string;
}

export interface Branch {
  id: string;
  city: string;
  cityAr: string;
  address: string;
  phone: string;
  workingHours: string;
  lat?: number;
  lng?: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  priority: number;
}

export interface QuickReply {
  id: string;
  title: string;
  payload: string;
  icon?: string;
}

// ==========================================
// 2. قائمة التنقل (Navigation)
// ==========================================

export const NAV_ITEMS: NavItem[] = [
  { label: "الرئيسية", href: "/", icon: "🏠" },
  { label: "خدماتنا", href: "/services", icon: "⚙️" },
  { label: "مشاريعنا", href: "/projects", icon: "📁" },
  { label: "طلب عرض سعر", href: "/quote", icon: "💰" },
  { label: "من نحن", href: "/about", icon: "ℹ️" },
  { label: "تواصل معنا", href: "/contact", icon: "📞" },
  { label: "المدونة", href: "/blog", icon: "📝" },
  { label: "الشركاء", href: "/partners", icon: "🤝" },
];

// ==========================================
// 3. الأسئلة المقترحة (Suggested Questions)
// ==========================================

export const SUGGESTED_QUESTIONS = [
  "ما هي خدمات الشركة؟",
  "أريد عرض سعر تشطيب",
  "ما هي أسعار التشطيب؟",
  "ما هي فروع الشركة؟",
  "كم يستغرق تشطيب شقة؟",
  "هل لديكم ضمان؟",
  "ما هي طريقة الدفع؟",
  "تواصل مع خدمة العملاء",
];

// ==========================================
// 4. الردود السريعة (Quick Replies)
// ==========================================

export const QUICK_REPLIES: QuickReply[] = [
  { id: "services", title: "📋 خدماتنا", payload: "ما هي خدمات الشركة؟" },
  { id: "price", title: "💰 عرض سعر", payload: "أريد عرض سعر تشطيب" },
  { id: "prices", title: "💵 الأسعار", payload: "ما هي أسعار التشطيب؟" },
  { id: "branches", title: "📍 فروعنا", payload: "ما هي فروع الشركة؟" },
  { id: "time", title: "⏱️ المدة", payload: "كم يستغرق تشطيب شقة؟" },
  { id: "warranty", title: "🛡️ الضمان", payload: "هل لديكم ضمان؟" },
  { id: "payment", title: "💳 الدفع", payload: "ما هي طريقة الدفع؟" },
  { id: "contact", title: "📞 اتصل بنا", payload: "تواصل مع خدمة العملاء" },
  { id: "quote", title: "📄 طلب عرض سعر", payload: "طلب عرض سعر جديد" },
  { id: "schedule", title: "📅 حجز موعد", payload: "أريد حجز موعد استشارة" },
];

// ==========================================
// 5. الرسائل الافتتاحية (Initial Messages)
// ==========================================

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content: "مرحباً بك في شركة رواد البناء! 🏗️ أنا مساعدك الذكي للتشطيبات والمقاولات.",
    timestamp: new Date(),
    metadata: {
      intent: "greeting",
      confidence: 1,
      suggestedActions: QUICK_REPLIES.map(q => q.title)
    }
  },
  {
    role: "assistant",
    content: "أستطيع مساعدتك في:\n\n🔹 استشارات التشطيب المجانية\n🔹 حساب التكاليف التقريبية\n🔹 حجز موعد مع فريق الخبراء\n🔹 طلب عرض سعر مفصل\n🔹 متابعة مشروعك الحالي\n🔹 الإجابة عن استفساراتك الفنية",
    timestamp: new Date(),
  },
  {
    role: "assistant",
    content: "اختر أحد الأسئلة السريعة أدناه أو اكتب سؤالك مباشرة 👇",
    timestamp: new Date(),
  },
];

// ==========================================
// 6. النوايا والردود (Intents & Responses)
// ==========================================

export const INTENTS: Intent[] = [
  {
    id: "greeting",
    name: "تحية",
    keywords: ["مرحبا", "اهلا", "سلام", "صباح الخير", "مساء الخير", "هلا"],
    responses: [
      "أهلاً بك! كيف يمكنني مساعدتك اليوم؟ 😊",
      "مرحباً! أنا في انتظار استفساراتك عن التشطيبات",
      "أهلاً وسهلاً! تفضل واسأل عن أي شيء يخص التشطيبات والمقاولات",
    ],
  },
  {
    id: "services",
    name: "الخدمات",
    keywords: ["خدمات", "تقدمون", "تعملون", "مجال", "تشطيب", "مقاولات", "شغل"],
    responses: [
      "نقدم خدمات متكاملة في التشطيبات والمقاولات:\n\n✅ تشطيب شقق وفيلات (سوبر لوكس، ديلوكس، اقتصادي)\n✅ تركيب سيراميك ورخام وباركيه\n✅ دهانات داخلية وخارجية (جووتن، شروق، جوتن)\n✅ أعمال سباكة وكهرباء\n✅ واجهات كلادينج وحجر طبيعي\n✅ عزل حراري ومائي\n✅ أعمال نجارة وأثاث مطبخ",
    ],
  },
  {
    id: "price_inquiry",
    name: "استفسار عن السعر",
    keywords: ["سعر", "تكلفة", "أسعار", "كم سعر", "كم تكلف", "بكم", "سعرك"],
    responses: [
      "أسعار التشطيب حسب مستوى الجودة:\n\n🏠 تشطيب اقتصادي: 450 - 650 جنيه/م²\n🏢 تشطيب ديلوكس: 700 - 950 جنيه/م²\n🏰 تشطيب سوبر لوكس: 1000 - 1500 جنيه/م²\n\nهل تريد عرض سعر دقيق لمشروعك؟",
    ],
  },
  {
    id: "quote_request",
    name: "طلب عرض سعر",
    keywords: ["عرض سعر", "عرض سعر", "احسب لي", "تقدير", "كلفني"],
    responses: [
      "لإرسال عرض سعر دقيق، أجب على هذه الأسئلة:\n\n1️⃣ مساحة الشقة/الفيلا بالمتر المربع\n2️⃣ نوع العقار (شقة - فيلا - محل)\n3️⃣ مستوى التشطيب المطلوب\n4️⃣ المنطقة/المدينة",
    ],
    requiresData: ["area", "propertyType", "finishingLevel", "location"],
    followUp: "quote_collection",
  },
  {
    id: "branches",
    name: "الفروع",
    keywords: ["فرع", "فروع", "مكان", "عنوان", "منطقة", "موقع"],
    responses: [
      "لدينا فروع في عدة مدن:\n\n📍 القاهرة: مدينة نصر - التجمع الخامس - مصر الجديدة\n📍 الإسكندرية: سموحة - كليوباترا - محطة الرمل\n📍 الجيزة: المهندسين - الشيخ زايد - 6 أكتوبر\n📍 مدن أخرى: طنطا - المنصورة - بورسعيد - الإسماعيلية\n\nنخدم جميع محافظات مصر عبر فريق متنقل",
    ],
  },
  {
    id: "time_duration",
    name: "مدة التنفيذ",
    keywords: ["وقت", "مدة", "كم يوم", "كم شهر", "يستغرق", "مدة التشطيب"],
    responses: [
      "متوسط مدة تشطيب شقة 100 متر:\n\n⚡ اقتصادي: 30-40 يوم\n📌 ديلوكس: 45-60 يوم\n✨ سوبر لوكس: 60-75 يوم\n\nالعوامل المؤثرة: توفر الخامات، عدد العمال، تعقيد التصميم",
    ],
  },
  {
    id: "warranty",
    name: "الضمان",
    keywords: ["ضمان", "ضمانات", "صيانة", "ضمانة", "كفالة"],
    responses: [
      "مميزات الضمان لدينا:\n\n✅ 10 سنوات ضمان على أعمال التشطيب ضد عيوب الصناعة\n✅ 5 سنوات على أعمال السباكة والكهرباء\n✅ 3 سنوات على الأجهزة والمواد\n✅ صيانة مجانية لمدة عام كامل\n✅ فريق دعم فني متوفر 24/7",
    ],
  },
  {
    id: "payment_methods",
    name: "طرق الدفع",
    keywords: ["دفع", "تقسيط", "سداد", "طريقة الدفع", "مقدم", "قسط"],
    responses: [
      "نظام الدفع المرن:\n\n💰 15-20% دفعة مقدمة عند التعاقد\n💰 30-40% بعد المحارة والسباكة\n💰 30-35% بعد الدهانات والسيراميك\n💰 10% بعد الاستلام النهائي\n\n🔹 تقسيط حتى 12 شهراً بدون فوائد\n🔹 خصم 5% للدفع النقدي الكامل",
    ],
  },
  {
    id: "contact",
    name: "الاتصال",
    keywords: ["اتصل", "رقم", "تليفون", "واتساب", "تواصل", "خدمة العملاء"],
    responses: [
      "طرق التواصل معنا:\n\n📞 الهاتف: 0123456789\n💬 واتساب: 0123456789\n📧 البريد الإلكتروني: info@roaaelbana.com\n🌐 الموقع: www.roaaelbana.com\n\n⏰ ساعات العمل: السبت - الخميس | 9ص - 9م",
    ],
  },
  {
    id: "schedule_appointment",
    name: "حجز موعد",
    keywords: ["حجز", "موعد", "استشارة", "زيارة", "مقابلة"],
    responses: [
      "لحجز موعد استشارة مجانية، أرسل لي:\n\n📅 التاريخ المناسب\n⏰ الوقت المفضل\n📍 المنطقة\n📞 رقم هاتفك\n\nسيتواصل معك مندوبنا خلال ساعة لتأكيد الموعد",
    ],
    requiresData: ["date", "time", "location", "phone"],
    followUp: "appointment_confirmation",
  },
  {
    id: "goodbye",
    name: "وداع",
    keywords: ["مع السلامة", "باي", "شكرا", "جزاك الله خير", "وداعا"],
    responses: [
      "شكراً لتواصلك معنا! 🏗️ نتمنى لك يوماً سعيداً، وأهلاً بك في أي وقت",
      "مع السلامة! سعدنا بمساعدتك، تفضل بزيارتنا مرة أخرى",
      "في خدمتك دائماً! 👋",
    ],
  },
];

// ==========================================
// 7. تدفق المحادثة (Conversation Flows)
// ==========================================

export const CONVERSATION_FLOWS: ConversationFlow[] = [
  {
    id: "quote_collection",
    name: "جمع بيانات عرض السعر",
    steps: [
      {
        question: "ما هي مساحة العقار بالمتر المربع؟",
        expectedAnswerType: "number",
        validation: /^[0-9]{2,4}$/,
        errorMessage: "الرجاء إدخال رقم صحيح (مثال: 120)",
        nextStepId: "property_type",
      },
      {
        id: "property_type",
        question: "نوع العقار: (شقة - فيلا - محل تجاري - مكتب)",
        expectedAnswerType: "choice",
        choices: ["شقة", "فيلا", "محل تجاري", "مكتب"],
        nextStepId: "finishing_level",
      },
      {
        id: "finishing_level",
        question: "مستوى التشطيب المطلوب:",
        expectedAnswerType: "choice",
        choices: ["اقتصادي", "ديلوكس", "سوبر لوكس"],
        nextStepId: "location",
      },
      {
        id: "location",
        question: "ما هي المنطقة/المدينة؟",
        expectedAnswerType: "text",
        nextStepId: "phone",
      },
      {
        id: "phone",
        question: "رقم هاتفك للتواصل (سيتم إرسال عرض السعر عليه):",
        expectedAnswerType: "phone",
        validation: /^01[0-9]{9}$/,
        errorMessage: "الرجاء إدخال رقم مصري صحيح (مثال: 0123456789)",
        nextStepId: "complete",
      },
    ],
  },
  {
    id: "appointment_confirmation",
    name: "تأكيد حجز موعد",
    steps: [
      {
        question: "ما هو التاريخ المناسب لك؟ (مثال: 15 ابريل)",
        expectedAnswerType: "text",
        nextStepId: "time",
      },
      {
        id: "time",
        question: "ما هو الوقت المناسب؟ (مثال: 5 عصراً)",
        expectedAnswerType: "text",
        nextStepId: "location_appointment",
      },
      {
        id: "location_appointment",
        question: "في أي منطقة تريد الموعد؟",
        expectedAnswerType: "text",
        nextStepId: "phone_appointment",
      },
      {
        id: "phone_appointment",
        question: "رقم هاتفك للتأكيد:",
        expectedAnswerType: "phone",
        validation: /^01[0-9]{9}$/,
        errorMessage: "الرجاء إدخال رقم صحيح",
        nextStepId: "complete",
      },
    ],
  },
];

// ==========================================
// 8. المنتجات والخدمات (Products & Services)
// ==========================================

export const PRODUCTS_SERVICES: ProductService[] = [
  {
    id: "eco_finishing",
    name: "Eco Finishing",
    nameAr: "تشطيب اقتصادي",
    description: "تشطيب أساسي بجودة عالية وأسعار مناسبة",
    priceRange: "450-650 جنيه/م²",
    duration: "30-40 يوم",
    warranty: "5 سنوات",
    features: ["سيراميك محلي", "دهانات جوتن", "سباكة بولى بيبر", "كهرباء فنار"],
  },
  {
    id: "deluxe_finishing",
    name: "Deluxe Finishing",
    nameAr: "تشطيب ديلوكس",
    description: "تشطيب فاخر بخامات ممتازة وتشطيبات دقيقة",
    priceRange: "700-950 جنيه/م²",
    duration: "45-60 يوم",
    warranty: "7 سنوات",
    features: ["سيراميك إسباني/محلي درجة أولى", "دهانات شروق/جوتن", "شطافات روكا", "أباجورات راقية"],
  },
  {
    id: "super_luxury",
    name: "Super Luxury Finishing",
    nameAr: "تشطيب سوبر لوكس",
    description: "أعلى مستويات الجودة والفخامة",
    priceRange: "1000-1500 جنيه/م²",
    duration: "60-75 يوم",
    warranty: "10 سنوات",
    features: ["رخام طبيعي/بورسلين إيطالي", "دهانات إيطالية/سويسرية", "صحية إيطالي", "لمبات LED ذكية", "عزل كامل"],
  },
];

// ==========================================
// 9. الفروع (Branches)
// ==========================================

export const BRANCHES: Branch[] = [
  {
    id: "cairo_nasr",
    city: "Cairo",
    cityAr: "القاهرة",
    address: "مدينة نصر - شارع عباس العقاد - برج ٤",
    phone: "0123456789",
    workingHours: "السبت - الخميس 9ص - 9م",
    lat: 30.0456,
    lng: 31.3675,
  },
  {
    id: "cairo_5th",
    city: "Cairo",
    cityAr: "القاهرة",
    address: "التجمع الخامس - الحي الثالث - مجمع الخدمات",
    phone: "0123456789",
    workingHours: "السبت - الخميس 9ص - 9م",
    lat: 30.0095,
    lng: 31.4491,
  },
  {
    id: "alex_smouha",
    city: "Alexandria",
    cityAr: "الإسكندرية",
    address: "سموحة - شارع أحمد شوقي - فوق بنك مصر",
    phone: "0123456789",
    workingHours: "السبت - الخميس 10ص - 8م",
    lat: 31.2231,
    lng: 29.9611,
  },
  {
    id: "giza_sheikh",
    city: "Giza",
    cityAr: "الجيزة",
    address: "الشيخ زايد - الحي الرابع - شارع التسعين",
    phone: "0123456789",
    workingHours: "السبت - الخميس 9ص - 9م",
    lat: 29.9761,
    lng: 30.9481,
  },
];

// ==========================================
// 10. الأسئلة الشائعة (FAQs)
// ==========================================

export const FAQS: FAQ[] = [
  {
    id: "faq1",
    question: "هل تقومون بتشطيب الشقق المفروشة؟",
    answer: "نعم، نقوم بتشطيب جميع أنواع العقار بما فيها الشقق المفروشة، ونقدم خدمة تسليم مفتاح كامل (تشطيب + أثاث + أجهزة).",
    category: "الخدمات",
    keywords: ["مفروش", "أثاث", "تشطيب كامل"],
    priority: 8,
  },
  {
    id: "faq2",
    question: "هل تقدمون ضمان على الخامات؟",
    answer: "نعم، الخامات التي نركبها لها ضمان حسب كل مورد، ويبدأ من سنة حتى 25 سنة حسب نوع الخامة.",
    category: "الضمان",
    keywords: ["ضمان خامات", "كفالة مواد"],
    priority: 9,
  },
  {
    id: "faq3",
    question: "كيف أتابع مشروعي أثناء التشطيب؟",
    answer: "نوفر تطبيق لمتابعة المشروع خطوة بخطوة مع تقارير أسبوعية بالصور والفيديوهات، وفريق متخصص للتواصل المستمر.",
    category: "المتابعة",
    keywords: ["متابعة", "مراقبة", "تطبيق"],
    priority: 7,
  },
  {
    id: "faq4",
    question: "هل لديكم مهندسين استشاريين؟",
    answer: "نعم، لدينا فريق من المهندسين الاستشاريين المتخصصين في التصميم الداخلي والهندسة المعمارية والإنشائية.",
    category: "الفريق",
    keywords: ["مهندس", "استشاري", "مصمم"],
    priority: 6,
  },
  {
    id: "faq5",
    question: "هل تشمل الأسعار الخامات؟",
    answer: "نعم، الأسعار التي نقدمها شاملة الخامات والأيدي العاملة والتصاريح إن وجدت. نرسل عرض سعر مفصل بكل بند.",
    category: "الأسعار",
    keywords: ["الخامات", "شامل", "مواد"],
    priority: 10,
  },
];

// ==========================================
// 11. الردود الاحتياطية (Fallback Responses)
// ==========================================

export const FALLBACK_RESPONSES = {
  unknown: "عذراً، لم أستطع فهم سؤالك بالكامل. 😅 يمكنك إعادة صياغته أو اختيار سؤال من القائمة أدناه:",
  technical: "عذراً، حدث خطأ فني. يرجى المحاولة مرة أخرى أو التواصل مع خدمة العملاء على 0123456789",
  out_of_context: "سؤالك خارج نطاق خدمات التشطيب حالياً. هل تريد التحدث مع خدمة العملاء؟",
  positive: "شكراً لك! 😊 هل تريد مساعدة في شيء آخر؟",
  negative: "آسف لسماع ذلك. كيف يمكنني تحسين تجربتك؟",
};

// ==========================================
// 12. رسائل النظام والأخطاء (System Messages)
// ==========================================

export const SYSTEM_MESSAGES = {
  typing: "يكتب...",
  processing: "جاري معالجة طلبك 🔄",
  connected_to_agent: "سيتم تحويلك إلى أحد المندوبين المتاحين الآن ⏳",
  agent_joined: "انضم {agentName} إلى المحادثة 👨‍💼",
  offline: "خدمة العملاء غير متاحة حالياً. سيرد عليكم فريقنا خلال ساعات العمل الرسمية.",
  max_attempts: "تمت المحاولة عدة مرات. سيتم تحويلك إلى خدمة العملاء مباشرة.",
};

// ==========================================
// 13. بيانات تجريبية لعرض الأسعار (Demo Data)
// ==========================================

export const DEMO_QUOTE = {
  id: "QUOTE-001",
  customer: "أحمد محمد",
  area: 120,
  propertyType: "شقة",
  finishingLevel: "سوبر لوكس",
  totalPrice: 138000,
  pricePerMeter: 1150,
  currency: "جنيه مصري",
  breakdown: {
    materials: 80000,
    labor: 45000,
    permits: 5000,
    contingency: 8000,
  },
  validUntil: new Date("2025-05-15"),
  status: "pending",
};

export const PROJECT_STATS = {
  completedProjects: 450,
  happyClients: 420,
  yearsOfExperience: 12,
  expertTeam: 85,
  citiesServed: 18,
};

// ==========================================
// 14. دوال مساعدة (Helper Functions)
// ==========================================

/**
 * البحث عن نية (Intent) بناءً على كلمات مفتاحية
 */
export function findIntent(userMessage: string): Intent | undefined {
  const normalizedMessage = userMessage.toLowerCase();
  
  return INTENTS.find(intent =>
    intent.keywords.some(keyword => normalizedMessage.includes(keyword))
  );
}

/**
 * الحصول على رد عشوائي من قائمة الردود المتاحة لنية معينة
 */
export function getRandomResponse(intent: Intent): string {
  const responses = intent.responses;
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * البحث في الأسئلة الشائعة
 */
export function searchFAQ(query: string): FAQ | undefined {
  const normalizedQuery = query.toLowerCase();
  
  return FAQS.find(faq =>
    faq.keywords.some(keyword => normalizedQuery.includes(keyword)) ||
    normalizedQuery.includes(faq.question.toLowerCase())
  );
}

/**
 * تنسيق عرض السعر كرسالة
 */
export function formatQuoteMessage(quote: typeof DEMO_QUOTE): string {
  return `
📄 *عرض السعر الخاص بك*

🏠 المساحة: ${quote.area} م²
📐 نوع العقار: ${quote.propertyType}
✨ مستوى التشطيب: ${quote.finishingLevel}

💰 *الإجمالي: ${quote.totalPrice.toLocaleString()} ${quote.currency}*
📊 سعر المتر: ${quote.pricePerMeter} ${quote.currency}

تفاصيل:
• خامات: ${quote.breakdown.materials.toLocaleString()} ج.م
• أيدي عاملة: ${quote.breakdown.labor.toLocaleString()} ج.م
• تصاريح: ${quote.breakdown.permits.toLocaleString()} ج.م
• طوارئ: ${quote.breakdown.contingency.toLocaleString()} ج.م

⏰ العرض صالح حتى: ${quote.validUntil.toLocaleDateString('ar-EG')}
  `;
}

// ==========================================
// 15. تصدير كل شيء بشكل افتراضي (Default Export)
// ==========================================

const chatbotData = {
  NAV_ITEMS,
  SUGGESTED_QUESTIONS,
  QUICK_REPLIES,
  INITIAL_MESSAGES,
  INTENTS,
  CONVERSATION_FLOWS,
  PRODUCTS_SERVICES,
  BRANCHES,
  FAQS,
  FALLBACK_RESPONSES,
  SYSTEM_MESSAGES,
  DEMO_QUOTE,
  PROJECT_STATS,
  findIntent,
  getRandomResponse,
  searchFAQ,
  formatQuoteMessage,
};

export default chatbotData;
