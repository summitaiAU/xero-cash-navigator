import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};

export const fetchInvoices = async (viewState: 'payable' | 'paid' | 'flagged' = 'payable'): Promise<Invoice[]> => {
  let query = supabase
    .from('invoices')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (viewState === 'paid') {
    query = query.eq('status', 'PAID');
  } else if (viewState === 'flagged') {
    query = query.eq('status', 'FLAGGED');
  } else {
    // Payable: all statuses that aren't FLAGGED or PAID
    query = query.not('status', 'in', '(FLAGGED,PAID)');
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Map Supabase schema to our Invoice interface
  const mappedInvoices = data.map((invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_no || '',
    supplier: invoice.supplier_name || '',
    amount: Number(invoice.total_amount) || 0,
    due_date: invoice.due_date || '',
    status: (invoice.status as 'READY' | 'FLAGGED' | 'PAID') || 'READY',
    xero_bill_id: invoice.xero_invoice_id || '',
    drive_embed_url: (invoice as any).google_drive_embed_link || invoice.google_drive_link || '',
    drive_view_url: invoice.link_to_invoice || '',
    supplier_email: '', // email_id field contains unusable data
    remittance_email: (invoice as any).remittance_email || undefined,
    supplier_email_on_invoice: (invoice as any).supplier_email_on_invoice || undefined,
    sender_email: (invoice as any).sender_email || undefined,
    remittance_sent: invoice.remittance_sent || false,
    project: invoice.project || '',
    xero_data: {
      invoiceNumber: invoice.invoice_no || '',
      contactName: invoice.supplier_name || '',
      issueDate: formatDate(invoice.created_at || ''),
      dueDate: formatDate(invoice.due_date || ''),
      reference: invoice.payment_ref || '',
      currency: 'AUD',
      status: 'DRAFT' as const,
      bsb: 'N/A',
      accountNumber: 'N/A',
      lineItems: invoice.list_items ? 
        (Array.isArray(invoice.list_items) ? 
          invoice.list_items.map((item: any, index: number) => {
            const itemData = typeof item === 'string' ? JSON.parse(item) : item;
            return {
              itemNumber: index + 1,
              description: itemData.description || '',
              quantity: Number(itemData.quantity) || 1,
              unitAmount: Number(itemData.unit_price || itemData.total) || 0,
              account: `${itemData.account_code || '429'} - Expenses`,
              taxRate: 'GST (10%)',
              amount: Number(itemData.total || itemData.unit_price) || 0
            };
          }) : []) : [],
      subtotal: Number(invoice.subtotal) || 0,
      totalTax: Number(invoice.gst) || 0,
      total: Number(invoice.total_amount) || 0
    }
  }));

  // Sort by due date with overdue invoices first, then by closest due date
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  
  return mappedInvoices.sort((a, b) => {
    const dateA = a.due_date ? new Date(a.due_date) : null;
    const dateB = b.due_date ? new Date(b.due_date) : null;
    
    // Handle null dates (put them last)
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    const isOverdueA = dateA < today;
    const isOverdueB = dateB < today;
    
    // If one is overdue and one isn't, prioritize overdue
    if (isOverdueA && !isOverdueB) return -1;
    if (!isOverdueA && isOverdueB) return 1;
    
    // Both overdue or both not overdue - sort by date (ascending)
    return dateA.getTime() - dateB.getTime();
  });
};

export const updateInvoicePaymentStatus = async (invoiceId: string, remittanceSent: boolean) => {
  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'PAID',
      remittance_sent: remittanceSent,
      paid_date: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice: ${error.message}`);
  }
};

export const unmarkInvoiceAsPaid = async (invoiceId: string) => {
  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'READY',
      remittance_sent: false,
      paid_date: null
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to unmark invoice as paid: ${error.message}`);
  }
};

export const updateInvoiceRemittanceStatus = async (invoiceId: string) => {
  const { error } = await supabase
    .from('invoices')
    .update({ 
      remittance_sent: true
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice remittance status: ${error.message}`);
  }
};

export interface FlagInvoiceData {
  flagType: string;
  emailAddress?: string;
  subject?: string;
  emailBody?: string;
}

export const flagInvoice = async (invoiceId: string, flagData: FlagInvoiceData) => {
  // First get the invoice details to extract necessary fields for webhook
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('google_drive_id, invoice_no')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    throw new Error(`Failed to fetch invoice details: ${fetchError?.message}`);
  }

  // Update invoice with flag information
  const updateData: any = {
    status: 'FLAGGED',
    flag_type: flagData.flagType
  };

  if (flagData.emailAddress) {
    updateData.flag_email_address = flagData.emailAddress;
  }
  if (flagData.subject) {
    updateData.flag_email_subject = flagData.subject;
  }
  if (flagData.emailBody) {
    updateData.flag_email_body = flagData.emailBody;
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId);

  if (updateError) {
    throw new Error(`Failed to flag invoice: ${updateError.message}`);
  }

  // Send webhook notification if email details provided
  if (flagData.emailAddress && flagData.subject && flagData.emailBody) {
    try {
      const { sendN8NWebhook } = await import('./webhookService');
      
      await sendN8NWebhook({
        flag_email_address: flagData.emailAddress,
        flag_email_body: flagData.emailBody,
        flag_email_subject: flagData.subject,
        google_drive_id: invoice.google_drive_id || '',
        invoice_no: invoice.invoice_no || ''
      });
    } catch (webhookError) {
      console.error('Webhook failed but invoice was flagged:', webhookError);
      // Don't throw here - we want the flagging to succeed even if webhook fails
    }
  }
};

export const resolveFlag = async (invoiceId: string) => {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'READY',
      flag_type: null,
      flag_email_address: null,
      flag_email_subject: null,
      flag_email_body: null
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to resolve flag: ${error.message}`);
  }
};