-- Remove the public read policy that exposes financial data
DROP POLICY IF EXISTS "Allow public read invoices" ON public.invoices;

-- Remove the update policy that allows anyone to mark invoices as paid
DROP POLICY IF EXISTS "Allow mark invoice paid" ON public.invoices;

-- Create security definer function to check if user is in allowlist
CREATE OR REPLACE FUNCTION public.is_user_allowed(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_users
    WHERE lower(email) = lower(user_email)
      AND active = true
  )
$$;

-- Create new secure policies for invoices
-- Only allow authenticated users who are in the allowlist to read invoices
CREATE POLICY "Authorized users can read invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (public.is_user_allowed(auth.jwt() ->> 'email'));

-- Only allow authenticated users who are in the allowlist to update invoice payment status
CREATE POLICY "Authorized users can update invoice payment status"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (public.is_user_allowed(auth.jwt() ->> 'email'))
  WITH CHECK (
    public.is_user_allowed(auth.jwt() ->> 'email') AND
    (status = 'PAID' OR remittance_sent IS NOT NULL)
  );