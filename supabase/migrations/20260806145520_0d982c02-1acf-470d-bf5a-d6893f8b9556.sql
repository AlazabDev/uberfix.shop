-- 1) Security fix: technician live GPS must never be readable by anonymous visitors
REVOKE EXECUTE ON FUNCTION public.get_public_technicians_for_map() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_technicians_for_map() TO authenticated;

-- 2) Map/public intake fallback must be callable by the form
GRANT EXECUTE ON FUNCTION public.get_public_default_branch_company() TO anon, authenticated;

-- 3) Schema unification: created_at / updated_at on operational tables
DO $$
DECLARE
  t text;
  targets text[] := ARRAY[
    'companies','invoice_items','user_roles','role_permissions','sla_policies','rate_items',
    'malls','cities','districts','branch_locations','specialization_icons','mail_sync_state',
    'wa_contacts','wa_conversations','wa_numbers','wa_api_keys','wa_webhooks','wa_media',
    'hall_of_excellence','monthly_excellence_awards','annual_grand_winners','provider_badges',
    'document_signatures','document_versions','ai_sessions','request_approvals','sla_policies'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r') THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()', t);
    END IF;
  END LOOP;
END $$;

-- 4) Schema unification: one shared touch function + trigger on every table having updated_at
CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'updated_at' AND NOT a.attisdropped
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT EXISTS (
        SELECT 1 FROM pg_trigger g
        WHERE g.tgrelid = c.oid AND NOT g.tgisinternal
          AND g.tgname = 'trg_touch_updated_at_' || c.relname
      )
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at()',
      'trg_touch_updated_at_' || r.relname, r.relname
    );
  END LOOP;
END $$;