
-- إصلاح check constraint في daftra_sync_logs لتشمل pending
ALTER TABLE public.daftra_sync_logs DROP CONSTRAINT daftra_sync_logs_status_check;
ALTER TABLE public.daftra_sync_logs ADD CONSTRAINT daftra_sync_logs_status_check 
  CHECK (status = ANY (ARRAY['success', 'failed', 'pending']));

-- إصلاح sync_type check constraint لتشمل auto_trigger
ALTER TABLE public.daftra_sync_logs DROP CONSTRAINT daftra_sync_logs_sync_type_check;
ALTER TABLE public.daftra_sync_logs ADD CONSTRAINT daftra_sync_logs_sync_type_check 
  CHECK (sync_type = ANY (ARRAY['invoice', 'contact', 'product', 'auto_trigger']));

-- إضافة عمود الرقم التسلسلي
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS request_number TEXT UNIQUE;

-- إنشاء sequence
CREATE SEQUENCE IF NOT EXISTS public.maintenance_request_seq START WITH 1001;

-- دالة توليد الرقم التسلسلي
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  IF NEW.request_number IS NULL THEN
    v_year := to_char(NOW(), 'YY');
    v_seq := nextval('public.maintenance_request_seq');
    NEW.request_number := 'MR-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger لتوليد الرقم التسلسلي
DROP TRIGGER IF EXISTS trg_generate_request_number ON public.maintenance_requests;
CREATE TRIGGER trg_generate_request_number
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_request_number();

-- تحديث الطلبات الموجودة
DO $$
DECLARE
  r RECORD;
  v_year TEXT;
  v_seq INT;
BEGIN
  FOR r IN SELECT id FROM public.maintenance_requests WHERE request_number IS NULL ORDER BY created_at ASC
  LOOP
    v_year := to_char(NOW(), 'YY');
    v_seq := nextval('public.maintenance_request_seq');
    UPDATE public.maintenance_requests 
    SET request_number = 'MR-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;
