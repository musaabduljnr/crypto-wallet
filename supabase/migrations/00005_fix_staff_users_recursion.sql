-- ==============================================================================
-- MIGRATION: 00005_fix_staff_users_recursion.sql
-- DESCRIPTION: Eliminates infinite recursion in staff_users RLS policy
-- ==============================================================================

-- 1. Create a SECURITY DEFINER helper function that bypasses RLS during permission checks
CREATE OR REPLACE FUNCTION public.is_active_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.staff_users
        WHERE id = p_user_id AND role = 'super_admin' AND is_active = true
    );
$$;

-- 2. Drop the recursive policy on staff_users
DROP POLICY IF EXISTS "Super admins manage staff" ON public.staff_users;

-- 3. Re-create the policy using the security definer function to prevent recursion
CREATE POLICY "Super admins manage staff" ON public.staff_users
    FOR ALL USING (
        public.is_active_super_admin(auth.uid())
    );
