-- Fix function search path issues for security
CREATE OR REPLACE FUNCTION public.log_api_error(
  api_endpoint text,
  error_message text,
  error_details jsonb DEFAULT '{}',
  request_data jsonb DEFAULT '{}',
  response_status integer DEFAULT NULL,
  response_data text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_email,
    user_id,
    action_type,
    entity_type,
    details,
    user_agent,
    session_id,
    invoice_number
  ) VALUES (
    COALESCE((auth.jwt() ->> 'email'::text), 'system'),
    auth.uid(),
    'API_ERROR',
    'SYSTEM',
    jsonb_build_object(
      'api_endpoint', api_endpoint,
      'error_message', error_message,
      'error_details', error_details,
      'request_data', request_data,
      'response_status', response_status,
      'response_data', response_data,
      'timestamp', now()
    ),
    COALESCE((error_details ->> 'user_agent'), 'unknown'),
    COALESCE((error_details ->> 'session_id'), 'unknown'),
    COALESCE((request_data ->> 'invoice_number'), NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';