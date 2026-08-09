CREATE TABLE public.receipt_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_no text NOT NULL UNIQUE,
  voucher_date date NOT NULL,
  customer_name text NOT NULL DEFAULT 'أبو عوف',
  branch_name text NOT NULL,
  branch_name_raw text,
  branch_location_id text REFERENCES public.branch_locations(id),
  items_count integer NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'مؤكد',
  source text NOT NULL DEFAULT 'excel_import',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.receipt_voucher_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id uuid NOT NULL REFERENCES public.receipt_vouchers(id) ON DELETE CASCADE,
  seq integer,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'عدد',
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipt_vouchers_date ON public.receipt_vouchers (voucher_date);
CREATE INDEX idx_receipt_vouchers_branch ON public.receipt_vouchers (branch_name);
CREATE INDEX idx_receipt_voucher_items_voucher ON public.receipt_voucher_items (voucher_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_vouchers TO authenticated;
GRANT ALL ON public.receipt_vouchers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_voucher_items TO authenticated;
GRANT ALL ON public.receipt_voucher_items TO service_role;

ALTER TABLE public.receipt_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_voucher_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipt_vouchers_select_staff" ON public.receipt_vouchers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "receipt_vouchers_insert_finance" ON public.receipt_vouchers
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "receipt_vouchers_update_finance" ON public.receipt_vouchers
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "receipt_vouchers_delete_admin" ON public.receipt_vouchers
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "receipt_voucher_items_select_staff" ON public.receipt_voucher_items
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "receipt_voucher_items_insert_finance" ON public.receipt_voucher_items
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "receipt_voucher_items_update_finance" ON public.receipt_voucher_items
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'accounting'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "receipt_voucher_items_delete_admin" ON public.receipt_voucher_items
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_receipt_vouchers_updated_at BEFORE UPDATE ON public.receipt_vouchers FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

CREATE OR REPLACE FUNCTION public.fn_receipt_voucher_sync_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher_id uuid;
BEGIN
  v_voucher_id := COALESCE(NEW.voucher_id, OLD.voucher_id);
  UPDATE public.receipt_vouchers v
  SET items_count = sub.cnt,
      total_amount = sub.total
  FROM (
    SELECT COUNT(*)::int AS cnt, COALESCE(SUM(i.total_price), 0)::numeric(12,2) AS total
    FROM public.receipt_voucher_items i
    WHERE i.voucher_id = v_voucher_id
  ) sub
  WHERE v.id = v_voucher_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_receipt_voucher_items_sync
AFTER INSERT OR UPDATE OR DELETE ON public.receipt_voucher_items
FOR EACH ROW EXECUTE FUNCTION public.fn_receipt_voucher_sync_totals();

CREATE OR REPLACE VIEW public.v_receipt_vouchers_dashboard
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.voucher_no,
  v.voucher_date,
  v.customer_name,
  v.branch_name,
  v.branch_name_raw,
  v.branch_location_id,
  bl.branch AS branch_location_name,
  v.items_count,
  v.total_amount,
  v.status,
  v.source,
  v.created_at,
  date_trunc('month', v.voucher_date)::date AS month_bucket
FROM public.receipt_vouchers v
LEFT JOIN public.branch_locations bl ON bl.id = v.branch_location_id;