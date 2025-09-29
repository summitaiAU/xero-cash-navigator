import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';
import { auditService } from './auditService';
import { ApiErrorLogger } from './apiErrorLogger';

export interface InvoiceDeletionResult {
  success: boolean;
  message: string;
  deletedFromXero: boolean;
  softDeleted: boolean;
}

export const deleteInvoice = async (invoice: Invoice): Promise<InvoiceDeletionResult> => {
  try {
    // Soft delete in Supabase (change status to DELETED instead of actual deletion)
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'DELETED' })
      .eq('id', invoice.id);

    if (error) {
      await ApiErrorLogger.logSupabaseError('UPDATE', error, {
        table: 'invoices',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        userContext: 'Soft delete invoice (set status to DELETED)'
      });
      throw new Error(`Failed to soft delete invoice: ${error.message}`);
    }

    // Audit log the soft deletion
    await auditService.logInvoiceSoftDeleted(invoice.id, {
      invoice_number: invoice.invoice_number,
      supplier_name: invoice.supplier,
      amount: invoice.amount,
      status_from: invoice.status,
      status_to: 'DELETED',
      deleted_from_xero: false,
      had_xero_id: !!invoice.xero_bill_id
    });

    console.log(`Successfully soft deleted invoice ${invoice.invoice_number}`);

    return {
      success: true,
      message: `Invoice ${invoice.invoice_number} has been deleted successfully.`,
      deletedFromXero: false,
      softDeleted: true
    };

  } catch (error: any) {
    console.error('Delete invoice error:', error);
    
    // Log the comprehensive deletion error
    await ApiErrorLogger.logError({
      endpoint: 'invoice-deletion',
      method: 'DELETE',
      requestData: {
        invoice_id: invoice.id,
        xero_bill_id: invoice.xero_bill_id,
        had_xero_id: !!invoice.xero_bill_id
      },
      invoiceNumber: invoice.invoice_number,
      userContext: 'Complete invoice deletion process',
      error
    });

    return {
      success: false,
      message: error.message || "Failed to delete invoice",
      deletedFromXero: false,
      softDeleted: false
    };
  }
};