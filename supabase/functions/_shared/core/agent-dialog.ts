/**
 * agent-dialog — الجزء الحواري من وكيل UberFix.
 *
 * 1) رد مسؤول الصيانة على واتساب (الموعد + الفني) → جدولة الموعد + تحريك الطلب إلى scheduled.
 * 2) إشعار العميل بقالب Flow يحتوي: موافق / أرفض / أطلب موعدًا آخر.
 * 3) استلام قرار العميل (Flow أو زر) وتطبيقه على الموعد والطلب.
 *
 * كل الدوال idempotent بقدر الإمكان، ولا ترفع استثناءات إلى الـ webhook.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const AGENT_MODEL = Deno.env.get('UF_AGENT_MODEL') ?? 'openai/gpt-5-mini';
const GRAPH_VERSION = 'v21.0';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const APPT_BUTTONS = {
  approve: 'uf_appt_approve',
  reject: 'uf_appt_reject',
  reschedule: 'uf_appt_reschedule',
};

function digits(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}

function fmtCairo(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function runtimeConfig(): Promise<Record<string, string>> {
  const { data } = await admin.from('agent_runtime_config').select('key, value');
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.key as string] = (row.value as string) ?? '';
  return out;
}

/** حساب الإرسال الرسمي للوكيل (نفس المستخدم في التصعيد). */
async function senderCtx(): Promise<{ phoneNumberId: string; token: string }> {
  const cfg = await runtimeConfig();
  const phoneNumberId = cfg.sender_phone_number_id || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  const level = cfg.sender_token_level || '';
  const token =
    (level ? Deno.env.get(`WHATSAPP_ACCESS_TOKEN_L${level}`) : '') ||
    Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '';
  return { phoneNumberId, token };
}

async function graphSend(payload: Record<string, unknown>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { phoneNumberId, token } = await senderCtx();
  if (!phoneNumberId || !token) return { ok: false, error: 'whatsapp_sender_not_configured' };

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body?.error?.message ?? `graph_${res.status}` };
  }
  return { ok: true, id: body?.messages?.[0]?.id };
}

async function logEvent(eventType: string, requestId: string | null, description: string) {
  await admin.from('domain_events').insert({
    event_type: eventType,
    aggregate_id: requestId,
    aggregate_type: 'maintenance_request',
    description,
  }).then(() => undefined, () => undefined);
}

/* ------------------------------------------------------------------ *
 * 1) رد المسؤول: تحديد الموعد والفني
 * ------------------------------------------------------------------ */

interface OperatorParse {
  request_number?: string | null;
  visit_date?: string | null;   // YYYY-MM-DD
  visit_time?: string | null;   // HH:MM
  technician_name?: string | null;
  note?: string | null;
}

/** هل الرقم يخص أحد مسؤولي التصعيد؟ */
export async function findEscalationContact(from: string) {
  const tail = digits(from).slice(-9);
  const { data } = await admin
    .from('agent_escalation_contacts')
    .select('id, level, role_label, notify_phone, is_active')
    .eq('is_active', true);
  return (data ?? []).find((c) => digits(c.notify_phone as string).endsWith(tail)) ?? null;
}

async function parseOperatorReply(text: string): Promise<OperatorParse | null> {
  if (!LOVABLE_API_KEY) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AGENT_MODEL,
      messages: [
        {
          role: 'system',
          content: [
            'أنت محلّل ردود مسؤولي الصيانة في نظام UberFix.',
            `تاريخ اليوم بتوقيت القاهرة: ${today}.`,
            'استخرج من الرد: رقم الطلب إن ذُكر، تاريخ الزيارة (YYYY-MM-DD)، وقت الزيارة (HH:MM بنظام 24 ساعة)، اسم الفني، وأي ملاحظة.',
            'أعد JSON فقط بالمفاتيح: request_number, visit_date, visit_time, technician_name, note.',
            'استخدم null لأي قيمة غير مذكورة. حوّل "بكرة" و"غدًا" إلى تاريخ اليوم + يوم، و"النهاردة" إلى تاريخ اليوم.',
          ].join('\n'),
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const raw = json?.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OperatorParse;
  } catch {
    return null;
  }
}

/** الطلب المستهدف: المذكور صراحة، أو آخر طلب صعّد الوكيل بشأنه. */
async function resolveTargetRequest(parsed: OperatorParse) {
  if (parsed.request_number) {
    const { data } = await admin
      .from('maintenance_requests')
      .select('id, request_number, title, client_name, client_phone, location, customer_id, created_by, workflow_stage, property_id, branch_id')
      .eq('request_number', parsed.request_number.trim())
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await admin
    .from('agent_timers')
    .select('request_id, fired_at, maintenance_requests!inner(id, request_number, title, client_name, client_phone, location, customer_id, created_by, workflow_stage, property_id, branch_id)')
    .not('fired_at', 'is', null)
    .order('fired_at', { ascending: false })
    .limit(1);
  const row = (data ?? [])[0] as unknown as { maintenance_requests?: Record<string, unknown> } | undefined;
  return (row?.maintenance_requests as Record<string, unknown> | undefined) ?? null;
}

/**
 * يعالج رد المسؤول. يعيد نص الرد المناسب للمسؤول، أو null إن لم يكن الرد متعلقًا بجدولة.
 */
export async function handleOperatorReply(
  from: string,
  text: string,
): Promise<string | null> {
  const contact = await findEscalationContact(from);
  if (!contact) return null;

  const parsed = await parseOperatorReply(text);
  if (!parsed || (!parsed.visit_date && !parsed.visit_time && !parsed.technician_name)) return null;

  const request = await resolveTargetRequest(parsed) as Record<string, any> | null;
  if (!request) return 'لم أتمكن من تحديد الطلب المقصود. برجاء إرسال رقم الطلب مع الموعد والفني.';
  if (!parsed.visit_date || !parsed.visit_time) {
    return `استلمت ردك بخصوص الطلب ${request.request_number}. برجاء تحديد تاريخ ووقت الزيارة بشكل صريح (مثال: 15/09 الساعة 11:00).`;
  }

  // الفني (اختياري) — نطابق بالاسم دون إلزام
  let technicianId: string | null = null;
  let technicianName = parsed.technician_name?.trim() ?? null;
  if (technicianName) {
    const { data: tech } = await admin
      .from('service_providers')
      .select('id, name')
      .ilike('name', `%${technicianName}%`)
      .limit(1)
      .maybeSingle();
    if (tech) {
      technicianId = tech.id as string;
      technicianName = tech.name as string;
    }
  }

  const customerId = request.customer_id ?? request.created_by ?? null;
  if (!customerId) {
    return `تعذر إنشاء الموعد للطلب ${request.request_number} — الطلب غير مربوط بعميل في النظام.`;
  }

  // موعد واحد لكل طلب: نحدّث القائم أو نُنشئ جديدًا
  const { data: existing } = await admin
    .from('appointments')
    .select('id')
    .eq('request_id', request.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const apptPayload: Record<string, unknown> = {
    title: request.title ?? 'زيارة صيانة',
    customer_name: request.client_name ?? 'عميل',
    customer_phone: request.client_phone,
    appointment_date: parsed.visit_date,
    appointment_time: parsed.visit_time.length === 5 ? `${parsed.visit_time}:00` : parsed.visit_time,
    status: 'scheduled',
    request_id: request.id,
    maintenance_request_id: request.id,
    customer_id: customerId,
    property_id: request.property_id ?? null,
    provider_id: technicianId,
    location: request.location,
    notes: parsed.note ?? null,
    customer_decision: null,
    customer_decision_at: null,
    customer_requested_date: null,
  };

  let appointmentId: string | null = null;
  if (existing?.id) {
    const { error } = await admin.from('appointments').update(apptPayload).eq('id', existing.id);
    if (error) return `تعذر تحديث الموعد: ${error.message}`;
    appointmentId = existing.id as string;
  } else {
    const { data: created, error } = await admin.from('appointments').insert(apptPayload).select('id').single();
    if (error) return `تعذر إنشاء الموعد: ${error.message}`;
    appointmentId = created.id as string;
  }

  // تحريك الطلب إلى scheduled + تسجيل الفني
  const patch: Record<string, unknown> = { workflow_stage: 'scheduled' };
  if (technicianId) patch.assigned_technician_id = technicianId;
  await admin.from('maintenance_requests').update(patch).eq('id', request.id);

  const visitIso = new Date(`${parsed.visit_date}T${parsed.visit_time.length === 5 ? parsed.visit_time : parsed.visit_time.slice(0, 5)}:00+03:00`).toISOString();
  await logEvent('agent_schedule_recorded', request.id,
    `by:${contact.role_label} visit:${visitIso} tech:${technicianName ?? '-'}`);

  const notify = await sendCustomerConfirmation(request.id, appointmentId!);

  return [
    `تم تسجيل الموعد للطلب ${request.request_number}.`,
    `الزيارة: ${fmtCairo(visitIso)}`,
    `الفني: ${technicianName ?? 'غير محدد'}`,
    notify.ok ? 'وتم إرسال طلب التأكيد للعميل على واتساب.' : `لم يُرسل تأكيد العميل: ${notify.error}`,
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * 2) إشعار العميل بقالب Flow (موافق / أرفض / موعد آخر)
 * ------------------------------------------------------------------ */

export async function sendCustomerConfirmation(
  requestId: string,
  appointmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: appt } = await admin
    .from('appointments')
    .select('id, appointment_date, appointment_time, customer_phone, customer_name, provider_id')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!appt) return { ok: false, error: 'appointment_not_found' };

  const { data: request } = await admin
    .from('maintenance_requests')
    .select('request_number, client_phone, client_name, title, location')
    .eq('id', requestId)
    .maybeSingle();

  const to = digits((appt.customer_phone as string) || (request?.client_phone as string) || '');
  if (!to) return { ok: false, error: 'customer_phone_missing' };

  const visitIso = new Date(
    `${appt.appointment_date}T${String(appt.appointment_time).slice(0, 5)}:00+03:00`,
  ).toISOString();

  const bodyText = [
    `مرحبًا ${request?.client_name ?? appt.customer_name ?? ''}،`,
    `تم تحديد موعد زيارة الصيانة للطلب ${request?.request_number ?? ''}:`,
    `🗓️ ${fmtCairo(visitIso)}`,
    request?.location ? `📍 ${request.location}` : '',
    '',
    'هل الموعد مناسب لك؟',
  ].filter(Boolean).join('\n');

  const cfg = await runtimeConfig();
  const flowId = cfg.customer_confirm_flow_id?.trim();

  let sent: { ok: boolean; id?: string; error?: string };
  if (flowId) {
    // قالب Flow رسمي — شاشة واحدة بها الاختيارات وحقل الموعد البديل
    sent = await graphSend({
      to,
      type: 'interactive',
      interactive: {
        type: 'flow',
        header: { type: 'text', text: 'تأكيد موعد الزيارة' },
        body: { text: bodyText },
        footer: { text: 'UberFix' },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_id: flowId,
            flow_token: appointmentId,
            flow_cta: 'تأكيد الموعد',
            flow_action: 'navigate',
            flow_action_payload: {
              screen: 'APPOINTMENT_CONFIRM',
              data: {
                request_number: request?.request_number ?? '',
                visit_at: fmtCairo(visitIso),
              },
            },
          },
        },
      },
    });
  } else {
    // بديل فوري بدون انتظار مراجعة Meta: ثلاثة أزرار تفاعلية
    sent = await graphSend({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: [
            { type: 'reply', reply: { id: `${APPT_BUTTONS.approve}:${appointmentId}`, title: 'موافق ✅' } },
            { type: 'reply', reply: { id: `${APPT_BUTTONS.reschedule}:${appointmentId}`, title: 'موعد آخر 🗓️' } },
            { type: 'reply', reply: { id: `${APPT_BUTTONS.reject}:${appointmentId}`, title: 'أرفض ❌' } },
          ],
        },
      },
    });
  }

  await admin.from('appointments').update({
    confirmation_sent_at: new Date().toISOString(),
    confirmation_message_id: sent.id ?? null,
  }).eq('id', appointmentId);

  await logEvent(
    sent.ok ? 'customer_confirmation_sent' : 'customer_confirmation_failed',
    requestId,
    sent.ok ? `to:${to} mode:${flowId ? 'flow' : 'buttons'}` : `error:${sent.error}`,
  );

  return { ok: sent.ok, error: sent.error };
}

/* ------------------------------------------------------------------ *
 * 3) قرار العميل
 * ------------------------------------------------------------------ */

export type CustomerDecision = 'approved' | 'rejected' | 'reschedule';

export async function applyCustomerDecision(
  appointmentId: string,
  decision: CustomerDecision,
  opts: { requestedDate?: string | null; note?: string | null } = {},
): Promise<{ ok: boolean; message: string }> {
  const { data: appt } = await admin
    .from('appointments')
    .select('id, request_id, appointment_date, appointment_time')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!appt) return { ok: false, message: 'لم نعد نجد هذا الموعد. برجاء التواصل مع الدعم.' };

  await admin.from('appointments').update({
    customer_decision: decision,
    customer_decision_at: new Date().toISOString(),
    customer_requested_date: opts.requestedDate ?? null,
    customer_note: opts.note ?? null,
    status: decision === 'approved' ? 'confirmed' : decision === 'rejected' ? 'cancelled' : 'scheduled',
  }).eq('id', appointmentId);

  const requestId = appt.request_id as string;
  await logEvent('customer_appointment_decision', requestId,
    `decision:${decision} requested:${opts.requestedDate ?? '-'}`);

  // إبلاغ مسؤول الصيانة (مستوى 1) بالقرار
  const { data: contact } = await admin
    .from('agent_escalation_contacts')
    .select('role_label, notify_phone')
    .eq('is_active', true)
    .eq('level', 1)
    .maybeSingle();

  const { data: request } = await admin
    .from('maintenance_requests')
    .select('request_number, client_name')
    .eq('id', requestId)
    .maybeSingle();

  if (contact?.notify_phone) {
    const label = decision === 'approved' ? 'وافق على الموعد ✅'
      : decision === 'rejected' ? 'رفض الموعد ❌'
      : 'طلب موعدًا آخر 🗓️';
    await graphSend({
      to: digits(contact.notify_phone as string),
      type: 'text',
      text: {
        body: [
          `${contact.role_label}،`,
          `العميل ${request?.client_name ?? ''} ${label} للطلب ${request?.request_number ?? ''}.`,
          opts.requestedDate ? `الموعد المقترح من العميل: ${opts.requestedDate}` : '',
          opts.note ? `ملاحظة العميل: ${opts.note}` : '',
          decision === 'approved' ? 'الزيارة مؤكدة، والتنبيهات الزمنية فعّالة.' : 'مطلوب إعادة جدولة الزيارة.',
        ].filter(Boolean).join('\n'),
      },
    });
  }

  if (decision === 'reschedule' || decision === 'rejected') {
    // إلغاء منبّهات الزيارة الحالية حتى تُحدَّد جدولة جديدة
    await admin.rpc('fn_cancel_agent_timers', {
      p_request_id: requestId,
      p_reason: `customer_${decision}`,
    }).then(() => undefined, () => undefined);
    await admin.from('maintenance_requests')
      .update({ workflow_stage: decision === 'rejected' ? 'triaged' : 'triaged' })
      .eq('id', requestId);
  }

  const message = decision === 'approved'
    ? 'تم تأكيد الموعد ✅ سيصلك تذكير قبل الزيارة بساعة. شكرًا لك.'
    : decision === 'reschedule'
      ? 'تم تسجيل طلبك بموعد آخر 🗓️ وسيتواصل معك مسؤول الصيانة لتحديد موعد بديل.'
      : 'تم تسجيل رفض الموعد ❌ وسيتواصل معك مسؤول الصيانة لمراجعة الطلب.';

  return { ok: true, message };
}

/** رد زر تفاعلي: uf_appt_approve:<appointment_id> */
export async function handleAppointmentButton(buttonId: string): Promise<string | null> {
  const [action, appointmentId] = buttonId.split(':');
  if (!appointmentId) return null;
  const decision: CustomerDecision | null =
    action === APPT_BUTTONS.approve ? 'approved'
    : action === APPT_BUTTONS.reject ? 'rejected'
    : action === APPT_BUTTONS.reschedule ? 'reschedule'
    : null;
  if (!decision) return null;
  const res = await applyCustomerDecision(appointmentId, decision);
  return res.message;
}

/** رد شاشة Flow: nfm_reply.response_json */
export async function handleFlowDecisionPayload(payload: Record<string, unknown>): Promise<string | null> {
  const appointmentId = String(payload.appointment_id ?? payload.flow_token ?? '').trim();
  const raw = String(payload.decision ?? payload.choice ?? '').trim();
  if (!appointmentId || !raw) return null;

  const decision: CustomerDecision | null =
    /approve|موافق|confirm/i.test(raw) ? 'approved'
    : /reject|رفض|cancel/i.test(raw) ? 'rejected'
    : /resched|آخر|another|new_date/i.test(raw) ? 'reschedule'
    : null;
  if (!decision) return null;

  const res = await applyCustomerDecision(appointmentId, decision, {
    requestedDate: (payload.requested_date as string) ?? (payload.new_date as string) ?? null,
    note: (payload.note as string) ?? null,
  });
  return res.message;
}
