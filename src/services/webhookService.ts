import { supabase } from '@/integrations/supabase/client';

export interface N8NWebhookPayload {
  flag_email_address: string;
  flag_email_body: string;
  flag_email_subject: string;
  google_drive_id: string;
  invoice_no: string;
}

export const sendN8NWebhook = async (payload: N8NWebhookPayload): Promise<void> => {
  const webhookUrl = 'https://sodhipg.app.n8n.cloud/webhook/589ba0d5-ce5a-48b6-989a-60e512190157';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    console.log('N8N webhook sent successfully');
  } catch (error) {
    console.error('Failed to send N8N webhook:', error);
    throw new Error('Failed to send notification email');
  }
};