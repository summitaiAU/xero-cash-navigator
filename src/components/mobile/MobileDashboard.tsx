import React, { useState, useRef } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileHamburgerMenu } from './MobileHamburgerMenu';
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
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onJumpToInvoice: (index: number) => void;
  showHamburgerMenu: boolean;
  onToggleHamburgerMenu: (open: boolean) => void;
  viewState: 'payable' | 'paid' | 'flagged';
  payableCount: number;
  flaggedCount: number;
  reviewCount: number;
  userName?: string;
  onSignOut?: () => void;
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
  onNavigatePrevious,
  onNavigateNext,
  onJumpToInvoice,
  showHamburgerMenu,
  onToggleHamburgerMenu,
  viewState,
  payableCount,
  flaggedCount,
  reviewCount,
  userName,
  onSignOut,
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

  // Swipe gesture state
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const MIN_SWIPE_DISTANCE = 50;
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

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    
    if (Math.abs(swipeDistance) < MIN_SWIPE_DISTANCE) {
      return; // Not a swipe, ignore
    }

    if (swipeDistance > 0) {
      // Swiped left - go to next invoice
      if (currentIndex < invoices.length - 1) {
        onNavigateNext();
      }
    } else {
      // Swiped right - go to previous invoice
      if (currentIndex > 0) {
        onNavigatePrevious();
      }
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
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
        onOpenHamburgerMenu={() => onToggleHamburgerMenu(true)}
      />

      <MobileHamburgerMenu
        open={showHamburgerMenu}
        onOpenChange={onToggleHamburgerMenu}
        viewState={viewState}
        payableCount={payableCount}
        flaggedCount={flaggedCount}
        reviewCount={reviewCount}
        userName={userName}
        onSignOut={onSignOut}
      />
      
      <main 
        className="pt-14 pb-6 overflow-y-auto" 
        style={{ height: 'calc(100vh - 56px)', WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
