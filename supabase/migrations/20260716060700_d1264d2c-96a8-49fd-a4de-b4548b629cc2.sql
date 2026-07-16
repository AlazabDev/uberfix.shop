
-- Drop existing INSERT policies that allow role self-assignment
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_new" ON public.profiles;

-- Recreate: only allow inserting own row, and role must be 'customer' (default safe)
CREATE POLICY "profiles_insert_self_customer_only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND (role IS NULL OR role = 'customer')
);
