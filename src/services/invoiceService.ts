import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';
import { auditService } from './auditService';
import { ApiErrorLogger } from './apiErrorLogger';

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
    // Payable: all statuses that aren't FLAGGED, PAID, or DELETED
    query = query.not('status', 'in', '(FLAGGED,PAID,DELETED)');
  }
  const { data, error } = await query;

  if (error) {
    await ApiErrorLogger.logSupabaseError('SELECT', error, {
      table: 'invoices',
      userContext: `Fetch ${viewState} invoices`
    });
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
    status: (invoice.status as 'READY' | 'FLAGGED' | 'PAID' | 'APPROVED' | 'PARTIALLY PAID') || 'READY',
    xero_bill_id: invoice.xero_invoice_id || '',
    drive_embed_url: (invoice as any).google_drive_embed_link || invoice.google_drive_link || '',
    drive_view_url: invoice.link_to_invoice || '',
    supplier_email: '', // email_id field contains unusable data
    remittance_email: (invoice as any).remittance_email || undefined,
    supplier_email_on_invoice: (invoice as any).supplier_email_on_invoice || undefined,
    sender_email: (invoice as any).sender_email || undefined,
    remittance_sent: invoice.remittance_sent || false,
    project: invoice.project || '',
    approved: (invoice as any).approved || false,
    partially_paid: (invoice as any).partially_paid || false,
    saved_emails: (invoice as any).saved_emails || [], // Include saved emails
    
    // Additional Supabase fields for editing
    entity: invoice.entity || '',
    supplier_name: invoice.supplier_name || '',
    invoice_no: invoice.invoice_no || '',
    list_items: invoice.list_items || [],
    subtotal: Number(invoice.subtotal) || 0,
    gst: Number(invoice.gst) || 0,
    total_amount: Number(invoice.total_amount) || 0,
    amount_due: Number(invoice.amount_due) || 0,
    amount_paid: Number(invoice.amount_paid) || 0,
    invoice_date: invoice.invoice_date || '',
    currency: (invoice as any).currency || 'AUD',
    
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

export const updateInvoicePaymentStatus = async (
  invoiceId: string, 
  remittanceSent: boolean,
  remittanceEmail?: string
) => {
  const { dailyEventsService } = await import('./dailyEventsService');
  
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    await ApiErrorLogger.logSupabaseError('SELECT', fetchError, {
      table: 'invoices',
      invoiceId: invoiceId,
      userContext: 'Update payment status - fetch for audit'
    });
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

  const updateData: any = { 
    status: 'PAID',
    remittance_sent: remittanceSent,
    paid_date: new Date().toISOString(),
    payment_made_at: new Date().toISOString(),
    amount_paid: currentInvoice.total_amount
  };

  if (remittanceEmail) {
    updateData.remittance_email = remittanceEmail;
  }

  if (remittanceSent) {
    updateData.remittance_sent_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId);

  if (error) {
    await ApiErrorLogger.logSupabaseError('UPDATE', error, {
      table: 'invoices',
      invoiceId: invoiceId,
      invoiceNumber: currentInvoice.invoice_no,
      userContext: 'Mark invoice as paid'
    });
    throw new Error(`Failed to update invoice: ${error.message}`);
  }

  // Log to daily events
  await dailyEventsService.logPaymentMade(
    invoiceId,
    currentInvoice.invoice_no,
    currentInvoice.entity || 'Unknown',
    currentInvoice.total_amount
  );

  if (remittanceSent && remittanceEmail) {
    await dailyEventsService.logRemittanceSent(
      invoiceId,
      currentInvoice.invoice_no,
      remittanceEmail,
      currentInvoice.entity
    );
  }

  // Audit log
  await auditService.logInvoiceMarkedPaid(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    status_from: currentInvoice.status,
    status_to: 'PAID',
    remittance_sent: remittanceSent
  });
};

export const unmarkInvoiceAsPaid = async (invoiceId: string) => {
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'READY',
      remittance_sent: false,
      paid_date: null,
      payment_made_at: null,
      remittance_sent_at: null,
      amount_paid: null
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to unmark invoice as paid: ${error.message}`);
  }

  // Audit log
  await auditService.logInvoiceUnmarkedPaid(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    status_from: currentInvoice.status,
    status_to: 'READY'
  });
};

export const updateInvoiceRemittanceStatus = async (
  invoiceId: string,
  remittanceEmail?: string
) => {
  const { dailyEventsService } = await import('./dailyEventsService');
  
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

  const updateData: any = { 
    remittance_sent: true,
    remittance_sent_at: new Date().toISOString()
  };

  if (remittanceEmail) {
    updateData.remittance_email = remittanceEmail;
  }

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice remittance status: ${error.message}`);
  }

  // Log to daily events
  if (remittanceEmail) {
    await dailyEventsService.logRemittanceSent(
      invoiceId,
      currentInvoice.invoice_no,
      remittanceEmail,
      currentInvoice.entity
    );
  }

  // Audit log
  await auditService.logRemittanceEmailSent(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    remittance_sent: true
  });
};

export interface FlagInvoiceData {
  flagType: string;
  emailAddress?: string;
  subject?: string;
  emailBody?: string;
}

export const flagInvoice = async (invoiceId: string, flagData: FlagInvoiceData) => {
  const { dailyEventsService } = await import('./dailyEventsService');
  
  // First get the invoice details to extract necessary fields for webhook and audit
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
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
    updateData.flag_email_sent_at = new Date().toISOString();
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

      // Log to daily events
      await dailyEventsService.logFlagEmailSent(
        invoiceId,
        invoice.invoice_no,
        flagData.emailAddress,
        flagData.subject
      );
    } catch (webhookError) {
      console.error('Webhook failed but invoice was flagged:', webhookError);
      // Don't throw here - we want the flagging to succeed even if webhook fails
    }
  }

  // Audit log
  await auditService.logInvoiceFlagged(invoiceId, {
    invoice_number: invoice.invoice_no,
    supplier_name: invoice.supplier_name,
    amount: invoice.total_amount,
    status_from: invoice.status,
    status_to: 'FLAGGED',
    flag_type: flagData.flagType,
    email_address: flagData.emailAddress,
    email_subject: flagData.subject,
    email_body: flagData.emailBody
  });
};

export const resolveFlag = async (invoiceId: string) => {
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

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

  // Audit log
  await auditService.logInvoiceFlagResolved(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    status_from: currentInvoice.status,
    status_to: 'READY',
    flag_type: currentInvoice.flag_type
  });
};

export const updateInvoiceData = async (invoiceId: string, updateData: {
  entity?: string,
  project?: string,
  supplier_name?: string,
  invoice_no?: string,
  invoice_date?: string,
  due_date?: string,
  currency?: string,
  list_items?: any[],
  subtotal?: number,
  gst?: number,
  total_amount?: number,
  approved?: boolean
}) => {
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to update invoice: ${error.message}`);
  }

  // Log detailed changes for each field that was updated
  const changes: Array<{field: string, old_value: any, new_value: any}> = [];
  
  if (updateData.entity !== undefined && updateData.entity !== currentInvoice.entity) {
    changes.push({ field: 'entity', old_value: currentInvoice.entity, new_value: updateData.entity });
  }
  if (updateData.project !== undefined && updateData.project !== currentInvoice.project) {
    changes.push({ field: 'project', old_value: currentInvoice.project, new_value: updateData.project });
  }
  if (updateData.supplier_name !== undefined && updateData.supplier_name !== currentInvoice.supplier_name) {
    changes.push({ field: 'supplier_name', old_value: currentInvoice.supplier_name, new_value: updateData.supplier_name });
  }
  if (updateData.invoice_no !== undefined && updateData.invoice_no !== currentInvoice.invoice_no) {
    changes.push({ field: 'invoice_no', old_value: currentInvoice.invoice_no, new_value: updateData.invoice_no });
  }
  if (updateData.invoice_date !== undefined && updateData.invoice_date !== currentInvoice.invoice_date) {
    changes.push({ field: 'invoice_date', old_value: currentInvoice.invoice_date, new_value: updateData.invoice_date });
  }
  if (updateData.due_date !== undefined && updateData.due_date !== currentInvoice.due_date) {
    changes.push({ field: 'due_date', old_value: currentInvoice.due_date, new_value: updateData.due_date });
  }
  if (updateData.currency !== undefined && updateData.currency !== currentInvoice.currency) {
    changes.push({ field: 'currency', old_value: currentInvoice.currency, new_value: updateData.currency });
  }
  if (updateData.list_items !== undefined && JSON.stringify(updateData.list_items) !== JSON.stringify(currentInvoice.list_items)) {
    changes.push({ field: 'list_items', old_value: currentInvoice.list_items, new_value: updateData.list_items });
  }
  if (updateData.subtotal !== undefined && updateData.subtotal !== Number(currentInvoice.subtotal)) {
    changes.push({ field: 'subtotal', old_value: currentInvoice.subtotal, new_value: updateData.subtotal });
  }
  if (updateData.gst !== undefined && updateData.gst !== Number(currentInvoice.gst)) {
    changes.push({ field: 'gst', old_value: currentInvoice.gst, new_value: updateData.gst });
  }
  if (updateData.total_amount !== undefined && updateData.total_amount !== Number(currentInvoice.total_amount)) {
    changes.push({ field: 'total_amount', old_value: currentInvoice.total_amount, new_value: updateData.total_amount });
  }
  if (updateData.approved !== undefined && updateData.approved !== currentInvoice.approved) {
    changes.push({ field: 'approved', old_value: currentInvoice.approved, new_value: updateData.approved });
  }

  // Only log if there were actual changes
  if (changes.length > 0) {
    await auditService.logInvoiceDataUpdate(invoiceId, {
      invoice_number: currentInvoice.invoice_no,
      supplier_name: currentInvoice.supplier_name,
      amount: currentInvoice.total_amount,
      changes: changes
    });
  }
};

export const approveInvoice = async (invoiceId: string) => {
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from('invoices')
    .update({ approved: true } as any)
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to approve invoice: ${error.message}`);
  }

  // Audit log
  await auditService.logInvoiceApproved(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    old_value: currentInvoice.approved,
    new_value: true
  });
};

export const undoApproveInvoice = async (invoiceId: string) => {
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from('invoices')
    .update({ approved: false } as any)
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to undo invoice approval: ${error.message}`);
  }

  // Audit log
  await auditService.logInvoiceApprovalUndone(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    old_value: currentInvoice.approved,
    new_value: false
  });
};

export const markAsPartiallyPaid = async (invoiceId: string, amountPaid: number) => {
  const { dailyEventsService } = await import('./dailyEventsService');
  
  // First get current invoice data to calculate new amounts and audit
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    throw new Error(`Failed to fetch invoice: ${fetchError?.message}`);
  }

  const currentAmountPaid = Number(invoice.amount_paid) || 0;
  const totalAmount = Number(invoice.total_amount) || 0;
  const newAmountPaid = currentAmountPaid + amountPaid;
  const newAmountDue = totalAmount - newAmountPaid;

  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'PARTIALLY PAID',
      partially_paid: true,
      amount_paid: newAmountPaid,
      amount_due: newAmountDue,
      partial_payment_made_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to mark invoice as partially paid: ${error.message}`);
  }

  // Log to daily events
  await dailyEventsService.logPartialPayment(
    invoiceId,
    invoice.invoice_no,
    invoice.entity || 'Unknown',
    amountPaid,
    totalAmount
  );

  // Audit log
  await auditService.logInvoicePartialPayment(invoiceId, {
    invoice_number: invoice.invoice_no,
    supplier_name: invoice.supplier_name,
    amount: invoice.total_amount,
    amount_paid: amountPaid,
    status_from: invoice.status,
    status_to: 'PARTIALLY PAID'
  });
};

// Email management functions
export const addSavedEmail = async (invoiceId: string, email: string) => {
  // First get the current invoice to capture current saved emails
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for email update: ${fetchError.message}`);
  }

  const currentEmails = currentInvoice.saved_emails || [];
  
  // Check if email already exists
  if (currentEmails.includes(email)) {
    throw new Error('Email already exists in saved emails');
  }

  const updatedEmails = [...currentEmails, email];

  const { error } = await supabase
    .from('invoices')
    .update({ saved_emails: updatedEmails })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to add saved email: ${error.message}`);
  }

  // Audit log
  await auditService.logInvoiceDataUpdate(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    changes: [{
      field: 'saved_emails',
      old_value: currentEmails,
      new_value: updatedEmails
    }]
  });
};

export const removeSavedEmail = async (invoiceId: string, email: string) => {
  // First get the current invoice to capture current saved emails
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for email removal: ${fetchError.message}`);
  }

  const currentEmails = currentInvoice.saved_emails || [];
  const updatedEmails = currentEmails.filter(e => e !== email);

  const { error } = await supabase
    .from('invoices')
    .update({ saved_emails: updatedEmails })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to remove saved email: ${error.message}`);
  }

  // Audit log
  await auditService.logInvoiceDataUpdate(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    changes: [{
      field: 'saved_emails',
      old_value: currentEmails,
      new_value: updatedEmails
    }]
  });
};

export const unmarkPartialPayment = async (invoiceId: string) => {
  // First get the current invoice to capture audit details
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch invoice for audit: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'READY',
      partially_paid: false,
      amount_paid: 0,
      amount_due: null,
      partial_payment_made_at: null
    })
    .eq('id', invoiceId);

  if (error) {
    throw new Error(`Failed to unmark partial payment: ${error.message}`);
  }

  // Audit log
  await auditService.logInvoicePartialPaymentUndo(invoiceId, {
    invoice_number: currentInvoice.invoice_no,
    supplier_name: currentInvoice.supplier_name,
    amount: currentInvoice.total_amount,
    status_from: currentInvoice.status,
    status_to: 'READY'
  });
};