import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';
import { deleteInvoice } from '@/services/invoiceDeletionService';

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
    setIsDeleting(true);
    
    try {
      const result = await deleteInvoice(invoice);
      
      if (result.success) {
        toast({
          title: "Invoice Deleted",
          description: result.message,
        });
        setOpen(false);
        onDeleted?.();
      } else {
        toast({
          title: "Delete Failed",
          description: result.message,
          variant: "destructive",
        });
        if (result.message.includes("Unapprove")) {
          setOpen(false); // Close dialog for approval errors
        }
      }
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

  // Only show for payable invoices (not paid or deleted)
  if (invoice.status === 'PAID' || invoice.status === 'DELETED') {
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
            This action will mark the invoice as deleted and remove it from Xero if it exists. The invoice record will be preserved for audit purposes.
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