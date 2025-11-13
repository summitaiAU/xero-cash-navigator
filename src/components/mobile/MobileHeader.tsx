import { useState } from 'react';
import { MoreVertical, Menu } from 'lucide-react';
import SodhiLogo from '@/assets/sodhi-logo.svg';
import { Button } from '@/components/ui/button';
import { ViewerPresenceChips } from '@/components/ViewerPresenceChips';
import { LiveStatusBadge } from '@/components/LiveStatusBadge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Invoice } from '@/types/invoice';
import { InvoiceSearch } from '@/components/InvoiceSearch';

interface MobileHeaderProps {
  currentInvoice: Invoice | null;
  invoices: Invoice[];
  onJumpToInvoice: (index: number) => void;
  onOpenHamburgerMenu: () => void;
  onInvoiceSearch: (invoice: Invoice) => void;
  viewersOnInvoice?: Array<{ user_id: string; user_email: string; status: string }>;
}

export const MobileHeader = ({
  currentInvoice,
  invoices,
  onJumpToInvoice,
  onOpenHamburgerMenu,
  onInvoiceSearch,
  viewersOnInvoice = [],
}: MobileHeaderProps) => {
  const [showJumpSheet, setShowJumpSheet] = useState(false);

  return (
    <header className="sticky top-0 left-0 right-0 bg-background border-b border-border z-50">
      {/* Row 1: Hamburger, Logo, Invoice Info, Search, 3-dots */}
      <div className="h-14 flex items-center justify-between px-2 gap-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenHamburgerMenu}
            className="h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img src={SodhiLogo} alt="Sodhi" className="h-6 w-auto" />
        </div>

        <div className="flex-1 min-w-0 px-2 flex items-center justify-center">
          {currentInvoice ? (
            <>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {currentInvoice.invoice_number}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentInvoice.supplier}
                </p>
              </div>
              <div className="ml-2 font-semibold text-sm tabular-nums">
                ${currentInvoice.total_amount?.toLocaleString() || '0'}
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">
              No Flagged Invoices
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Live Status Badge */}
          <LiveStatusBadge />
          
          {/* Presence Chips */}
          {currentInvoice && viewersOnInvoice.length > 0 && (
            <ViewerPresenceChips 
              invoiceId={currentInvoice.id} 
              maxVisible={2}
            />
          )}
          
          <InvoiceSearch 
            invoices={invoices}
            onInvoiceSelect={onInvoiceSearch}
          />
          <Sheet open={showJumpSheet} onOpenChange={setShowJumpSheet}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Jump to Invoice</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(80vh-80px)]">
                {invoices.map((invoice, index) => (
                  <button
                    key={invoice.id}
                    onClick={() => {
                      onJumpToInvoice(index);
                      setShowJumpSheet(false);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {invoice.invoice_number}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {invoice.supplier}
                        </div>
                      </div>
                      <div className="ml-2 font-semibold text-sm tabular-nums">
                        ${invoice.total_amount.toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
