-- Enable RLS on invoices and add minimal policies for this app
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to read invoices
CREATE POLICY "Allow public read invoices"
ON public.invoices
FOR SELECT
USING (true);

-- Allow updating invoices only when setting status to 'PAID' (also permits updating remittance_sent alongside)
CREATE POLICY "Allow mark invoice paid"
ON public.invoices
FOR UPDATE
USING (true)
WITH CHECK (status = 'PAID');