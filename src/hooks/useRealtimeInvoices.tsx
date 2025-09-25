import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeInvoiceUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  invoice: Invoice;
  user_email?: string;
}

interface UseRealtimeInvoicesProps {
  viewState: 'payable' | 'paid' | 'flagged';
  onInvoiceUpdate?: (update: RealtimeInvoiceUpdate) => void;
}

export const useRealtimeInvoices = ({ viewState, onInvoiceUpdate }: UseRealtimeInvoicesProps) => {
  const { toast } = useToast();
  const [realtimeUpdates, setRealtimeUpdates] = useState<RealtimeInvoiceUpdate[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('invoice-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Invoice change detected:', payload);
          
          let invoice: Invoice;
          
          if (payload.eventType === 'DELETE') {
            // For deletes, we need to construct invoice from old data
            invoice = {
              id: payload.old.id,
              invoice_number: payload.old.invoice_no || '',
              supplier: payload.old.supplier_name || '',
              amount: Number(payload.old.total_amount) || 0,
              due_date: payload.old.due_date || '',
              status: payload.old.status as any,
              xero_bill_id: payload.old.xero_invoice_id || '',
              drive_embed_url: payload.old.google_drive_embed_link || '',
              drive_view_url: payload.old.link_to_invoice || '',
              supplier_email: '',
              remittance_sent: payload.old.remittance_sent || false,
              project: payload.old.project || '',
              approved: payload.old.approved || false,
              partially_paid: payload.old.partially_paid || false,
              // ... other required fields
            } as Invoice;
          } else {
            // For inserts and updates, use new data
            const newData = payload.new;
            invoice = {
              id: newData.id,
              invoice_number: newData.invoice_no || '',
              supplier: newData.supplier_name || '',
              amount: Number(newData.total_amount) || 0,
              due_date: newData.due_date || '',
              status: newData.status as any,
              xero_bill_id: newData.xero_invoice_id || '',
              drive_embed_url: newData.google_drive_embed_link || '',
              drive_view_url: newData.link_to_invoice || '',
              supplier_email: '',
              remittance_sent: newData.remittance_sent || false,
              project: newData.project || '',
              approved: newData.approved || false,
              partially_paid: newData.partially_paid || false,
              // ... other required fields
            } as Invoice;
          }

          const update: RealtimeInvoiceUpdate = {
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            invoice
          };

          // Show toast notification for changes made by other users
          // Note: In a real implementation, you'd want to track who made the change
          // This could be done through the audit logs or additional metadata
          if (payload.eventType === 'UPDATE') {
            toast({
              title: "Invoice Updated",
              description: `Invoice ${invoice.invoice_number} was updated by another user`,
              duration: 3000,
            });
          } else if (payload.eventType === 'INSERT') {
            toast({
              title: "New Invoice Added",
              description: `Invoice ${invoice.invoice_number} was added by another user`,
              duration: 3000,
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: "Invoice Deleted",
              description: `Invoice ${invoice.invoice_number} was deleted by another user`,
              duration: 3000,
            });
          }

          setRealtimeUpdates(prev => [...prev, update]);
          onInvoiceUpdate?.(update);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewState, onInvoiceUpdate, toast]);

  return { realtimeUpdates };
};
