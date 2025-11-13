import React from 'react';
import { Invoice } from '@/types/invoice';
import { formatDateSydney } from '@/lib/dateUtils';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from './utils';

interface MobileInvoiceDetailsProps {
  invoice: Invoice;
  onSupplierClick?: (supplier: string) => void;
}

export const MobileInvoiceDetails = ({ invoice, onSupplierClick }: MobileInvoiceDetailsProps) => {
  const { toast } = useToast();
  
  const supplierName = invoice.supplier_name || invoice.supplier;
  const invoiceNumber = invoice.invoice_number || invoice.invoice_no;
  
  const handleCopyInvoiceNumber = () => {
    if (invoiceNumber) {
      copyToClipboard(invoiceNumber, toast);
    }
  };

  const handleSupplierClick = () => {
    if (supplierName && onSupplierClick) {
      onSupplierClick(supplierName);
    }
  };

  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'PAID';

  return (
    <div className="mx-2 mt-3 p-3 bg-card border border-border rounded-xl shadow-sm">
      <h2 className="text-sm font-semibold text-foreground mb-3">Invoice Details</h2>
      
      <div className="space-y-0">
        {/* Entity */}
        {invoice.entity && (
          <div className="flex items-center justify-between py-2.5 border-b border-border/50">
            <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">Entity</span>
            <span className="text-sm font-medium text-right break-words flex-1">{invoice.entity}</span>
          </div>
        )}
        
        {/* Project */}
        <div className="flex items-center justify-between py-2.5 border-b border-border/50">
          <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">Project</span>
          {invoice.project ? (
            <span className="text-sm font-medium text-right break-words flex-1">{invoice.project}</span>
          ) : (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">No project</span>
          )}
        </div>
        
        {/* Supplier */}
        {supplierName && (
          <div className="flex items-center justify-between py-2.5 border-b border-border/50">
            <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">Supplier</span>
            <button
              onClick={handleSupplierClick}
              className="text-sm font-medium text-primary text-right break-words flex-1 active:underline"
            >
              {supplierName}
            </button>
          </div>
        )}
        
        {/* Invoice Number */}
        {invoiceNumber && (
          <div className="flex items-center justify-between py-2.5 border-b border-border/50">
            <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">Invoice #</span>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className="text-sm font-medium text-right break-words">{invoiceNumber}</span>
              <button
                onClick={handleCopyInvoiceNumber}
                className="p-1 hover:bg-muted rounded active:bg-muted/70"
              >
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
        
        {/* Invoice Date */}
        {invoice.invoice_date && (
          <div className="flex items-center justify-between py-2.5 border-b border-border/50">
            <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">Invoice Date</span>
            <span className="text-sm font-medium text-right break-words flex-1">
              {formatDateSydney(invoice.invoice_date, 'dd MMM yyyy')}
            </span>
          </div>
        )}
        
        {/* Due Date */}
        {invoice.due_date && (
          <div className="flex items-center justify-between py-2.5">
            <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">Due Date</span>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className="text-sm font-medium text-right break-words">
                {formatDateSydney(invoice.due_date, 'dd MMM yyyy')}
              </span>
              {isOverdue && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-medium">
                  Overdue
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
