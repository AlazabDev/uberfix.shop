-- Fix: Remove overly broad invoices storage policy that allows any authenticated user to read all invoices
-- Keep the ownership-scoped policy (invoices_owner_select) and staff policy instead
DROP POLICY IF EXISTS "Users can view their invoices" ON storage.objects;