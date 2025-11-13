import React from 'react';
import { MobileHeader } from './MobileHeader';
import { MobilePDFViewer } from './MobilePDFViewer';
import { MobileInvoiceDetails } from './MobileInvoiceDetails';
import { MobileLineItems } from './MobileLineItems';
import { MobileTotals } from './MobileTotals';
import { Invoice } from '@/types/invoice';

interface MobileDashboardProps {
  currentInvoice: Invoice | null;
  invoices: Invoice[];
  currentIndex: number;
  onNavigateBack: () => void;
  onJumpToInvoice: (index: number) => void;
  onOpenHamburgerMenu: () => void;
}

export const MobileDashboard = ({
  currentInvoice,
  invoices,
  currentIndex,
  onNavigateBack,
  onJumpToInvoice,
  onOpenHamburgerMenu,
}: MobileDashboardProps) => {
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
        
        {/* TODO: Action Buttons - Priority 3 */}
        {/* TODO: Payment Confirmation - Priority 3 */}
      </main>
    </div>
  );
};
