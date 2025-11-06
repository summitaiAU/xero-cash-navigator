-- Enable RLS on reconciliation_log table
ALTER TABLE public.reconciliation_log ENABLE ROW LEVEL SECURITY;

-- Add policy for reconciliation_log
CREATE POLICY "Service role full access on reconciliation_log"
ON public.reconciliation_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable RLS on weekly_google_drive table
ALTER TABLE public.weekly_google_drive ENABLE ROW LEVEL SECURITY;

-- Add policy for weekly_google_drive
CREATE POLICY "Authenticated users can read weekly_google_drive"
ON public.weekly_google_drive
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_user_allowed((auth.jwt() ->> 'email')));

-- Service role full access for weekly_google_drive
CREATE POLICY "Service role full access on weekly_google_drive"
ON public.weekly_google_drive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);