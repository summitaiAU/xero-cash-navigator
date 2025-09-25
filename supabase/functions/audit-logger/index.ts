import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditLogRequest {
  user_email: string;
  user_id?: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const logData: AuditLogRequest = await req.json();

    // Get client IP from headers
    const clientIP = req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    const auditEntry = {
      user_email: logData.user_email,
      user_id: logData.user_id,
      action_type: logData.action_type,
      entity_type: logData.entity_type,
      entity_id: logData.entity_id,
      details: logData.details,
      ip_address: clientIP,
      user_agent: logData.user_agent,
      session_id: logData.session_id,
      created_at: new Date().toISOString()
    };

    console.log('Creating audit log entry:', {
      action: logData.action_type,
      entity: logData.entity_type,
      user: logData.user_email,
      details: Object.keys(logData.details)
    });

    const { error } = await supabase
      .from('audit_logs')
      .insert([auditEntry]);

    if (error) {
      console.error('Failed to insert audit log:', error);
      throw error;
    }

    console.log('Audit log created successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in audit-logger function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);