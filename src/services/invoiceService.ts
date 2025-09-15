import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['READY', 'NEW SUPPLIER', 'REVIEW'])
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
    remittance_email: (invoice as any).remittance_email || undefined,
    xero_data: {
      Status: 'DRAFT' as const,
      Reference: invoice.payment_ref || '',
      SubTotal: Number(invoice.subtotal) || 0,
      TotalTax: Number(invoice.gst) || 0,
      Total: Number(invoice.total_amount) || 0,
      LineItems: invoice.list_items ? 
        (Array.isArray(invoice.list_items) ? 
          invoice.list_items.map((item: any) => {
            const itemData = typeof item === 'string' ? JSON.parse(item) : item;
            return {
              Description: itemData.description || '',
              UnitAmount: Number(itemData.unit_price || itemData.total) || 0,
              TaxAmount: Number(itemData.tax_amount || (itemData.total * 0.1)) || 0,
              AccountCode: itemData.account_code || '429',
              Quantity: Number(itemData.quantity) || 1,
              LineAmount: Number(itemData.total || itemData.unit_price) || 0,
              TaxType: 'INPUT'
            };
          }) : []) : []
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