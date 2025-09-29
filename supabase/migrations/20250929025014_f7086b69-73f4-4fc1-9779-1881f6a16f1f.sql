-- Fix audit_logs RLS policies for better security

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Block all anonymous access to audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin users can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

-- Create more secure RLS policies for audit_logs

-- 1. Block ALL access by default (this will be our restrictive base)
CREATE POLICY "audit_logs_default_deny" ON public.audit_logs
FOR ALL 
USING (false)
WITH CHECK (false);

-- 2. Allow service role to insert audit logs (for system logging)
CREATE POLICY "audit_logs_service_insert" ON public.audit_logs
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 3. Allow authenticated users to view ONLY their own audit logs
-- This ensures users can only see logs where their email matches
CREATE POLICY "audit_logs_user_own_select" ON public.audit_logs
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_user_allowed((auth.jwt() ->> 'email'::text))
  AND user_email = (auth.jwt() ->> 'email'::text)
);

-- 4. Allow admin users to view all audit logs (but only admins)
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_user_allowed((auth.jwt() ->> 'email'::text))
  AND EXISTS (
    SELECT 1 FROM public.allowed_users 
    WHERE email = (auth.jwt() ->> 'email'::text)
    AND role = 'admin'
    AND active = true
  )
);

-- Fix allowed_users table security as well
-- Drop existing policies
DROP POLICY IF EXISTS "Block all anonymous access to allowed_users" ON public.allowed_users;
DROP POLICY IF EXISTS "Users can read their own allowlist record" ON public.allowed_users;

-- Create secure policies for allowed_users
-- 1. Default deny all access
CREATE POLICY "allowed_users_default_deny" ON public.allowed_users
FOR ALL
USING (false)
WITH CHECK (false);

-- 2. Allow authenticated users to read ONLY their own record
CREATE POLICY "allowed_users_user_own_select" ON public.allowed_users
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND lower(email) = lower((auth.jwt() ->> 'email'::text))
);

-- 3. Allow admin users to manage all records
CREATE POLICY "allowed_users_admin_all" ON public.allowed_users
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.allowed_users au
    WHERE au.email = (auth.jwt() ->> 'email'::text)
    AND au.role = 'admin'
    AND au.active = true
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.allowed_users au
    WHERE au.email = (auth.jwt() ->> 'email'::text)
    AND au.role = 'admin'
    AND au.active = true
  )
);