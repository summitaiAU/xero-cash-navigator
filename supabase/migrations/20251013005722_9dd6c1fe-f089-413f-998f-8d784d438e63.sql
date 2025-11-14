-- Add new timestamp columns to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_made_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS partial_payment_made_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS remittance_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS flag_email_sent_at timestamp with time zone;

-- Create daily_events table for tracking all invoice actions
CREATE TABLE IF NOT EXISTS public.daily_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number text,
  entity text,
  amount numeric,
  email_address text,
  details jsonb DEFAULT '{}'::jsonb,
  user_email text,
  user_id uuid
);

-- Enable RLS on daily_events
ALTER TABLE public.daily_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert events
CREATE POLICY "Allow authorized users to insert events"
ON public.daily_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND is_user_allowed((auth.jwt() ->> 'email')));

-- Allow authenticated users to read events
CREATE POLICY "Allow authorized users to read events"
ON public.daily_events
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_user_allowed((auth.jwt() ->> 'email')));

-- Block anonymous access
CREATE POLICY "Block anonymous access to events"
ON public.daily_events
FOR ALL
TO anon
USING (false);

-- Create index for faster queries on event_type and created_at
CREATE INDEX IF NOT EXISTS idx_daily_events_type_date ON public.daily_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_events_invoice ON public.daily_events(invoice_id);

-- Add comment for documentation
COMMENT ON TABLE public.daily_events IS 'Tracks all invoice-related events for daily/weekly reporting';