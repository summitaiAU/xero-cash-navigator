import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Edit, Undo, Lock, Loader2, Flag } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';
import { FlagInvoiceModal } from '@/components/FlagInvoiceModal';

interface MobileActionsProps {
  invoice: Invoice;
  onStartEdit: () => void;
  onApprove: () => Promise<void>;
  onUndoApprove: () => Promise<void>;
  onFlagInvoice: (invoiceId: string) => void;
  isEditing: boolean;
  isApproving: boolean;
  isLockedByOther: boolean;
  lockedByUser?: string;
}

export const MobileActions: React.FC<MobileActionsProps> = ({
  invoice,
  onStartEdit,
  onApprove,
  onUndoApprove,
  onFlagInvoice,
  isEditing,
  isApproving,
  isLockedByOther,
  lockedByUser,
}) => {
  const { toast } = useToast();
  const [showFlagModal, setShowFlagModal] = useState(false);

  const handleLockedAction = () => {
    toast({
      title: 'Invoice Locked',
      description: lockedByUser 
        ? `This invoice is being edited by ${lockedByUser}`
        : 'This invoice is currently locked by another user',
      variant: 'destructive',
    });
  };

  // Don't show action buttons when editing (edit controls in XeroSection)
  if (isEditing) {
    return null;
  }

  return (
    <div className="mx-2 mt-3">
      <div className="flex gap-2">
        {/* Approve/Undo Button */}
        <Button
          onClick={invoice.approved ? onUndoApprove : onApprove}
          disabled={isApproving || isLockedByOther}
          variant={invoice.approved ? 'outline' : 'default'}
          className="flex-1 h-11"
          onTouchEnd={(e) => {
            if (isLockedByOther) {
              e.preventDefault();
              handleLockedAction();
            }
          }}
        >
          {isApproving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {invoice.approved ? 'Undoing...' : 'Approving...'}
            </>
          ) : isLockedByOther ? (
            <>
              <Lock className="mr-2 h-4 w-4" />
              {invoice.approved ? 'Undo Approval' : 'Approve Invoice'}
            </>
          ) : (
            <>
              {invoice.approved ? (
                <>
                  <Undo className="mr-2 h-4 w-4" />
                  Undo Approval
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Invoice
                </>
              )}
            </>
          )}
        </Button>

        {/* Edit Button */}
        <Button
          onClick={onStartEdit}
          disabled={isLockedByOther}
          variant="outline"
          className="flex-1 h-11"
          onTouchEnd={(e) => {
            if (isLockedByOther) {
              e.preventDefault();
              handleLockedAction();
            }
          }}
        >
          {isLockedByOther ? (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Edit Invoice
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Edit Invoice
            </>
          )}
        </Button>
      </div>

      {/* Flag Invoice Button */}
      <div className="mt-2">
        <Button
          onClick={() => setShowFlagModal(true)}
          variant="outline"
          className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 h-11"
        >
          <Flag className="mr-2 h-4 w-4" />
          Flag Invoice
        </Button>
      </div>

      {/* Flag Invoice Modal */}
      {showFlagModal && (
        <FlagInvoiceModal
          invoice={invoice}
          isOpen={showFlagModal}
          onClose={() => setShowFlagModal(false)}
          onComplete={() => {
            onFlagInvoice(invoice.id);
            setShowFlagModal(false);
          }}
        />
      )}
    </div>
  );
};
