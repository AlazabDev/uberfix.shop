GRANT EXECUTE ON FUNCTION public.public_submit_rating(text, integer, text) TO anon, authenticated;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_decision text,
  ADD COLUMN IF NOT EXISTS customer_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_requested_date text,
  ADD COLUMN IF NOT EXISTS customer_note text,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_message_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_customer_decision_chk'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_customer_decision_chk
      CHECK (customer_decision IS NULL OR customer_decision IN ('approved','rejected','reschedule'));
  END IF;
END $$;

INSERT INTO public.agent_runtime_config(key, value) VALUES
  ('customer_confirm_flow_id', ''),
  ('customer_confirm_template', 'uf_appointment_confirm')
ON CONFLICT (key) DO NOTHING;