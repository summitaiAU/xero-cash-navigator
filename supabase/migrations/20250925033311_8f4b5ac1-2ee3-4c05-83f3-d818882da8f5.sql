-- Create audit log table for comprehensive user activity tracking
CREATE TABLE public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email text NOT NULL,
    user_id uuid,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    session_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_audit_logs_user_email ON public.audit_logs(user_email);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit logs
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND is_user_allowed((auth.jwt() ->> 'email'::text))
        AND user_email = (auth.jwt() ->> 'email'::text)
    );

CREATE POLICY "Admin users can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND is_user_allowed((auth.jwt() ->> 'email'::text))
        AND EXISTS (
            SELECT 1 FROM public.allowed_users 
            WHERE email = (auth.jwt() ->> 'email'::text) 
            AND role = 'admin' 
            AND active = true
        )
    );

CREATE POLICY "Service role can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Block all anonymous access to audit logs"
    ON public.audit_logs
    FOR ALL
    USING (false);