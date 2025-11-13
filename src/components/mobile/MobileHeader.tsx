import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Invoice } from '@/types/invoice';

interface MobileHeaderProps {
  currentInvoice: Invoice | null;
  invoices: Invoice[];
  onNavigateBack: () => void;
  onJumpToInvoice: (index: number) => void;
  onOpenHamburgerMenu: () => void;
}

export const MobileHeader = ({
  currentInvoice,
  invoices,
  onNavigateBack,
  onJumpToInvoice,
  onOpenHamburgerMenu,
}: MobileHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-50 flex items-center px-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onNavigateBack}
        className="h-10 w-10"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1 text-center px-2">
        <span className="font-semibold text-sm truncate">
          {currentInvoice?.invoice_number || 'No Invoice'}
        </span>
      </div>

      <Sheet>
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
                onClick={() => onJumpToInvoice(index)}
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
    </header>
  );
};
