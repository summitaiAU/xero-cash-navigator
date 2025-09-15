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
};

export const updateInvoicePaymentStatus = async (invoiceId: string, isPaid: boolean) => {
  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'PAID',
      remittance_sent: isPaid,
      paid_date: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice: ${error.message}`);
  }
};