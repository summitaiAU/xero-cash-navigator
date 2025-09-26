import { supabase } from '@/integrations/supabase/client';
import { ApiErrorLogger } from './apiErrorLogger';

export interface N8NWebhookPayload {
  flag_email_address: string;
  flag_email_body: string;
  flag_email_subject: string;
  google_drive_id: string;
  invoice_no: string;
}

export const sendN8NWebhook = async (payload: N8NWebhookPayload): Promise<void> => {
  const webhookUrl = 'https://sodhipg.app.n8n.cloud/webhook/589ba0d5-ce5a-48b6-989a-60e512190157';
  
  const response = await ApiErrorLogger.fetchWithLogging(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      flag_email_body: payload.flag_email_body.replace(/\n/g, '\\n')
    }),
    logContext: {
      endpoint: webhookUrl,
      method: 'POST',
      requestData: {
        flag_email_address: payload.flag_email_address,
        flag_email_subject: payload.flag_email_subject,
        google_drive_id: payload.google_drive_id
      },
      invoiceNumber: payload.invoice_no,
      userContext: 'Send flag notification email'
    }
  });

  console.log('N8N webhook sent successfully');
};