import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteInvoiceButtonProps {
  invoice: Invoice;
  onDeleted?: () => void;
}

export const DeleteInvoiceButton: React.FC<DeleteInvoiceButtonProps> = ({ 
  invoice, 
  onDeleted 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!invoice.xero_bill_id) {
      toast({
        title: "Error",
        description: "No Xero invoice ID found for this invoice.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // First check if Xero invoice is approved
      const checkResponse = await fetch('https://sodhipg.app.n8n.cloud/webhook/f31b75ff-6eda-4a72-93ea-91c541daaa4e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xero_invoice_id: invoice.xero_bill_id })
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to check invoice status');
      }

      const xeroData = await checkResponse.json();
      const xeroInvoice = Array.isArray(xeroData) ? xeroData[0] : xeroData;
      
      // Check if invoice is approved (AUTHORISED or AWAITING_PAYMENT)
      if (xeroInvoice?.Status && xeroInvoice.Status !== 'DRAFT') {
        toast({
          title: "Cannot Delete",
          description: "Cannot Delete Xero Invoice is Approved. Unapprove Xero Invoice First",
          variant: "destructive",
        });
        setOpen(false);
        return;
      }

      // Delete from Xero first
      const deleteXeroResponse = await fetch('https://sodhipg.app.n8n.cloud/webhook/3382a24f-d60a-4f11-882d-1e4b595d0a3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xero_invoice_id: invoice.xero_bill_id })
      });

      if (!deleteXeroResponse.ok) {
        const errorText = await deleteXeroResponse.text();
        throw new Error(`Failed to delete from Xero: ${errorText}`);
      }

      // Delete from Supabase
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) {
        throw new Error(`Failed to delete from database: ${error.message}`);
      }

      // Audit log the deletion
      const { auditService } = await import('@/services/auditService');
      await auditService.logInvoiceDeleted(invoice.id, {
        invoice_number: invoice.invoice_number,
        supplier_name: invoice.supplier,
        amount: invoice.amount,
        status_from: invoice.status
      });

      toast({
        title: "Invoice Deleted",
        description: `Invoice ${invoice.invoice_number} has been deleted successfully.`,
      });

      setOpen(false);
      onDeleted?.();

    } catch (error: any) {
      console.error('Delete invoice error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Only show for payable invoices (not paid)
  if (invoice.status === 'PAID') {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost-destructive" 
          size="sm"
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Invoice
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete invoice <strong>{invoice.invoice_number}</strong>? 
            This action cannot be undone. The invoice will be removed from both Xero and the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};