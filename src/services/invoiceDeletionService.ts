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
  let deletedFromXero = false;
  let softDeleted = false;

  try {
    // Check if Xero ID exists before making API calls
    if (invoice.xero_bill_id) {
      try {
        // First check if Xero invoice is approved
        const checkResponse = await ApiErrorLogger.fetchWithLogging(
          'https://sodhipg.app.n8n.cloud/webhook/f31b75ff-6eda-4a72-93ea-91c541daaa4e',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ xero_invoice_id: invoice.xero_bill_id }),
            logContext: {
              endpoint: '/webhook/f31b75ff-6eda-4a72-93ea-91c541daaa4e',
              method: 'POST',
              requestData: { xero_invoice_id: invoice.xero_bill_id },
              invoiceNumber: invoice.invoice_number,
              userContext: 'Check Xero invoice status before deletion'
            }
          }
        );

        const xeroData = await checkResponse.json();
        const xeroInvoice = Array.isArray(xeroData) ? xeroData[0] : xeroData;
        
        // Check if invoice is approved (AUTHORISED or AWAITING_PAYMENT)
        if (xeroInvoice?.Status && xeroInvoice.Status !== 'DRAFT') {
          return {
            success: false,
            message: "Cannot Delete Xero Invoice is Approved. Unapprove Xero Invoice First",
            deletedFromXero: false,
            softDeleted: false
          };
        }

        // Delete from Xero
        await ApiErrorLogger.fetchWithLogging(
          'https://sodhipg.app.n8n.cloud/webhook/3382a24f-d60a-4f11-882d-1e4b595d0a3d',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ xero_invoice_id: invoice.xero_bill_id }),
            logContext: {
              endpoint: '/webhook/3382a24f-d60a-4f11-882d-1e4b595d0a3d',
              method: 'POST',
              requestData: { xero_invoice_id: invoice.xero_bill_id },
              invoiceNumber: invoice.invoice_number,
              userContext: 'Delete invoice from Xero'
            }
          }
        );

        deletedFromXero = true;
        console.log(`Successfully deleted invoice ${invoice.invoice_number} from Xero`);
      } catch (xeroError: any) {
        console.error('Failed to delete from Xero:', xeroError);
        throw new Error(`Failed to delete from Xero: ${xeroError.message}`);
      }
    } else {
      console.log(`Invoice ${invoice.invoice_number} has no Xero ID, skipping Xero deletion`);
    }

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

    softDeleted = true;

    // Audit log the soft deletion
    await auditService.logInvoiceSoftDeleted(invoice.id, {
      invoice_number: invoice.invoice_number,
      supplier_name: invoice.supplier,
      amount: invoice.amount,
      status_from: invoice.status,
      status_to: 'DELETED',
      deleted_from_xero: deletedFromXero,
      had_xero_id: !!invoice.xero_bill_id
    });

    console.log(`Successfully soft deleted invoice ${invoice.invoice_number}`);

    return {
      success: true,
      message: `Invoice ${invoice.invoice_number} has been deleted successfully.`,
      deletedFromXero,
      softDeleted
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
      deletedFromXero,
      softDeleted
    };
  }
};