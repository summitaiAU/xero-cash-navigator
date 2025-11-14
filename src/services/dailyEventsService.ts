import { supabase } from '@/integrations/supabase/client';

export interface DailyEventData {
  event_type: 'PAYMENT_MADE' | 'PARTIAL_PAYMENT' | 'REMITTANCE_SENT' | 'FLAG_EMAIL_SENT';
  invoice_id: string;
  invoice_number: string;
  entity?: string;
  amount?: number;
  email_address?: string;
  details?: Record<string, any>;
}

class DailyEventsService {
  private async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return {
      email: user?.email || 'unknown',
      id: user?.id || null
    };
  }

  async logEvent(eventData: DailyEventData): Promise<void> {
    try {
      const user = await this.getCurrentUser();

      const { error } = await supabase
        .from('daily_events')
        .insert({
          event_type: eventData.event_type,
          invoice_id: eventData.invoice_id,
          invoice_number: eventData.invoice_number,
          entity: eventData.entity,
          amount: eventData.amount,
          email_address: eventData.email_address,
          details: eventData.details || {},
          user_email: user.email,
          user_id: user.id
        });

      if (error) {
        console.error('Failed to log daily event:', error);
        // Don't throw - we don't want to break the main flow if event logging fails
      }
    } catch (error) {
      console.error('Error logging daily event:', error);
    }
  }

  async logPaymentMade(
    invoiceId: string,
    invoiceNumber: string,
    entity: string,
    amount: number,
    paymentMethod?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'PAYMENT_MADE',
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      entity,
      amount,
      details: { payment_method: paymentMethod }
    });
  }

  async logPartialPayment(
    invoiceId: string,
    invoiceNumber: string,
    entity: string,
    amountPaid: number,
    totalAmount: number
  ): Promise<void> {
    await this.logEvent({
      event_type: 'PARTIAL_PAYMENT',
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      entity,
      amount: amountPaid,
      details: {
        amount_paid: amountPaid,
        total_amount: totalAmount,
        remaining: totalAmount - amountPaid
      }
    });
  }

  async logRemittanceSent(
    invoiceId: string,
    invoiceNumber: string,
    emailAddress: string,
    entity?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'REMITTANCE_SENT',
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      entity,
      email_address: emailAddress
    });
  }

  async logFlagEmailSent(
    invoiceId: string,
    invoiceNumber: string,
    emailAddress: string,
    subject?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'FLAG_EMAIL_SENT',
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      email_address: emailAddress,
      details: { subject }
    });
  }
}

export const dailyEventsService = new DailyEventsService();
