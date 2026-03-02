
-- Drop existing conflicting function
DROP FUNCTION IF EXISTS public.generate_invoice_number();

-- Recreate invoice number trigger function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_unified_serial('INV', 'uf_inv_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();

-- Contract number trigger
DROP FUNCTION IF EXISTS public.generate_contract_number();
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := generate_unified_serial('CT', 'uf_ct_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_contract_number ON public.maintenance_contracts;
CREATE TRIGGER trg_generate_contract_number
  BEFORE INSERT ON public.maintenance_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contract_number();

-- Document number trigger  
DROP FUNCTION IF EXISTS public.generate_document_number();
CREATE OR REPLACE FUNCTION public.generate_document_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := generate_unified_serial('DOC', 'uf_doc_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_document_number ON public.documents;
CREATE TRIGGER trg_generate_document_number
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_document_number();

-- Technician number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'technicians' AND column_name = 'technician_number'
  ) THEN
    ALTER TABLE public.technicians ADD COLUMN technician_number TEXT UNIQUE;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.generate_technician_number() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_technician_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.technician_number IS NULL THEN
    NEW.technician_number := generate_unified_serial('TEC', 'uf_tec_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_technician_number ON public.technicians;
CREATE TRIGGER trg_generate_technician_number
  BEFORE INSERT ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_technician_number();
