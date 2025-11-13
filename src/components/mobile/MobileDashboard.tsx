import React, { useState, useCallback } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileHamburgerMenu } from './MobileHamburgerMenu';
import { MobilePDFViewer } from './MobilePDFViewer';
import { MobileInvoiceDetails } from './MobileInvoiceDetails';
import { MobileLineItems } from './MobileLineItems';
import { MobileTotals } from './MobileTotals';
import { MobileActions } from './MobileActions';
import { MobilePayment } from './MobilePayment';
import { MobileEditSheet } from './MobileEditSheet';
import { MobileFloatingNav } from './MobileFloatingNav';
import { InvoiceLockBanner } from '@/components/InvoiceLockBanner';
import { RemittanceSection } from '@/components/RemittanceSection';
import { RealtimeNotifications } from '@/components/RealtimeNotifications';
import { UpdateShimmer } from '@/components/UpdateShimmer';
import { Invoice, PaymentData } from '@/types/invoice';
import { useInvoiceLock } from '@/hooks/useInvoiceLock';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useToast } from '@/hooks/use-toast';
import { approveInvoice, undoApproveInvoice } from '@/services/invoiceService';

interface MobileDashboardProps {
  currentInvoice: Invoice | null;
  invoices: Invoice[];
  currentIndex: number;
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
  onFlagInvoice?: (invoiceId: string) => void;
  onInvoiceSearch: (invoice: Invoice) => void;
  onInvoiceListUpdate?: () => void;
}

export const MobileDashboard = ({
  currentInvoice,
  invoices,
  currentIndex,
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
  onFlagInvoice,
  onInvoiceSearch,
  onInvoiceListUpdate,
}: MobileDashboardProps) => {
  const [isEditingXero, setIsEditingXero] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  // Get lock status for current invoice
  const { isLockedByOther, lockedByUser } = useInvoiceLock(currentInvoice?.id);
  
  // Track user presence for current invoice
  const { usersOnCurrentInvoice } = useUserPresence({
    currentInvoiceId: currentInvoice?.id,
    isEditing: isEditingXero,
    disabled: false,
  });
  
  // Handle real-time invoice list updates
  const handleRealtimeListUpdate = useCallback(() => {
    setIsUpdating(true);
    onInvoiceListUpdate?.();
    
    // Clear shimmer after 2 seconds
    setTimeout(() => {
      setIsUpdating(false);
    }, 2000);
  }, [onInvoiceListUpdate]);
  
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
        onJumpToInvoice={onJumpToInvoice}
        onOpenHamburgerMenu={() => onToggleHamburgerMenu(true)}
        onInvoiceSearch={onInvoiceSearch}
        viewersOnInvoice={usersOnCurrentInvoice}
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
      
      <UpdateShimmer show={isUpdating}>
        <main 
          className="pt-14 pb-6 overflow-y-auto" 
          style={{ height: 'calc(100vh - 56px)', WebkitOverflowScrolling: 'touch' }}
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
            onFlagInvoice={onFlagInvoice || (() => {})}
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
      </UpdateShimmer>
      
      {/* Edit Sheet */}
      <MobileEditSheet
        open={isEditingXero}
        onOpenChange={setIsEditingXero}
        invoice={currentInvoice}
        onUpdate={onXeroUpdate}
        onSync={onXeroSync}
      />

      {/* Floating Navigation */}
      <MobileFloatingNav
        currentIndex={currentIndex}
        totalInvoices={invoices.length}
        onPrevious={onNavigatePrevious}
        onNext={onNavigateNext}
      />
      
      {/* Real-time Notifications */}
      <RealtimeNotifications 
        viewState={viewState} 
        onInvoiceListUpdate={handleRealtimeListUpdate} 
      />
    </div>
  );
};
