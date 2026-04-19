-- ============================================================
-- 1. إزالة access_token من facebook_users نهائياً
-- ============================================================
ALTER TABLE public.facebook_users DROP COLUMN IF EXISTS access_token;

-- ============================================================
-- 2. حذف الـ overload النصي الخطر من is_authorized_owner
-- يبقى فقط الإصدار الذي يستخدم auth.uid() داخلياً
-- ============================================================
DROP FUNCTION IF EXISTS public.is_authorized_owner(text);

-- ============================================================
-- 3. تشديد user_roles: منع المدير من منح/تعديل دور owner
-- فقط owner يستطيع منح owner
-- ============================================================
DROP POLICY IF EXISTS "ur_insert" ON public.user_roles;
DROP POLICY IF EXISTS "ur_update" ON public.user_roles;

CREATE POLICY "ur_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- owner يستطيع منح أي دور
  public.has_role(auth.uid(), 'owner'::app_role)
  OR
  -- admin يستطيع منح أي دور ما عدا owner
  (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'owner'::app_role)
);

CREATE POLICY "ur_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR
  (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'owner'::app_role)
);

-- منع حذف دور owner من قبل أي شخص غير owner آخر
DROP POLICY IF EXISTS "ur_delete" ON public.user_roles;
CREATE POLICY "ur_delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR
  (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'owner'::app_role)
);