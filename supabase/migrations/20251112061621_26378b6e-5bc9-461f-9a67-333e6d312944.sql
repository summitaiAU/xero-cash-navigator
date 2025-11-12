-- Clean up telemetry logs from audit_logs table
-- This removes 437,627+ telemetry events (ui/*, perf/*, error/*) that were incorrectly
-- logged as API_ERROR, keeping only real business audit logs and actual API errors

DELETE FROM audit_logs 
WHERE action_type = 'API_ERROR' 
  AND (
    details->>'api_endpoint' LIKE 'ui/%' 
    OR details->>'api_endpoint' LIKE 'perf/%'
    OR details->>'api_endpoint' LIKE 'error/%'
  );

-- This will make audit_logs ~86% smaller and improve query performance