
-- ============================================================
-- PR: Fix three issues from lifecycle test 2026-07-10
--   1) Technician code UF-TEC not generated on approval
--   2) Mirror to public.technicians missing on approval
--   3) WhatsApp not enqueued on stage transitions (empty map)
-- ============================================================

-- 1 & 2) Extend approval trigger to also fire on INSERT
--    Root cause: trigger was BEFORE UPDATE only, so rows inserted
--    directly with status='approved' bypassed code + mirror logic.
--    Also fix the mirrored technicians.status to use an allowed
--    value from technicians_status_check (online|busy|offline|on_route).
CREATE OR REPLACE FUNCTION public.fn_handle_technician_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seq int;
  v_tech_id uuid;
  v_prev_status text := COALESCE(OLD.status, '');
BEGIN
  IF NEW.status = 'approved' AND v_prev_status <> 'approved' THEN
    -- Generate UF-TEC code if missing
    IF NEW.technician_code IS NULL THEN
      SELECT COALESCE(MAX(NULLIF(regexp_replace(technician_code,'[^0-9]','','g'),'')::int),0)+1
        INTO v_seq
        FROM public.technician_profiles
        WHERE technician_code LIKE 'UF-TEC-%';
      NEW.technician_code := 'UF-TEC-' || lpad(v_seq::text, 5, '0');
    END IF;

    NEW.approved_at := COALESCE(NEW.approved_at, now());

    -- Mirror to operational technicians table (status must satisfy check constraint)
    IF NEW.technician_id IS NULL THEN
      INSERT INTO public.technicians (
        name, phone, email, specialization, status,
        is_active, is_verified, application_id, created_by
      ) VALUES (
        NEW.full_name, NEW.phone, NEW.email,
        COALESCE(NEW.company_type, 'general'),
        'offline',       -- valid per technicians_status_check
        true, true, NEW.id, NEW.user_id
      )
      RETURNING id INTO v_tech_id;
      NEW.technician_id := v_tech_id;
    END IF;
  END IF;

  IF NEW.status = 'rejected' AND v_prev_status <> 'rejected' THEN
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
  END IF;

  RETURN NEW;
END $function$;

-- Re-bind trigger to fire on INSERT too
DROP TRIGGER IF EXISTS trg_handle_technician_approval ON public.technician_profiles;
CREATE TRIGGER trg_handle_technician_approval
BEFORE INSERT OR UPDATE ON public.technician_profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_technician_approval();

-- 3) Seed default WhatsApp stage → template mappings so that
--    fn_enqueue_whatsapp_for_stage() has something to fetch and
--    outbound_messages actually gets rows queued.
--    Only inserts if the (stage) row doesn't already exist.
INSERT INTO public.wa_stage_template_map (stage, template_key, language, is_active, priority)
VALUES
  ('submitted',        'azord',                    'ar', true, 10),
  ('triaged',          'requests',                 'ar', true, 10),
  ('assigned',         'technician_visit',         'ar', true, 10),
  ('scheduled',        'appointment_scheduling',   'ar', true, 10),
  ('in_progress',      'technician_arrival',       'ar', true, 10),
  ('waiting_parts',    'shifting_journey',         'ar', true, 10),
  ('completed',        'invoice_available',        'ar', true, 10),
  ('billed',           'invoice_available',        'ar', true, 20),
  ('paid',             'statement_available',      'ar', true, 10),
  ('handover_to_admin','statement_available',      'ar', true, 20),
  ('closed',           'feedback_form',            'ar', true, 10),
  ('cancelled',        'order_canceled',           'ar', true, 10)
ON CONFLICT DO NOTHING;

-- Resolve template_id from template_key so fn_enqueue_whatsapp_for_stage()
-- can load the approved template row.
UPDATE public.wa_stage_template_map m
SET template_id = t.id
FROM (
  SELECT DISTINCT ON (name, language) id, name, language
  FROM public.wa_templates
  WHERE status::text = 'approved'
  ORDER BY name, language, approved_at DESC NULLS LAST
) t
WHERE m.template_id IS NULL
  AND t.name = m.template_key
  AND t.language = m.language;
