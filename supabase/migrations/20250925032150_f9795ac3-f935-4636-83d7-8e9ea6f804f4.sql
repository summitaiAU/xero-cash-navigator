-- Fix critical security vulnerability in invoices table RLS policies
-- The current policies are PERMISSIVE, which means they're combined with OR logic
-- We need RESTRICTIVE policies to properly block unauthorized access

-- First, drop the existing faulty policies
DROP POLICY "Block anonymous access to invoices" ON public.invoices;
DROP POLICY "Authenticated allowed users can read invoices" ON public.invoices;
DROP POLICY "Authenticated allowed users can update invoice payment status" ON public.invoices;

-- Create proper RESTRICTIVE policies that will block access by default
-- and only allow access for authenticated, allowed users

-- Block all anonymous access (RESTRICTIVE policy)
CREATE POLICY "Block all anonymous access" ON public.invoices
FOR ALL TO anon
USING (false);

-- Allow authenticated users who are in the allowlist to read invoices
CREATE POLICY "Allow authorized users to read invoices" ON public.invoices
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_user_allowed((auth.jwt() ->> 'email'::text))
);

-- Allow authorized users to insert invoices (for admin functions)
CREATE POLICY "Allow authorized users to insert invoices" ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_user_allowed((auth.jwt() ->> 'email'::text))
);

-- Allow authorized users to update invoice payment status and related fields
CREATE POLICY "Allow authorized users to update invoices" ON public.invoices
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_user_allowed((auth.jwt() ->> 'email'::text))
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_user_allowed((auth.jwt() ->> 'email'::text))
);

-- Allow authorized users to delete invoices (for admin functions)
CREATE POLICY "Allow authorized users to delete invoices" ON public.invoices
FOR DELETE TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_user_allowed((auth.jwt() ->> 'email'::text))
);

-- Also fix the allowed_users table while we're at it
-- Drop existing policies
DROP POLICY "Block anonymous access to allowed_users" ON public.allowed_users;
DROP POLICY "Authenticated users can read their own allowlist record" ON public.allowed_users;

-- Create proper restrictive policies for allowed_users
CREATE POLICY "Block all anonymous access to allowed_users" ON public.allowed_users
FOR ALL TO anon
USING (false);

-- Allow authenticated users to read only their own record
CREATE POLICY "Users can read their own allowlist record" ON public.allowed_users
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND lower(email) = lower((auth.jwt() ->> 'email'::text))
);