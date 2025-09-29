-- Fix the is_user_allowed function and RLS policies to avoid recursion

-- First, let's drop the problematic RLS policies that are causing recursion
DROP POLICY IF EXISTS "allowed_users_default_deny" ON public.allowed_users;
DROP POLICY IF EXISTS "allowed_users_user_own_select" ON public.allowed_users;
DROP POLICY IF EXISTS "allowed_users_admin_all" ON public.allowed_users;

-- Create a much simpler policy for allowed_users that doesn't cause recursion
-- This allows authenticated users to read from allowed_users (needed for the is_user_allowed function)
CREATE POLICY "allowed_users_authenticated_read" ON public.allowed_users
FOR SELECT
TO authenticated
USING (true);

-- Block non-authenticated access
CREATE POLICY "allowed_users_block_anonymous" ON public.allowed_users
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only allow service role to modify allowed_users
CREATE POLICY "allowed_users_service_modify" ON public.allowed_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Now let's test the is_user_allowed function
SELECT public.is_user_allowed('kirt.quar@hotmail.com') as test_result;