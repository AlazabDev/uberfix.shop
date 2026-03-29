# إعداد Google Maps API لتطبيق UberFix

## نظرة عامة

يستخدم التطبيق **مفتاحين منفصلين** لخرائط Google:

| المفتاح | الاستخدام | مكان التخزين |
|---------|-----------|-------------|
| **Browser Key** | الواجهة الأمامية (الخرائط، Autocomplete، Geocoding) | `VITE_GOOGLE_MAPS_API_KEY` في `.env` |
| **Server Key** | Edge Functions (حساب المسارات) | Supabase Secrets باسم `GOOGLE_MAPS_API_KEY` |

---

## الخطوة 1: إنشاء مشروع Google Cloud

1. افتح [Google Cloud Console](https://console.cloud.google.com/)
2. اضغط **Select a project** → **New Project**
3. سمّ المشروع مثلاً `UberFix Production`
4. اضغط **Create**

> ⚠️ يجب تفعيل **Billing** على المشروع. بدون ذلك لن تعمل أي API.

---

## الخطوة 2: تفعيل الـ APIs المطلوبة

من القائمة الجانبية: **APIs & Services** → **Library**

فعّل كل الـ APIs التالية واحدة تلو الأخرى:

### مطلوبة (إجباري)

| API | الاستخدام في التطبيق |
|-----|---------------------|
| **Maps JavaScript API** | عرض الخرائط في جميع المكونات |
| **Places API** | البحث التلقائي عن العناوين (Autocomplete) |
| **Geocoding API** | تحويل الإحداثيات إلى عناوين والعكس |
| **Directions API** | حساب المسارات بين الفني والعميل |

### اختيارية

| API | الاستخدام |
|-----|----------|
| **Maps Static API** | صور خرائط ثابتة في الإشعارات/PDF |
| **Distance Matrix API** | حساب المسافات لعدة فنيين دفعة واحدة |

### كيفية التفعيل

1. ابحث عن اسم الـ API في Library
2. اضغط عليها
3. اضغط **Enable**
4. كرر لكل API

---

## الخطوة 3: إنشاء Map ID (مطلوب للـ Advanced Markers)

بعض مكونات التطبيق تستخدم `AdvancedMarkerElement` الذي يتطلب **Map ID**.

1. اذهب إلى [Google Maps Platform → Map Management](https://console.cloud.google.com/google/maps-apis/studio/maps)
2. اضغط **Create Map ID**
3. الإعدادات:
   - **Name**: `UberFix Production Map`
   - **Map type**: `JavaScript`
   - **Raster / Vector**: اختر **Vector** (مطلوب للـ Advanced Markers)
4. اضغط **Save**
5. انسخ الـ **Map ID** الناتج (شكله مثل: `b41c60a3f8e58bdb15b2c668`)

### تخصيص ستايل الخريطة (اختياري)

إذا كانت الخريطة تظهر **داكنة جداً**، فالسبب هو Cloud Style مطبق على Map ID:

1. من نفس صفحة Map Management، اضغط على الـ Map ID
2. اذهب إلى **Map Style**
3. اختر **Standard** أو أنشئ ستايل جديد يناسب هوية التطبيق
4. اضغط **Save**

> 💡 لا تستخدم `styles` property في الكود مع Map ID — استخدم Cloud Styling فقط.

---

## الخطوة 4: إنشاء Browser Key (للواجهة الأمامية)

1. اذهب إلى **APIs & Services** → **Credentials**
2. اضغط **Create Credentials** → **API Key**
3. سيظهر مفتاح جديد — اضغط **Edit API Key**

### الإعدادات:

**Name**: `UberFix Browser Key`

**Application restrictions**: اختر **HTTP referrers (websites)**

أضف هذه الروابط في **Website restrictions**:

```
https://uberfix.shop/*
https://www.uberfix.shop/*
https://uberfix.alazab.com/*
https://www.uberfix.alazab.com/*
https://*.lovable.app/*
https://*.lovableproject.com/*
http://localhost:*/*
http://127.0.0.1:*/*
```

**API restrictions**: اختر **Restrict key** وحدد:
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

> ⛔ لا تضف Directions API هنا — هذا المفتاح للمتصفح فقط.

4. اضغط **Save**
5. انسخ المفتاح

---

## الخطوة 5: إنشاء Server Key (للـ Edge Functions)

1. من نفس صفحة **Credentials**، اضغط **Create Credentials** → **API Key**
2. اضغط **Edit API Key**

### الإعدادات:

**Name**: `UberFix Server Key`

**Application restrictions**: اختر **None** (أو IP restrictions إذا عرفت IPs سيرفر Supabase)

**API restrictions**: اختر **Restrict key** وحدد:
- ✅ Directions API
- ✅ Geocoding API

3. اضغط **Save**
4. انسخ المفتاح

---

## الخطوة 6: تكوين المفاتيح في التطبيق

### Browser Key → ملف `.env`

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...your-browser-key...
VITE_GOOGLE_MAPS_ID=your-map-id-from-step-3
```

### Server Key → Supabase Secrets

1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك → **Settings** → **Edge Functions** → **Secrets**
3. أضف:

| Secret Name | Value |
|-------------|-------|
| `GOOGLE_MAPS_API_KEY` | المفتاح السيرفر الذي أنشأته |

> هذا المفتاح تستخدمه Edge Function `calculate-route` و `get-maps-key`.

---

## الخطوة 7: التحقق من عمل كل شيء

### اختبار Browser Key

افتح المتصفح على أحد الدومينات المسموحة وتأكد من:

- [x] خريطة الخدمات تظهر بشكل صحيح (ليست داكنة)
- [x] البحث عن العناوين يعمل (Autocomplete)
- [x] النقر على الخريطة يحدد الموقع
- [x] علامات الفنيين والفروع تظهر

### اختبار Server Key

من Supabase Edge Functions logs تأكد أن:

- [x] `calculate-route` يعيد مسار صحيح
- [x] `get-maps-key` يعيد المفتاح بنجاح

### اختبار Map ID

- [x] الخريطة تظهر بالستايل المحدد (ليست داكنة/سوداء)
- [x] `AdvancedMarkerElement` يعمل بدون أخطاء في Console

---

## استكشاف الأخطاء الشائعة

### "يتعذّر على هذه الصفحة تحميل خرائط Google بشكل صحيح"

| السبب المحتمل | الحل |
|--------------|------|
| المفتاح غير صالح أو محذوف | تأكد من نسخ المفتاح الصحيح |
| Billing غير مفعل | فعّل الفوترة في Google Cloud |
| APIs غير مفعلة | تأكد من تفعيل كل API من الخطوة 2 |
| HTTP referrer خاطئ | تأكد من إضافة دومينك بالشكل `https://yourdomain.com/*` |

### الخريطة تظهر داكنة جداً

| السبب | الحل |
|------|------|
| Cloud Style داكن مطبق على Map ID | غيّر الستايل من Map Management |
| استخدام `styles` مع `mapId` معاً | احذف `styles` من الكود واعتمد على Cloud Styling |

### Autocomplete لا يعمل

| السبب | الحل |
|------|------|
| Places API غير مفعلة | فعّلها من Library |
| المفتاح لا يملك صلاحية Places | أضف Places API في API restrictions |

### خطأ "google.maps.marker is not defined"

| السبب | الحل |
|------|------|
| Map ID غير صالح | تأكد أن Map ID من نوع Vector |
| مكتبة marker غير محملة | تأكد أن `libraries` تتضمن `marker` |

---

## المكونات التي تستخدم Google Maps

| المكون | الملف | APIs المستخدمة |
|--------|-------|---------------|
| خريطة الخدمات | `src/components/maps/ServiceMap.tsx` | Maps JS, Markers |
| خريطة الفروع | `src/components/maps/BranchesGoogleMap.tsx` | Maps JS, Advanced Markers |
| حاوية الخريطة | `src/components/maps/GoogleMapContainer.tsx` | Maps JS, Advanced Markers |
| البحث عن العناوين | `src/components/maps/GooglePlacesAutocomplete.tsx` | Places |
| اختيار الموقع | `src/components/maps/MapLocationPicker.tsx` | Maps JS |
| الخريطة التفاعلية | `src/components/maps/InteractiveMap.tsx` | Maps JS, Places, Geocoding |
| حساب المسارات | `supabase/functions/calculate-route/` | Directions (Server Key) |
| جلب المفتاح | `supabase/functions/get-maps-key/` | — (يخدم المفتاح فقط) |

---

## المكونات التي تستخدم Mapbox (منفصلة)

| المكون | الملف | الغرض |
|--------|-------|-------|
| الكرة الأرضية | `src/components/maps/Globe3D.tsx` | عرض ترويجي في الصفحة الرئيسية |
| الخريطة العالمية | `src/components/maps/GlobalMap.tsx` | عرض الفروع على خريطة عالمية |

> Mapbox يعمل بمفتاح `VITE_MAPBOX_TOKEN` ولا علاقة له بإعدادات Google Maps.

---

## ملخص سريع

```
┌─────────────────────────────────────────────┐
│           Google Cloud Console              │
│                                             │
│  1. أنشئ مشروع + فعّل Billing              │
│  2. فعّل 4 APIs                             │
│  3. أنشئ Map ID (Vector)                    │
│  4. أنشئ Browser Key → .env                 │
│  5. أنشئ Server Key → Supabase Secrets      │
│                                             │
│  APIs المطلوبة:                              │
│  ├── Maps JavaScript API                    │
│  ├── Places API                             │
│  ├── Geocoding API                          │
│  └── Directions API                         │
│                                             │
│  المفاتيح:                                   │
│  ├── Browser Key (مقيّد بـ HTTP referrers)   │
│  └── Server Key (مقيّد بـ API فقط)          │
└─────────────────────────────────────────────┘
```
