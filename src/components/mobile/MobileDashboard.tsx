import React, { useState } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobilePDFViewer } from './MobilePDFViewer';
import { MobileInvoiceDetails } from './MobileInvoiceDetails';
import { MobileLineItems } from './MobileLineItems';
import { MobileTotals } from './MobileTotals';
import { MobileActions } from './MobileActions';
import { MobilePayment } from './MobilePayment';
import { MobileEditSheet } from './MobileEditSheet';
import { Invoice, PaymentData } from '@/types/invoice';
import { useInvoiceLock } from '@/hooks/useInvoiceLock';
import { useToast } from '@/hooks/use-toast';
import { approveInvoice, undoApproveInvoice } from '@/services/invoiceService';

interface MobileDashboardProps {
  currentInvoice: Invoice | null;
  invoices: Invoice[];
  currentIndex: number;
  onNavigateBack: () => void;
  onJumpToInvoice: (index: number) => void;
  onOpenHamburgerMenu: () => void;
  onMarkAsPaid: (data: PaymentData) => Promise<void>;
  onXeroUpdate: (updates: any) => void;
  onXeroSync: () => void;
  onPartialPaymentUpdate?: () => Promise<void>;
}

export const MobileDashboard = ({
  currentInvoice,
  invoices,
  currentIndex,
  onNavigateBack,
  onJumpToInvoice,
  onOpenHamburgerMenu,
  onMarkAsPaid,
  onXeroUpdate,
  onXeroSync,
  onPartialPaymentUpdate,
}: MobileDashboardProps) => {
  const [isEditingXero, setIsEditingXero] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();
  
  // Get lock status for current invoice
  const { isLockedByOther, lockedByUser } = useInvoiceLock(currentInvoice?.id);
  const handleStartEdit = () => {
    setIsEditingXero(true);
  };

  const handleApprove = async () => {
    if (!currentInvoice) return;
    
    setIsApproving(true);
    try {
      await approveInvoice(currentInvoice.id);
      toast({ 
        title: 'Invoice Approved', 
        description: 'Invoice has been approved.',
      });
      // Trigger parent refresh
      onXeroUpdate({ approved: true });
    } catch (error: any) {
      toast({ 
        title: 'Approval Failed', 
        description: error.message, 
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleUndoApprove = async () => {
    if (!currentInvoice) return;
    
    setIsApproving(true);
    try {
      await undoApproveInvoice(currentInvoice.id);
      toast({ 
        title: 'Approval Undone', 
        description: 'Invoice approval reverted.',
      });
      // Trigger parent refresh
      onXeroUpdate({ approved: false });
    } catch (error: any) {
      toast({ 
        title: 'Undo Failed', 
        description: error.message, 
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (!currentInvoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No invoice selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        currentInvoice={currentInvoice}
        invoices={invoices}
        onNavigateBack={onNavigateBack}
        onJumpToInvoice={onJumpToInvoice}
        onOpenHamburgerMenu={onOpenHamburgerMenu}
      />
      
      <main 
        className="pt-14 pb-6 overflow-y-auto" 
        style={{ height: 'calc(100vh - 56px)', WebkitOverflowScrolling: 'touch' }}
      >
        <MobilePDFViewer invoice={currentInvoice} />
        
        {/* Invoice Details Section */}
        <MobileInvoiceDetails 
          invoice={currentInvoice}
          onSupplierClick={(supplier) => {
            console.log('Filter by supplier:', supplier);
          }}
        />
        
        {/* Line Items Section */}
        {currentInvoice.xero_data?.lineItems && (
          <MobileLineItems lineItems={currentInvoice.xero_data.lineItems} />
        )}
        
        {/* Totals Section */}
        <MobileTotals 
          subtotal={currentInvoice.xero_data?.subtotal || currentInvoice.subtotal || 0}
          totalTax={currentInvoice.xero_data?.totalTax || currentInvoice.gst || 0}
          total={currentInvoice.xero_data?.total || currentInvoice.total_amount || currentInvoice.amount || 0}
          isApproved={currentInvoice.approved}
        />
        
        {/* Action Buttons */}
        <MobileActions
          invoice={currentInvoice}
          onStartEdit={handleStartEdit}
          onApprove={handleApprove}
          onUndoApprove={handleUndoApprove}
          isEditing={isEditingXero}
          isApproving={isApproving}
          isLockedByOther={isLockedByOther}
          lockedByUser={lockedByUser}
        />
        
        {/* Payment Confirmation */}
        <MobilePayment
          invoice={currentInvoice}
          onMarkAsPaid={onMarkAsPaid}
          onPartialPaymentUpdate={onPartialPaymentUpdate}
          isLockedByOther={isLockedByOther}
          loading={false}
        />
      </main>
      
      {/* Edit Sheet */}
      <MobileEditSheet
        open={isEditingXero}
        onOpenChange={setIsEditingXero}
        invoice={currentInvoice}
        onUpdate={onXeroUpdate}
        onSync={onXeroSync}
      />
    </div>
  );
};
