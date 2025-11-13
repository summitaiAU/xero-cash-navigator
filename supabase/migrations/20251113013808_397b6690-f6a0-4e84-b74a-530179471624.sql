-- Schedule cleanup_expired_locks to run every 5 minutes using pg_cron
-- This ensures stale locks are removed regularly

-- pg_cron extension should already be available in Supabase
-- Schedule the cleanup job
SELECT cron.schedule(
  'cleanup-invoice-locks',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT cleanup_expired_locks();$$
);