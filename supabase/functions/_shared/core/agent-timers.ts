/**
 * agent-tick — منبّه الوكيل الذاتي.
 *
 * تُنادى من مهمة pg_cron كل 5 دقائق (وتُشغَّل المهمة فقط أثناء وجود منبّهات معلّقة).
 * الدالة تسحب المنبّهات المستحقة، تسأل وكيل UberFix عن القرار،
 * وترسل التذكير أو التصعيد على واتساب من الحساب المخصص لكل مستوى.
 *
 * لا تُنفّذ أي إجراء إن لم يوجد منبّه مستحق — استدعاؤها مرارًا آمن (idempotent).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const AGENT_MODEL = Deno.env.get('UF_AGENT_MODEL') ?? 'openai/gpt-5-mini';
const GRAPH_VERSION = 'v21.0';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface DueTimer {
  timer_id: string;
  request_id: string;
  appointment_id: string | null;
  timer_kind: string;
  escalation_level: number;
  scheduled_visit_at: string | null;
  due_at: string;
  attempts: number;
  request_number: string | null;
  workflow_stage: string | null;
  title: string | null;
  description: string | null;
  priority: string | null;
  client_name: string | null;
  client_phone: string | null;
  location: string | null;
  assigned_technician_id: string | null;
}

interface Contact {
  level: number;
  role_label: string;
  waba_id: string;
  phone_number_id: string;
  notify_phone: string;
}

/** المراحل التي تعني أن الزيارة تحرّكت فعلًا — لا تصعيد. */
const SETTLED_STAGES = new Set([
  'in_progress', 'inspection', 'completed', 'billed', 'paid',
  'handover_to_admin', 'closed', 'cancelled', 'rejected',
]);

function accessTokenForLevel(level: number): string {
  return (
    Deno.env.get(`WHATSAPP_ACCESS_TOKEN_L${level}`) ??
    Deno.env.get('WHATSAPP_ACCESS_TOKEN') ??
    ''
  );
}

function fmtCairo(iso: string | null): string {
  if (!iso) return 'غير محدد';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function minutesLate(visitAt: string | null): number {
  if (!visitAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(visitAt).getTime()) / 60000));
}

/** نص احتياطي إذا لم يتوفر الوكيل — الرسالة يجب أن تُرسل في كل الحالات. */
function fallbackMessage(t: DueTimer, technician: string, contact: Contact | null): string {
  const ref = t.request_number ?? t.request_id.slice(0, 8);
  const when = fmtCairo(t.scheduled_visit_at);
  const late = minutesLate(t.scheduled_visit_at);
  const head = contact ? `${contact.role_label}،` : 'تنبيه،';

  if (t.timer_kind === 'pre_visit_reminder') {
    return `${head}\nتذكير: زيارة الطلب ${ref} بعد ساعة (${when}).\nالفني: ${technician}\nالعنوان: ${t.location ?? 'غير محدد'}\nالعميل: ${t.client_name ?? '-'}`;
  }
  if (t.timer_kind === 'start_check') {
    return `${head}\nالطلب ${ref} كان مقررًا ${when} ولم يُسجَّل بدء التنفيذ بعد (متأخر ${late} دقيقة).\nالفني: ${technician}\nهل نؤكد الزيارة أم نعيد الجدولة؟`;
  }
  return `${head}\n🔴 تصعيد (مستوى ${t.escalation_level}) للطلب ${ref}.\nالزيارة المقررة: ${when} — التأخير: ${late} دقيقة بدون بدء تنفيذ.\nالفني: ${technician}\nالعميل: ${t.client_name ?? '-'} — ${t.client_phone ?? '-'}\nالعنوان: ${t.location ?? 'غير محدد'}\nمطلوب إجراء فوري: تعيين فني بديل أو إعادة جدولة.`;
}

/** الوكيل يقرأ الحالة ويكتب الرسالة بنفسه. */
async function agentCompose(t: DueTimer, technician: string, contact: Contact | null): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;

  const system = [
    'أنت وكيل تشغيل نظام صيانة UberFix. مهمتك مراقبة الزيارات المتأخرة وتوجيه المسؤول البشري على واتساب.',
    'اكتب رسالة عربية واحدة، قصيرة ومباشرة (٥ أسطر كحد أقصى)، بصيغة عملية لا إنشائية.',
    'اذكر دائمًا رقم الطلب، الموعد المقرر، مدة التأخير، الفني، وطلب إجراء واضح.',
    'لا تفترض معلومات غير معطاة. لا تستخدم أي تنسيق Markdown.',
  ].join('\n');

  const user = JSON.stringify({
    نوع_المنبه: t.timer_kind,
    مستوى_التصعيد: t.escalation_level,
    المستلم: contact?.role_label ?? 'الفني',
    رقم_الطلب: t.request_number,
    المرحلة_الحالية: t.workflow_stage,
    عنوان_الطلب: t.title,
    الوصف: t.description,
    الأولوية: t.priority,
    الموعد_المقرر: fmtCairo(t.scheduled_visit_at),
    دقائق_التأخير: minutesLate(t.scheduled_visit_at),
    الفني: technician,
    العميل: t.client_name,
    هاتف_العميل: t.client_phone,
    الموقع: t.location,
  });

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      console.error('agent model error', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch (e) {
    console.error('agent model exception', e);
    return null;
  }
}

async function sendWhatsApp(level: number, phoneNumberId: string, to: string, body: string) {
  const token = accessTokenForLevel(level);
  if (!token) throw new Error(`missing WhatsApp access token for level ${level}`);

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`whatsapp ${res.status}: ${JSON.stringify(payload)}`);
  }
  return payload?.messages?.[0]?.id ?? null;
}

async function logEvent(t: DueTimer, eventType: string, payload: Record<string, unknown>) {
  await admin.from('domain_events').insert({
    aggregate_type: 'maintenance_request',
    aggregate_id: t.request_id,
    event_type: eventType,
    event_payload: { timer_id: t.timer_id, timer_kind: t.timer_kind, ...payload },
    actor_role: 'agent',
  });
}

async function technicianName(id: string | null): Promise<{ name: string; phone: string | null }> {
  if (!id) return { name: 'غير معيَّن', phone: null };

  const { data: tech } = await admin
    .from('technicians').select('name, phone').eq('id', id).maybeSingle();
  if (tech?.name) return { name: tech.name, phone: tech.phone ?? null };

  const { data: provider } = await admin
    .from('service_providers').select('display_name, phone').eq('id', id).maybeSingle();
  if (provider?.display_name) return { name: provider.display_name, phone: provider.phone ?? null };

  return { name: 'غير معيَّن', phone: null };
}

async function handleTimer(t: DueTimer, contacts: Map<number, Contact>): Promise<string> {
  // الطلب تحرّك بالفعل → لا تصعيد، أوقف بقية المنبّهات.
  const stage = (t.workflow_stage ?? '').toLowerCase();
  if (SETTLED_STAGES.has(stage) && t.timer_kind !== 'pre_visit_reminder') {
    await admin.rpc('fn_cancel_agent_timers', { p_request_id: t.request_id, p_reason: `stage_${stage}` });
    await logEvent(t, 'agent_timer_skipped', { reason: `stage_${stage}` });
    return 'skipped_stage_settled';
  }

  const tech = await technicianName(t.assigned_technician_id);

  // المستوى 0 (تذكير/تحقق) يُرسل من حساب مسؤول الصيانات إلى الفني إن وُجد رقمه، وإلا للمسؤول.
  const contact = contacts.get(Math.max(t.escalation_level, 1)) ?? null;
  if (!contact) {
    await admin.rpc('fn_settle_agent_timer', {
      p_timer_id: t.timer_id, p_state: 'failed', p_decision: null,
      p_error: `no active escalation contact for level ${t.escalation_level}`, p_retry_in_minutes: null,
    });
    return 'no_contact';
  }

  const recipient =
    t.timer_kind === 'pre_visit_reminder' && tech.phone ? tech.phone : contact.notify_phone;

  const body = (await agentCompose(t, tech.name, contact)) ?? fallbackMessage(t, tech.name, contact);

  try {
    const messageId = await sendWhatsApp(contact.level, contact.phone_number_id, recipient, body);
    await admin.rpc('fn_settle_agent_timer', {
      p_timer_id: t.timer_id, p_state: 'done',
      p_decision: `notified:${contact.role_label}`, p_error: null, p_retry_in_minutes: null,
    });
    await logEvent(t, 'agent_timer_fired', {
      escalation_level: t.escalation_level,
      recipient,
      role_label: contact.role_label,
      waba_id: contact.waba_id,
      provider_message_id: messageId,
      minutes_late: minutesLate(t.scheduled_visit_at),
      message: body,
    });
    return 'notified';
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('timer send failed', t.timer_id, message);
    await admin.rpc('fn_settle_agent_timer', {
      p_timer_id: t.timer_id, p_state: 'retry', p_decision: null,
      p_error: message, p_retry_in_minutes: 5,
    });
    await logEvent(t, 'agent_timer_failed', { error: message });
    return 'retry';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { data: due, error: claimError } = await admin.rpc('fn_claim_due_agent_timers', { p_limit: 25 });
    if (claimError) return json({ ok: false, error: claimError.message }, 500);

    const timers = (due ?? []) as DueTimer[];
    if (timers.length === 0) {
      await admin.rpc('fn_agent_timers_sync_dispatcher');
      return json({ ok: true, processed: 0 });
    }

    const { data: contactRows } = await admin
      .from('agent_escalation_contacts')
      .select('level, role_label, waba_id, phone_number_id, notify_phone')
      .eq('is_active', true);

    const contacts = new Map<number, Contact>(
      ((contactRows ?? []) as Contact[]).map((c) => [c.level, c]),
    );

    const results: Record<string, number> = {};
    for (const timer of timers) {
      const outcome = await handleTimer(timer, contacts);
      results[outcome] = (results[outcome] ?? 0) + 1;
    }

    return json({ ok: true, processed: timers.length, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('agent-tick fatal', message);
    return json({ ok: false, error: message }, 500);
  }
});
