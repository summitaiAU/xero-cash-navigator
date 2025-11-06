-- Fix RLS for gmail_messages_stage table
ALTER TABLE public.gmail_messages_stage ENABLE ROW LEVEL SECURITY;

-- Add policies for gmail_messages_stage
CREATE POLICY "Service role full access on gmail_messages_stage"
ON public.gmail_messages_stage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix search_path for fn_kick_email_processor_sync function
CREATE OR REPLACE FUNCTION public.fn_kick_email_processor_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_now         timestamptz := now();
  v_claimed_id  uuid;
  v_response    jsonb;
  v_url text := 'https://sodhipg.app.n8n.cloud/webhook/b40eec46-6ca3-44aa-a3eb-55744011a820';
BEGIN
  -- Try synchronous HTTP call
  BEGIN
    SELECT (net.http((
      'POST',
      v_url,
      jsonb_build_object('Content-Type', 'application/json'),
      'application/json',
      json_build_object('row_id', v_claimed_id)::text
    )::net.http_request_result)).*
    INTO v_response;
    
    RAISE NOTICE 'HTTP Response: %', v_response;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'HTTP call failed: %', SQLERRM;
  END;

  RETURN NULL;
END;
$function$;

-- Fix search_path for fn_kick_email_processor function
CREATE OR REPLACE FUNCTION public.fn_kick_email_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_now         timestamptz := now();
  v_claimed_id  uuid;
  v_msg_id      text;
  v_request_id  bigint;
  v_url text := 'https://sodhipg.app.n8n.cloud/webhook/b40eec46-6ca3-44aa-a3eb-55744011a820';
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN 
    RETURN NULL; 
  END IF;

  -- Check if any job is actively processing
  IF EXISTS (
    SELECT 1 FROM public.email_queue
    WHERE status = 'processing' 
      AND locked_until IS NOT NULL 
      AND locked_until > v_now
  ) THEN 
    RETURN NULL; 
  END IF;

  -- Release stale locks
  UPDATE public.email_queue
  SET status = 'queued', 
      attempt_count = attempt_count + 1,
      locked_until = NULL
  WHERE status = 'processing' 
    AND locked_until IS NOT NULL 
    AND locked_until <= v_now;

  -- Exit if no queued jobs
  IF NOT EXISTS (SELECT 1 FROM public.email_queue WHERE status = 'queued') THEN 
    RETURN NULL; 
  END IF;

  -- Mark max-attempt jobs as error
  UPDATE public.email_queue
  SET status = 'error', 
      error_message = 'max attempts exceeded'
  WHERE status = 'queued'
    AND attempt_count >= max_attempts;

  -- Claim one job and capture both id + message_id
  WITH pick AS (
    SELECT id, message_id
    FROM public.email_queue
    WHERE status = 'queued' 
      AND attempt_count < max_attempts
    ORDER BY priority DESC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.email_queue e
  SET status = 'processing', 
      started_at = v_now, 
      locked_until = v_now + INTERVAL '15 minutes', 
      attempt_count = e.attempt_count + 1
  FROM pick
  WHERE e.id = pick.id
  RETURNING e.id, pick.message_id INTO v_claimed_id, v_msg_id;

  -- Exit if no job was claimed
  IF v_claimed_id IS NULL THEN 
    RETURN NULL; 
  END IF;

  -- Send webhook with row_id + message_id
  SELECT net.http_post(
    v_url, 
    json_build_object(
      'row_id', v_claimed_id,
      'message_id', v_msg_id
    )::jsonb,
    '{}'::jsonb, 
    '{"Content-Type": "application/json"}'::jsonb,
    10000
  ) INTO v_request_id;

  RETURN NULL;
END;
$function$;

-- Fix search_path for test_pgnet_webhook function
CREATE OR REPLACE FUNCTION public.test_pgnet_webhook()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request_id bigint;
BEGIN
  -- Test with httpbin.org (always available echo service)
  SELECT net.http_post(
    'https://httpbin.org/post',
    '{"test": true}'::jsonb,
    '{"Content-Type": "application/json"}'::jsonb
  ) INTO v_request_id;
  
  RAISE NOTICE 'Request ID: %', v_request_id;
  RETURN v_request_id;
END;
$function$;