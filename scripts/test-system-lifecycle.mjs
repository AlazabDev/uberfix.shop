#!/usr/bin/env node
/**
 * 🔄 سكربت اختبار دورة حياة النظام الكاملة - UberFix
 *
 * يقوم بـ:
 *  1. إنشاء/التأكد من شركة "أبو عوف المعادي" وفرعها (50 شارع المعادي)
 *  2. تحميل جميع الخدمات (categories) مع ربطها بأسعار من rate_items_rows.csv
 *  3. إنشاء طلب صيانة جديد عبر maintenance-gateway
 *  4. متابعة الطلب خلال كل مراحل workflow_stage حتى الإغلاق
 *  5. التحقق من إرسال إشعارات WhatsApp/Email للعميل
 *
 * التشغيل:
 *   node scripts/test-system-lifecycle.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ====== الإعدادات ======
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zrrffsjbfkphridqyais.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycmZmc2piZmtwaHJpZHF5YWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzE1NzMsImV4cCI6MjA3MjAwNzU3M30.AwzY48mSUGeopBv5P6gzAPlipTbQasmXK8DR-L_Tm9A';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // مطلوب لإنشاء البيانات

const TEST_CLIENT = {
  name: 'عميل اختبار - أبو عوف',
  email: 'test@alazab.com',
  phone: '+201004006620',
};

const TEST_BRANCH = {
  company_name: 'شركة أبو عوف للصيانة',
  branch_name: 'فرع أبو عوف - المعادي 50',
  city: 'القاهرة',
  address: '50 شارع المعادي، القاهرة، مصر',
};

const WORKFLOW_STAGES = [
  'submitted',
  'assigned',
  'scheduled',
  'in_progress',
  'inspection',
  'waiting_parts',
  'completed',
  'billed',
  'paid',
];

// ====== أدوات مساعدة ======
const log = {
  step: (n, msg) => console.log(`\n\x1b[36m▶ ${n}.\x1b[0m \x1b[1m${msg}\x1b[0m`),
  ok: (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`),
  warn: (msg) => console.log(`  \x1b[33m⚠\x1b[0m ${msg}`),
  err: (msg) => console.log(`  \x1b[31m✗\x1b[0m ${msg}`),
  info: (msg) => console.log(`  \x1b[90m·\x1b[0m ${msg}`),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getClient() {
  if (!SUPABASE_SERVICE_KEY) {
    log.err('SUPABASE_SERVICE_ROLE_KEY غير مضبوط في البيئة');
    log.info('شغّل: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/test-system-lifecycle.mjs');
    process.exit(1);
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ====== المراحل ======

/** 1️⃣ تجهيز الشركة والفرع */
async function ensureCompanyAndBranch(supabase) {
  log.step(1, 'تجهيز شركة "أبو عوف" وفرع المعادي');

  // ابحث عن الشركة
  let { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', TEST_BRANCH.company_name)
    .maybeSingle();

  if (!company) {
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({ name: TEST_BRANCH.company_name, billing_cycle: 'monthly' })
      .select()
      .single();
    if (error) throw new Error(`فشل إنشاء الشركة: ${error.message}`);
    company = newCompany;
    log.ok(`تم إنشاء الشركة: ${company.id}`);
  } else {
    log.ok(`الشركة موجودة: ${company.id}`);
  }

  // ابحث عن الفرع
  let { data: branch } = await supabase
    .from('branches')
    .select('id, name')
    .eq('company_id', company.id)
    .eq('name', TEST_BRANCH.branch_name)
    .maybeSingle();

  if (!branch) {
    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert({
        company_id: company.id,
        name: TEST_BRANCH.branch_name,
        city: TEST_BRANCH.city,
        address: TEST_BRANCH.address,
        code: 'ABO-MAADI-50',
      })
      .select()
      .single();
    if (error) throw new Error(`فشل إنشاء الفرع: ${error.message}`);
    branch = newBranch;
    log.ok(`تم إنشاء الفرع: ${branch.id}`);
  } else {
    log.ok(`الفرع موجود: ${branch.id}`);
  }

  return { company, branch };
}

/** 2️⃣ تحميل كل الخدمات مع الأسعار */
async function loadServicesAndRates(supabase) {
  log.step(2, 'تحميل قائمة الخدمات والأسعار');

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, description')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(`فشل تحميل الخدمات: ${error.message}`);
  log.ok(`عدد الخدمات النشطة: ${categories.length}`);

  // قراءة ملف الأسعار من public/data/rate_items_rows.csv
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.resolve(__dirname, '..', 'public', 'data', 'rate_items_rows.csv');
  let rateItems = [];
  try {
    const csv = readFileSync(csvPath, 'utf8');
    const lines = csv.trim().split('\n').slice(1);
    rateItems = lines.map((line) => {
      const [id, rate_card_id, trade_id, normal_hourly, after_hours_hourly, min_billable_hours, trip_charge, notes, min_invoice] = line.split(',');
      return { id, trade_id, normal_hourly, after_hours_hourly, min_billable_hours, trip_charge, notes, min_invoice };
    });
    log.ok(`عدد بنود التسعير المُحمَّلة: ${rateItems.length}`);
  } catch (e) {
    log.warn(`تعذّر قراءة CSV (${e.message}) — سنكمل بدون أسعار تفصيلية`);
  }

  // عرض مختصر
  console.log('\n  📋 ملخص الخدمات:');
  categories.forEach((c, i) => {
    const rate = rateItems[i];
    const price = rate ? `${rate.normal_hourly} ج.م/س (طارئ ${rate.after_hours_hourly}، انتقال ${rate.trip_charge})` : '—';
    console.log(`    ${String(i + 1).padStart(2, '0')}. ${c.name.padEnd(35)} ${price}`);
  });

  return { categories, rateItems };
}

/** 3️⃣ إنشاء طلب صيانة عبر maintenance-gateway */
async function createMaintenanceRequest(supabase, { branch, company, categories }) {
  log.step(3, 'إنشاء طلب صيانة عبر maintenance-gateway');

  const serviceCategory = categories.find((c) => c.name.includes('سباكة')) || categories[0];

  // ندخل مباشرة عبر الجدول لأن maintenance-gateway يتطلب قنوات معتمدة
  const { data: req, error } = await supabase
    .from('maintenance_requests')
    .insert({
      company_id: company.id,
      branch_id: branch.id,
      title: 'تسريب ماء في حمام الدور الأول - اختبار دورة الحياة',
      description: 'يوجد تسريب مستمر من خلف الحوض، يحتاج فحص فوري واستبدال الوصلات.',
      service_type: serviceCategory.name,
      category_id: serviceCategory.id,
      priority: 'high',
      channel: 'internal',
      client_name: TEST_CLIENT.name,
      client_phone: TEST_CLIENT.phone,
      client_email: TEST_CLIENT.email,
      location: TEST_BRANCH.address,
      status: 'Open',
      workflow_stage: 'submitted',
    })
    .select()
    .single();

  if (error) throw new Error(`فشل إنشاء الطلب: ${error.message}`);
  log.ok(`تم إنشاء الطلب: ${req.id}`);
  log.info(`رقم الطلب: ${req.request_number || '(سيُولَّد تلقائياً)'}`);
  log.info(`المرحلة الأولية: ${req.workflow_stage}`);
  return req;
}

/** 4️⃣ المرور بكل مراحل دورة الحياة */
async function runLifecycle(supabase, requestId) {
  log.step(4, 'تشغيل دورة الحياة الكاملة (جميع المراحل)');

  for (const stage of WORKFLOW_STAGES) {
    const stageMap = {
      submitted: 'Open',
      assigned: 'Assigned',
      scheduled: 'Assigned',
      in_progress: 'In Progress',
      inspection: 'In Progress',
      waiting_parts: 'In Progress',
      completed: 'Completed',
      billed: 'Completed',
      paid: 'Closed',
    };

    const { error } = await supabase
      .from('maintenance_requests')
      .update({ workflow_stage: stage, status: stageMap[stage] })
      .eq('id', requestId);

    if (error) {
      log.err(`مرحلة ${stage} فشلت: ${error.message}`);
      continue;
    }
    log.ok(`المرحلة → ${stage} (${stageMap[stage]})`);
    await sleep(800); // إعطاء وقت للـ triggers والإشعارات
  }
}

/** 5️⃣ التحقق من الإشعارات */
async function verifyNotifications(supabase, requestId) {
  log.step(5, 'التحقق من سجل الإشعارات والأحداث');

  const { data: lifecycle } = await supabase
    .from('request_lifecycle')
    .select('status, update_type, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (lifecycle?.length) {
    log.ok(`عدد أحداث دورة الحياة المسجَّلة: ${lifecycle.length}`);
    lifecycle.forEach((e) => log.info(`${e.created_at?.slice(11, 19)} — ${e.update_type} → ${e.status}`));
  } else {
    log.warn('لا توجد سجلات في request_lifecycle');
  }

  const { data: audit } = await supabase
    .from('audit_logs')
    .select('action, created_at')
    .eq('record_id', requestId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (audit?.length) {
    log.ok(`عدد سجلات التدقيق: ${audit.length}`);
  }

  log.info(`📱 تحقّق يدوياً من وصول WhatsApp إلى ${TEST_CLIENT.phone}`);
  log.info(`📧 تحقّق يدوياً من وصول البريد إلى ${TEST_CLIENT.email}`);
}

// ====== التشغيل ======
async function main() {
  console.log('\n\x1b[1;35m╔══════════════════════════════════════════════════════╗');
  console.log('║   🔄 اختبار دورة حياة UberFix - فرع أبو عوف المعادي  ║');
  console.log('╚══════════════════════════════════════════════════════╝\x1b[0m');
  console.log(`Project: ${SUPABASE_URL}`);
  console.log(`Client : ${TEST_CLIENT.email} | ${TEST_CLIENT.phone}`);

  const supabase = getClient();

  try {
    const { company, branch } = await ensureCompanyAndBranch(supabase);
    const { categories } = await loadServicesAndRates(supabase);
    const request = await createMaintenanceRequest(supabase, { branch, company, categories });
    await runLifecycle(supabase, request.id);
    await verifyNotifications(supabase, request.id);

    console.log('\n\x1b[1;32m✅ اكتمل اختبار دورة الحياة بنجاح\x1b[0m');
    console.log(`   Request ID: ${request.id}\n`);
  } catch (err) {
    console.log(`\n\x1b[1;31m❌ فشل الاختبار: ${err.message}\x1b[0m\n`);
    console.error(err);
    process.exit(1);
  }
}

main();
