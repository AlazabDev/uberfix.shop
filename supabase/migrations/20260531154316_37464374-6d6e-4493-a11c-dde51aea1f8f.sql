
-- Add missing values to maintenance_status enum
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'triaged';
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'handover_to_admin';
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'rejected';
