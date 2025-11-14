-- Enable full row images for realtime updates on invoice_locks
-- This ensures all columns are sent in realtime payloads for UPDATE/DELETE events
ALTER TABLE public.invoice_locks REPLICA IDENTITY FULL;