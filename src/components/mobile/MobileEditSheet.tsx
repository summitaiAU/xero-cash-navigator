import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { XeroSection } from '@/components/XeroSection';
import { Invoice } from '@/types/invoice';
import { invoiceLockService } from '@/services/invoiceLockService';

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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmClose = async () => {
    setShowCloseConfirm(false);
    setHasUnsavedChanges(false);
    
    // Release the lock before closing
    await invoiceLockService.releaseLock(invoice.id);
    
    onOpenChange(false);
  };

  const handleSaveAndClose = async (updates: any) => {
    // Release lock first (same pattern as X button)
    await invoiceLockService.releaseLock(invoice.id);
    
    // Then trigger save callback and close
    onUpdate(updates);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  const handleCancelAndClose = async () => {
    // Release lock first (same pattern as X button)
    await invoiceLockService.releaseLock(invoice.id);
    
    // Then close
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  const handleCancelClose = () => {
    setShowCloseConfirm(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleCloseAttempt();
        }
      }}>
        <SheetContent 
          side="bottom" 
          className="h-[100vh] p-0 w-full"
        >
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10 flex flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseAttempt}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
            <SheetTitle className="flex-1 text-center">Edit Invoice</SheetTitle>
            <div className="h-8 w-8" /> {/* Spacer for centering */}
          </SheetHeader>
          
          <div className="overflow-y-auto h-[calc(100vh-64px)] p-4">
            <XeroSection
              invoice={invoice}
              onUpdate={handleSaveAndClose}
              onSync={onSync}
              disablePresence={true}
              autoStartEdit={true}
              onCancelEdit={handleCancelAndClose}
              onDataChange={(hasChanges) => {
                setHasUnsavedChanges(hasChanges);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog for Unsaved Changes */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Close Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
