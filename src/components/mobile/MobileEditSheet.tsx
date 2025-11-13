import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { XeroSection } from '@/components/XeroSection';
import { Invoice } from '@/types/invoice';

interface MobileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onUpdate: (updates: any) => void;
  onSync: () => void;
}

export const MobileEditSheet: React.FC<MobileEditSheetProps> = ({
  open,
  onOpenChange,
  invoice,
  onUpdate,
  onSync,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[100vh] p-0 w-full"
      >
        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle>Edit Invoice</SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto h-[calc(100vh-64px)] p-4">
          <XeroSection
            invoice={invoice}
            onUpdate={(updates) => {
              onUpdate(updates);
              onOpenChange(false); // Close sheet after save
            }}
            onSync={onSync}
            disablePresence={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
