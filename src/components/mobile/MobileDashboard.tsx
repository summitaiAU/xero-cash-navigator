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
import { InvoiceLockBanner } from '@/components/InvoiceLockBanner';
import { RemittanceSection } from '@/components/RemittanceSection';
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
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };
  
  const handleStartEdit = () => {
    setIsEditingXero(true);
  };

  const handleApprove = async () => {
    if (!currentInvoice) return;
    
    // Validation: Check required fields
    if (!currentInvoice.entity) {
      toast({ 
        title: 'Approval Failed', 
        description: 'Entity is required. Please edit the invoice.',
        variant: 'destructive',
      });
      scrollToSection('mobile-details-section');
      return;
    }
    
    if (!currentInvoice.project) {
      toast({ 
        title: 'Approval Failed', 
        description: 'Project is required. Please edit the invoice.',
        variant: 'destructive',
      });
      scrollToSection('mobile-details-section');
      return;
    }
    
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
      
      {/* Lock Banner */}
      {isLockedByOther && (
        <div className="sticky top-14 z-40 mx-2 mt-2">
          <InvoiceLockBanner
            invoiceId={currentInvoice.id}
            isCurrentUserEditing={isEditingXero}
          />
        </div>
      )}
      
      <main 
        className="pt-14 pb-6 overflow-y-auto" 
        style={{ height: 'calc(100vh - 56px)', WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div id="mobile-pdf-section" className="scroll-mt-16">
          <MobilePDFViewer invoice={currentInvoice} />
        </div>
        
        {/* Invoice Details Section */}
        <div id="mobile-details-section" className="scroll-mt-16">
          <MobileInvoiceDetails 
            invoice={currentInvoice}
            onSupplierClick={(supplier) => {
              console.log('Filter by supplier:', supplier);
            }}
          />
        </div>
        
        {/* Line Items Section */}
        {currentInvoice.xero_data?.lineItems && (
          <div id="mobile-lineitems-section" className="scroll-mt-16">
            <MobileLineItems lineItems={currentInvoice.xero_data.lineItems} />
          </div>
        )}
        
        {/* Totals Section */}
        <div id="mobile-totals-section" className="scroll-mt-16">
          <MobileTotals 
            subtotal={currentInvoice.xero_data?.subtotal || currentInvoice.subtotal || 0}
            totalTax={currentInvoice.xero_data?.totalTax || currentInvoice.gst || 0}
            total={currentInvoice.xero_data?.total || currentInvoice.total_amount || currentInvoice.amount || 0}
            isApproved={currentInvoice.approved}
          />
        </div>
        
        {/* Action Buttons */}
        <div id="mobile-actions-section" className="scroll-mt-16">
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
        </div>
        
        {/* Payment Confirmation */}
        <div id="mobile-payment-section" className="scroll-mt-16">
          <MobilePayment
            invoice={currentInvoice}
            onMarkAsPaid={onMarkAsPaid}
            onPartialPaymentUpdate={onPartialPaymentUpdate}
            isLockedByOther={isLockedByOther}
            loading={false}
          />
        </div>
        
        {/* Remittance Section - Only for Paid/Partially Paid Invoices */}
        {(currentInvoice.status === 'PAID' || currentInvoice.status === 'PARTIALLY PAID') && (
          <div className="mx-2 mt-3">
            <RemittanceSection
              invoice={currentInvoice}
              compact={true}
              onRemittanceSent={(invoiceId, email) => {
                onXeroUpdate({ remittance_sent: true, remittance_email: email });
                toast({
                  title: 'Remittance Sent',
                  description: `Remittance sent to ${email}`,
                });
              }}
            />
          </div>
        )}
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
