-- إضافة القيم المفقودة إلى enum mr_status
ALTER TYPE public.mr_status ADD VALUE IF NOT EXISTS 'In Progress';
ALTER TYPE public.mr_status ADD VALUE IF NOT EXISTS 'Closed';
ALTER TYPE public.mr_status ADD VALUE IF NOT EXISTS 'On Hold';