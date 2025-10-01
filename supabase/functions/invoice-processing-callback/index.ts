import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuccessPayload {
  status: 'success';
  file_name: string;
  invoice_id?: string;
  invoice_number?: string;
  supplier_name?: string;
  total_amount?: number;
  [key: string]: any;
}

interface ErrorPayload {
  status: 'error';
  file_name: string;
  error_message: string;
  error_code?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const payload: SuccessPayload | ErrorPayload = await req.json();
    
    console.log('Received callback:', JSON.stringify(payload, null, 2));

    if (!payload.file_name) {
      console.error('Missing file_name in payload');
      return new Response(
        JSON.stringify({ error: 'file_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the invoice by upload_tracking_id (file_name)
    const { data: existingInvoice, error: findError } = await supabase
      .from('invoices')
      .select('id, processing_status')
      .eq('upload_tracking_id', payload.file_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('Error finding invoice:', findError);
      return new Response(
        JSON.stringify({ error: 'Database error finding invoice' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingInvoice) {
      console.error('Invoice not found for tracking ID:', payload.file_name);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found invoice:', existingInvoice.id, 'with status:', existingInvoice.processing_status);

    // Handle success callback
    if (payload.status === 'success') {
      const successPayload = payload as SuccessPayload;
      
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          processing_status: 'completed',
          processing_completed_at: new Date().toISOString(),
          processing_error: null,
        })
        .eq('id', existingInvoice.id);

      if (updateError) {
        console.error('Error updating invoice to completed:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update invoice' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Invoice updated to completed:', existingInvoice.id);

      // Log successful processing to audit
      await supabase.rpc('log_api_error', {
        api_endpoint: 'invoice-processing-callback',
        error_message: 'Invoice processing completed successfully',
        error_details: {
          invoice_id: existingInvoice.id,
          file_name: payload.file_name,
          status: 'success'
        },
        request_data: successPayload,
        response_status: 200
      }).catch(err => console.error('Audit log error:', err));

      return new Response(
        JSON.stringify({ success: true, invoice_id: existingInvoice.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle error callback
    if (payload.status === 'error') {
      const errorPayload = payload as ErrorPayload;
      
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          processing_status: 'failed',
          processing_completed_at: new Date().toISOString(),
          processing_error: JSON.stringify({
            message: errorPayload.error_message,
            code: errorPayload.error_code,
            timestamp: new Date().toISOString()
          }),
        })
        .eq('id', existingInvoice.id);

      if (updateError) {
        console.error('Error updating invoice to failed:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update invoice' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Invoice updated to failed:', existingInvoice.id);

      // Log processing error to audit
      await supabase.rpc('log_api_error', {
        api_endpoint: 'invoice-processing-callback',
        error_message: errorPayload.error_message,
        error_details: {
          invoice_id: existingInvoice.id,
          file_name: payload.file_name,
          error_code: errorPayload.error_code,
          status: 'failed'
        },
        request_data: errorPayload,
        response_status: 500
      }).catch(err => console.error('Audit log error:', err));

      return new Response(
        JSON.stringify({ success: true, invoice_id: existingInvoice.id, status: 'error_recorded' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown status
    console.error('Unknown status in payload:', payload.status);
    return new Response(
      JSON.stringify({ error: 'Invalid status in payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in invoice-processing-callback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
