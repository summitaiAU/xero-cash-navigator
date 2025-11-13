import React from 'react';
import { MobileHeader } from './MobileHeader';
import { MobilePDFViewer } from './MobilePDFViewer';
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
      
      <main className="pt-14">
        <MobilePDFViewer invoice={currentInvoice} />
        
        {/* TODO: Add remaining sections in Priority 2 & 3 */}
        {/* - Invoice Details Section */}
        {/* - Line Items Section */}
        {/* - Totals Section */}
        {/* - Action Buttons */}
        {/* - Payment Confirmation */}
      </main>
    </div>
  );
};
