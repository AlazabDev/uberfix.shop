#!/usr/bin/env node

import process from 'node:process';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zrrffsjbfkphridqyais';
const SUPABASE_URL = (process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`).replace(/\/$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim();
const SCOPE = (process.env.MODULE01_TEST_SCOPE || 'all').trim().toLowerCase();
const ALLOW_WRITES = process.env.MODULE01_ALLOW_WRITES === 'YES';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`متغير البيئة ${name} مطلوب`);
  return value;
}

function assertScope() {
  if (!['public', 'internal', 'all'].includes(SCOPE)) {
    throw new Error('MODULE01_TEST_SCOPE يجب أن يكون public أو internal أو all');
  }
  if (!ALLOW_WRITES) {
    throw new Error('الاختبار ينشئ طلبات حقيقية. اضبط MODULE01_ALLOW_WRITES=YES للتأكيد');
  }
  if (!ANON_KEY) throw new Error('SUPABASE_ANON_KEY مطلوب');
}

async function requestJson(url, options, acceptedStatuses) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!acceptedStatuses.includes(response.status)) {
    throw new Error(`${options.method || 'GET'} ${url} → ${response.status}\n${JSON.stringify(body, null, 2)}`);
  }

  return { status: response.status, body };
}

function assertCreated(label, result) {
  if (!result.body?.success || !result.body?.request_id || !result.body?.request_number) {
    throw new Error(`${label}: الاستجابة لا تحتوي request_id وrequest_number`);
  }
  console.log(`✓ ${label}: ${result.body.request_number} (${result.body.request_id})`);
  return {
    label,
    request_id: result.body.request_id,
    request_number: result.body.request_number,
    track_url: result.body.track_url,
  };
}

async function runPublicTests(runId) {
  const clientPhone = required('TEST_CLIENT_PHONE');
  const branchName = required('TEST_BRANCH_NAME');
  const companyName = process.env.TEST_COMPANY_NAME?.trim() || undefined;
  const endpoint = `${SUPABASE_URL}/functions/v1/submit-public-request`;

  const cases = [
    {
      label: 'Public general',
      service_type: 'electrical',
      priority: 'medium',
      form_type: 'general',
    },
    {
      label: 'Public urgent alias',
      service_type: 'power_outage',
      priority: 'high',
      form_type: 'urgent',
    },
    {
      label: 'Public periodic alias',
      service_type: 'electrical_periodic',
      priority: 'low',
      form_type: 'periodic',
    },
  ];

  const created = [];
  for (const testCase of cases) {
    const result = await requestJson(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        client_name: `Module 01 Test ${runId}`,
        client_phone: clientPhone,
        branch_name: branchName,
        service_type: testCase.service_type,
        priority: testCase.priority,
        description: `[E2E ${runId}] ${testCase.label}`,
        metadata: {
          company_name: companyName,
          form_type: testCase.form_type,
        },
      }),
    }, [201]);

    created.push(assertCreated(testCase.label, result));
  }

  return created;
}

async function signIn() {
  const email = required('TEST_USER_EMAIL');
  const password = required('TEST_USER_PASSWORD');
  const result = await requestJson(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    },
    [200],
  );

  if (!result.body?.access_token) throw new Error('لم يتم الحصول على access_token');
  console.log(`✓ تم تسجيل الدخول للاختبار الداخلي: ${email}`);
  return result.body.access_token;
}

async function runInternalTests(runId) {
  const propertyId = required('TEST_PROPERTY_ID');
  const clientPhone = required('TEST_CLIENT_PHONE');
  const gatewayEndpoint = `${SUPABASE_URL}/functions/v1/gateway`;
  const payload = {
    channel: 'internal',
    action: 'create_request',
    client_name: `Module 01 Internal ${runId}`,
    client_phone: clientPhone,
    service_type: 'electrical',
    priority: 'medium',
    description: `[E2E ${runId}] authenticated internal request`,
    property_id: propertyId,
    source_metadata: { test_run_id: runId },
  };

  const unauthorized = await requestJson(gatewayEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
    },
    body: JSON.stringify(payload),
  }, [401]);

  if (unauthorized.body?.error !== 'Authentication required') {
    throw new Error('اختبار رفض internal بدون JWT لم يُرجع الخطأ المتوقع');
  }
  console.log('✓ تم رفض internal بدون JWT كما هو مطلوب');

  const accessToken = await signIn();
  const created = await requestJson(gatewayEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'x-request-id': `module01-${runId}`,
    },
    body: JSON.stringify(payload),
  }, [201]);

  return [assertCreated('Authenticated internal', created)];
}

async function main() {
  assertScope();
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  console.log(`UberFix Module 01 E2E — scope=${SCOPE} — run=${runId}`);
  console.log(`Supabase: ${SUPABASE_URL}`);

  const created = [];
  if (SCOPE === 'public' || SCOPE === 'all') {
    created.push(...await runPublicTests(runId));
  }
  if (SCOPE === 'internal' || SCOPE === 'all') {
    created.push(...await runInternalTests(runId));
  }

  console.log('\nالطلبات التي أنشأها الاختبار:');
  for (const item of created) {
    console.log(`- ${item.label}: ${item.request_number} | ${item.request_id}`);
  }
  console.log('\n✓ اكتمل اختبار Module 01 بنجاح');
}

main().catch((error) => {
  console.error(`\n✗ فشل اختبار Module 01: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
