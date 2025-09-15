import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .neq('status', 'PAID')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Map Supabase schema to our Invoice interface
  return data.map((invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_no || '',
    supplier: invoice.supplier_name || '',
    amount: Number(invoice.total_amount) || 0,
    due_date: invoice.due_date || '',
    status: (invoice.status as 'READY' | 'NEW SUPPLIER' | 'REVIEW' | 'PAID') || 'READY',
    xero_bill_id: invoice.xero_invoice_id || '',
    drive_embed_url: (invoice as any).google_drive_embed_link || invoice.google_drive_link || '',
    drive_view_url: invoice.link_to_invoice || '',
    supplier_email: invoice.email_id || '',
    xero_data: {
      status: 'DRAFT' as const,
      reference: invoice.payment_ref || '',
      account_code: '200',
      tax_rate: 10,
      subtotal: Number(invoice.subtotal) || 0,
      tax: Number(invoice.gst) || 0,
      total: Number(invoice.total_amount) || 0,
      line_items: invoice.list_items ? 
        (Array.isArray(invoice.list_items) ? 
          invoice.list_items.map((item: any) => ({
            description: item.description || '',
            amount: Number(item.amount) || 0,
            tax_amount: Number(item.tax_amount) || 0,
            account_code: item.account_code || '200'
          })) : []) : []
    }
  }));
};

export const updateInvoicePaymentStatus = async (invoiceId: string, isPaid: boolean) => {
  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'PAID',
      remittance_sent: isPaid
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice: ${error.message}`);
  }
};