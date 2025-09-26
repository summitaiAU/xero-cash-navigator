import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
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

export interface InvoiceAuditDetails {
  invoice_number?: string;
  supplier_name?: string;
  amount?: number;
  status_from?: string;
  status_to?: string;
  email_address?: string;
  payment_method?: string;
  amount_paid?: number;
  flag_type?: string;
  flag_reason?: string;
  email_subject?: string;
  email_body?: string;
  field_changed?: string;
  old_value?: any;
  new_value?: any;
  remittance_sent?: boolean;
  changes?: Array<{field: string, old_value: any, new_value: any}>;
}

export interface ApiErrorDetails {
  api_endpoint: string;
  error_message: string;
  error_details?: any;
  request_data?: any;
  response_status?: number;
  response_data?: string;
  invoice_number?: string;
}

class AuditService {
  private async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      email: session?.user?.email || 'unknown',
      id: session?.user?.id
    };
  }

  private async getClientInfo() {
    return {
      user_agent: navigator.userAgent,
      session_id: (await supabase.auth.getSession()).data.session?.access_token?.substring(0, 8)
    };
  }

  async log(entry: Omit<AuditLogEntry, 'user_email' | 'user_id'>): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      const clientInfo = await this.getClientInfo();

      // Extract invoice_number from details for top-level logging
      const invoiceNumber = (entry.details as any)?.invoice_number;

      const logEntry: AuditLogEntry & { invoice_number?: string } = {
        ...entry,
        user_email: user.email,
        user_id: user.id,
        ...clientInfo,
        invoice_number: invoiceNumber
      };

      // Use edge function to insert audit log to avoid RLS issues
      const { error } = await supabase.functions.invoke('audit-logger', {
        body: logEntry
      });

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  // Authentication events
  async logSignIn() {
    await this.log({
      action_type: 'SIGN_IN',
      entity_type: 'AUTH',
      details: { timestamp: new Date().toISOString() }
    });
  }

  async logSignOut() {
    await this.log({
      action_type: 'SIGN_OUT',
      entity_type: 'AUTH',
      details: { timestamp: new Date().toISOString() }
    });
  }

  // Invoice status changes
  async logInvoiceStatusChange(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_STATUS_CHANGE',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logInvoiceMarkedPaid(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_MARKED_PAID',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logInvoiceUnmarkedPaid(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_UNMARKED_PAID',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logInvoicePartialPayment(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_PARTIAL_PAYMENT',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logInvoicePartialPaymentUndo(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_PARTIAL_PAYMENT_UNDO',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  // Invoice flagging
  async logInvoiceFlagged(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_FLAGGED',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logInvoiceFlagResolved(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_FLAG_RESOLVED',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  // Invoice data updates
  async logInvoiceDataUpdate(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_DATA_UPDATE',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logInvoiceApproved(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_APPROVED',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logInvoiceApprovalUndone(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_APPROVAL_UNDONE',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  // Email and remittance
  async logRemittanceEmailSent(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'REMITTANCE_EMAIL_SENT',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  async logFlagNotificationSent(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'FLAG_NOTIFICATION_SENT',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  // Document operations
  async logDocumentUpload(details: { file_name: string; file_size: number; invoice_id?: string }) {
    await this.log({
      action_type: 'DOCUMENT_UPLOAD',
      entity_type: 'DOCUMENT',
      entity_id: details.invoice_id,
      details
    });
  }

  // Invoice deletion (soft delete)
  async logInvoiceSoftDeleted(invoiceId: string, details: InvoiceAuditDetails & {
    deleted_from_xero?: boolean;
    had_xero_id?: boolean;
  }) {
    await this.log({
      action_type: 'INVOICE_SOFT_DELETED',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  // Invoice deletion (legacy - kept for compatibility)
  async logInvoiceDeleted(invoiceId: string, details: InvoiceAuditDetails) {
    await this.log({
      action_type: 'INVOICE_DELETED',
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details
    });
  }

  // General field updates with before/after values
  async logFieldUpdate(entityType: string, entityId: string, fieldName: string, oldValue: any, newValue: any, additionalDetails?: Record<string, any>) {
    await this.log({
      action_type: 'FIELD_UPDATE',
      entity_type: entityType,
      entity_id: entityId,
      details: {
        field_changed: fieldName,
        old_value: oldValue,
        new_value: newValue,
        ...additionalDetails
      }
    });
  }

  // Fetch audit logs for admin users
  async getAuditLogs(filters?: {
    user_email?: string;
    action_type?: string;
    entity_type?: string;
    entity_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.user_email) {
        query = query.eq('user_email', filters.user_email);
      }
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
    }

    return query;
  }

  // Log API errors with comprehensive details
  async logApiError(details: ApiErrorDetails): Promise<void> {
    try {
      // Use the database function directly for API errors
      const { error } = await supabase.rpc('log_api_error', {
        api_endpoint: details.api_endpoint,
        error_message: details.error_message,
        error_details: details.error_details || {},
        request_data: {
          ...details.request_data || {},
          invoice_number: details.invoice_number
        },
        response_status: details.response_status,
        response_data: details.response_data
      });

      if (error) {
        console.error('Failed to log API error:', error);
      }
    } catch (error) {
      console.error('API error logging failed:', error);
    }
  }
}

export const auditService = new AuditService();