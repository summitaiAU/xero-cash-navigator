import React, { useState, useEffect } from 'react';
import { Invoice } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, Edit, Lock, CheckCircle, XCircle } from 'lucide-react';
import { MobilePDFViewer } from './MobilePDFViewer';
import { MobileInvoiceDetails } from './MobileInvoiceDetails';
import { MobileLineItems } from './MobileLineItems';
import { MobileTotals } from './MobileTotals';
import { MobileEditSheet } from './MobileEditSheet';
import { InvoiceLockBanner } from '@/components/InvoiceLockBanner';
import { RemittanceSection } from '@/components/RemittanceSection';
import { UpdateShimmer } from '@/components/UpdateShimmer';
import { RealtimeNotifications } from '@/components/RealtimeNotifications';
import { invoiceLockService } from '@/services/invoiceLockService';
import { approveInvoice, undoApproveInvoice } from '@/services/invoiceService';
import { useAuth } from '@/hooks/useAuth';
import { useInvoiceLock } from '@/hooks/useInvoiceLock';
import { useUserPresence } from '@/hooks/useUserPresence';
import { ViewerPresenceChips } from '@/components/ViewerPresenceChips';
import { LiveStatusBadge } from '@/components/LiveStatusBadge';
import { toast } from 'sonner';

interface MobilePaidInvoiceViewerProps {
  invoice: Invoice;
  onBack: () => void;
  onSupplierClick?: (supplier: string) => void;
  onOpenSearch: () => void;
  onUpdate: (updatedInvoice: Invoice) => void;
}

export const MobilePaidInvoiceViewer: React.FC<MobilePaidInvoiceViewerProps> = ({
  invoice,
  onBack,
  onSupplierClick,
  onOpenSearch,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [isEditingSheet, setIsEditingSheet] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get lock status using hook
  const { isLockedByOther, lockedByUser } = useInvoiceLock(invoice?.id);

  // Track user presence
  const { usersOnCurrentInvoice } = useUserPresence({
    currentInvoiceId: invoice?.id,
    isEditing: isEditingSheet,
    disabled: false,
  });

  // Process line items from invoice data
  const processedLineItems = React.useMemo(() => {
    if (invoice.list_items && Array.isArray(invoice.list_items)) {
      return invoice.list_items;
    }
    if (invoice.xero_data?.lineItems) {
      return invoice.xero_data.lineItems;
    }
    return [];
  }, [invoice]);

  // Calculate totals from line items
  const { subtotal, totalTax, total } = React.useMemo(() => {
    let sub = 0;
    let tax = 0;
    
    processedLineItems.forEach((item: any) => {
      const lineTotalExGst = item.lineTotalExGst || (item.quantity * item.unitAmount);
      const lineGst = item.lineGst || 0;
      sub += lineTotalExGst;
      tax += lineGst;
    });
    
    return {
      subtotal: sub,
      totalTax: tax,
      total: sub + tax,
    };
  }, [processedLineItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const handleStartEdit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to edit invoices');
      return;
    }

    if (isLockedByOther) {
      toast.error(`This invoice is being edited by ${lockedByUser}`);
      return;
    }

    // Attempt to acquire lock
    const lockResult = await invoiceLockService.acquireLock(invoice.id);
    
    if (!lockResult.success) {
      if (lockResult.lock?.locked_by_user_id === user.id) {
        // Session recovery - release and retry
        toast.info('Recovering session...');
        await invoiceLockService.releaseOwnLock(invoice.id);
        const retryResult = await invoiceLockService.acquireLock(invoice.id);
        if (retryResult.success) {
          setIsEditingSheet(true);
          return;
        }
      }
      toast.error(lockResult.error || 'Failed to acquire lock');
      return;
    }

    setIsEditingSheet(true);
  };

  const handleUpdate = (updatedInvoice: Invoice) => {
    setIsEditingSheet(false);
    onUpdate(updatedInvoice);
  };

  const handleCancelEdit = () => {
    setIsEditingSheet(false);
  };

  const handleApprove = async () => {
    try {
      await approveInvoice(invoice.id);
      toast.success('Invoice approved successfully');
      onUpdate({ ...invoice, approved: true });
    } catch (error) {
      console.error('Error approving invoice:', error);
      toast.error('Failed to approve invoice');
    }
  };

  const handleUndoApproval = async () => {
    try {
      await undoApproveInvoice(invoice.id);
      toast.success('Approval undone successfully');
      onUpdate({ ...invoice, approved: false });
    } catch (error) {
      console.error('Error undoing approval:', error);
      toast.error('Failed to undo approval');
    }
  };

  const handleRealtimeListUpdate = () => {
    setIsUpdating(true);
    onUpdate(invoice); // Trigger parent refresh
    setTimeout(() => setIsUpdating(false), 2000);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border h-14 px-2 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{invoice.invoice_number}</div>
          <div className="text-xs text-muted-foreground truncate">{invoice.supplier}</div>
        </div>
        <div className="text-sm font-semibold tabular-nums mr-2">
          {formatCurrency(invoice.total_amount)}
        </div>
        
        {/* Live Status Badge */}
        <LiveStatusBadge />
        
        {/* Presence Chips */}
        {usersOnCurrentInvoice.length > 0 && (
          <ViewerPresenceChips 
            invoiceId={invoice.id} 
            maxVisible={2}
          />
        )}
        
        <Button variant="ghost" size="icon" onClick={onOpenSearch} className="h-10 w-10">
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Lock Banner */}
      {isLockedByOther && (
        <InvoiceLockBanner
          invoiceId={invoice.id}
          isCurrentUserEditing={isEditingSheet}
        />
      )}

      {/* Update Shimmer */}
      <UpdateShimmer show={isUpdating} duration={2000}>
        <div />
      </UpdateShimmer>

      {/* Scrollable Content */}
      <main 
        className="pb-6 overflow-y-auto" 
        style={{ 
          height: 'calc(100vh - 56px)', 
          WebkitOverflowScrolling: 'touch' 
        }}
      >
        <MobilePDFViewer invoice={invoice} />
        <MobileInvoiceDetails 
          invoice={invoice} 
          onSupplierClick={onSupplierClick} 
        />
        <MobileLineItems lineItems={processedLineItems} />
        <MobileTotals 
          subtotal={subtotal}
          totalTax={totalTax}
          total={total}
          isApproved={invoice.approved}
        />
        
        {/* Action Buttons Row */}
        <div className="mx-2 mt-3 flex gap-2">
          {/* Approve/Undo Button */}
          <Button
            onClick={invoice.approved ? handleUndoApproval : handleApprove}
            disabled={isLockedByOther}
            className="flex-1 h-11"
            variant={invoice.approved ? 'outline' : 'default'}
          >
            {invoice.approved ? (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Undo Approval
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Invoice
              </>
            )}
          </Button>

          {/* Edit Button */}
          <Button
            onClick={handleStartEdit}
            disabled={isLockedByOther}
            className="flex-1 h-11"
            variant="outline"
          >
            {isLockedByOther ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Locked
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>

        {/* Remittance Section */}
        {invoice.remittance_sent && (
          <RemittanceSection
            invoice={invoice}
            compact={true}
          />
        )}
      </main>

      {/* Edit Sheet */}
      <MobileEditSheet
        open={isEditingSheet}
        onOpenChange={setIsEditingSheet}
        invoice={invoice}
        onUpdate={handleUpdate}
        onSync={() => onUpdate(invoice)}
      />

      {/* Realtime Notifications */}
      <RealtimeNotifications
        viewState="paid"
        onInvoiceListUpdate={handleRealtimeListUpdate}
      />
    </div>
  );
};
