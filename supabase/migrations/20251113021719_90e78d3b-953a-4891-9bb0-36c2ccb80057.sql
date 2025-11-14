-- Set REPLICA IDENTITY FULL to ensure complete row data in realtime events
-- This allows User B to see invoice updates from User A in real-time
ALTER TABLE public.invoices REPLICA IDENTITY FULL;