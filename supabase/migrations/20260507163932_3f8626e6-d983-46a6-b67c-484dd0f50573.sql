
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 14.00,
  ADD COLUMN IF NOT EXISTS withholding_rate NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE OR REPLACE FUNCTION public.fn_generate_service_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq INT;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code,'\D','','g'),'')::INT),0)+1
      INTO seq FROM public.services WHERE code LIKE 'UF-SVC-%';
    NEW.code := 'UF-SVC-' || lpad(seq::text, 5, '0');
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_services_autocode ON public.services;
CREATE TRIGGER trg_services_autocode
BEFORE INSERT ON public.services
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_service_code();

CREATE TABLE IF NOT EXISTS public.inventory_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  manager_id UUID,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_warehouse_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq INT;
BEGIN
  IF NEW.warehouse_code IS NULL OR NEW.warehouse_code = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(warehouse_code,'\D','','g'),'')::INT),0)+1
      INTO seq FROM public.inventory_warehouses WHERE warehouse_code LIKE 'UF-WH-%';
    NEW.warehouse_code := 'UF-WH-' || lpad(seq::text, 4, '0');
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_warehouses_autocode ON public.inventory_warehouses;
CREATE TRIGGER trg_warehouses_autocode
BEFORE INSERT ON public.inventory_warehouses
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_warehouse_code();

DROP TRIGGER IF EXISTS trg_warehouses_updated ON public.inventory_warehouses;
CREATE TRIGGER trg_warehouses_updated
BEFORE UPDATE ON public.inventory_warehouses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'قطعة',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 14.00,
  withholding_rate NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  barcode TEXT,
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_inventory_item_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq INT;
BEGIN
  IF NEW.item_code IS NULL OR NEW.item_code = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(item_code,'\D','','g'),'')::INT),0)+1
      INTO seq FROM public.inventory_items WHERE item_code LIKE 'UF-INV-%';
    NEW.item_code := 'UF-INV-' || lpad(seq::text, 6, '0');
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_items_autocode ON public.inventory_items;
CREATE TRIGGER trg_items_autocode
BEFORE INSERT ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_inventory_item_code();

DROP TRIGGER IF EXISTS trg_items_updated ON public.inventory_items;
CREATE TRIGGER trg_items_updated
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_code TEXT UNIQUE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  warehouse_id UUID NOT NULL REFERENCES public.inventory_warehouses(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjust','transfer')),
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  reason TEXT,
  reference_type TEXT,
  reference_id UUID,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_generate_movement_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq INT; ymd TEXT;
BEGIN
  IF NEW.movement_code IS NULL OR NEW.movement_code = '' THEN
    ymd := to_char(now(),'YYMMDD');
    SELECT COALESCE(COUNT(*),0)+1 INTO seq
      FROM public.inventory_movements WHERE movement_code LIKE 'UF/MOV/'||ymd||'/%';
    NEW.movement_code := 'UF/MOV/'||ymd||'/'||lpad(seq::text,4,'0');
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_movements_autocode ON public.inventory_movements;
CREATE TRIGGER trg_movements_autocode
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_movement_code();

CREATE OR REPLACE FUNCTION public.fn_apply_inventory_movement()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE delta NUMERIC;
BEGIN
  IF NEW.movement_type = 'in' THEN delta := NEW.quantity;
  ELSIF NEW.movement_type = 'out' THEN delta := -NEW.quantity;
  ELSIF NEW.movement_type = 'adjust' THEN delta := NEW.quantity;
  ELSE delta := 0;
  END IF;

  INSERT INTO public.inventory_stock(item_id, warehouse_id, quantity, updated_at)
  VALUES (NEW.item_id, NEW.warehouse_id, delta, now())
  ON CONFLICT (item_id, warehouse_id)
  DO UPDATE SET quantity = inventory_stock.quantity + EXCLUDED.quantity,
                updated_at = now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_movements_apply ON public.inventory_movements;
CREATE TRIGGER trg_movements_apply
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.fn_apply_inventory_movement();

ALTER TABLE public.inventory_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_read_auth" ON public.inventory_warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "wh_admin_write" ON public.inventory_warehouses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role));

CREATE POLICY "items_read_auth" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_admin_write" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role));

CREATE POLICY "stock_read_auth" ON public.inventory_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_admin_write" ON public.inventory_stock FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'warehouse'::app_role));

CREATE POLICY "mov_read_auth" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "mov_insert_staff" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
    OR public.has_role(auth.uid(),'warehouse'::app_role)
    OR public.has_role(auth.uid(),'technician'::app_role)
  );
CREATE POLICY "mov_admin_modify" ON public.inventory_movements FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "mov_admin_delete" ON public.inventory_movements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE VIEW public.v_inventory_dashboard
WITH (security_invoker = true) AS
SELECT
  i.id,
  i.item_code,
  i.name_ar,
  i.category,
  i.unit,
  i.cost_price,
  i.selling_price,
  i.vat_rate,
  i.reorder_level,
  COALESCE(SUM(s.quantity),0) AS total_quantity,
  COUNT(DISTINCT s.warehouse_id) AS warehouse_count,
  CASE
    WHEN COALESCE(SUM(s.quantity),0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(SUM(s.quantity),0) <= i.reorder_level THEN 'low_stock'
    ELSE 'ok'
  END AS stock_status,
  i.is_active
FROM public.inventory_items i
LEFT JOIN public.inventory_stock s ON s.item_id = i.id
GROUP BY i.id;

CREATE OR REPLACE VIEW public.v_service_catalog_dashboard
WITH (security_invoker = true) AS
SELECT
  sv.id,
  sv.code,
  sv.name_ar,
  sv.unit,
  sv.pricing_type,
  sv.base_price,
  sv.vat_rate,
  sv.withholding_rate,
  sv.is_active,
  COUNT(ii.id) AS times_invoiced,
  COALESCE(SUM(ii.total_price),0) AS total_revenue
FROM public.services sv
LEFT JOIN public.invoice_items ii ON ii.service_name = sv.name_ar
GROUP BY sv.id;

CREATE INDEX IF NOT EXISTS idx_inv_items_active ON public.inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inv_stock_item ON public.inventory_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_wh ON public.inventory_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_item ON public.inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_wh ON public.inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_request ON public.inventory_movements(request_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_created ON public.inventory_movements(created_at DESC);
